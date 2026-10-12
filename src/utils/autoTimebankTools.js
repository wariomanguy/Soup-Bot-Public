const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { removePendingCheck, 
        getAttendanceKey, 
        addPendingCheck, 
        getPendingCheck, 
        addAttendanceEvent, 
        getAttendanceEvent, 
        removeAttendanceEvent, 
        getAttendanceEventByChannel} = require('./attendanceManager');
const { getAllEvents, getEvent, eventExists } = require('./eventTools');
const { getVoiceRoleForChannel } = require('./voiceRoleManager');
const { newTransaction, 
    hasAttendanceTransaction, 
    getEventTimebankAmount, 
    newBulkTransaction,
    getTransactionStatement,
    getTimebankAccount,
    getTransactionsByEvent } = require('./timebankTools');

const scheduledEvents = new Map();
let discordClient = null;

// Generate schedule checks for an event
function scheduleEvent(event) {
    //Clear any existing schedule around this event to prevent duplicates
    cancelEventSchedule(event.id);

    if (event.type === 'external') {
        console.warn(`[Auto Timebank] Rejected scheduling in-person event "${event.name}"`);
        return;
    }

    const now = Date.now();

    const earlyCheckTime = event.start_time - (30 * 60 * 1000); //30 minutes prior to the event
    const lateCheckTime = event.start_time + (30 * 60 * 1000); // 30 minutes after the event start
    //const lateCheckTime = event.start_time + (1 * 60 * 1000); // 1 minute after the event start (for testing)
    const timeouts = {};

    // Add check for people at the event 30 minutes early
    if (earlyCheckTime > now) {
        timeouts.earlyCheck = setTimeout(() => {
            runEarlyAttendanceCheck(event.id);
        }, earlyCheckTime - now);
    } else if (event.start_time > now) {
        console.log('[Auto Timebank] Missed normal early attendance check time. Running now.')
        runEarlyAttendanceCheck(event.id);
    }

    // Add check for anyone 30+ minutes late
    if (lateCheckTime > now) {
        timeouts.lateCheck = setTimeout(async () => {
            try {
                await runLateAttendanceCheck(event.id);
            } catch (err) {
                console.error(`[Auto Timebank] Late attendance check failed for ${event.id}:`, err);
            }

            await runEventStatusCheck(event.id);
        }, lateCheckTime - now);
    }

    scheduledEvents.set(event.id, timeouts);
    console.log(`[Auto Timebank] Added checks for ${event.name}`);
}

// Clears any existing timers/schedules for an event
function cancelEventSchedule(eventId) {
    const timeouts = scheduledEvents.get(eventId);

    if (!timeouts) {
        return;
    }

    if (timeouts.earlyCheck) {clearTimeout(timeouts.earlyCheck)};
    if (timeouts.lateCheck) {clearTimeout(timeouts.lateCheck)};

    scheduledEvents.delete(eventId);
    console.log(`[Auto Timebank] Cleared check schedule for ${eventId}`);
}

// Schedules all eligible events
function initializeTimebankEventScheduler(client) {
    discordClient = client; 
    const events = getAllEvents();

    for (const event of Object.values(events)) {
        if (event.type !== 'external' && (event.status === 'scheduled' || event.status === 'active')) {
            scheduleEvent(event);

            if (Math.abs(getEventTimebankAmount(event.start_time)) < 30) {
                    console.log('Added event to active Timebank registry');
                    addAttendanceEvent({
                    eventId: event.id,
                    channelId: event.voice_channel_id,
                    guildId: event.guild_id,
                    name: event.name
                });
            }
        }
    }

    //console.log('[Auto Timebank] ✓ Added checks for all eligible events');
}

