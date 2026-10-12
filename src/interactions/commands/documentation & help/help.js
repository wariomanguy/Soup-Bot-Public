const { SlashCommandBuilder, ApplicationCommandType } = require('discord.js');
const fs = require('fs');
// const { data } = require('../documentation/about');
const { ids = {} } = require('../../../../config.json');
const processCommandMentions = require('../../../utils/processCommandMentions');
// >TO DO: make it so that choices are customized based on the server
module.exports = {
data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Provides help information for commands')
        .addStringOption(option =>
            option
                .setName('general')
                .setDescription('Help for general commands on the server')
                .setRequired(false)
                .addChoices(
                    { name: 'announcements', value: 'announcements' },
                    { name: 'about', value: 'about' },
                    { name: 'notes', value: 'community_notes' },
                    { name: 'soup', value: 'soup' },
                    { name: 'timebank', value: 'timebank' },
                    { name: 'timestamp', value: 'timestamp' }
                )
        ),
        
    execute: async (interaction) => {
        
        let help;
        if (interaction.options.getString('general')) {
            help = interaction.options.getString('general');
        } else {
            switch (interaction.guild.id) {
                case ids.servers.soup.guild:
                    help = 'help-soup';
                    break;
                case ids.servers.vinland.guild:
                    help = 'help-vinland';
                    break;
                default:
                    help = 'help';
                    break;
            };
        }

        const messageContent = fs.readFileSync(`src/assets/text_files/help/${help}.md`, 'utf8');
        const formattedContent = processCommandMentions(messageContent);

        await interaction.reply({content: formattedContent});
    }
}