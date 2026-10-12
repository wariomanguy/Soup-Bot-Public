const fs = require('fs');
const path = require('path');

const getCommandId = (commandName) => {
    try {
        const commandIdsPath = path.join(__dirname, '../savedata/commandIds.json');
        const commandIds = JSON.parse(fs.readFileSync(commandIdsPath, 'utf8'));
        return commandIds[commandName] || null;
    } catch (error) {
        console.warn(`Could not load command IDs:`, error.message);
        return null;
    }
};

module.exports = (commandString) => {
    // Handle both 'help' and 'timebank balance' formats
    const parts = commandString.trim().split(/\s+/);
    const baseCommand = parts[0];
    const subcommand = parts.slice(1).join(' ') || null;
    
    const commandId = getCommandId(baseCommand);
    if (!commandId) {
        console.warn(`⚠ Command ID for "${baseCommand}" not found.`);
        return `/${baseCommand}${subcommand ? ` ${subcommand}` : ''}`; //Fallback to plain text
    }
    
    if (subcommand) {
        return `</${baseCommand} ${subcommand}:${commandId}>`;
    }
    return `</${baseCommand}:${commandId}>`;
};