async function runEarlyAttendanceCheck(eventId) {
    console.log(`[Auto Timebank] Running early check for ${eventId}`);

    const event = getEvent(eventId);
    if (!event) {
        console.warn(`[Auto Timebank] Couldn't find event with ID: ${eventId}`);
        return;
    }

    if (event.type === 'external') {
        console.warn(`[Auto Timebank] External event "${event.name} rejected from attendance check`);
        return;
    }

    const guild = discordClient.guilds.cache.get(event.guild_id);
    if (!guild) {
        console.warn(`[Auto Timebank] Guild ${event.guild_id} not found`);
        return;
    }

    const eventChannel = guild.channels.cache.get(event.voice_channel_id);
    if (!eventChannel?.isVoiceBased()) {
        console.warn(`[Auto Timebank] Event channel for ${event.name} not found`);
        return;
    }

    //Start window for voice channel verification
    addAttendanceEvent({
        eventId: event.id,
        channelId: event.voice_channel_id,
        guildId: event.guild_id,
        name: event.name,
        start_time: event.start_time
    });
    
    for (const member of eventChannel.members.values()) {
        
        //Skip those uninterested in the event
        if (!event.interested_members.includes(member.id)) {
            continue;
        }

        startAttendanceVerification(event, member);
    }
}

async function runLateAttendanceCheck(eventId) {
    if (!getAttendanceEvent(eventId)) {
        console.log('[Auto Timebank] Skipped late attendance check for an ineligible event');
        return;
    }

    const event = getEvent(eventId);
    if (!event) {
        console.warn(`[Auto Timebank] Couldn't find event with ID: ${eventId}`);
        return;
    }

    if (event.type === 'external') {
        console.warn(`[Auto Timebank] External event "${event.name} rejected from attendance check`);
        return;
    }

    const guild = discordClient.guilds.cache.get(event.guild_id);
    if (!guild) {
        console.warn(`[Auto Timebank] Guild ${event.guild_id} not found`);
        return;
    }

    const eventChannel = guild.channels.cache.get(event.voice_channel_id);
    if (!eventChannel?.isVoiceBased()) {
        console.warn(`[Auto Timebank] Event channel for ${event.name} not found`);
        return;
    }
    
    console.log(`[Auto Timebank] Running late check for ${eventId}`);
    
    // If there are no timebank transactions for this event, nobody attended — skip late check
    const eventTransactions = getTransactionsByEvent(event.id, event.start_time).filter(tx => !tx.reverted);
    if (!eventTransactions.length) {
        console.log(`[Auto Timebank] No timebank transactions found for ${event.name}. Skipping late check.`);
        removeAttendanceEvent(event.id);
        return;
    }

    let absentUserIds = event.interested_members.filter(userId => getUserAttendanceState(eventId, userId, event.start_time) === 'none');

    try {
        const minutes = getEventTimebankAmount(event.start_time);
        const transactions = newBulkTransaction(absentUserIds, minutes, {
            id: event.id,
            name: event.name,
            start_time: event.start_time
        });
        const channel = guild.channels.cache.get(event.voice_channel_id);


        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        for (const transaction of transactions) {
            try {
                let member;
                try {
                    member = await guild.members.fetch(transaction.userId);
                } catch {
                    console.warn(`Failed to fetch member ${transaction.userId}. Skipping...`);
                    continue;
                }

                const statement = getTransactionStatement(transaction, member);

                await sendAutoStatement(transaction, statement, channel);
                console.log(`[Auto Timebank] Applied late penalty to user ${transaction.userId}`);

                await delay(5000);
            } catch (err) {
                console.error(`Failed to send late penalty statement for ${transaction.userId}`);
            }
        }

    } finally {
        removeAttendanceEvent(event.id);
    }
}

async function runEventStatusCheck(eventId) {
    const event = getEvent(eventId);
    if (!event || event.type === 'external' || event.status !== 'scheduled') {
        return;
    }

    const guild = discordClient.guilds.cache.get(event.guild_id);
    if (!guild) {
        console.warn(`[Auto Timebank] Guild ${event.guild_id} not found for event status check`);
        return;
    }

    const channel = guild.channels.cache.get(event.voice_channel_id);
    if (!channel?.isVoiceBased()) {
        console.warn(`[Auto Timebank] Event channel for ${event.name} not found for event status check`);
        return;
    }

    const voiceRoleId = getVoiceRoleForChannel(event.voice_channel_id);
    const roleMention = voiceRoleId ? `-# <@&${voiceRoleId}>\n` : '';
    const eventStartTimestamp = `<t:${Math.floor(event.start_time / 1000)}:t>`;

    try {
        await channel.send({
            content: `${roleMention}### ⚠️ Event Has Not Been Started\nThe start time for the event **📆 ${event.name}** was ${eventStartTimestamp}. Start the event so everyone knows it's happening!`
        });
        console.log(`[Auto Timebank] Sent event status reminder for ${event.name}`);
    } catch (err) {
        console.error(`[Auto Timebank] Failed to send event status reminder for ${event.name}:`, err);
    }
}

