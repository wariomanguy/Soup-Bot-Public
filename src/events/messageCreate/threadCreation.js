const { ids = {} } = require('../../../config.json');

function extractHighestHeading(content) {
    const lines = content.split('\n');
    const headingRegex = /^(#{1,6})\s+(.*)/;

    let bestLevel = Infinity;
    let bestHeading = null;

    for (const line of lines) {
        const match = line.match(headingRegex);
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            if (level < bestLevel) {
                bestLevel = level;
                bestHeading = text;
            }
            if (level === 1) break;
        }
    }

    return bestHeading;
}

function cleanHeading(heading, maxLength) {
    const customEmojiRegex = /<a?:\w+:\d+>/g;
    heading = heading.replace(customEmojiRegex, '').trim();
    heading = heading.replace(/\s{2,}/g, ' ');

    if (heading.length > maxLength) {
        return heading.slice(0, maxLength - 3).trim() + '...';
    }

    return heading;
}

module.exports = async (client, message) => {
    //console.log('message post received');
    if (message.author.bot) return;

    const threadChannels = [ids.servers.soup.announcements, ids.servers.soup.gallery];
    
    // dev server channels for testing
    //const threadChannels = ['1227774353576427522', '1427438074325110824'];

    if (!threadChannels.includes(message.channel.id)) {
        //console.log(`[Thread Creation] channel ID does not match a thread channel: ${message.channel.id}`);
        return;
    }

    let heading = extractHighestHeading(message.content);
    let finalHeading;
    //console.log('Attempting to create thread');

    if (heading) {
        finalHeading = cleanHeading(heading, 100);
    } else {
        const displayName = message.author.nickname || message.author.displayName;
        if (message.channel.id === ids.servers.soup.gallery) {
            finalHeading = `${displayName}'s Post`;
        } else {
            finalHeading = `${displayName}'s Announcement`;
        }
    }

    try {
        await message.startThread({
            name: finalHeading,
            autoArchiveDuration: 4320,
        });

        console.log(`[Thread Creation] Thread created with title: ${finalHeading}`);
    } catch (error) {
        console.error('[Thread Creation] Error creating thread:', error);
    }
};
