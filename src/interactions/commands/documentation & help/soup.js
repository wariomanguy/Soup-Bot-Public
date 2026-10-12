const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const themes = JSON.parse(fs.readFileSync(path.join('src/assets/server_themes/themes.json'), 'utf8'));

function RandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

module.exports = {
    register: 'guild',
    guildGroup: 'soup',

    data: new SlashCommandBuilder()
        .setName('soup')
        .setDescription('Get information about past and present Soup server themes')
        .addStringOption(option =>
            option.setName('theme')
                .setDescription('Search or select a Soup theme')
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        // Add special options first
        const choices = [
            { name: "Current Theme", value: "-2" },
            { name: "Random Theme", value: "-1" },
            ...themes.map((theme, index) => ({
                name: `${theme.name} (${theme.start_date || 'Unknown'})`,
                value: index.toString()
            }))
        ];

        // Filter based on user input (Discord returns max 25 results dynamically)
        const filtered = choices
            .filter(choice => choice.name.toLowerCase().includes(focusedValue))
            .slice(0, 25);

        await interaction.respond(filtered);
    },

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const themeInput = interaction.options.getString('theme');
            let index = themeInput !== null ? parseInt(themeInput, 10) : -1;

            switch (index) {
                case -2:
                    index = themes.length - 1;
                    break;
                case -1:
                    index = RandomInt(0, themes.length - 1);
                    break;
                default: break;
            }

            if (isNaN(index) || index < 0 || index >= themes.length) {
                await interaction.editReply("Invalid theme selected.");
                return;
            }

            const theme = themes[index];
            let message = `# ${theme.name}`;
            
            if (theme.end_date == null) {
                message += `\nCurrent theme as of ${theme.start_date}`;
            } else {
                message += `\n${theme.start_date} – ${theme.end_date}`;
            }

            if (theme.contest !== null) {
                message += `\n\n🏆 **${theme.contest} Winner** • `;
            }

            if (theme.credit !== null) {
                if (theme.contest == null) {
                    message += `\n*${theme.credit}*`;
                } else {
                    message += `*${theme.credit}*`;
                }
            }

            if (theme.description !== null) {
                message += `\n\n-# *${theme.description}*`;
            }

            const filePath = path.join('src/assets/server_themes', theme.filename);
            
            if (theme.url) {
                await interaction.editReply({ content: `${message}\n\n${theme.url}`});
            } else {
                await interaction.editReply({ content: message, files: [filePath] });
            }
        } catch (error) {
            console.error("Error handling interaction:", error);
            await interaction.editReply({
                content: '❌ Something went wrong displaying this Soup theme. Please try again later.'
            });
        }
    }
};

// const { MessageFlags, SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');
// const fs = require('fs');
// const path = require('path');

// // Load themes from the JSON file
// const themes = JSON.parse(fs.readFileSync(path.join('src/assets/server_themes/themes.json'), 'utf8'));

// function RandomInt(min, max) {
//     const minCeiled = Math.ceil(min);
//     const maxFloored = Math.floor(max);
//     return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
// }

// module.exports = {
//     register: 'guild',
//     guildGroup: 'soup',

//     data: new SlashCommandBuilder()
//         .setName('soup')
//         .setDescription('Get information about past and present Soup server themes')
//         .addNumberOption(option =>
//         option.setName('other')
//             .setDescription('Other options for getting a soup theme')
//             .addChoices(
//                 { name: "current", value: -2 },
//                 { name: "random", value: -1 },
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2020')
//             .setDescription('Soup themes from 2020')
//             .addChoices(
//                 { name: "Where's the Soup?!", value: 0 },
//                 { name: "Hwere's the Soup?!", value: 1 },
//                 { name: "Christmas Soup", value: 2 }
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2021')
//             .setDescription('Soup themes from 2021')
//             .addChoices(
//                 { name: "Minecraft Soup", value: 3 },
//                 { name: "Anime Soup", value: 4 },
//                 { name: "Spooky Soup", value: 5 },
//                 { name: "Thankful Soup", value: 6 },
//                 { name: "Santa's Soup", value: 7 },
//                 { name: "❌ Not Soup 🚫", value: 8 },
//                 { name: "Christmas Soup", value: 9 },
//                 { name: "New Year's Soup", value: 10 }
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2022')
//             .setDescription('Soup themes from 2022')
//             .addChoices(
//                 { name: "New Year's Soup", value: 10 },
//                 { name: "Big Soup", value: 11 },
//                 { name: "Poptart Soup", value: 12 },
//                 { name: "The Soup Dimension", value: 13 },
//                 { name: "Summer Soup (Part I)", value: 14 },
//                 { name: "Summer Soup (Part II)", value: 15 },
//                 { name: "Spooky Soup", value: 16 },
//                 { name: "Impostor Soup", value: 17 },
//                 { name: "Winterfest Soup", value: 18 }
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2023')
//             .setDescription('Soup themes from 2023')
//             .addChoices(
//                 { name: "New Year's Soup", value: 19 },
//                 { name: "Romantic Soup", value: 20 },
//                 { name: "Irish Stew", value: 21 },
//                 { name: "soap", value: 22 },
//                 { name: "gloob", value: 23 },
//                 { name: "Late Late Soup!", value: 24 },
//                 { name: "Pumpkin Soup", value: 25 },
//                 { name: "Turkey Soup", value: 26 },
//                 { name: "Christmas Soup", value: 27 }
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2024')
//             .setDescription('Soup themes from 2024')
//             .addChoices(
//                 { name: "New Year's Soup", value: 28 },
//                 { name: "Missing Soup", value: 29 },
//                 { name: "dnoS ƃuᴉssᴉW", value: 30 },
//                 { name: "Soupiter", value: 31 },
//                 { name: "I'm at Soup", value: 32 },
//                 { name: "Witches' Soup", value: 33 },
//                 { name: "Electoral Soup", value: 34 },
//                 { name: "Peppermint Soup", value: 35 }
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2025')
//             .setDescription('Soup themes from 2025')
//             .addChoices(
//                 { name: "New Year's Soup", value: 36 },
//                 { name: "Higher Dimensional Soup", value: 37 },
//                 { name: "the original Soupwalker", value: 38 },
//                 { name: "Soup or Treat!", value: 39 },
//                 { name: "Bob Broth", value: 40 },
//                 { name: "Santa's Soup", value: 41 },
//             )
//     )
//     .addNumberOption(option =>
//         option.setName('2026')
//             .setDescription('Soup themes from 2026')
//             .addChoices(
//                 { name: "New Year's Soup", value: 42 },
//                 { name: "Twice the Soup!", value: 43 },
//                 { name: "Soup, Japan", value: 44 },
//                 { name: "Soupy, Scary...", value: 45 }
//             )
//     ),

