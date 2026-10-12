const { updateEvent, createEvent, eventExists, getEvent } = require('../../utils/eventTools');
const { scheduleEvent, cancelEventSchedule, runLateAttendanceCheck } = require('../../utils/autoTimebankTools');
const { getVoiceRoleForChannel } = require('../../utils/voiceRoleManager');
const { GuildScheduledEventStatus } = require('discord.js');

module.exports = async (clientInformation, oldGuildScheduledEvent, newGuildScheduledEvent) => {
    try {
        const oldEvent = oldGuildScheduledEvent;
        const newEvent = newGuildScheduledEvent;
        let event;

        //Create event instead if it's missing
        if (!eventExists(newEvent.id)) {
            console.warn(`"${newEvent.id}" is missing. Indexing...`);

            event = await createEvent(newEvent);
            console.log(`Indexed "${newEvent.name}" (${newEvent.id})`);
            
            return;
        } else {
            const result = updateEvent(newEvent); //make async if you want to refresh members (you'll need to change fn too)
            event = result?.event ?? null;
            const revertedIds = result?.revertedIds ?? [];
            console.log(`Updated event "${newEvent.name}" (${newEvent.id})`);

            // If updateEvent reverted any transactions for a reschedule, notify the server
            try {
                if (revertedIds?.length) {
                    const cancelledTransactions = revertedIds.length;
                    const transactionPlural = cancelledTransactions === 1 ? 'Transaction' : 'Transactions';

                    const guild = clientInformation.guilds.cache.get(event.guild_id);
                    if (!guild) {
                        console.warn(`[updateEvent] Didn't find server ${event.guild_id} to notify about reverted transactions.`);
                    } else {
                        const channel = guild.channels.cache.get(event.voice_channel_id) || (guild.systemChannel ? guild.channels.cache.get(guild.systemChannel.id) : null);
                        const voiceRoleId = getVoiceRoleForChannel(event.voice_channel_id);
                        const roleMention = voiceRoleId ? `-# <@&${voiceRoleId}>\n` : '';

                        if (channel?.send) {
                            try {
                                await channel.send(`${roleMention}### ↩️ ${cancelledTransactions} ${transactionPlural} Reverted\nReverted transactions associated with the rescheduled event 📆 **${event.name}**.`);
                            } catch (err) {
                                console.warn("[updateEvent] Failed to send reschedule revert notification to channel.", err);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[updateEvent] Error while notifying about reverted transactions:', err);
            }
        }
        


        // If event ended early
        if (oldEvent.status !== GuildScheduledEventStatus.Completed &&
            newEvent.status === GuildScheduledEventStatus.Completed
        ) {
            runLateAttendanceCheck(event.id);
            cancelEventSchedule(event.id);
            return;
        }

        cancelEventSchedule(event.id);

        if (newEvent.type !== 'external') {
            scheduleEvent(event);
        }
    } catch (err) {
        console.error(`Failed to update event "${newEvent.name}":`, err);
    }
}