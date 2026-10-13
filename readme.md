# Soup Bot
This is Soup Bot! A personal Discord bot project of mine built on Discord.js. It's not really designed to be used by anyone else (there are some Discord server and channel specific features), but feel free to poke around the source code if you're curious or want to use parts of it for a project of your own!

## Want to Make Your Own Instance of Soup Bot?
I'm flattered! Why are you doing this??? You'll need to configure a .env file at the top level of the project with your unique bot token and client ID. Sort all of that out from the [Discord Developer Portal](https://discord.com/developers/home). While you're there you should also sort out bot permissions. I'm not going to tell you how to do that because honestly Discord keeps changing it and (as of late 2026) they're in the middle of a transition right now with OAuth2 stuff that I barely understand myself. The bot functions best with all three of the major intents: Presence, Server Members, and Message Content. Most features rely exclusively on `/commands` but your mileage may vary.

You will also need to [install Node.js](https://nodejs.org/en/download) and run `npm install` from the project folder to grab all the tasty dependencies.

The bot will behave much better if you install it on a server rather than trying to run it as a personal "Authorized App" on your Discord account.

## Running the bot
Run `node src/index.js` from the project folder from a device with a working (hopefully stable) internet connection.
