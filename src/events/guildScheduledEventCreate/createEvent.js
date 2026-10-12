const { createEvent, eventExists, getEvent } = require('../../utils/eventTools');
const { scheduleEvent } = require('../../utils/autoTimebankTools');

// Indexes Soup Events when created

module.exports = async (client, guildScheduledEvent) => {
    try {
        if (eventExists(guildScheduledEvent.id)) {
            console.warn(`Event "${guildScheduledEvent.name}" already indexed`);
            return;
        }

        await createEvent(guildScheduledEvent);
        console.log(`Indexed event "${guildScheduledEvent.name}" (ID: ${guildScheduledEvent.id})`);

        //Auto Timebank check scheduling
        event = getEvent(guildScheduledEvent.id)
        if (event.type !== 'external') {
            scheduleEvent(event);
        }
    } catch (err) {
        console.error(`Failed to index event "${guildScheduledEvent.name}":`, err);
    }
}