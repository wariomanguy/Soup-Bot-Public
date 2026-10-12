// handleSelectMenus.js
const { MessageFlags } = require('discord.js');
const { getCommandByPrefix } = require('../utils/getLocalCommands');

module.exports = async (client, interaction) => {
    const prefix = interaction.customId.split(':')[0];

    const commandObject = getCommandByPrefix(prefix);

    if (!commandObject?.handleSelectMenu) {
        return;
    }

    try {
        await commandObject.handleSelectMenu(interaction, client);
    } catch (err) {
        console.error(`[Select Menus] Error handling ${interaction.customId}:`, err);

        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({
                content: '❌ Something went wrong with the select menu.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        } else {
            interaction.followUp({
                content: '❌ An error occurred after you made your selection.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }
};
