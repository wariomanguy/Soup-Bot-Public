const { initializeMonthlyScheduler } = require('../../utils/timebankMonthlyScheduler');
//>TO DO: Fix monthly schedule system for new data format and update monthly statement
module.exports = (client) => {
    initializeMonthlyScheduler(client);
};
