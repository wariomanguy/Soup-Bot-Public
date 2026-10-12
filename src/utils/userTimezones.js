const fs = require('fs');
const path = require('path');
const filePath = path.join('src/savedata/', 'userPreferences.json');

function getUserTimezone(userID) {
    if (!fs.existsSync(filePath)) return null;
    const preferences = JSON.parse(fs.readFileSync(filePath));
    if (!preferences[userID]) {
        return null
    } else {
        return preferences[userID].timezone;
    }
}

function setUserTimezone(userID, selectedTZ) {
    let preferences = {};
    if (fs.existsSync(filePath)) {
        preferences = JSON.parse(fs.readFileSync(filePath));
    }

    preferences[userID] = { timezone: selectedTZ };
    fs.writeFileSync(filePath, JSON.stringify(preferences, null, 2));
}

module.exports = {getUserTimezone, setUserTimezone};