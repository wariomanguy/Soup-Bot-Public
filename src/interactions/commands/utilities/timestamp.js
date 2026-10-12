const { MessageFlags, SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment-timezone');
const fs = require('fs');
const { getUserTimezone, setUserTimezone } = require('../../../utils/userTimezones');
const { exec } = require('child_process');

module.exports = {
    interactionPrefix: 'timestamp',

    data: new SlashCommandBuilder()
        .setName('timestamp')
        .setDescription('generate a dynamic timestamp')
        .addIntegerOption(option =>
            option
                .setName('hours')
                .setDescription('Hours')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(23)
        )
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('Minutes')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(59)
        )
        .addBooleanOption(option =>
            option
                .setName('pm')
                .setDescription('Switches hour from AM to PM when set to true')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('month')
                .setDescription('Month')
                .setRequired(false)
                .addChoices(
                    { name: 'January', value: 0 },
                    { name: 'February', value: 1 },
                    { name: 'March', value: 2 },
                    { name: 'April', value: 3 },
                    { name: 'May', value: 4 },
                    { name: 'June', value: 5 },
                    { name: 'July', value: 6 },
                    { name: 'August', value: 7 },
                    { name: 'September', value: 8 },
                    { name: 'October', value: 9 },
                    { name: 'November', value: 10 },
                    { name: 'December', value: 11 },
                )
        )
        .addIntegerOption(option =>
            option
                .setName('date')
                .setDescription('Date')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(31)
        )
        .addIntegerOption(option =>
            option
                .setName('year')
                .setDescription('Year')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('timezone')
                .setDescription('Enter a time zone (default is CT)')
                .setRequired(false)
                .addChoices(
                    { name: 'Pago Pago (UTC -11)', value: 'Pacific/Pago Pago' },
                    { name: 'Honolulu (UTC -10)', value: 'Pacific/Honolulu' },
                    { name: 'Anchorage (UTC -8)', value: 'America/Anchorage' },
                    { name: 'Los Angeles (UTC -7)', value: 'America/Los_Angeles' },
                    { name: 'Denver (UTC -6)', value: 'America/Denver' },
                    { name: 'Columbia (UTC -5)', value: 'America/Bogota' },
                    { name: 'Baltimore/Pittsburgh (UTC -4)', value: 'America/New_York' },
                    { name: 'Rio de Janeiro (UTC -3)', value: 'America/Sao_Paulo' },
                    { name: 'Fernando de Noronha (UTC -2)', value: 'America/Noronha' },
                    { name: 'Nuuk (UTC -1)', value: 'America/Nuuk' },
                    { name: 'Reykjavik (UTC)', value: 'Atlantic/Reykjavik' },
                    { name: 'Limerick (UTC +1)', value: 'Europe/Dublin' },
                    { name: 'Barcelona/Bergen (UTC +2)', value: 'Europe/Oslo' },
                    { name: 'Gaza (UTC +3)', value: 'Asia/Gaza' },
                    { name: 'Dubai (UTC +4)', value: 'Asia/Dubai' },
                    { name: 'Ashgabat (UTC +5)', value: 'Asia/Ashgabat' },
                    { name: 'Omsk (UTC +6)', value: 'Asia/Omsk' },
                    { name: 'Bangkok (UTC +7)', value: 'Asia/Bangkok' },
                    { name: 'Singapore/Taipei (UTC +8)', value: 'Asia/Singapore' },
                    { name: 'Tokyo (UTC +9)', value: 'Asia/Tokyo' },
                    { name: 'Sydney (UTC +10)', value: 'Australia/Sydney' },
                    { name: 'Nouméa (UTC +11)', value: 'Pacific/Noumea' },
                    { name: 'Wellington (UTC +12)', value: 'Pacific/Auckland' },
                    { name: 'Apia (UTC +13)', value: 'Pacific/Apia' },
                    { name: 'Papeete (UTC +14)', value: 'Pacific/Kiritimati' },
                )
        ),


    async execute(interaction) {
            try {
                const userID = interaction.user.id;
                const now = moment();

                const userProvided = {
                    year: interaction.options.getInteger('year') !== null,
                    month: interaction.options.getInteger('month') !== null,
                    date: interaction.options.getInteger('date') !== null,
                    hours: interaction.options.getInteger('hours') !== null,
                    minutes: interaction.options.getInteger('minutes') !== null,
                    timezone: interaction.options.getString('timezone') !== null
                };

                const defaultTZ = getUserTimezone(userID) ?? 'America/Chicago';
                const tz = interaction.options.getString('timezone') ?? defaultTZ;

                let year = interaction.options.getInteger('year') ?? now.year();
                let month = interaction.options.getInteger('month') ?? now.month();
                let date = interaction.options.getInteger('date') ?? now.date();
                let hours = interaction.options.getInteger('hours') ?? now.hour();
                const minutes = interaction.options.getInteger('minutes') ?? now.minute();
                const isPM = interaction.options.getBoolean('pm') ?? false;

                if (isPM && hours < 12) hours += 12;

                let dateObj = moment.tz({ year, month, date, hour: hours, minute: minutes }, tz);

                if (!dateObj.isValid()) {
                    return interaction.reply({ content: '❌ Invalid date or time zone.', flags: MessageFlags.Ephemeral });
                }

                // Adjust to future if needed
                if (dateObj.isBefore(now)) {

                    // Case 1: User explicitly gave a past year → assume they meant that exact year
                    if (userProvided.year) {
                        // Do nothing – user intentionally asked for a past date
                    }
                    else if (userProvided.month && !userProvided.year) {
                        // User gave month/day but it was earlier this year → push to next year
                        dateObj.add(1, 'year');
                    }
                    else if (userProvided.date && !userProvided.month) {
                        // User gave a day that already passed this month → next month
                        dateObj.add(1, 'month');
                    }
                    else if (userProvided.hours && userProvided.minutes && 
                            !userProvided.date && !userProvided.month && !userProvided.year) {
                        // User gave only a time that already passed today → tomorrow
                        dateObj.add(1, 'day');
                    }
                    else {
                        // Generic fallback: roll forward until future
                        while (dateObj.isBefore(now)) {
                            dateObj.add(1, 'day');
                        }
                    }
                }

                const ts = Math.floor(dateObj.valueOf() / 1000);
                const formats = {
                    longWeek: `<t:${ts}:F>`,
                    longTime: `<t:${ts}:f>`,
                    longDate: `<t:${ts}:D>`,
                    shortDate: `<t:${ts}:d>`,
                    shortTime: `<t:${ts}:t>`,
                    relative: `<t:${ts}:R>`
                };

                // Detect device
                const presence = interaction.member.presence ?? {};
                const clientStatus = presence.clientStatus ?? {};
                let device = clientStatus.desktop ? 'desktop' : clientStatus.mobile ? 'mobile' : clientStatus.web ? 'web' : 'unknown';

                if (device === 'mobile') {
                    await interaction.reply({ content: '## 🕓 Dynamic Timestamp Formats:\n\n-# 📱 Mobile Device Detected: On mobile, timestamp formats are sent as individual messages so they can easily be copied', flags: MessageFlags.Ephemeral });
                    for (const key in formats) {
                        await interaction.followUp({ content: formats[key], flags: MessageFlags.Ephemeral });
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setColor([180, 180, 208])
                        .setTitle('🕓 Dynamic Timestamp Formats')
                        .setDescription('Copy the format below that best suits your needs.')
                        .addFields(
                            Object.entries(formats).map(([k, v]) => ({ name: v, value: `\`\`\`${v}\`\`\``, inline: k.includes('short') })
                            )
                        );
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }

                // Offer to save default timezone
                if (interaction.options.getString('timezone') && tz !== defaultTZ) {
                    const btn = new ButtonBuilder()
                        .setCustomId(`timestamp:setTimezone:${tz}`)
                        .setLabel(`Set to ${tz}`)
                        .setStyle(ButtonStyle.Primary);
                    const row = new ActionRowBuilder().addComponents(btn);

                    await interaction.followUp({
                        content: "## Set Default Timezone?\nYou can set this timezone as your default moving forward.",
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });
                }

            } catch (err) {
                console.error('Error generating timestamp:', err);
                if (!interaction.replied) {
                    await interaction.reply({ content: '❌ Error generating timestamp.', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.followUp({ content: '❌ Error generating timestamp.', flags: MessageFlags.Ephemeral });
                }
            }
    },

    // When user sets timezone via button:
    async handleButton(interaction) {
        const { customId } = interaction;
        const [, action, selectedTZ] = customId.split(':');
        const userID = interaction.user.id;

        // Save timezone to the JSON file
        setUserTimezone(userID, selectedTZ);

        await interaction.update({
            content: `### ✓ Default Timezone Set\nYour default timezone is now **${selectedTZ}**.`,
            components: []
        });

        return;
    }
};
