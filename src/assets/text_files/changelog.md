## Server Version 9.11 (Bot Version 5)
### 🏛️ Timebank
- If an event is cancelled or rescheduled before it starts, Timebank transactions related to the event will now be automatically reverted
- If an event has not started 30 minutes after its scheduled start time, Soup Bot will now send a reminder to start the event
- If nobody attends an event, Auto Timebank penalties will no longer be awarded
- Summary statements now show more recent transactions and recent events than before:
  - 3 most recent transactions → 6 most recent transactions
  - 3 most recent events → 4 most recent events
- Reoccurring Event Support:
  - Transactions can now be properly associated with individual instances of a reoccurring event
  - Auto Timebank now works on reoccuring events so long as an individual instance of the event has not been rescheduled or deleted (this is unfortunately a limitation of the Discord API at this time)
  - Statistics in summary and monthly statements no longer incorrectly group transactions from multiple instances together
- Soup Bot now internally records the authors of transactions
### Other Features and Changes
- The cooldown between creating new posts in <#1485447630581661826> (# 🌶️**hot-takes**) has been reduced from 15 minutes to 5 minutes
- The <#1427525371485753354> channel has been renamed from # **🪲bugs-and-requests** to # **🪲feedback** (you need the <@&1267891080356040787> [Development] role to view this channel)
- The "Member Channels" category has been renamed to "Member Created" for clarity
- Some Soup Bot legacy code has been updated to better fit more recent backend structural changes
- The <#1330327874439348267> (🔊 🪐 **outer wilds**) channel has been archived and marked as a Spoiler channel
### Issues and Bug Fixes
- Resolved an issue where Auto Timebank would round award deposits and withdrawls incorrectly, making transactions one minute later than they should have been
- Removed edge cases where Auto Timebank would apply to users who were not marked as interested in an event
- Corrected permissions for forum channels on the server like <#1485447630581661826> (# 🌶️**hot-takes**) so that they behave correctly