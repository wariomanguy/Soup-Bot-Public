const { MessageFlags } = require('discord.js');
const handleCommands = require('../../handlers/handleCommands');
const handleAutocomplete = require('../../handlers/handleAutocomplete');
const handleButtons = require('../../handlers/handleButtons');
const handleSelectMenus = require('../../handlers/handleSelectMenus');
const handleModals = require('../../handlers/handleModals');

// This file determines what kind of interaction the bot has received and passes the interaction to the relevant handler file.

//TO DO: In the future, handleCommands(), handleButtons(), etc. should stop passing the "client" since it's accessible with any interaction
//via interaction.client. A few commands will need to have code changes to support this optimization.

module.exports = async (client, interaction) => {
    try {
        if (interaction.isAutocomplete()) {
            return handleAutocomplete(client, interaction);
        }

        if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
            return handleCommands(client, interaction);
        }

        if (interaction.isButton()) {
            return handleButtons(client, interaction);
        }

        if (interaction.isStringSelectMenu()) {
            return handleSelectMenus(client, interaction);
        }

        if (interaction.isModalSubmit()) {
            //console.log("Routing to modal handler");
            return handleModals(client, interaction);
        }
    } catch (err) {
        console.error('Interaction Error:', err);

        if (!interaction.replied) {
            interaction.reply({
                content: 'Something went wrong handling your interaction.',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};
