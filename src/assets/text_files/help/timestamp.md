# :clock4: About Timestamp
The ${cmd:timestamp} command generates copyable dynamic timestamps in a range of formats. Timestamp outputs will only be visible to *you*, so this command is great for creating messages with timestamps.
### Time parameters
The hours and minutes parameters are required; all other parameters are optional. By default, any unentered fields will assume the nearest possible date and time in the future.
`hours:` Set the hour. Accepts values from 0-23.
`minutes:` Set the minute. Accepts values from 0-59.
`pm:` true/false. Set to true if you don't feel like converting to 24-hour time.
`month:` Set the month. Accepts any of the 12 regular months.*
`date:` Sets the date. Accepts values from 0-31.
`year:` Sets the year.
-# \***A note about the time council:** The time council officially recognizes Sol as a 13th month between June and July on the server. Because dynamic timestamps do not include Sol, it is not possible to set it as a month using the timestamp command.
### :map: Time Zones
By default, the ${cmd:timestamp} command will assume you are in Central Time (North America) when handling your input. To generate a timestamp based on a *different* time zone, use the `timezone` parameter and select a time zone from the drop down. After generating a timestamp using the `timezone` parameter, you will be prompted to set a new default timezone, should you wish to do so.