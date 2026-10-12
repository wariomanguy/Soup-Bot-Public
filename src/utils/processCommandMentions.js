const getCommandMention = require('./getCommandMention');

module.exports = (markdownContent) => {
    // Replace ${cmd:commandName} or ${cmd:command subcommand} with proper mention
    return markdownContent.replace(/\$\{cmd:([^}]+)\}/g, (match, commandString) => {
        return getCommandMention(commandString);
    });
};
