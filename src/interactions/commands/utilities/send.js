const { MessageFlags, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

function readChangelog() {
    const changelogPath = path.join(__dirname, '../../../assets/text_files/changelog.md');
    return fs.readFileSync(changelogPath, 'utf8');
}

const pendingMessages = new Map();

module.exports = {
    register: 'guild',
    guildGroup: 'soup',
    interactionPrefix: 'send',

    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('send a message as Soup Bot')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('choose where to send')
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('add a text or file with message content')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('changelog')
                .setDescription('send the latest stored changelog.md file')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        const attachment = interaction.options.getAttachment('file');
        const changelog = interaction.options.getBoolean('changelog') ?? false;

        if (attachment) {
            // If user submits text or markdown file

            const attachmentFile = await fetch(attachment.url);
            const content = await attachmentFile.text();

            // If message is too long handle, otherwise send
            if (content.length > 2000) {
                return await multiMessagePrompt(content, channel, interaction);
            } else {
                await channel.send(content);

                return interaction.reply({
                    content: '✓ Message Sent',
                    flags: MessageFlags.Ephemeral
                })
            }

        } else if (changelog) {
            const content = readChangelog();

            // If message is too long handle, otherwise send
            if (content.length > 2000) {
                return await multiMessagePrompt(content, channel, interaction);
            } else {
                await channel.send(content);

                return interaction.reply({
                    content: '✓ Changelog Sent',
                    flags: MessageFlags.Ephemeral
                })
            }
        } else {
            //If user chooses to type message into modal

            const modal = new ModalBuilder()
                .setCustomId(`send:modalSubmit:${channel.id}`)
                .setTitle('Send Soup Bot Message');

            const contentInput = new TextInputBuilder() 
                .setCustomId('content')
                .setLabel('Message Content')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Your message content. Links, markdown, and rich formatting are supported.')
                .setRequired(true);

            const row = new ActionRowBuilder()
                .addComponents(contentInput);
            
            modal.addComponents(row);
            
            await interaction.showModal(modal);
        }
    },

    async handleModal(interaction) {
        //receive modal submission and send content as message
        const [, , channelId] = interaction.customId.split(':');
        const channel = await interaction.client.channels.fetch(channelId);
        const content = interaction.fields.getTextInputValue('content');

        // If message is too long handle, otherwise send
        if (content.length > 2000) {
            return await multiMessagePrompt(content, channel, interaction);
        } else {
            await channel.send(content);

            return interaction.reply({
                content: '✓ Message Sent',
                flags: MessageFlags.Ephemeral
            })
        }
    },

    async handleButton(interaction) {
        //Handles prompts for if message exceeds character limit
        const [, action, id] = interaction.customId.split(':');

        const pending = pendingMessages.get(id);

        if (!pending) {
            return interaction.reply({
                content: ':x: Oops. Lost your message somewhere.',
                flags: MessageFlags.Ephemeral
            })
        }

        switch (action) {
            case 'confirmSplit':
                const channel = await interaction.client.channels.fetch(pending.channelId);

                for (const message of pending.messages) {
                    await channel.send(message);
                }

                pendingMessages.delete(id);

                //edits button message
                return interaction.update({
                    content: `✓ Sent ${pending.messages.length} Messages`,
                    components: []
                })
            case 'cancelSplit':
                pendingMessages.delete(id);

                return interaction.update({
                    content: 'Message send cancelled.',
                    components: []
                })
            default:
                return interaction.reply({
                    content: ':x: Something went wrong.',
                    flags: MessageFlags.Ephemeral
                })
                break;
        }

    }
}

function splitMessage(content, maxLength = 2000) {
    const messages = [];

    while (content.length > maxLength) {
        let splitPoint = content.lastIndexOf('\n', maxLength);

        if (splitPoint === -1) {
            splitPoint = content.lastIndexOf(' ', maxLength);
        }

        if (splitPoint === -1) {
            splitPoint = maxLength;
        }

        messages.push(content.slice(0, splitPoint).trimEnd());

        content = content.slice(splitPoint).trimStart();
    }

    if (content.length > 0) {
        messages.push(content);
    }

    return messages;
}

async function multiMessagePrompt(content, channel, interaction) {
    const messages = splitMessage(content);

    const confirmButton = new ButtonBuilder()
        .setCustomId(`send:confirmSplit:${interaction.id}`)
        .setLabel(`Send as ${messages.length} Messages`)
        .setStyle(ButtonStyle.Primary);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`send:cancelSplit:${interaction.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

    pendingMessages.set(interaction.id, {
        channelId: channel.id,
        messages: messages
    });

    setTimeout(() => {
        pendingMessages.delete(interaction.id);
    }, 10 * 60 * 1000);

    return interaction.reply({
        content: 'This message exceeds Discord character limit. Would you like to send it as multiple messages?\n',
        components: [row],
        flags: MessageFlags.Ephemeral
    })
}