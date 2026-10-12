const voiceRoleMap = {
    //SOUP
    '860688124475473940':'1452439611740651736', // #spoon: @spoon
    '931429826932387900':'1516926629954322432', // #bowl: @bowl
    '691130115924426757':'792063900241231912',  // #for shame: @for shame

    //VINLAND
    '1503598680303861873':'1516945349682528569' //#voice, @voice
}

const voiceRoles = [...new Set(Object.values(voiceRoleMap))]; //Allows possibility of one role for multiple channels

async function updateUserVoiceRoles(oldState, newState) {
    //The member who triggered voiceStateUpdate event
    const member = newState.member || oldState.member;
    const oldChannelId = oldState.channelId || null;
    const newChannelId = newState.channelId || null;

    //Remove any old vc channel roles
    if (oldChannelId && voiceRoleMap[oldChannelId]) {
        // NOT USED: more conservative system that only removes old role. Can't account for strange role buildups
        // const roleId = voiceRoleMap[oldChannelId];
        // if (member.roles.cache.has(roleId)) {
        //     await member.roles.remove(roleId);
        // }

        for (const roleId of voiceRoles) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        }
    }

    if (newChannelId && voiceRoleMap[newChannelId]) {
        const roleId = voiceRoleMap[newChannelId];

        if (!member.roles.cache.has(roleId)) {
            await member.roles.add(roleId);
        }
    }
}

async function resetVoiceRoles(client) {
    console.log('[Voice Roles] Updating all voice roles...');
    
    for (const guild of client.guilds.cache.values()) {
        try {

            // Clear all member voice roles
            for (const roleId of voiceRoles) {
                const role = guild.roles.cache.get(roleId);
                
                if (!role) {
                    continue; //skips to next loop iteration
                }

                for (const member of role.members.values()) {
                    await member.roles.remove(roleId);
                }
            }

            // Assign voice roles
            for (const [channelId, roleId] of Object.entries(voiceRoleMap)) {
                const channel = guild.channels.cache.get(channelId);

                if (!channel?.isVoiceBased()) {
                    continue;
                }

                for (const member of channel.members.values()) {
                    if (!member.roles.cache.has(roleId)) {
                        await member.roles.add(roleId);
                    }
                }
            }
            console.log(`[Voice Roles] ✓ Reset roles for ${guild.name}`);

        } catch (err) {
            console.error(`[Voice Roles] ✕ Failed to reset ${guild.name} voice roles:`, err)
        }
    }
}

function getVoiceRoleForChannel(channelId) {
    return voiceRoleMap[channelId] ?? null;
}

module.exports = {
    voiceRoleMap,
    updateUserVoiceRoles,
    resetVoiceRoles,
    getVoiceRoleForChannel
}