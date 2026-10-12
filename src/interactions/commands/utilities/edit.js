const {
    MessageFlags,
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    register: 'guild',
    guildGroup: 'soup',
    interactionPrefix: 'edit',

    data: new ContextMenuCommandBuilder()
        .setName('Edit as Soup Bot')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const message = interaction.targetMessage;

        // Only allow editing messages from this bot
        if (message.author.id !== interaction.client.user.id) {
            return interaction.reply({
                content: ':x: Message must be by Soup Bot.',
                flags: MessageFlags.Ephemeral
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit:submit:${message.id}`)
            .setTitle('Edit Soup Bot Message');

        const contentInput = new TextInputBuilder()
            .setCustomId('content')
            .setLabel('Message Content')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000)
            .setValue(message.content);

        const row = new ActionRowBuilder()
            .addComponents(contentInput);

        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        const [, action, messageId] = interaction.customId.split(':');

        if (action !== 'submit') {
            return interaction.reply({
                content: ":x: Edit Killed. Didn't like that one",
                flags: MessageFlags.Ephemeral
            });
        }

        const newContent = interaction.fields.getTextInputValue('content');

        try {
            // Modal submissions do not carry targetMessage,
            // so fetch the message again.
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId);

            if (message.author.id !== interaction.client.user.id) {
                return interaction.reply({
                    content: ':x: That message can no longer be edited.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await message.edit(newContent);

            return interaction.reply({
                content: '✓ Message edited.',
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error(`[Edit] Failed to edit message ${messageId}:`, error);

            return interaction.reply({
                content: ':x: Failed to find or edit the message.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};