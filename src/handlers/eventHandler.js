const path = require('path');
const getAllFiles = require('../utils/getAllFiles');

module.exports = (client) => {
    const events = getAllFiles(path.join(__dirname, '..', 'events'), true);

    for (const folder of events) {
        const eventName = folder.split('/').pop().replace(/\\/g, '/');
        const eventFunctions = getAllFiles(folder)
        .sort()
        .map(file => require(file));

        client.on(eventName, async (...args) => {
            for (const eventFunction of eventFunctions) {

                if (typeof eventFunction !== 'function') {
                    console.warn(`⚠️ Skipping ${eventName} – not a function`);
                    continue;
                }

                await eventFunction(client, ...args);
            }
        });
    }
};
