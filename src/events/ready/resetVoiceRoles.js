const { resetVoiceRoles } = require('../../utils/voiceRoleManager');
const { ids = {} } = require('../../../config.json');

module.exports = (client) => {
    if (process.env.CLIENT_ID === ids.bots.primary) {
        resetVoiceRoles(client);
    }
}