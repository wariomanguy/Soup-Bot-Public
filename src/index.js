require('dotenv').config();
const {Client, IntentsBitField, ActivityType} = require('discord.js');
const eventHandler = require('./handlers/eventHandler');
const { version } = require('os');
const internal = require('stream');
const fs = require('fs');

//Client: This is the bot class
//IntentsBitField:
process.noDeprecation = true;

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildScheduledEvents,
        IntentsBitField.Flags.GuildVoiceStates
    ],
});

eventHandler(client);

client.login(process.env.TOKEN).catch((error) => {
    console.error('Error logging in:', error);
    process.exit(1);
});

// Catch uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function restartBot() {
    client.destroy();
    process.exit(1); // Exits the process to allow for a restart
}