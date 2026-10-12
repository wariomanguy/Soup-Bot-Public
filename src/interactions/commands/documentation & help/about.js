const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const packageInfo = require('../../../../package.json');
const { ids = {} } = require('../../../../config.json');

module.exports = {
    // name: 'about',
    // description: 'Returns information about the server',

    // callback: async (client, interaction) => {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Returns information about the server'),
        
    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Calculate ping
            const reply = await interaction.fetchReply();
            const rawPing = reply.createdTimestamp - interaction.createdTimestamp;
            const userPing = isNaN(rawPing) ? 0 : rawPing;

            // Fetch all members + presences
            const members = await interaction.guild.members.fetch({ withPresences: true });

            // Split humans / bots
            const humans = members.filter(m => !m.user.bot);
            const bots = members.filter(m => m.user.bot);

            // Presence-safe filters
            const onlineHumans = humans.filter(m =>
                m.presence?.status && m.presence.status !== 'offline'
            );

            const offlineBots = bots.filter(m =>
                !m.presence || m.presence.status === 'offline'
            );

            // Get correct server description
            const customDescription = {
                [`${ids.servers.soup.guild}`]: `A friend group Discord server populated with strange people.\n` +
                    `It also boasts a number of unique features and bot commands. You can use the </help:1445705064390987937> command to learn more about them.`,
                [`${ids.servers.vinland.guild}`]: `A smaller friend server designed to recreate the feel of older Soup.`
            };

            const serverDescription = customDescription[interaction.guild.id] || interaction.guild.description || '';

            // Formatting values
            const serverPicture = interaction.guild.iconURL({ dynamic: true, size: 1024 });
            const displayName = interaction.member.nickname || interaction.user.displayName;

            const dateFormat = { year: 'numeric', month: 'long', day: 'numeric' };
            const serverCreationDate = interaction.guild.createdAt.toLocaleDateString(undefined, dateFormat);
            
            //Create Fields for Embed
            const fields = [
                {
                    name: '📆 Created',
                    value: serverCreationDate,
                    inline: true,
                },
                {
                    name: `👥 ${humans.size} Members`,
                    value: `Online: ${onlineHumans.size}`,
                    inline: true,
                },
                {
                    name: `🤖 ${bots.size} Bots`,
                    value: `Down: ${offlineBots.size}`,
                    inline: true,
                }
            ];

            switch (interaction.guild.id) {
                case ids.servers.soup.guild:
                    console.log('Matched SOUP ID');
                    fields.push(                    
                        {
                            name: `Server Version`,
                            value: packageInfo.soup_version,
                            inline: false,
                        }
                    );
                    break;
                case ids.servers.vinland.guild:
                    console.log('Matched VINLAND ID');
                    fields.push(                    
                        {
                            name: `Server Version`,
                            value: packageInfo.vinland_version,
                            inline: false,
                        }
                    );
                    break;
                default:
                    console.log(`Unmatched Server ID: ${interaction.guild.id}`);
                    break;
            };
            
            fields.push(                    
                {
                    name: `Bot Version`,
                    value: packageInfo.version,
                    inline: false,
                }
            );

            // Embed
            const embed = new EmbedBuilder()
                .setColor([180, 180, 208])
                .setTitle(`About ${interaction.guild.name}`)
                .setThumbnail(serverPicture)
                .addFields(fields)
                .setFooter({
                    text: `${displayName}'s Ping: ${userPing}ms  •  Bot Ping: ${interaction.client.ws.ping}ms`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

                if (serverDescription) {
                    embed.setDescription(serverDescription);
                }

            interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in /about command:', error);
            interaction.editReply('There was an error while fetching server information.');
        }
    }
};