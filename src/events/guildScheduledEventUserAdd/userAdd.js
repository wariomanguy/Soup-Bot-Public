const { addInterestedMember, eventExists, createEvent, getEvent } = require('../../utils/eventTools');
const { getAttendanceEvent } = require('../../utils/attendanceManager');
const { startAttendanceVerification } = require('../../utils/autoTimebankTools');

module.exports = async (client, guildScheduledEvent, user) => {
    try {
        if (!eventExists(guildScheduledEvent.id)) {
            //Creating event will add interested member on its own
            console.warn(`User marked interested in unindexed event. Indexing "${guildScheduledEvent.name}"...`);
            await createEvent(guildScheduledEvent);
            console.log(`Indexed "${guildScheduledEvent.name}" with new interested member.`);
        } else {
            addInterestedMember(guildScheduledEvent.id, user.id);
            console.log(`${user.displayName} marked interested in "${guildScheduledEvent.name}"`);
        }

        //Check if user should now start an attendance verification check
        const event = getEvent(guildScheduledEvent.id);
        if (!event) {
            console.warn(`[Auto Timebank] Missing indexed event after interest update for ${guildScheduledEvent.id}`);
            return;
        }

        const attendanceEvent = getAttendanceEvent(event.id);
        if (!attendanceEvent) {
            return;
        }

        if (event.type !== 'voice') {
            return;
        }

        if (Date.now() >= event.start_time) {
            return;
        }

        const guild = client.guilds.cache.get(event.guild_id);
        if (!guild) {
            return;
        }

        const channelId = attendanceEvent.channelId || event.voice_channel_id || guildScheduledEvent.channelId;
        if (!channelId) {
            return;
        }

        const voiceChannel = guild.channels.cache.get(channelId);
        if (!voiceChannel?.isVoiceBased()) {
            return;
        }

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member || !voiceChannel.members.has(member.id)) {
            return;
        }

        startAttendanceVerification(event, member);
        console.log(`[Auto Timebank] Started early attendance verification for ${member.displayName} in "${event.name}"`);
    } catch (err) {
        console.error(`Failed to add user as interested for "${guildScheduledEvent.name}"`, err);
    }
}