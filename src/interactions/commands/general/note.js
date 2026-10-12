// note.js
const { MessageFlags,
        ContextMenuCommandBuilder, 
        ApplicationCommandType, 
        InteractionContextType, 
        ModalBuilder, 
        TextInputBuilder, 
        TextInputStyle, 
        ActionRowBuilder, 
        LabelBuilder, 
        ButtonBuilder, 
        ButtonStyle } = require('discord.js');
const { randomUUID } = require('crypto');
const noteStore = require('../../../utils/noteStorage');
const embed = require('../../../utils/noteEmbeds');

module.exports = {
    register: 'global',
    interactionPrefix: 'note', // Used for identifying interactions that aren't slash commands

    data: new ContextMenuCommandBuilder()
        .setName('Leave Community Note')
        .setType(ApplicationCommandType.Message)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        console.log(interaction.targetMessage);
        const botInGuild = interaction.client.guilds.cache.has(interaction.guildId);
        if (!botInGuild) {
            await interaction.reply({
                content: `# ❌ Unable to Leave Note\nYou can't leave a note on this message because Soup Bot isn't in the server.`,
                components: [],
                flags: MessageFlags.Ephemeral
            });
        }
        const msg = interaction.targetMessage;
        const noteId = randomUUID();

        noteStore.createPending({
            id: noteId,
            userId: interaction.user.id,
            messageId: msg.id,
            channelId: msg.channelId,
            content: null,
            type: null,
            createdAt: Date.now()
        });

        return interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: `# Add a Note\nWant to leave an anonymous note under this post with context for other soup members? There are two types of notes:\n- **👥 Community Note**: fact-check or add context to a message. Cite relevant sources.\n- **💢 Potential Ragebait:** Warn server members that a message may contain overly inflamatory or unproductive language.\n### Select the kind of note you want to leave:`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `note:type:${noteId}`,
                            placeholder: 'Choose a note type…',
                            options: [
                                { label: '👥 Community Note', value: 'community' },
                                { label: '💢 Potential Ragebait', value: 'ragebait' }
                            ]
                        }
                    ]
                }
            ]
        });
    },

    async handleSelectMenu(interaction) {

        if (!interaction.isStringSelectMenu()) return;

        try {
            const { customId, values } = interaction;
            const [prefix, action, noteId] = customId.split(':');

            if (action === 'type') {
                const type = values[0];

                const pending = noteStore.getPending(noteId);
                if (!pending) {
                    return interaction.reply({
                        content: 'Your note session expired or was not found.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Store the type
                noteStore.updatePending(noteId, { type });

                if (type === "community") {
                    console.log("Attempting to create modal for community note...");

                    const targetMessageChannel = await interaction.client.channels.fetch(pending.channelId);
                    const targetMessage = await targetMessageChannel.messages.fetch(pending.messageId);
                    
                    let truncatedContent = "(Message with no text content)";

                    if (targetMessage.content) {
                        truncatedContent = targetMessage.content.length > 100 ? targetMessage.content.slice(0, 98) + '…' : targetMessage.content;
                    }
                    
                    const modal = new ModalBuilder()
                        .setCustomId(`note:community:${noteId}`)
                        .setTitle('✏️ Draft Community Note');

                    const contextInput = new TextInputBuilder() 
                        .setCustomId('noteContentInput')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Add context or information relevant to this message. Provide sources if possible.')
                        .setRequired(true)
                        .setMaxLength(2048);

                    const communityLabel = new LabelBuilder()
                        .setLabel(`Add context to this message:`)
                        .setDescription(truncatedContent)
                        .setTextInputComponent(contextInput);
                    
                    modal.addLabelComponents(communityLabel);
                    
                    return interaction.showModal(modal);
                }

                if (type === "ragebait") {
                    console.log("Attempting to create modal for ragebait note...");

                    const targetMessageChannel = await interaction.client.channels.fetch(pending.channelId);
                    const targetMessage = await targetMessageChannel.messages.fetch(pending.messageId);
                    
                    let truncatedContent = "(Message with no text content)";

                    if (targetMessage.content) {
                        truncatedContent = targetMessage.content.length > 100 ? targetMessage.content.slice(0, 98) + '…' : targetMessage.content;
                    }
                    
                    const modal = new ModalBuilder()
                        .setCustomId(`note:ragebait:${noteId}`)
                        .setTitle('✏️ Draft Ragebait Warning');

                    const contextInput = new TextInputBuilder() 
                        .setCustomId('noteContentInput')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Add context or information relevant to this message. Provide sources if possible.')
                        .setRequired(true)
                        .setValue("This message may contain inflammatory language that will not lead to a productive or thoughtful discussion. Think carefully before choosing to engage with it.")
                        .setMaxLength(2048);

                    const communityLabel = new LabelBuilder()
                        .setLabel(`Add context to this message:`)
                        .setDescription(truncatedContent)
                        .setTextInputComponent(contextInput);
                    
                    modal.addLabelComponents(communityLabel);
                    
                    return interaction.showModal(modal);
                }

                // Default fallback
                return interaction.reply({
                    content: `You selected: **${type}**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (err) {
            console.error('Select Menu Handler Error:', err);

            if (!interaction.replied) {
                return interaction.reply({
                    content: '❌ Something went wrong with your selected note type.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async handleModal(interaction) {

        if (!interaction.isModalSubmit()) return;

        const { customId, values } = interaction;
        const [prefix, action, noteId] = customId.split(':');

        if (action === 'community') {
            console.log('Community Note Submission');

            //retireve note from storage if it exists
            const pending = noteStore.getPending(noteId);
            if (!pending) {
                return interaction.reply({
                    content: 'Your note session expired or was not found.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const content = interaction.fields.getTextInputValue('noteContentInput');

            noteStore.updatePending(noteId, { content });

            const btn = new ButtonBuilder()
                .setCustomId(`note:submit:${noteId}`)
                .setLabel(`Post Note`)
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(btn);

            console.log("Attempting to generate embed preview");
            const noteEmbed = await embed.community(interaction.client, interaction, content);
            console.log("Generated embed preview:", noteEmbed);

            return interaction.reply({
                content: `## Note Preview\nThis is how your note will appear once posted. When you are finished reviewing it, continue by selecting the button below.`,
                components: [row],
                embeds: noteEmbed ? [noteEmbed] : [],
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "ragebait") {
            console.log('Ragebait Note Submission');

            const pending = noteStore.getPending(noteId);
            if (!pending) {
                return interaction.reply({
                    content: 'Your note session expired or was not found.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const content = interaction.fields.getTextInputValue('noteContentInput');

            //record contents for long-term storage
            noteStore.updatePending(noteId, { content });

            //Create and send embed preview
            const btn = new ButtonBuilder()
                .setCustomId(`note:submit:${noteId}`)
                .setLabel(`Post Note`)
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(btn);

            console.log("Attempting to generate embed preview");
            const noteEmbed = await embed.ragebait(interaction.client, interaction, content);

            return interaction.reply({
                content: `## Note Preview\nThis is how your note will appear once posted. When you are finished reviewing it, continue by selecting the button below.`,
                embeds: noteEmbed ? [noteEmbed] : [],
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleButton(interaction) {
        if (!interaction.isButton()) return;

        try {
            const { customId } = interaction;
            const [prefix, action, noteId] = customId.split(':');

            if (action === 'submit') {
                const pending = noteStore.getPending(noteId);

                if (!pending) {
                    return interaction.reply( {
                        content: 'Your note session expired or was not found.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const channel = await interaction.client.channels.fetch(pending.channelId);
                const msg = await channel.messages.fetch(pending.messageId);

                let noteEmbed;
                if (pending.type === 'community') {
                    noteEmbed = await embed.community(interaction.client, interaction, pending.content);
                } else if (pending.type === 'ragebait') {
                    noteEmbed = await embed.ragebait(interaction.client, interaction, pending.content);
                } else {
                    console.error('Unknown note type for embed generation:', pending.type);
                    return interaction.reply({
                        content: 'There was an error generating the note embed.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                console.log('Generated Note Embed:', noteEmbed);

                await msg.reply( {
                    embeds: [noteEmbed]
                });
                console.log(pending);
                noteStore.logNote(pending);
                noteStore.deletePending(noteId);

                await interaction.update({
                    content: '✅ Your note has been posted successfully!',
                    components: [],
                    embeds: []
                });

                return;
            }

        } catch (err) {
        console.error('Community Note Button Error:', err);

            if (!interaction.replied) {
                await interaction.reply({
                    content: 'Something went wrong.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }
};
