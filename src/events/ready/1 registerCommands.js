const differentiateCommands = require('../../utils/differentiateCommands');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const { getLocalCommands }  = require('../../utils/getLocalCommands');
const fs = require('fs').promises;
const path = require('path');
const { guildGroups = {} } = require('../../../config.json');

const normalizeGuildIds = (guilds) => {
    if (!Array.isArray(guilds)) return [];
    return guilds.filter(guildId => typeof guildId === 'string' && guildId.length > 0);
};

const resolveGuildGroup = (groupPath) => {
    if (!groupPath || typeof groupPath !== 'string') return [];

    const keys = groupPath.split('.').filter(Boolean);
    let node = guildGroups;

    for (const key of keys) {
        if (!node || typeof node !== 'object') return [];
        node = node[key];
    }

    return normalizeGuildIds(node);
};

const getCommandTargets = (name, localCommand) => {
    const explicitRegister = typeof localCommand.register === 'string'
        ? localCommand.register.toLowerCase()
        : null;

    const explicitGuilds = normalizeGuildIds(localCommand.guilds);
    const groupGuilds = resolveGuildGroup(localCommand.guildGroup);
    const guildIds = [...new Set([...explicitGuilds, ...groupGuilds])];

    const wantsGlobal = explicitRegister === 'global' || explicitRegister === 'both' ||
        (explicitRegister === null && guildIds.length === 0);
    const wantsGuild = explicitRegister === 'guild' || explicitRegister === 'both' ||
        (explicitRegister === null && guildIds.length > 0);

    return {
        global: wantsGlobal,
        guilds: wantsGuild ? guildIds : []
    };
};

const syncCommand = async (applicationCommands, cmdJSON, targetLabel) => {
    const existingCommand = applicationCommands.cache.find(
        (cmd) => cmd.name === cmdJSON.name
    );

    if (!existingCommand) {
        const newCommand = await applicationCommands.create(cmdJSON);
        console.log(`✨ Registered new command: ${cmdJSON.name} (${targetLabel})`);
        return newCommand;
    }

    if (differentiateCommands(existingCommand, cmdJSON)) {
        const updatedCommand =await applicationCommands.edit(existingCommand.id, cmdJSON);
        console.log(`🔄 Updated command: ${cmdJSON.name} (${targetLabel})`);
        return updatedCommand.id;
    } else {
        //console.log(`✓ No changes for ${cmdJSON.name} (${targetLabel})`);
        return existingCommand.id;
    }
};

const deleteCommandIfExists = async (applicationCommands, name, targetLabel) => {
    const existingCommand = applicationCommands.cache.find(
        (cmd) => cmd.name === name
    );

    if (!existingCommand) {
        console.log(`🛑 Skipped ${name} (hidden) on ${targetLabel}`);
        return;
    }

    await applicationCommands.delete(existingCommand.id);
    console.log(`🫥 Hid (deleted) ${name} on ${targetLabel}`);
};

module.exports = async (client) => {
    console.log("[Commands] Registering commands...");

    const commandIds = {}; // Map of command names and their coorsponding IDs

    try {
        const localCommands = getLocalCommands();
        const globalCommands = await getApplicationCommands(client);
        const guildCommandManagers = new Map();

        const getGuildCommands = async (guildId) => {
            if (!guildCommandManagers.has(guildId)) {
                guildCommandManagers.set(guildId, await getApplicationCommands(client, guildId));
            }
            return guildCommandManagers.get(guildId);
        };

        for (const localCommand of localCommands) {
            if (!localCommand.data) {
                console.warn(`⚠ Local command is missing "data":`, localCommand);
                continue;
            }

            const cmdJSON = localCommand.data.toJSON();
            const { name } = cmdJSON;

            if (!name || typeof name !== 'string') {
                console.error(`❌ Command has invalid or missing name:`, localCommand);
                continue;
            }

            const targets = getCommandTargets(name, localCommand);
            const existingGlobalCommand = globalCommands.cache.find((cmd) => cmd.name === name);

            if (!targets.global && existingGlobalCommand) {
                await deleteCommandIfExists(globalCommands, name, 'global');
            }

            if (localCommand.hidden) {
                for (const guildId of targets.guilds) {
                    const guildCommands = await getGuildCommands(guildId);
                    await deleteCommandIfExists(guildCommands, name, `guild ${guildId}`);
                }

                continue;
            }

            if (targets.global) {
                const commandId =await syncCommand(globalCommands, cmdJSON, 'global');
                if (commandId) commandIds[name] = commandId;
            }

            for (const guildId of targets.guilds) {
                if (!guildId) continue;
                const guildCommands = await getGuildCommands(guildId);
                const commandId = await syncCommand(guildCommands, cmdJSON, `guild ${guildId}`);
                if (commandId) commandIds[name] = commandId;
            }

            if (!targets.global && targets.guilds.length === 0) {
                console.warn(`⚠ Command /${name} has no registration target; skipping.`);
            }
        }

        //Save command IDs map after registering commands
        await fs.writeFile(
            path.join(__dirname, '../../savedata/commandIds.json'),
            JSON.stringify(commandIds, null, 2)
        ).catch((err) => {
            console.error('❌ Failed to save command IDs:', err);
        });
        console.log('[Commands] ✓ Command registration complete. Updated saved Command IDs.');

    } catch (error) {
        console.error('[Commands] ❌ Error registering commands:', error);
    }
};
