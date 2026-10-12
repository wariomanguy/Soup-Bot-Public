
// require('dotenv').config();
// const {Client, IntentsBitField, EmbedBuilder, User, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');

// const client = new Client({
//     intents: [
//         IntentsBitField.Flags.Guilds,
//         IntentsBitField.Flags.GuildMembers,
//         IntentsBitField.Flags.GuildMessages,
//         IntentsBitField.Flags.MessageContent,
//     ],
// });

// //Apparently 'c' means client in this? Not really sure how it works if you're confused look it up, probably
// client.on('ready', async (c) => {
//     try {
//          const channel = await client.channels.cache.get('1231709249042907218');
         
//          if (!channel) return;
//          const row = new ActionRowBuilder();
//          roles.forEach((role) => {
//             row.components.push(
//                 new ButtonBuilder()
//                     .setCustomId(role.id)
//                     .setLabel(role.label)
//                     .setStyle(ButtonStyle.Primary)
//             )
//          })

//          await channel.send({
//             content: '# Aura Customization\nSet the color that you want your name to appear as from the color options listed below.',
//             components: [row],
//          });
//          process.exit();
//     } catch (error) {
//         console.log(error);
//     }
// });

// client.login(process.env.TOKEN);