const { deleteEvent, eventExists, getEvent } = require('../../utils/eventTools');
const { cancelEventSchedule } = require('../../utils/autoTimebankTools');
const { getTransactionsByEvent, revertTransaction, revertTransactionsForOccurrence } = require('../../utils/timebankTools');
const { getVoiceRoleForChannel } = require('../../utils/voiceRoleManager');

module.exports = async (client, guildScheduledEvent) => {
    try {
        if (!eventExists(guildScheduledEvent.id)) {
            console.warn(`Unindexed event was deleted: "${guildScheduledEvent.name}"`);
            return;
        }

        cancelEventSchedule(guildScheduledEvent.id); //Auto Timebank check scheduling
        
        //Revert transactions for the cancelled event (occurrence-aware)
        const deletedEvent = getEvent(guildScheduledEvent.id);

        if (!deletedEvent) {
            console.warn(`Deleted event ${guildScheduledEvent.id} missing, unable to revert transactions`);
        } else {
            try {
                let revertedIds = [];

                if (deletedEvent.start_time) {
                    // Revert only transactions tied to this specific occurrence
                    revertedIds = revertTransactionsForOccurrence(deletedEvent.id, deletedEvent.start_time) || [];
                } else {
                    // Fallback: revert any transactions tied to this event id (legacy)
                    const deletedEventTransactions = getTransactionsByEvent(deletedEvent.id);
                    for (const transaction of deletedEventTransactions) {
                        try {
                            if (!transaction.reverted) {
                                revertTransaction(transaction.id);
                                revertedIds.push(transaction.id);
                            }
                        } catch (err) {
                            console.error(`Failed to revert transaction ${transaction.id}`, err);
                        }
                    }
                }

                if (revertedIds.length) {
                    const cancelledTransactions = revertedIds.length;
                    const transactionPlural = cancelledTransactions === 1 ? 'Transaction' : 'Transactions';

                    const guild = client.guilds.cache.get(deletedEvent.guild_id);
                    if (!guild) {
                        console.warn(`[deleteEvent] Didn't find server ${deletedEvent.guild_id} for deleted event.`);
                    } else {
                        const channel = guild.channels.cache.get(deletedEvent.voice_channel_id) || (guild.systemChannel ? guild.channels.cache.get(guild.systemChannel.id) : null);
                        const voiceRoleId = getVoiceRoleForChannel(deletedEvent.voice_channel_id);
                        const roleMention = voiceRoleId ? `-# <@&${voiceRoleId}>\n` : '';

                        if (channel?.send) {
                            try {
                                await channel.send(`${roleMention}### ↩️ ${cancelledTransactions} ${transactionPlural} Reverted\nReverted transactions associated with the cancelled event 📆 **${deletedEvent.name}**.`);
                            } catch (err) {
                                console.warn("[deleteEvent] Failed to send deleted-event revert notification to channel.", err);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[deleteEvent] Error while reverting transactions for deleted event:', err);
            }
        }

        deleteEvent(guildScheduledEvent.id);
        console.log(`Deleted event "${guildScheduledEvent.name}" (${guildScheduledEvent.id}) from index`);
    } catch (err) {
        console.error(`Failed to remove event "${guildScheduledEvent.name}"`, err);
    }
}