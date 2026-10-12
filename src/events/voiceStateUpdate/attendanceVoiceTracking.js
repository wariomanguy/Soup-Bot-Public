const { startAttendanceVerification, cancelEventSchedule } = require("../../utils/autoTimebankTools");
const { getAttendanceEventByChannel, getAttendanceKey, removePendingCheck } = require('../../utils/attendanceManager');
const { eventExists, getEvent, allInterestedMembersPresent, getInterestedMembers } = require('../../utils/eventTools');
const { hasAttendanceTransaction } = require("../../utils/timebankTools");
const { getVoiceRoleForChannel } = require('../../utils/voiceRoleManager');

module.exports = async (client, oldState, newState) => {

    //Skip over events like deafens, muting, camera, streaming, etc.
    if (oldState.channelId === newState.channelId) {
        return;
    }

    //The member who triggered voiceStateUpdate event
    const member = newState.member || oldState.member;

    // ⬅️ USERS LEAVING VC CHANNEL:

    //If user was in vc before the event...
    if (oldState.channelId) {
        console.log(`${member.displayName} left channel 🔊${oldState.channel.name}`);

        //...check if old channel has an active event
        const event = getAttendanceEventByChannel(oldState.channelId);

        //If it does, check for unfinished pending timer:
        if (event) {
                const key = getAttendanceKey(
                    event.eventId,
                    member.id,
                    // event stored in attendance registry should include start_time when added
                    event.start_time
                );

            //Stop pending timer and remove pending check
            removePendingCheck(key);
        }
    }

    // ➡️ USERS JOINING VC CHANNEL:

    //If user isn't joining a channel, we're done here
    if (!newState.channelId) {
        return;
    }

    //console.log(`${member.displayName} joined channel 🔊${newState.channel.name}`);

    //check if new vc channel has an active event
    const attendanceEvent = getAttendanceEventByChannel(newState.channelId);

    //If there's no event here, we're done
    if (!attendanceEvent) {
        return;
    }

    //Make sure user is marked as interested in event
    const interestedMembers = getInterestedMembers(attendanceEvent.eventId);
    if (!Array.isArray(interestedMembers) || !interestedMembers.includes(member.id)) {
        return;
    }

    //console.log('Interested member joined during eligible event window...');

    const event = getEvent(attendanceEvent.eventId);

    if (!event) {
        console.warn(`[Auto Timebank] Missing event: ${attendanceEvent.eventId}. Removing attendance checks for this event.`)
        cancelEventSchedule(attendanceEvent.eventId);
        return;
    }

    // Checks if event time passed but event hasn't started
    if (event.start_time < Date.now() && event.status === 'scheduled') {
        const channel = newState.channel;
        if (allInterestedMembersPresent(event, channel)) {
            //ping voice role if it exists
            const voiceRoleId = getVoiceRoleForChannel(newState.channelId);
            const roleMention = voiceRoleId ? `-# <@&${voiceRoleId}>\n` : '';

            //message
            await channel.send({
                content: `${roleMention}### 👥 All Event Members Present\nAll members who marked interested in **📆 ${event.name}** are in <#${newState.channelId}>. It's time to start the event!`
            });
        }
    }

    startAttendanceVerification(event, member);
};