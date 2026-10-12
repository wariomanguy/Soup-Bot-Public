/**
 * Migration script to consolidate individual timebank JSON files into a single centralized file
 * Run this once to migrate data, then delete the old individual files
 */

const fs = require('fs');
const path = require('path');

const OLD_TIMEBANK_DIR = './src/savedata/timebank';
const TIMEBANK_DATA_UTIL = require('./src/utils/timebankTools');

async function migrateTimebankData() {
    console.log('🔄 Starting timebank data migration...\n');

    try {
        // Read all files from the old timebank directory
        const files = fs.readdirSync(OLD_TIMEBANK_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            console.log('❌ No timebank files found to migrate.');
            return;
        }

        console.log(`📂 Found ${jsonFiles.length} timebank account file(s)\n`);

        // Initialize the centralized data file
        TIMEBANK_DATA_UTIL.ensureTimebankFileExists();
        let timebankData = TIMEBANK_DATA_UTIL.readTimebankData();

        let successCount = 0;
        let errorCount = 0;

        // Migrate each file
        jsonFiles.forEach(file => {
            try {
                const filePath = path.join(OLD_TIMEBANK_DIR, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const account = JSON.parse(fileContent);

                // Add to centralized data
                timebankData.accounts[account.id] = account;
                console.log(`✅ Migrated: ${file} (ID: ${account.id})`);
                successCount++;
            } catch (err) {
                console.error(`❌ Error migrating ${file}:`, err.message);
                errorCount++;
            }
        });

        // Write the consolidated data
        TIMEBANK_DATA_UTIL.writeTimebankData(timebankData);

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Successfully migrated: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📁 New file location: ./src/savedata/timebank.json`);
        console.log(`\nℹ️ Next steps:`);
        console.log(`   1. Verify the new timebank.json file is correct`);
        console.log(`   2. Back up the old individual files if desired`);
        console.log(`   3. Delete ./src/savedata/timebank/ directory after confirming migration`);
        console.log(`   4. Update any other files that reference the old directory structure\n`);

    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
}

// Run the migration
migrateTimebankData();