// Start 60 second waiting period
function startAttendanceVerification(event, member) {
    console.log(`[Auto Timebank] Starting attendance verification for ${member.user.displayName} @ ${event.name}`);
    const key = getAttendanceKey(event.id, member.id, event.start_time);

    if (getPendingCheck(key)) {
        console.warn(`[Auto Timebank] Rejected duplicate pending check for ${member.user.displayName} @ ${event.name}`);
        return;
    }

    if (hasAttendanceTransaction(event.id, member.id, event.start_time)) {
        console.log(`[Auto Timebank] ${member.displayName} already has transaction for this event`);
        return;
    }

    const joinTime = Date.now();
    const timeout = setTimeout(async () => {
        try {
            await verifyAttendance(event.id, member.id, joinTime);
        } catch (err){
            console.error(`[Auto Timebank] Verification for ${member.user.displayName} Failed`)
        }
    //timeout duration in milliseconds
    }, 60_000);

    addPendingCheck(key, {timeout});
    return timeout;
}

// Run after 60 second waiting period
async function verifyAttendance(eventId, userId, joinTime = Date.now()) {
    const event = getEvent(eventId);
    if (!event) {
        console.error(`[Auto Timebank] Event ${eventId} missing for verification`)
        return;
    }

    const guild = discordClient.guilds.cache.get(event.guild_id);
    if (!guild) {
        console.error(`[Auto Timebank] Guild for ${event.name} missing for verification`)
        return;
    }

    const channel = guild.channels.cache.get(event.voice_channel_id);
    if (!channel?.isVoiceBased()) {
        console.error(`[Auto Timebank] Channel for ${event.name} missing for verification`);
        return;
    }
    const member = channel.members.get(userId);
    if (!member) {
        console.error(`[Auto Timebank] Member for ${userId} missing for verification`);
        return;
    }

    if (hasAttendanceTransaction(eventId, userId, event.start_time)) {
        console.warn(`[Auto Timebank] Rejected duplicate event transaction for ${member.user.displayName}`)
        return;
    }

    try  {
        const minutes = getEventTimebankAmount(event.start_time, joinTime);

        const transaction = newTransaction(userId, minutes, {
            id: event.id,
            name: event.name,
            start_time: event.start_time
        });

        const statement = getTransactionStatement(transaction, member);
        const channel = guild.channels.cache.get(event.voice_channel_id);

        await sendAutoStatement(transaction, statement, channel);
        console.log(`[Auto Timebank] Verified attendance for ${member.user.displayName}`);

    } finally {
        removePendingCheck(getAttendanceKey(eventId, userId, event.start_time));
    }
}


// Gets whether a user has received attendance, is waiting during a check period, or has no data associated with them
function getUserAttendanceState(eventId, userId, startTime = null) {
    if (hasAttendanceTransaction(eventId, userId, startTime)) {
        return 'verified';
    }   

    const key = getAttendanceKey(eventId, userId, startTime);

    if (getPendingCheck(key)) {
        return 'pending';
    }

    return 'none';
}

async function sendAutoStatement(transaction, statement, channel) {
    try {
        const revertButton = new ButtonBuilder()
            .setCustomId(`timebank:revert:${transaction.id}`)
            .setLabel(`Revert Auto Transaction`)
            .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(revertButton);
        const message = await channel.send({embeds: [statement], components: [row]});
        
        setTimeout(async () => {
            try {
                await message.edit({
                    components: []
                });
            } catch (err) {
                console.error('[Auto Timebank] Failed to remove button row')
            }
        }, 12 * 60 * 60 * 1000);
        return;
    } catch (err){
        console.error('[Auto Timebank] ❌ Failed to send automatic statement in channel:', err);
    }
}

module.exports = {
    initializeTimebankEventScheduler,
    scheduleEvent,
    cancelEventSchedule,
    addAttendanceEvent,
    getUserAttendanceState,
    startAttendanceVerification,
    runLateAttendanceCheck,
    runEventStatusCheck,
    sendAutoStatement
}