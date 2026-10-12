//handleButtons.js
const { MessageFlags } = require('discord.js');
const { getCommandByPrefix } = require('../utils/getLocalCommands');

module.exports = async (client, interaction) => {
    const prefix = interaction.customId.split(':')[0];

    const commandObject = getCommandByPrefix(prefix);

    try {
        if (!commandObject?.handleButton) {
            //If you're getting this, make sure the command has an interactionPrefix
            //inside its exports (preferably at the top)
            throw new Error('No button handler found for this command prefix');
        }
        await commandObject.handleButton(interaction, client);
    } catch (err) {
        console.error(`[Buttons] Error handling ${interaction.customId}:`, err);

        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({
                content: '❌ Something went wrong with that button.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        } else {
            interaction.followUp({
                content: '❌ Something went wrong after you pressed that button.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }

};