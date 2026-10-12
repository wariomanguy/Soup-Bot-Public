# Soup Bot Readme
-# *because your ass forgot how this stuff works*

## Switching between the dev bot and the pi bot
Because .env is ignored by Git, edits made on your computer will automatically be reflected in the dev bot, and the pi will always run the most recent push to main. If you want to run the actual real bot from your computer (I have no idea why you would do this unless the pi breaks), you can switch the active tokens under .env.

## Running the dev bot
To run the dev bot, make sure the terminal is in the project folder (it should be if you're in the VS Code workspace) and run this:
```node src/index.js```

## Running the primary bot
Why the hell is it down? What did you fucking do.

Okay, well to get it up and running with PM2 you should be able to just run:
```pm2 start soupbot```

### That didn't work

If PM2 wasn't recognized, navigate to the project folder (`cd /home/liam/Developer/Soup-Bot`) and run `npm`. From there, run `pm2 list` to see if soupbot exists. If it doesn't, you can create it using:
```pm2 start /home/liam/Developer/Soup-Bot/src/index.js --name soupbot```

Make sure to run `pm2 save` afterwards so that the restart service will work.

Depending on the state of your git stuff at this point, you may need to reconfigure your actions runner. If that's the case you're looking that shit up because I barely know how it works and I just set it up.

## Reregister Commands
If you need to force re-register commands for the bot, run thw following:
`npm run reregister-commands`
Then restart the bot.

# CURRENTLY WORKING ON
Adding "national debt" feature to timebank. System of updating balances every month is already in place, just need to make national balance user facing.

Options:
- message in quickfire at start of every month with summary of changes
- include in rankings?
- new subcommand for national debt?/mentioning soup bot?

# ROADMAP FOR 4.0 RELEASE
[/] Multi-server support
  [] Help Commands
[] Timebank
  [✓] New Timebank monthly statements system
  [] Automatically timebank people who are late to events (maybe give credit if they are early as well?)
[] Google Calendar Integration
  [] Soup Events Calendar
  [] Vinland Events Calendar
[✓] Community Notes
  [✓] Move all functionality into note.js file
  [✓] Leave custom ragebait note text
[] /drift command for Ella Server
[✓] Admin Command for posting messages and changelog as Soup Bot