/**
 * Gets display name for a target
 * @param {Member or User} target - The member or user target to get the display name for.
 * @returns {string} The display name
 */
async function getDisplayName(target) {
    // GuildMember
    if ('user' in target) {
        return target.nickname ?? target.user.displayName;
    }

    // User
    return target.displayName;
}

module.exports(
    getDisplayName
)