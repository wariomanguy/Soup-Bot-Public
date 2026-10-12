const { EmbedBuilder } = require('discord.js');

async function community(client, interaction, content) {
    const member = await interaction.guild.members.fetch(client.user.id);
        const botColor = member.displayHexColor;
        return new EmbedBuilder()
            .setDescription(content)
            .setFooter({text: `👥 Community Note`})
            .setColor(botColor)
            .setTimestamp();
}

async function ragebait(client, interaction, content) {
    const member = await interaction.guild.members.fetch(client.user.id);
        const botColor = member.displayHexColor;
        return new EmbedBuilder()
            .setTitle(`💢 Potential Ragebait`)
            .setDescription(content)
            .setColor(botColor)
            .setTimestamp();
}

module.exports = { community, ragebait };