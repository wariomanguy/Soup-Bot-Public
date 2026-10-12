# :bank: Timebank Help
The `/timebank` command can be used to hold other server members accountable for showing up to events on time! To change someone's account balance, type in `/timebank` followed by the action you'd like to complete:
### ⚖️ Balance
${cmd:timebank balance} will return the balance of any existing Timebank account. By default, it will return your balance. Use the optional `user` argument to view someone else's.
### ⮂ Transactions (`deposit` or `withdraw`)
Use ${cmd:timebank deposit} to add time into another user's balance, and ${cmd:timebank withdraw} to subtract from it. The deposit and withdraw actions automatically prompt you for a target user and amount. *To prevent manipulation, you can't change your own balance. Someone else will have to make the transaction for you.* The maximum amount that can deposited or withdrawn in a single transaction is 30 minutes.
### 📋 Summary
You can bring up a Timebank Summary Statement by using ${cmd:timebank summary}. The summary shows recent transactions & events, as well as general statistics about the Timebank.
### 🥇 Rankings
To view a rankings board of all the timebank balances on the server, use ${cmd:timebank rankings}.
### 🔄 Auto Timebank
For scheduled events that take place in a voice channel, Soup Bot will automatically apply Timebank transactions to users interested in the event (if they already have a Timebank account). Sometimes an attendance verification period will need to occur before the transaction is posted to the event channel, but the resulting transaction will always reflect the time the user initially joined the event.