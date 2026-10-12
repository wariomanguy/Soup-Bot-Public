const { MessageFlags } = require('discord.js');
const { getCommandByName } = require('../utils/getLocalCommands');

module.exports = async (client, interaction) => {

    //console.log(`[Commands] Interaction type: ${interaction.type}`);
    //console.log(`[Commands] Command name: ${interaction.commandName}`);

    const commandObject = getCommandByName(interaction.commandName);

    //console.log("[Commands] Found commandObject:", commandObject ? "YES" : "NO");

    if (!commandObject) {
        return interaction.reply({
            content: "⚠️ Command not found locally. It may be outdated or missing.",
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        await commandObject.execute(interaction, client);
    } catch (err) {
        console.error(`[Commands] Error executing ${interaction.commandName}:`, err);

        // Don't crash — inform the user safely
        if (!interaction.replied) {
            interaction.reply({
                content: "❌ An error occurred while executing this command.",
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        } else {
            interaction.followUp({
                content: "❌ An error occurred after the command replied.",
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }
};