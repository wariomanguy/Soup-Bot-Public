const { getCommandByName } = require('../utils/getLocalCommands');

module.exports = async (client, interaction) => {
    const commandObject = getCommandByName(interaction.commandName);

    if (!commandObject?.autocomplete) {
        return interaction.respond([]);
    }

    try {
        await commandObject.autocomplete(interaction, client);
    } catch (err) {
        console.error(`[Autocomplete] Error handling ${interaction.commandName}:`, err);

        if (!interaction.responded) {
            await interaction.respond([]).catch(() => {});
        }
    }
};