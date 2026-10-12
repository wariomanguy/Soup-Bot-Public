const { getAllEvents, createEvent, updateEvent, deleteEvent, readEventData, writeEventData } = require('../../utils/eventTools');
const { scheduleEvent, initializeTimebankEventScheduler } = require('../../utils/autoTimebankTools')

module.exports = async (client) => {
    try {
        console.log('[Events] Syncing events...');
        const storedEvents = getAllEvents();
        
        const liveEventIDs = new Set();
        for (const guild of client.guilds.cache.values()) {
            let scheduledEvents;

            // Get all scheduled events for a server
            try {
                scheduledEvents = await guild.scheduledEvents.fetch();
            } catch (error) {
                console.error(`[Events] Failed to get events for guild ${guild.id}`, error);
                continue;
            }

            // Check if event is already stored in events.json. Add if not, update if so.
            for (const [id, discordEvent] of scheduledEvents) {
                liveEventIDs.add(id);

                const exists = storedEvents[id];

                if (!exists) {
                    console.log(`[Events] Indexing missing event: ${discordEvent.name}`);
                    await createEvent(discordEvent);
                    continue;
                }

                console.log(`[Events] Updating event: ${discordEvent.name}`);
                updateEvent(discordEvent);
            }
        }

        // Remove deleted events
        // for (const storedId of Object.keys(storedEvents)) {
        //     if (!liveEventIDs.has(storedId)) {
        //         console.log(`[Events] Removing deleted event ${storedEvents[storedId].name}`);
        //         deleteEvent(storedId);
        //     }
        // }

        // Mark missing events as completed or deleted (based on scheduled start time)
        const data = readEventData();
        const now = Date.now();

        for (const storedId of Object.keys(data.events)) {
            if (liveEventIDs.has(storedId)) {
                continue;
            }

            if (storedEvents[storedId].status === 'completed') {
                continue;
            }

            const event = storedEvents[storedId];
            const eventEndTime = event.end_time
                ? event.end_time <= now
                : event.start_time <= now;

            if (eventEndTime <= now) {
                data.events[storedId].status = 'completed';
                writeEventData(data);
                console.log(`[Events] Marked missing past event "${storedEvents[storedId].name}" as completed`);
            } else {
                deleteEvent(storedId);
                console.log(`[Events] Deleted missing upcoming event "${storedEvents[storedId].name}"`);
            }
        }

        // Initialize Timebank Event Schedules now that list is updated
        initializeTimebankEventScheduler(client);
    } catch (error) {
        console.error('[Events] Startup event synchronization failed', error);
    }
}