const { ids } = require('../../../config.json');

module.exports = async (client, oldGuild, newGuild) => {
    const PARENT_GUILD_ID = process.env.CLIENT_ID === ids.bots.dev
        ? ids.servers.soup_dev.guild
        : ids.servers.soup.guild;

    // Ignore updates from every other server
    if (newGuild.id !== PARENT_GUILD_ID) return;

    try {
        // Only update username if the server name changed
        if (oldGuild.name !== newGuild.name) {
            const serverName = newGuild.name;
            if (serverName) {
                console.log('Server name changed:', serverName);
                await client.user.setUsername(serverName);
                console.log('Bot username updated successfully.');
            }
        }

        // Only update avatar if the server icon changed
        if (oldGuild.icon !== newGuild.icon) {
            const serverPicture = newGuild.iconURL({
                extension: 'png',
                size: 1024
            });

            if (serverPicture) {
                console.log('Server icon changed:', serverPicture);
                await client.user.setAvatar(serverPicture);
                console.log('Bot avatar updated successfully.');
            } else {
                console.log('Server icon was removed.');
            }
        }
    } catch (err) {
        console.error('Failed to update bot appearance:', err);
    }
};