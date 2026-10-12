const { removeInterestedMember, eventExists, getEvent, createEvent, allInterestedMembersPresent } = require('../../utils/eventTools');
const { getEventTimebankAmount, newTransaction, hasAttendanceTransaction, getTransactionStatement } = require('../../utils/timebankTools');
const { sendAutoStatement } = require('../../utils/autoTimebankTools');
const { ids = {} } = require('../../../config.json');
const { getVoiceRoleForChannel } = require('../../utils/voiceRoleManager');

module.exports = async (client, guildScheduledEvent, user) => {
    try {
        if (!eventExists(guildScheduledEvent.id)) {
            console.warn(`User no longer interested in an unindexed event: "${guildScheduledEvent.name}". Indexing...`);
            await createEvent(guildScheduledEvent);
            return;
        }

        // remove member from interested and get remaining members
        removeInterestedMember(guildScheduledEvent.id, user.id);
        console.log(`${user.displayName} no longer marked as interested in "${guildScheduledEvent.name}"`);

        const event = getEvent(guildScheduledEvent.id);
        const guild = guildScheduledEvent.guild;
        let channelId = event.voice_channel_id;

        //In person event (this may or may not ever even matter—not sure you can mark uninterested after it starts)
        if (!channelId) {
            switch (guild.id) {
                case ids.servers.soup.guild:
                    console.log('Matched SOUP ID');
                    channelId = ids.servers.soup.quickfire;
                    break;
                case ids.servers.vinland.guild:
                    console.log('Matched VINLAND ID');
                    channelId = ids.servers.vinland.bot_messages;
                    break;
                default:
                    console.log(`Unmatched Server ID: ${guild.id}. Defaulting to Soup.`);
                    channelId = ids.servers.soup.quickfire;
            };
        }
        const channel = client.channels.cache.get(channelId);
    
        //Nail people who try to mark uninterested after an event starts
        if (event.start_time <= Date.now() && !hasAttendanceTransaction(event.id, user.id, event.start_time)) {
            const minutes = getEventTimebankAmount(event.start_time);
            const transaction = newTransaction(user.id, minutes, {
                id: event.id,
                name: event.name,
                start_time: event.start_time
            });

            try {
                const member = await guild.members.fetch(transaction.userId);

                const statement = getTransactionStatement(transaction, member);
                await sendAutoStatement(transaction, statement, channel);
                console.log(`[Auto Timebank] Applied late penalty to user ${transaction.userId}`);

            } catch (err) {
                console.error(`Failed to send late penalty statement for ${transaction.userId}`);
            }

            // Checks if event time passed but event hasn't started
            if (event.status === 'scheduled' && event.type !== 'external') {
                if (allInterestedMembersPresent(event, channel)) {
                    //ping voice role if it exists
                    const voiceRoleId = getVoiceRoleForChannel(channelId);
                    const roleMention = voiceRoleId ? `-# <@&${voiceRoleId}>\n` : '';

                    //message
                    await channel.send({
                        content: `${roleMention}### 👥 All Event Members Present\nSomeone just marked themselves as uninterested in **📆 ${event.name}**. All interested members are now in <#${channelId}>—it's time to start the event!`
                    });
                }
            }
        }
    } catch (err) {
        console.error(`Failed to remove user as interested from "${guildScheduledEvent.name}"`, err);
    }
}