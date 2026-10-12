const { updateUserVoiceRoles }  = require('../../utils/voiceRoleManager');
const { ids = {} } = require('../../../config.json');

module.exports = async (client, oldState, newState) => {

    //Skip over events like deafens, muting, camera, streaming, etc.
    if ((oldState.channelId === newState.channelId) || (process.env.CLIENT_ID === ids.bots.dev)) {
        return;
    }
    
    await updateUserVoiceRoles(oldState, newState);
};