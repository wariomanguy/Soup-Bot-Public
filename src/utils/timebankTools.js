const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { getAllEvents } = require('../utils/eventTools');
const getCommandMention = require('../utils/getCommandMention');
const { EmbedBuilder } = require('discord.js');

const TIMEBANK_FILE = path.join('src/savedata/', 'timebank.json');

/**
 * Ensure the timebank data file exists
 */
function ensureTimebankFileExists() {
    if (!fs.existsSync(TIMEBANK_FILE)) {
        const initialData = { 
            accounts: {},
            national: { balance: 0, balance_history: [] },
            transactions: []
        };
        fs.writeFileSync(TIMEBANK_FILE, JSON.stringify(initialData, null, 4));
    }
}

/**
 * Read all timebank data from the centralized file
 */
function readTimebankData() {
    try {
        ensureTimebankFileExists();
        const data = fs.readFileSync(TIMEBANK_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading timebank data:', err);
        throw new Error('Unable to read timebank data');
    }
}

/**
 * Write timebank data to the centralized file
 */
function writeTimebankData(data) {
    try {
        fs.writeFileSync(TIMEBANK_FILE, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error('Error writing timebank data:', err);
        throw new Error('Unable to write timebank data');
    }
}

/**
 * Get a user's timebank account
 * @param {string} userID - The Discord user ID
 * @returns {Promise<Object>} The user's account data or null if not found
 */
function getTimebankAccount(userID) {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            const account = data.accounts[userID];
            if (account) {
                resolve(account);
            } else {
                reject('Account missing');
            }
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Create a new timebank account for a user
 * @param {Object} targetMember - Discord member object
 * @returns {Promise<Object>} The newly created account data
 */

// TO DO: NEEDS TO HANDLE USER OBJECT IF NO MEMBER
function createTimebankAccount(targetMember) {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            const newAccount = {
                display_name: targetMember.displayName,
                id: targetMember.id,
                balance: 0
            };
            data.accounts[targetMember.id] = newAccount;
            writeTimebankData(data);
            resolve(newAccount);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Update a user's timebank account
 * @param {Object} account - The account data to save
 * @returns {Promise<void>}
 */
function pushTimebankAccount(account) {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            data.accounts[account.id] = account;
            writeTimebankData(data);
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Get all timebank accounts
 * @returns {Promise<Object>} Object with arrays of ids, balances, and displayNames
 */
function getAllTimebank() {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            const ids = [];
            const balances = [];
            const displayNames = [];

            if (data.accounts) {
                Object.values(data.accounts).forEach(account => {
                    ids.push(account.id);
                    balances.push(account.balance);
                    displayNames.push(account.display_name);
                });
            }

            resolve({ ids, balances, displayNames });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Apply monthly 10% reduction to all accounts and add to national balance
 * @returns {Promise<Object>} Result object with reduction details
 */
function applyMonthlyReduction() {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            
            // Initialize national balance if it doesn't exist
            if (!data.national) {
                data.national = { balance: 0, balance_history: [] };
            }

            let totalReduction = 0;
            let accountsReduced = 0;

            // Reduce each account by 10%
            Object.values(data.accounts).forEach(account => {
                const reduction = Math.round(account.balance * 0.1);
                account.balance -= reduction;
                totalReduction += reduction;
                accountsReduced++;
            });

            // Add total reduction to national balance
            data.national.balance_history.push(data.national.balance);
            data.national.balance += totalReduction;


            writeTimebankData(data);

            resolve({
                success: true,
                accountsReduced,
                totalReduction: totalReduction,
                nationalBalance: data.national.balance,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Get the national timebank balance
 * @returns {Promise<number>} The national balance
 */
function getNationalBalance() {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            const balance = data.national?.balance || 0;
            resolve(balance);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * ## Get Balance Timebank Statement
 * @returns {<Object>} Statement embed
 */
function getBalanceStatement(balance, member) {
    const balanceDescription = `**${balance} ${unitDescriptor(balance)}**`;
    const accountStanding = balance < 0 
        ? `✕ Account is in time debt`
        : `✓ Account is in good standing`;

    const statement = new EmbedBuilder()
        .setColor(member.displayColor || [180, 180, 208])
        .setAuthor(
            {
                name: `${member.displayName}'s Timebank Account`,
                iconURL: member.displayAvatarURL?.(),
            }
        )
        .setTitle('Balance')
        .setDescription(balanceDescription)
        .addFields(
            {
                name: '',
                value: `${accountStanding}`,
                inline: true,
            }
        )
        .setFooter({
            text: `Timebank Account Balance`,
            iconURL: member.guild?.iconURL?.() ?? undefined,
        })
        .setTimestamp()
    ;
    return statement;
}

/**
 * ## Get Transaction Timebank Statement
 * @param {Number (Optional)} Provide if you feel like it 
 * @returns {<Object>} Statement embed
 */
function getTransactionStatement(transaction, member) {
    const startBalance = transaction.start_balance;
    const endBalance = startBalance + transaction.minutes;
    const transactionDescription = `${startBalance} ${unitDescriptor(startBalance)} → **${endBalance} ${unitDescriptor(endBalance)}**`;
    const typeText = transaction.type === 'deposit' 
        ? `Deposit`
        : `Withdrawal`;
    let footer = 'Timebank Transaction Statement';
    const plus = transaction.minutes > 0 ? '+' : '';
    let fields = [{
            name: '⮂ Transaction:',
            value: `${plus}${transaction.minutes} ${unitDescriptor(transaction.minutes)}`,
            inline: true
    }];

    if (transaction.event) {
        footer = transaction.auto
            ? `Auto Timebank Event Transaction`
            : `Timebank Event Transaction`;
        let attendanceText = 
            transaction.minutes > 0 ? `${Math.abs(transaction.minutes)} ${unitDescriptor(transaction.minutes)} early` :
            transaction.minutes < 0 ? `${Math.abs(transaction.minutes)} ${unitDescriptor(transaction.minutes)} late` :
            'On time';
        fields = [{
            name: `📆 ${transaction.event.name}`,
            value: attendanceText,
            inline: false
        }]
    };

    const statement = new EmbedBuilder()
        .setColor(member.displayColor || [180, 180, 208])
        .setAuthor(
            {
                name: `${member.displayName}'s Timebank Account`,
                iconURL: member.displayAvatarURL?.(),
            }
        )
        .setTitle(`${typeText}`)
        .setDescription(transactionDescription)
        .addFields(fields)
        .setFooter({
            text: `${footer}`,
            iconURL: member.guild?.iconURL?.() ?? undefined,
        })
        .setTimestamp(transaction.timestamp)
    ;
    return statement;
}

/**
 * Get Summary Timebank Statement
 * @returns {Promise<Object>} Statement embed
 */
function getSummaryStatement(interaction) {
    return new Promise(async (resolve, reject) => {
        try {
            const data = readTimebankData();
            const accountMap = new Map(
                Object.entries(data.accounts || {}).map(([id, acc]) => [id, acc])
            );
            const nationalBalance = data.national?.balance || 0;
            const oldNationalBalance = data.national?.balance_history.at(-1) || 0; //>TO DO: GET LAST ITEM IN balance_history INSTEAD!!
            const nationalChange = nationalBalance - oldNationalBalance;
            const totalAccounts = Object.keys(data.accounts).length;
            const highestBalanceAccount = Object.entries(data.accounts).reduce(
                (maxAccount, [accountId, account]) => {
                    if (!maxAccount || account.balance > maxAccount.balance) {
                        return account;
                    }
                    return maxAccount;
                },
                null
            );
            const lowestBalanceAccount = Object.entries(data.accounts).reduce(
                (minAccount, [accountId, account]) => {
                    if (!minAccount || account.balance < minAccount.balance) {
                        return account;
                    }
                    return minAccount;
                },
                null
            );
            const meanBalance = totalAccounts > 0 ? Math.round(Object.values(data.accounts).reduce((sum, acc) => sum + acc.balance, 0) / totalAccounts) : 0;

            let balanceOrDebt = nationalBalance >= 0 ? 'Balance' : 'Debt';
            let surplusOrDeficit = nationalChange >= 0 ? 'Surplus' : 'Deficit';

            const recentTransactions = getMostRecent(data.transactions, 6);

            // Get recent transactions summary:
            const recentTransactionsDisplay = recentTransactions.length
                ? recentTransactions.map(tx => {
                    const time = `<t:${Math.floor(tx.timestamp / 1000)}:s>`;
                    const sign = tx.minutes >= 0 ? '+' : '-';

                    const account = accountMap.get(tx.userId);
                    const displayName = account?.display_name || 'Unknown User';

                    return `${sign}${Math.abs(tx.minutes ?? 0)} ${unitDescriptor(tx.minutes)} to **${displayName}** (${time})`;
                }).join('\n')
                : '*No recent transactions*';
            
            // Get recent events summary:
            const eventsData = getAllEvents();
            const eventStatsMap = new Map();

            for (const tx of (data.transactions || [])) {
                const txEvent = tx.event || null;
                if (!txEvent?.id) continue;

                const occurrenceKey = getTransactionInstanceKey(txEvent);
                const event = eventsData[txEvent.id] || null;

                if (!eventStatsMap.has(occurrenceKey)) {
                    eventStatsMap.set(occurrenceKey, {
                        id: txEvent.id,
                        key: occurrenceKey,
                        name: event?.name ?? txEvent.name,
                        start_time: event?.start_time ?? txEvent.start_time ?? tx.timestamp,
                        interested: event?.interested_members?.length || 0,
                        onTime: 0,
                        late: 0,
                        hasActivity: false
                    });
                }

                const stat = eventStatsMap.get(occurrenceKey);
                if (!stat) continue;

                stat.hasActivity = true;
                if (tx.minutes < 0) stat.late++;
                else stat.onTime++;
            }

            const recentEvents = [...eventStatsMap.values()]
                .filter(ev => ev && ev.hasActivity)
                .sort((a, b) => b.start_time - a.start_time)
                .slice(0, 4);

            const recentEventsDisplay = recentEvents.length
                ? recentEvents.map(ev => {
                    const total = ev.onTime + ev.late;
                    const rate = total
                        ? Math.round((ev.onTime / total) * 100)
                        : 0;

                    const time = `<t:${Math.floor(ev.start_time / 1000)}:R>`;

                    return `**${ev.name}** *${ev.onTime}/${total} attendees on time (${rate}%)*`
                }).join('\n')
                : '*No recent events*';

            const summary = new EmbedBuilder()
                .setTitle(`🏦 Timebank Summary`)
                .setColor([180, 180, 208])
                .setDescription(`Summary of the state of the national Timebank. To view individual account balances, use ${getCommandMention('timebank rankings')}.`)
                .addFields(
                    {
                        name: `🕚 Recent Transactions`,
                        value: recentTransactionsDisplay,
                        inline: false
                    },
                    {
                        name: '📆 Recent Events',
                        value: recentEventsDisplay,
                        inline: false
                    },
                    {
                        name: `National Balance`,
                        value: `${nationalBalance} ${unitDescriptor(nationalBalance)}`,
                        inline: true
                    },
                    { 
                        name: `Statistics`,
                        value: `:busts_in_silhouette: Timebank Accounts: **${totalAccounts}**`+
                        `\n:bar_chart: Mean Account Balance: **${meanBalance} ${unitDescriptor(meanBalance)}**`+
                        `\n🥇 Highest Balance: **${highestBalanceAccount.display_name} (${highestBalanceAccount.balance} ${unitDescriptor(highestBalanceAccount.balance)})**`+
                        `\n💀 Lowest Balance: **${lowestBalanceAccount.display_name} (${lowestBalanceAccount.balance} ${unitDescriptor(lowestBalanceAccount.balance)})**`,
                        inline: true
                    }
                )
                .setFooter({
                    text: `Timebank Summary Statement`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            resolve(summary);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Get Monthly Timebank Statement
 * @returns {Promise<Object>} Statement embed
 */
function getMonthlyStatement(guild) {
    return new Promise(async (resolve, reject) => {
        try {
            const data = readTimebankData();

            const accountMap = new Map(Object.entries(data.accounts || {}).map(([id, account]) => [id, account]));

            const nationalBalance = data.national?.balance || 0;
            const oldNationalBalance = data.national?.balance_history?.at(-1) ?? 0;
            const nationalChange = nationalBalance - oldNationalBalance;
            const totalAccounts = Object.keys(data.accounts).length;
            
            // Get previous month name for statement fields
            const today = new Date();
            const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1);
            const monthYearName = previousMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const monthName = previousMonth.toLocaleString('en-US', { month: 'long'});

            // NOT USED: Get timestamp for start of month for statement timestamp (see commented out timestamp line)
            //const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);

            let balanceOrDebt = nationalBalance >= 0 ? 'balance' : 'debt';
            let surplusOrDeficit = nationalChange >= 0 ? 'surplus' : 'deficit';

            const monthTransactions = (data.transactions || []).filter(tx => {
                const date = new Date(tx.timestamp);

                return (
                    date.getMonth() === previousMonth.getMonth() &&
                    date.getFullYear() === previousMonth.getFullYear() && //Avoid Previous Years
                    !tx.reversed //Skip reverted transactions
                );
            });

            // Transaction Calculations
            const { deposits, withdrawals, positiveMins, negativeMins } = monthTransactions.reduce(
                (summary, tx) => {
                    if (tx.type === 'deposit') {
                        summary.positiveMins += tx.minutes;
                        summary.deposits++;
                    } else if (tx.type === 'withdrawal') {
                        summary.negativeMins += Math.abs(tx.minutes);
                        summary.withdrawals++;
                    }

                    summary.totalMinutes += Math.abs(tx.minutes);
                    return summary;
                },
                {
                    deposits: 0,
                    withdrawals: 0,
                    positiveMins: 0,
                    negativeMins: 0,
                }
            );
            const totalMinutes = negativeMins + positiveMins;

            //Leaderboard Calculations
            const leaderboardMap = new Map();

            for (const tx of monthTransactions) {
                const account = accountMap.get(tx.userId);
                if (!account) continue;

                if (!leaderboardMap.has(tx.userId)) {
                    leaderboardMap.set(tx.userId, {
                        displayName: account.display_name,
                        startBalance: tx.start_balance,
                        endBalance: tx.start_balance + tx.minutes
                    });
                } else {
                    leaderboardMap.get(tx.userId).endBalance = tx.start_balance + tx.minutes;
                }
            };

            const leaderboard = [...leaderboardMap.values()]
                .map(user => ({
                    ...user,
                    change: user.endBalance - user.startBalance
                })).sort((a, b) => b.change - a.change).slice(0,3);

            const leaderboardDisplay = leaderboard.length
                ? leaderboard.map((user, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const sign = user.change >= 0 ? '+' : '-';

                    return (
                        `${medals[index]} **${user.displayName}:** ${sign}${Math.abs(user.change)} ${unitDescriptor(user.change)}`
                    );
                }).join('\n')
                : '*No monthly activity*';

            //Event Calculations
            const eventsData = getAllEvents();
            const eventStatsMap = new Map();

            for (const tx of monthTransactions) {
                const txEvent = tx.event || null;
                if (!txEvent?.id) continue;

                const occurrenceKey = getTransactionInstanceKey(txEvent);
                const existing = eventStatsMap.get(occurrenceKey);

                if (!existing) {
                    const event = eventsData[txEvent.id] || null;
                    const startTime = txEvent.start_time ?? event?.start_time ?? tx.timestamp;

                    eventStatsMap.set(occurrenceKey, {
                        id: txEvent.id,
                        key: occurrenceKey,
                        name: event?.name ?? txEvent.name,
                        startTime,

                        //running statistics for event
                        attendees: 0,
                        onTime: 0,
                        late: 0
                    });
                }

                const eventStats = eventStatsMap.get(occurrenceKey);
                if (!eventStats) continue;

                eventStats.attendees++;

                if (tx.minutes < 0) {
                    eventStats.late++;
                } else {
                    eventStats.onTime++;
                }
            }

            const monthlyEvents = [...eventStatsMap.values()]
                .sort((a,b) => a.startTime - b.startTime);

            const monthlyEventsDisplay = monthlyEvents.length ? monthlyEvents.map(event => {
                const onTimeRate = Math.round(
                    (event.onTime / event.attendees) * 100
                );
            
                const time = `<t:${Math.floor(event.startTime / 1000)}:D>`;

                return (
                    `📆 **${event.name}** • ${time}\n` +
                    `${event.onTime}/${event.attendees} attendees on time *(${onTimeRate}%)*`
                );
            }).join('\n\n') : '*No events with Timebank transactions this month*';

            const statement = new EmbedBuilder()
                .setTitle(`🏦 ${monthYearName} Timebank Statement`)
                .setColor([180, 180, 208])
                .setDescription(`Timebank Account balances have been adjusted.\n*At the end of the month, 10% of the balance from each Timebank account is transfered into the national balance.*`)
                .addFields(
                    {
                        name: `${monthName} National Adjustment`,
                        value: `${oldNationalBalance} ${unitDescriptor(oldNationalBalance)}→ **${nationalBalance} minute ${balanceOrDebt}**\n*${Math.abs(nationalChange)} minute ${surplusOrDeficit}*`, 
                        inline: true
                    },
                    {
                        name: `⮂ Transactions`,
                        value: 
                            `⌛️ Exchanged: **${totalMinutes} ${unitDescriptor(totalMinutes)}** (+${positiveMins} min, -${negativeMins} min)\n` +
                            `↗ Deposits: **${deposits || 0}**\n` +
                            `↘ Withdrawals: **${withdrawals || 0}**`,
                        inline: true
                    },
                    {
                        name: `${monthName} Leaderboard`,
                        value: leaderboardDisplay,
                        inline: false
                    },
                    {
                        name: 'Events',
                        value: monthlyEventsDisplay,
                        inline: false
                    }
                )
                .setFooter({
                    text: `${monthYearName} Timebank Statement`,
                    iconURL: guild.iconURL()
                })
                .setTimestamp();
                //.setTimestamp(currentMonthStart); //Sub this version in to always show timestamp as start of month (instead of accurate timestamp)

            resolve(statement);
        } catch (err) {
            reject(err);
        }
    });
}

function newTransaction(userId, minutes, event = null, authorId = null) {
    const data = readTimebankData();
    if (!data.accounts[userId]) {
        console.log(`[Timebank] No Timebank Account for user: ${userId}`);
        return;
    };

    const id = randomUUID();
    const type = minutes > 0 ? 'deposit' : 'withdrawal';
    const auto = authorId ? false : true;
    // Normalize event payload on the transaction to include occurrence metadata when available
    let txEvent = null;
    if (event) {
        txEvent = {
            id: event.id,
            name: event.name
        };

        if (event.start_time) {
            txEvent.start_time = event.start_time;
            txEvent.instance_id = `${event.id}:${event.start_time}`;
        }
    }

    const transaction = {
        id,
        userId,
        type,
        start_balance: data.accounts[userId].balance ?? 0,
        minutes,
        event: txEvent,
        authorId,
        auto,
        timestamp: Date.now(),
        reverted: false
    }

    data.transactions ??= [];
    data.transactions.push(transaction);

    data.accounts[userId].balance += minutes;

    writeTimebankData(data);
    return transaction;
}

function newBulkTransaction(userIds, minutes, event = null, author = null) {
    let transactions = [];
    for (const userId of userIds) {
        transactions.push(newTransaction(userId, minutes, event, author));
    }
    return transactions;
}

function revertTransaction(id) {
    const data = readTimebankData();
    const transaction = getTransaction(id, data);
    if (transaction.reverted) {
        throw new Error('Transaction has already been reverted');
    }

    data.accounts[transaction.userId].balance += -transaction.minutes;
    transaction.reverted = true;
    writeTimebankData(data);
    return transaction;
}

/**
 * Updates all display names in timebankData based on current guild member data
 * Runs monthly with the reduction, but can also be called manually if needed
 * @param {Object} client - Discord client instance
 * @returns {Promise<Object>} Result object with update details
 */
function updateAllDisplayNames(client) {
    return new Promise(async (resolve, reject) => {
        try {
            const { ids = {} } = require('../../config.json');
            const guildId = ids.servers.soup.guild;
            const guild = client.guilds.cache.get(guildId);

            if (!guild) {
                reject('Guild not found');
                return;
            }

            const data = readTimebankData();
            const userIds = Object.keys(data.accounts);

            // Batch fetch members from the guild
            const members = await guild.members.fetch({ user: userIds, force: false });

            let namesUpdated = 0;
            const updates = [];

            // Update display names for each account
            for (const [userId, account] of Object.entries(data.accounts)) {
                const member = members.get(userId);
                let displayName;

                if (member) {
                    displayName = member.nickname || member.user.displayName;
                } else {
                    try {
                        const user = await client.users.fetch(userId);
                        displayName = user.displayName;
                    } catch {
                        displayName = account.display_name; // Keep old name if user not found
                    }
                }

                if (displayName !== account.display_name) {
                    updates.push({
                        id: userId,
                        oldName: account.display_name,
                        newName: displayName
                    });
                    account.display_name = displayName;
                    namesUpdated++;
                }
            }

            writeTimebankData(data);

            resolve({
                success: true,
                namesUpdated,
                updates,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Record a transaction type in the stats for the monthly statement
 * @param {string} type - The type of transaction ('deposit' or 'withdrawal')
 * @returns {Promise<void>}
 */
function recordTransactionType(type) {
    return new Promise((resolve, reject) => {
        try {
            const data = readTimebankData();
            if (!data.stats) {
                data.stats = { deposits: 0, withdrawals: 0 };
            }

            if (type === 'deposit') {
                data.stats.deposits += 1;
            } else if (type === 'withdrawal') {
                data.stats.withdrawals += 1;
            } else {
                reject('Invalid transaction type');
                return;
            }

            writeTimebankData(data);

            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Clear montly transaction stats
 */

function unitDescriptor(amount) {
    let descriptor = 'minutes';
    if (Math.abs(amount) == 1) descriptor = 'minute';
    return descriptor;
}

function getEventTimebankAmount(eventStartTime, joinTime = Date.now()) {
    const diffMinutes = Math.ceil((eventStartTime - joinTime) / 60000);
    return (Math.max(-30, Math.min(30, diffMinutes)));
}

// Transaction History Functions


// Check if a user has attendance for a given event
function hasAttendanceTransaction(eventId, userId, startTime = null) {
    const data = readTimebankData();

    if (startTime != null) {
        const instanceId = `${eventId}:${startTime}`;
        return data.transactions.some(transaction =>
            !transaction.reverted &&
            transaction.userId === userId &&
            (
                transaction.event?.instance_id === instanceId ||
                (transaction.event?.start_time === startTime && transaction.event?.id === eventId)
            )
        );
    }

    return data.transactions.some(transaction =>
        !transaction.reverted &&
        transaction.userId === userId &&
        transaction.event?.id === eventId
    );
}

function getTimebankEventCandidates(userId) {
    const now = Date.now();

    const candidates = Object.values(getAllEvents()).filter(event => {
        if (!event.interested_members.includes(userId)) return false;
        if (event.status !== 'scheduled' && event.status !== 'active') return false;

        const windowStart = event.start_time - 30 * 60 * 1000;
        const windowEnd = event.start_time + 30 * 60 * 1000;

        return now >= windowStart && now <= windowEnd;
    });

    if (candidates.length === 0) {
        return null;
    }

    if (candidates.length === 1) {
        return {
            ambiguous: false,
            event: candidates[0]
        };
    }

    return {
        ambiguous: true,
        events: candidates
    };
}

function getTransaction(id, data = readTimebankData()) {
    return data.transactions.find(transaction => transaction.id === id) || null;
}

function getTransactionInstanceKey(eventLike = null) {
    if (!eventLike) return null;

    if (eventLike.instance_id) {
        return eventLike.instance_id;
    }

    if (eventLike.start_time != null && eventLike.id) {
        return `${eventLike.id}:${eventLike.start_time}`;
    }

    return eventLike.id || null;
}

function getTransactionsByEvent(eventId, startTime = null, data = readTimebankData()) {
    if (startTime != null) {
        const instanceId = `${eventId}:${startTime}`;
        return data.transactions.filter(transaction => {
            if (!transaction.event) return false;
            return transaction.event.instance_id === instanceId ||
                (transaction.event.start_time === startTime && transaction.event.id === eventId);
        });
    }

    return data.transactions.filter(
        transaction => transaction.event?.id === eventId
    );
}

/**
 * Revert all non-reverted transactions for a specific event occurrence (eventId + startTime)
 * Returns array of reverted transaction ids
 */
function revertTransactionsForOccurrence(eventId, startTime) {
    const data = readTimebankData();
    const instanceId = `${eventId}:${startTime}`;
    const reverted = [];

    for (const transaction of data.transactions) {
        if (transaction.reverted) continue;
        if (!transaction.event) continue;

        const matchesInstance = (transaction.event.instance_id === instanceId) || (transaction.event.start_time === startTime && transaction.event.id === eventId);
        if (!matchesInstance) continue;

        // Adjust account balance by negating the transaction minutes
        if (data.accounts[transaction.userId]) {
            data.accounts[transaction.userId].balance += -transaction.minutes;
        }
        transaction.reverted = true;
        reverted.push(transaction.id);
    }

    writeTimebankData(data);
    return reverted;
}

function getTransactionsByUser(userId, data = readTimebankData()) {
    return data.transactions.filter(
        transaction => transaction.userId === userId
    );
}

const getMostRecent = (arr = [], limit = 3) => {
    return [...arr]
        .filter(Boolean)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limit);
};

module.exports = {
    getTimebankAccount,
    createTimebankAccount,
    pushTimebankAccount,
    getAllTimebank,

    newTransaction,
    newBulkTransaction,
    revertTransaction,

    applyMonthlyReduction,
    getNationalBalance,
    ensureTimebankFileExists,
    readTimebankData,
    writeTimebankData,
    updateAllDisplayNames,

    getBalanceStatement,
    getTransactionStatement,
    getSummaryStatement,
    getMonthlyStatement,

    recordTransactionType,
    unitDescriptor,
    getEventTimebankAmount,

    hasAttendanceTransaction,
    getTimebankEventCandidates,
    getTransaction,
    getTransactionsByEvent,
    getTransactionsByUser,
    revertTransactionsForOccurrence,
    TIMEBANK_FILE
};