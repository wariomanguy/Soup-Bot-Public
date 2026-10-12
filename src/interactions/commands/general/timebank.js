const { MessageFlags, SlashCommandBuilder, ApplicationCommandOptionType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { 
    getTimebankAccount, 
    createTimebankAccount, 
    pushTimebankAccount, 
    getAllTimebank, 
    getMonthlyStatement, 
    recordTransactionType, 
    readTimebankData, 
    unitDescriptor,
    applyMonthlyReduction,
    updateAllDisplayNames,
    newTransaction, 
    getTimebankEventCandidates,
    hasAttendanceTransaction,
    getTransactionStatement,
    getBalanceStatement,
    getSummaryStatement,
    revertTransaction,
    getTransaction,
    getTransactionsByEvent
} = require('../../../utils/timebankTools');
const crypto = require('crypto');
const pendingTransactions = new Map();

//const { get } = require('http');
function suffix(n) {
    if (n % 100 >= 11 && n % 100 <= 13) {
        return n + "th";
    }
    switch (n % 10) {
        case 1: return n + "st";
        case 2: return n + "nd";
        case 3: return n + "rd";
        default: return n + "th";
    }
}

module.exports = {
    register: 'global',
    interactionPrefix: 'timebank',

    data: new SlashCommandBuilder()
        .setName('timebank')
        .setDescription('Check and manage timebank accounts for server members')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Display your timebank account balance')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The target user')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit time into an account')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The target user')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('minutes')
                        .setDescription('Amount to deposit into the specified account')
                        .setRequired(true)
                        .setMinValue(-30)
                        .setMaxValue(30)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw time from an account')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The target user')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('minutes')
                        .setDescription('Amount to withdraw from the specified account')
                        .setRequired(true)
                        .setMinValue(-30)
                        .setMaxValue(30)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rankings')
                .setDescription('Display all balances for server timebank accounts ranked')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('summary')
                .setDescription('Get an information overview of the Timebank system')
        ),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            interaction.reply({
                content: 'Right now, this command only works in servers',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'rankings':
                //console.log('rankings requested');
                await interaction.deferReply();
                try {
                    const { ids, balances, displayNames } = await getAllTimebank();
                    if (ids.length === 0) {
                        const noAccountsMsg = new EmbedBuilder()
                            .setTitle('🏦 Timebank Account Rankings')
                            .setColor([180, 180, 208])
                            .setDescription('*No rankings to display*')
                            .setFooter({
                                text: `Timebank Account Rankings Board`,
                                iconURL: interaction.guild.iconURL()
                            })
                            .setTimestamp();
                        
                        return await interaction.editReply({embeds: [noAccountsMsg]});
                    }
        
                    const members = await interaction.guild.members.fetch({ user: ids, force: false });
                    const fetchedDisplayNames = ids.map((id, index) => {
                        const member = members.get(id);
                        return member?.nickname || member?.user.displayName || displayNames[index];
                    });
                    //console.log('got names');
        
                    const rankings = fetchedDisplayNames.map((display_name, index) => ({
                        display_name,
                        id: ids[index],
                        balance: balances[index],
                    }));
                    //console.log('rankings map created')
        
                    rankings.sort((a, b) => b.balance - a.balance);
                    //console.log('sorted rankings map')

                    //console.log(rankings);
        
                    const rankingsMsg = new EmbedBuilder()
                        .setTitle('🏦 Timebank Account Rankings')
                        .setColor([180, 180, 208])
                        .setFooter({
                            text: `Timebank Account Rankings Board`,
                            iconURL: interaction.guild.iconURL()
                        })
                        .setTimestamp()
                    ;
                    
                    let item = 0;
                    let place;
                    let prevBalance;

                    rankings.forEach(rank => {
                        if (rank.balance != prevBalance) item++;
                        place = suffix(item);
                        const trophies = {
                            1: "🥇",
                            2: "🥈",
                            3: "🥉"
                        };
                        
                        let trophy = trophies[item] || "";
                        placeString = `${trophy}${place}:`;

                        rankingsMsg.addFields({
                            name: `${placeString}`,
                            value: `${rank.display_name}: *${rank.balance} ${unitDescriptor(rank.balance)}*`,
                            inline: false,
                        });

                        prevBalance = rank.balance;
                    });

                    await interaction.editReply({embeds: [rankingsMsg]});

                } catch (error) {
                    console.error('Error:', error);
                    await interaction.editReply({
                        content: 'Failed to get Timebank rankings.',
                        flags: MessageFlags.Ephemeral,
                    });
                }
                break;
            case 'summary':
                try {
                    const summary = await getSummaryStatement(interaction);
                    return interaction.reply({embeds: [summary]});
                } catch (error) {
                    console.error('Error:', error);
                    return interaction.reply({
                        content: 'Failed to get Timebank summary.',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            default:
                //••••• BLOCK 1: Get user Timebank Account •••••\\
                //make sure target isn't a bot:
                const targetUser = interaction.options.getUser('user');
                if (targetUser && targetUser.bot) {
                    await interaction.reply({
                        content: "❌ Bots don't have timebank accounts.",
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const targetUserID = interaction.options.get('user')?.value || interaction.member.id;

                let account = await getTimebankAccount(targetUserID).catch((error) => {
                    console.error('Unable to get account:', error);
                });

                //set user variables
                const targetMember = await interaction.guild.members.fetch(targetUserID);

                const targetUserObj = targetMember || await interaction.client.users.fetch(targetUserID);
                const displayName = targetMember ? (targetMember.nickname || targetMember.user.displayName) : targetUserObj.displayName;

                
                //declare embed variables for later use
                let newAccountMsg;
                let statement;

                //Create new account if missing
                if (!account) {
                    try {
                        account = await createTimebankAccount(targetUserObj);
                        newAccountMsg = new EmbedBuilder()
                            .setColor(targetUserObj.displayColor || [180, 180, 208])
                            .setAuthor({
                                name: `🏦 Timebank account created for ${displayName}.`,
                            });
                    } catch (error) {
                        console.error('Unable to create account:', error);
                        await interaction.reply({
                            content: 'Unable to create an account for this user.',
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                }

                const balance = parseInt(account.balance);
                let transaction;

                //••••• BLOCK 2: Handle deposits and withdrawals •••••\\
                if (subcommand === 'deposit' || subcommand === 'withdraw') {

                    let minutes = interaction.options.get('minutes')?.value || 0;

                    if (minutes !== 0) {

                        // Reject transaction if user is trying to change their own balance
                        if (targetUserID == interaction.member.id) {
                            await interaction.reply({
                                content: `### ❌ Transaction Rejected\nYou can't change your own timebank balance. Someone else will need to make this transaction for you.`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }

                        if (subcommand === 'withdraw') {
                            minutes = -minutes;
                        }

                        let event;
                        const eventCandidates = getTimebankEventCandidates(targetUserID);
                        //console.log('candidates:', eventCandidates);
                        if (eventCandidates) {
                            if (eventCandidates.ambiguous) {
                                const vettedCandidates = eventCandidates.events.filter(event => !hasAttendanceTransaction(event.id, targetUserID, event.start_time));
                                console.log('vetted:', vettedCandidates);
                                if (vettedCandidates.length == 1) {
                                    event = vettedCandidates[0];
                                }
                            } else {
                                event = eventCandidates.event;
                            }
                        }

                        let transactionEvent = null;

                        if (event) {
                            const eventTransactions = getTransactionsByEvent(event.id, event.start_time);
                            const userEventTransaction = getTransactionsByEvent(event.id, event.start_time).filter(
                                transaction =>
                                    transaction.userId === targetUserID &&
                                    !transaction.reverted
                            );
                            //console.log('User Event transactions:', userEventTransaction);
                            if (userEventTransaction.length > 0) {
                                if (userEventTransaction.length > 1) {
                                    console.error(`Multiple transactions for user ${targetUser.displayName} in event ${event.name}`);
                                    return;
                                }
                                try {
                                    const pendingId = crypto.randomUUID();

                                    pendingTransactions.set(pendingId,  {
                                        targetUserId: targetUserID,
                                        minutes,
                                        event,
                                        existingTransaction: userEventTransaction[0],
                                        createdAt: Date.now()
                                    })

                                    const messageContent = 
                                        `### ⚠️ ${targetMember.displayName} already has a Timebank transaction for ${event.name}\nSee existing transaction below. How would you like to proceed with your transaction?`
                                    ;

                                    const statement = getTransactionStatement(userEventTransaction[0], targetMember);

                                    const replaceButton = new ButtonBuilder()
                                        .setCustomId(`timebank:replace:${pendingId}`)
                                        .setLabel(`Replace Existing`)
                                        .setStyle(ButtonStyle.Danger);
                                    const separateButton = new ButtonBuilder()
                                        .setCustomId(`timebank:separate:${pendingId}`)
                                        .setLabel(`Don't Apply to this Event`)
                                        .setStyle(ButtonStyle.Primary);
                                    const cancelButton = new ButtonBuilder()
                                        .setCustomId(`timebank:cancel:${pendingId}`)
                                        .setLabel(`Cancel Transaction`)
                                        .setStyle(ButtonStyle.Secondary);
                                    const row = new ActionRowBuilder().addComponents(replaceButton, separateButton, cancelButton);
                                    message = await interaction.reply({
                                        content: messageContent,
                                        embeds: [statement], components: [row],
                                        flags: MessageFlags.Ephemeral
                                    });
                                    
                                    setTimeout(async () => {
                                        try {
                                            await interaction.deleteReply();
                                            pendingTransactions.delete(pendingId);
                                        } catch (err) {
                                            console.error('[Timebank] Failed to delete interaction reply')
                                        }
                                    }, 20 * 60 * 1000); //20 min
                                    return;
                                } catch (err){
                                    console.error('[Auto Timebank] ❌ Failed to send automatic statement in channel:', err);
                                }
                            }

                            transactionEvent = {
                                id: event.id,
                                name: event.name,
                                start_time: event.start_time
                            };
                        }

                        try {
                            transaction = newTransaction(targetUserID, minutes, transactionEvent, interaction.user.id);
                        } catch (error) {
                            console.error('Unable to update account balance:', error);
                            await interaction.reply({
                                content: `❌ There was an error updating **${displayName}'s** account.`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                    }
                }
                
                //Refresh stored account display name if needed
                if (account.display_name !== displayName) {
                    account.display_name = displayName;
                    pushTimebankAccount(account).catch((error) => {
                        console.error('Unable to update account display name:', error);
                    });
                }

                if (!transaction) {
                    //NO TRANSACTION
                    statement = getBalanceStatement(balance, targetMember);
                } else {
                    //TRANSACTION OCCURRED
                    statement = getTransactionStatement(transaction, targetMember);
                }
                
                if (newAccountMsg) {
                    interaction.reply({embeds: [newAccountMsg, statement]});
                } else {
                    interaction.reply({embeds: [statement]});
                };
        }
    },

    async handleButton(interaction) {
        try {
            const { customId } = interaction;
            const [prefix, action, id] = customId.split(':');
            const userId = interaction.user.id;

            if (action === 'revert') {
                console.log('trying to revert')
                const data = readTimebankData();
                const transaction = getTransaction(id, data);
                if (!data.accounts[userId]) {
                    console.log(`[Timebank] No Timebank Account for user: ${userId}`);
                    await interaction.reply({
                        content: `❌ Timebank account missing. It may have been deleted.`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                };

                if (transaction.userId == userId) {
                    await interaction.reply({
                        content: `### ❌ Transaction Not Reverted\nYou can't change your own timebank balance. Someone else will need to revert this transaction for you.`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                };

                revertTransaction(id);
                console.log('reverted');

                await interaction.update({
                    content: `### ↩️ Transaction Reverted\nReverted Auto Timebank transaction for ${data.accounts[transaction.userId].display_name}.`,
                    components: [],
                    embeds: []
                });
                return;
            }

            if (action === 'cancel') {
                pendingTransactions.delete(id);
                await interaction.update({
                    content:'### ↩️ Transaction Cancelled\nKept original event transaction.',
                    embeds: [],
                    components: []
                });
                return;
            }

            if (action === 'replace' || action === 'separate') {
                const pending = pendingTransactions.get(id);

                if (!pending) {
                    await interaction.reply({
                        content: '### ❌ Request Expired\nUnable to find your proposed transaction. Please try again.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
                
                let event;
                let messageContent = '### ✓ Kept Both Transactions\nYour transaction has been applied as a non-event transaction.'
                if (action === 'replace') {
                    revertTransaction(pending.existingTransaction.id);
                    event = {
                        id: pending.event.id,
                        name: pending.event.name,
                        start_time: pending.event.start_time
                    }
                    messageContent = '### ⤵️ Transaction Replaced\nReplaced original event transaction with yours.';
                }
                try {
                    const targetMember = await interaction.guild.members.fetch(pending.targetUserId);

                    const transaction = newTransaction(
                        pending.targetUserId,
                        pending.minutes,
                        event,
                        interaction.user.id
                    );

                    const statement = getTransactionStatement(transaction, targetMember);
                    const interactionChannel = interaction.channel;

                    await interaction.update({
                        content: messageContent,
                        embeds: [],
                        components: []
                    });
                    await interactionChannel.send({embeds: [statement]});
                } catch (err){
                    console.log('[Timebank] Failed to send statement:', err)
                }
                pendingTransactions.delete(id);
                return;
            }

        } catch (error) {
            console.error('[Timebank] Button Error:', error)

            if (!interaction.replied) {
                await interaction.reply({
                    content: 'Something went wrong.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }
};