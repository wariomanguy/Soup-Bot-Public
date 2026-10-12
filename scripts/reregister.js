require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing TOKEN or CLIENT_ID in environment.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

const cfgPath = path.join(process.cwd(), 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

// gather guild IDs from guildGroups recursively
const gatherGuildIds = (obj) => {
  const ids = new Set();

  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(id => typeof id === 'string' && ids.add(id));
      return;
    }
    if (typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };

  walk(obj);
  return [...ids];
};

const guildIds = gatherGuildIds(cfg.guildGroups || {});

(async () => {
  try {
    console.log('Clearing global commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('Global commands cleared.');

    for (const gid of guildIds) {
      console.log(`Clearing commands for guild ${gid}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, gid), { body: [] });
      console.log(`Cleared guild ${gid}.`);
    }

    console.log('Done. Restart your bot to re-run the registration logic.');
  } catch (err) {
    console.error('Error clearing commands:', err);
    process.exit(1);
  }
})();
