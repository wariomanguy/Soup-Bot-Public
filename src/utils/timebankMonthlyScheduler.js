const cron = require('node-cron');
const { applyMonthlyReduction, updateAllDisplayNames, getMonthlyStatement } = require('./timebankTools');

const { ids = {} } = require('../../config.json');
const { channel } = require('diagnostics_channel');
const { exec } = require('child_process');

let cronTask = null;
let client = null;

/**
 * Initialize the monthly timebank reduction scheduler
 * Runs at 00:00 on the 1st of every month (UTC)
 */
function initializeMonthlyScheduler(discordClient) {
    if (cronTask) {
        console.log('[Timebank] Monthly scheduler already running');
        return;
    }

    client = discordClient;
    const guildId = ids.servers.soup.guild;
    const guild = client.guilds.cache.get(guildId);

    // Cron format: minute hour day month day-of-week
    // '0 0 1 * *' = 00:00 on the 1st of every month

    //cronTask = cron.schedule('* * * * *', async () => { //TEST SCHEDULE (runs every minute)
    cronTask = cron.schedule('0 0 1 * *', async () => { //NORMAL SCHEDULE (runs at start of each month)
        await endMonthReset(guild);
    }, {
        scheduled: true,
        timezone: 'America/Chicago'
    });

    console.log('[Timebank] ✓ Monthly cycle scheduler initialized');
}

/**
 * Stop the scheduler (useful for cleanup or testing)
 */
function stopMonthlyScheduler() {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        console.log('[Timebank] ⏹️ Monthly scheduler stopped');
    }
}

// Runs all end of month tasks: reduction, name updates, and statement generation
async function endMonthReset(guild) {
        console.log('[Timebank] 🔄 Running monthly timebank reduction...');
    try {
        const result = await applyMonthlyReduction();
        console.log('✓ Monthly reduction completed:');
        console.log(`Accounts reduced: ${result.accountsReduced}`);
        console.log(`Total reduction: ${result.totalReduction} minutes`);
        console.log(`National balance: ${result.nationalBalance} minutes`);
        console.log(`Timestamp: ${result.timestamp}`);
    } catch (error) {
        console.error('❌ Error applying monthly reduction:', error);
    }

    // Update stored user names based on Soup guild
    //console.log('🔄 Updating display names...');
    try {
        const result = await updateAllDisplayNames(client);
        console.log(`✓ Display names updated: ${result.namesUpdated}`);
        if (result.namesUpdated > 0) {
            result.updates.forEach(update => {
                console.log(`      ${update.oldName} → ${update.newName}`);
            });
        }
    } catch (error) {
        console.error('[Timebank] ❌ Error updating user names:', error);
    }

    const statementEmbed = await getMonthlyStatement(guild);
    let targetChannel = guild.channels.cache.get(ids.servers.soup.broth);
    if ((process.env.CLIENT_ID === ids.bots.dev)) {
        targetChannel = guild.channels.cache.get(ids.servers.soup.testing); //Prevent dev bot from sending to quickfire
    }

    if (targetChannel) {
        targetChannel.send({ embeds: [statementEmbed] });
        console.log('[Timebank] 📊 Monthly statement posted to channel');
    } else {
        console.log('Embed Data:', statementEmbed.data);
        console.warn(`[Timebank] ⚠ Couldn't find target channel for monthly statement`);
    }
}

module.exports = {
    initializeMonthlyScheduler,
    stopMonthlyScheduler,
    endMonthReset
};
