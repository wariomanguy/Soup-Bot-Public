const fs = require('fs');
const path = require('path');
const { GuildScheduledEventEntityType, GuildScheduledEventStatus, GuildScheduledEventManager } = require('discord.js');

const EVENTS_FILE = path.join('src/savedata/', 'events.json');

// Converts Discord's event location types (1,2,3) to descriptive strings
const entityTypeMap = {
    [GuildScheduledEventEntityType.StageInstance]: 'stage',
    [GuildScheduledEventEntityType.Voice]: 'voice',
    [GuildScheduledEventEntityType.External]: 'external'
}

//Converts Discord's event status types (1,2,3,4) to descriptive strings
const statusMap = {
    [GuildScheduledEventStatus.Scheduled]: 'scheduled',
    [GuildScheduledEventStatus.Active]: 'active',
    [GuildScheduledEventStatus.Completed]: 'completed',
    [GuildScheduledEventStatus.Canceled]: 'canceled'
}

function ensureEventsFileExists() {
    if (!fs.existsSync(EVENTS_FILE)) {
        const initialData = { events: {} };
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(initialData, null, 4));
    }
}

//Get events.json and make it a JavaScript object
function readEventData() {
    try {
        ensureEventsFileExists();
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading events data:', err);
        throw new Error('Unable to read events data');
    }
}

//write data back to file as JSON
function writeEventData(data) {
    try {
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error('Error writing to events data:', err);
        throw new Error('Unable to write event data');
    }
}

// - RETRIEVING EVENTS -

function getAllEvents() {
    try {
        return readEventData().events;
    } catch (err) {
        console.error('Error getting all events:', err);
        throw err;
    }
}

function getEvent(eventId) {
    try {
        const data = readEventData();
        return data.events[eventId] || null;
    } catch (err) {
        console.error('Failed to get event:', err);
        throw err;
    }
}

function eventExists(eventId) {
    return Boolean(getEvent(eventId));
}

// - WRITING EVENTS -

async function createEvent(discordEvent) {
    try {
        const data = readEventData();
        const users = await discordEvent.fetchSubscribers({withMember: false});

        data.events[discordEvent.id] = {
            id: discordEvent.id,
            guild_id: discordEvent.guildId,
            name: discordEvent.name,
            description: discordEvent.description || null,
            type: entityTypeMap[discordEvent.entityType],
            voice_channel_id: discordEvent.channelId || null,
            location: discordEvent.entityMetadata?.location || null,
            interested_members: [...users.keys()],
            status: statusMap[discordEvent.status],
            start_time: discordEvent.scheduledStartTimestamp,
            end_time: discordEvent.scheduledEndTimestamp,
            recurring: !!discordEvent.recurrenceRule,
            recurrence_rule: discordEvent.recurrenceRule ?? null
        };

        writeEventData(data);
        return data.events[discordEvent.id];
    } catch (err) {
        console.error('Failed to create event:',err);
        throw err;
    }
}

function updateEvent(discordEvent) {
    try {
        const data = readEventData();
        const event = data.events[discordEvent.id];

        //If event doesn't exist yet, create it instead
        if (!event) {
            createEvent(discordEvent);
            return { event: null, revertedIds: [] };
        }

        const oldStart = event.start_time;
        const oldStatus = event.status;
        const newStatus = statusMap[discordEvent.status];

        event.name = discordEvent.name;
        event.description = discordEvent.description || null;
        event.type = entityTypeMap[discordEvent.entityType];
        event.voice_channel_id = discordEvent.channelId || null;
        event.location = discordEvent.entityMetadata?.location || null;
        event.status = newStatus;

        const isLiveLifecycleTransition =
            oldStatus !== newStatus &&
            (oldStatus === 'scheduled' || oldStatus === 'active' || oldStatus === 'completed' || oldStatus === 'canceled') &&
            (newStatus === 'scheduled' || newStatus === 'active' || newStatus === 'completed' || newStatus === 'canceled');

        const shouldRevertForReschedule = Boolean(
            oldStart &&
            discordEvent.scheduledStartTimestamp != null &&
            oldStart !== discordEvent.scheduledStartTimestamp &&
            !isLiveLifecycleTransition &&
            oldStatus === 'scheduled' &&
            newStatus === 'scheduled'
        );

        let revertedIds = [];
        if (shouldRevertForReschedule) {
            try {
                // require lazily to avoid circular dependency at module load time
                const { revertTransactionsForOccurrence } = require('./timebankTools');
                const reverted = revertTransactionsForOccurrence(event.id, oldStart);
                revertedIds = Array.isArray(reverted) ? reverted : [];
                if (revertedIds.length) {
                    console.log(`[EventTools] Reverted ${revertedIds.length} transactions for rescheduled event ${event.id}`);
                }
            } catch (err) {
                console.error(`[EventTools] Failed to revert transactions for rescheduled event ${event.id}:`, err);
            }
        }

        event.start_time = discordEvent.scheduledStartTimestamp;
        event.end_time = discordEvent.scheduledEndTimestamp;
        event.recurring = !!discordEvent.recurrenceRule;
        event.recurrence_rule = discordEvent.recurrenceRule ?? null;

        writeEventData(data);
        return { event: data.events[discordEvent.id], revertedIds };
    } catch (err) {
        console.error('Error updating event:', err);
        throw err;
    }
}

function deleteEvent(eventId) {
    try {
        const data = readEventData();
        delete data.events[eventId];
        writeEventData(data);
    } catch (err) {
        console.error("Couldn't delete event:", err);
        throw err;
    }
}

// - TRACKING INTERESTED MEMBERS -
function addInterestedMember(eventId, userId) {
    try {
        const data = readEventData();
        const event = data.events[eventId];
        if (!event) {
            throw new Error(`Event ${eventId} doesn't exist`);
        }

        //Adds member if they aren't already in the list
        if (!event.interested_members.includes(userId)) {
            event.interested_members.push(userId);
            writeEventData(data);
        }
        return event.interested_members;
    } catch (err){
        console.error("Couldn't add interested member:", err);
        throw err;
    }
}

function removeInterestedMember(eventId, userId) {
    try {
        const data = readEventData();
        const event = data.events[eventId];
        if (!event) {
            throw new Error(`Event ${eventId} doesn't exist`);
        }

        const index = event.interested_members.indexOf(userId);
        if (index !== -1) {
            event.interested_members.splice(index, 1);
            writeEventData(data);
        }
        return event.interested_members;
    } catch (err) {
        console.error("Couldn't remove (un)interested member:", err);
        throw err;
    }
}

function getInterestedMembers(eventId) {
    try {
        const event = getEvent(eventId);
        if (!event) {
            return [];
        }
        return event.interested_members;
    } catch (err) {
        console.error("Unable to get interested members for this event:", err);
        throw err;
    }
}

function allInterestedMembersPresent(event, voiceChannel) {
    const channelMemberIds = new Set(
        voiceChannel.members.map(member => member.id)
    );

    return event.interested_members.every(userId =>
        channelMemberIds.has(userId)
    );
}

module.exports = {
    readEventData,
    writeEventData,

    getAllEvents,
    getEvent,
    eventExists,

    createEvent,
    updateEvent,
    deleteEvent,

    addInterestedMember,
    removeInterestedMember,
    getInterestedMembers,
    allInterestedMembersPresent
}