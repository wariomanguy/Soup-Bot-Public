// Active events that are currently accepting Timebank attendance
const activeEvents = new Map();

/*
eventId => {
    eventId,
    guildId,
    name,
    channelId,
    startsAt,
    endsAt
}
*/


// Users who are currently waiting to be checked (staying in call for 60 seconds)
const pendingAttendance = new Map();

/*
eventId:userId => {
    eventId,
    userId,
    channelId,
    joinedAt,
    timeout
}
*/


module.exports = {
    // 📆 EVENT FUNCTIONS:

    // add new event with ID and name
    addAttendanceEvent(event) {
        activeEvents.set(event.eventId, event);
        //console.log(activeEvents);
    },

    //remove by event ID
    removeAttendanceEvent(eventId) {
        activeEvents.delete(eventId);
       //console.log(activeEvents);
    },

    //get event by its ID
    getAttendanceEvent(eventId) {
        return activeEvents.get(eventId);
    },

    //get event based on the vc channel it takes place in
    getAttendanceEventByChannel(channelId) {
        //console.log(activeEvents);
        for (const event of activeEvents.values()) {
            if (event.channelId === channelId) {
                return event;
            }
        }

        return null;
    },

    // 📋 ATTENDANCE FUNCTIONS

    //Get user pending check by its key. Format is [eventId]:[startTime]:[userId] when startTime provided
    getAttendanceKey(eventId, userId, startTime = null) {
        if (startTime != null) {
            return `${eventId}:${startTime}:${userId}`;
        }
        return `${eventId}:${userId}`;
    },

    // Add new attendance check item for a user & event
    addPendingCheck(key, data) {
        pendingAttendance.set(key, data);
    },

    //Get check by key. Format is [eventId]:[userId]
    getPendingCheck(key) {
        return pendingAttendance.get(key);
    },

    //Remove by key. Format is [eventId]:[userId]
    removePendingCheck(key) {
        const pending = pendingAttendance.get(key);

        //cancel timeout
        if (pending?.timeout) {
            clearTimeout(pending.timeout);
        }

        //delete item
        pendingAttendance.delete(key);
    }
};