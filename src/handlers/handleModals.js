// handleModals.js
const { MessageFlags } = require('discord.js');
const { getCommandByPrefix } = require('../utils/getLocalCommands');

module.exports = async (client, interaction) => {
    const prefix = interaction.customId.split(':')[0];

    const commandObject = getCommandByPrefix(prefix);

    if (!commandObject?.handleModal) {
        return;
    }

    try {
        await commandObject.handleModal(interaction, client);
    } catch (err) {
        console.error(`[Modals] Error handling ${interaction.customId}:`, err);

        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({
                content: '❌ Something went wrong with your form submission.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        } else {
            interaction.followUp({
                content: '❌ An error occurred after your form was submitted.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }
};
