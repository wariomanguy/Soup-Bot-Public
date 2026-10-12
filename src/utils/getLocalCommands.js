const path = require("path");
const getAllFiles = require("./getAllFiles");

//Returns all commands
function getLocalCommands() {
    // Absolute path to your interactions/commands folder
    const commandsRoot = path.join(process.cwd(), "src", "interactions", "commands");
    // console.log("[getLocalCommands] Commands root path:", commandsRoot);

    // Recursively fetch all JS files
    const commandFiles = getAllFiles(commandsRoot).filter(file => file.endsWith(".js"));

    const commands = [];

    for (const file of commandFiles) {
        const command = require(file);

        // Command must have either name OR data.name
        const name = command.name || command.data?.name;
        if (!name) {
            console.warn(`[Commands] Skipping file missing a name: ${file}`);
            continue;
        }

        commands.push(command);
    }
    return commands;
}

// Get commands by their name
function getCommandByName(name) {
    return getLocalCommands().find(
        command => command.data?.name === name || command.name === name
    );
}


// Used for non-slash command interactions that rely on prefixes to get to the right place
function getCommandByPrefix(prefix) {
    return getLocalCommands().find(
        command => command.interactionPrefix === prefix
    );
}


module.exports = {
    getLocalCommands,
    getCommandByName,
    getCommandByPrefix,
};