//     async execute(interaction) {
//         await interaction.deferReply();
//         try {
//             const themeOther = interaction.options.getNumber('other') ?? null;
//             const theme2020 = interaction.options.getNumber('2020') ?? null;
//             const theme2021 = interaction.options.getNumber('2021') ?? null;
//             const theme2022 = interaction.options.getNumber('2022') ?? null;
//             const theme2023 = interaction.options.getNumber('2023') ?? null;
//             const theme2024 = interaction.options.getNumber('2024') ?? null;
//             const theme2025 = interaction.options.getNumber('2025') ?? null;
//             const theme2026 = interaction.options.getNumber('2026') ?? null;
            
//             let argsCounter = 0;

//             if (themeOther !== null) argsCounter++;
//             if (theme2020 !== null) argsCounter++;
//             if (theme2021 !== null) argsCounter++;
//             if (theme2022 !== null) argsCounter++;
//             if (theme2023 !== null) argsCounter++;
//             if (theme2024 !== null) argsCounter++;
//             if (theme2025 !== null) argsCounter++;
//             if (theme2026 !== null) argsCounter++;

//             let index = theme2020 ?? theme2021 ?? theme2022 ?? theme2023 ?? theme2024 ?? theme2025 ?? theme2026 ?? themeOther;

//             if (argsCounter == 0) {
//                 index = -1;
//             } else if (argsCounter > 1) {
//                 await interaction.reply({
//                     content: '❌ Please only request one soup theme at a time',
//                     flags: MessageFlags.Ephemeral
//                 });
//                 return;
//             }

//             // Handles "current" and "random" arguments
//             switch (index) {
//                 case -2:
//                     index = themes.length-1;
//                     break;
//                 case -1:
//                     index = RandomInt(0, themes.length - 1);
//                     break;
//                 default: break;
//             }


//             if (index >= themes.length) {
//                 await interaction.reply("Invalid theme selected.");
//                 return;
//             }

//             const theme = themes[index];

//             let message = `# ${theme.name}`;
            
//             if (theme.end_date == null) {
//                 message += `\nCurrent theme as of ${theme.start_date}`;
//             } else {
//                 message += `\n${theme.start_date} – ${theme.end_date}`;
//             }

//             if (theme.contest !== null) {
//                 message += `\n\n🏆 **${theme.contest} Winner** • `;
//             }

//             if (theme.credit !== null) {
//                 if (theme.contest == null) {
//                     message += `\n*${theme.credit}*`;
//                 } else {
//                     message += `*${theme.credit}*`;
//                 }
//             }

//             if (theme.description !== null) {
//                 message += `\n\n-# *${theme.description}*`;
//             }

//             const filePath = path.join('src/assets/server_themes', theme.filename);
            
//             if (theme.url) {
//                 await interaction.editReply({ content: `${message}\n\n${theme.url}`});
//             } else {
//                 await interaction.editReply({ content: message, files: [filePath] });
//             }
//         } catch (error) {
//             console.error("Error handling interaction:", error);
//             await interaction.editReply({
//                 content: '❌ Something went wrong displaying this Soup theme. Please try again later.',
//                 flags: MessageFlags.Ephemeral
//             });
//         }
//     }
// };