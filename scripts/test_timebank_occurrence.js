const assert = require('node:assert/strict');
const { GuildScheduledEventStatus } = require('discord.js');
const eventTools = require('../src/utils/eventTools');
const t = require('../src/utils/timebankTools');

const run = async () => {
    const data = t.readTimebankData();
    if (!data.accounts) data.accounts = {};
    if (!data.transactions) data.transactions = [];

    const accountId = 'TESTUSER';
    data.accounts[accountId] = { display_name: 'TestUser', id: accountId, balance: 0 };
    data.transactions = data.transactions.filter(tx => !(tx.userId === accountId && tx.event && tx.event.id && (
        tx.event.id.startsWith('TEST_') ||
        tx.event.id === 'INSTANCE_TEST_EVENT' ||
        tx.event.id.startsWith('INSTANCE_TEST_EVENT')
    )));
    t.writeTimebankData(data);

    const falsePositiveEvent = {
        id: 'TEST_FALSE_POSITIVE_EVENT',
        guild_id: 'TEST_GUILD',
        name: 'False Positive Test',
        description: null,
        type: 'voice',
        voice_channel_id: 'TEST_CHANNEL',
        location: null,
        interested_members: [accountId],
        status: 'scheduled',
        start_time: 1000,
        end_time: 2000,
        recurring: false,
        recurrence_rule: null
    };

    const originalEvents = eventTools.readEventData();
    delete originalEvents.events[falsePositiveEvent.id];
    originalEvents.events[falsePositiveEvent.id] = falsePositiveEvent;
    eventTools.writeEventData(originalEvents);

    const tx = t.newTransaction(accountId, 10, { id: falsePositiveEvent.id, name: falsePositiveEvent.name, start_time: falsePositiveEvent.start_time });
    assert.equal(tx && tx.id, tx.id);

    const activeUpdate = eventTools.updateEvent({
        id: falsePositiveEvent.id,
        guildId: falsePositiveEvent.guild_id,
        name: falsePositiveEvent.name,
        description: null,
        entityType: 2,
        channelId: falsePositiveEvent.voice_channel_id,
        entityMetadata: { location: null },
        status: GuildScheduledEventStatus.Active,
        scheduledStartTimestamp: 5000,
        scheduledEndTimestamp: 6000,
        recurrenceRule: null
    });
    assert.deepEqual(activeUpdate.revertedIds, []);
    assert.equal(t.getTransactionsByEvent(falsePositiveEvent.id, 1000).filter(tx => !tx.reverted).length, 1);

    const completedUpdate = eventTools.updateEvent({
        id: falsePositiveEvent.id,
        guildId: falsePositiveEvent.guild_id,
        name: falsePositiveEvent.name,
        description: null,
        entityType: 2,
        channelId: falsePositiveEvent.voice_channel_id,
        entityMetadata: { location: null },
        status: GuildScheduledEventStatus.Completed,
        scheduledStartTimestamp: 7000,
        scheduledEndTimestamp: 8000,
        recurrenceRule: null
    });
    assert.deepEqual(completedUpdate.revertedIds, []);
    assert.equal(t.getTransactionsByEvent(falsePositiveEvent.id, 1000).filter(tx => !tx.reverted).length, 1);

    const rescheduleEvent = {
        id: 'TEST_RESCHEUDLE_EVENT',
        guild_id: 'TEST_GUILD',
        name: 'Reschedule Test',
        description: null,
        type: 'voice',
        voice_channel_id: 'TEST_CHANNEL',
        location: null,
        interested_members: [accountId],
        status: 'scheduled',
        start_time: 2000,
        end_time: 3000,
        recurring: false,
        recurrence_rule: null
    };

    delete originalEvents.events[rescheduleEvent.id];
    originalEvents.events[rescheduleEvent.id] = rescheduleEvent;
    eventTools.writeEventData(originalEvents);

    const rescheduleTx = t.newTransaction(accountId, 10, { id: rescheduleEvent.id, name: rescheduleEvent.name, start_time: rescheduleEvent.start_time });
    const rescheduledResult = eventTools.updateEvent({
        id: rescheduleEvent.id,
        guildId: rescheduleEvent.guild_id,
        name: rescheduleEvent.name,
        description: null,
        entityType: 2,
        channelId: rescheduleEvent.voice_channel_id,
        entityMetadata: { location: null },
        status: GuildScheduledEventStatus.Scheduled,
        scheduledStartTimestamp: 9000,
        scheduledEndTimestamp: 10000,
        recurrenceRule: null
    });
    assert.equal(rescheduledResult.revertedIds.length, 1);
    assert.equal(t.getTransactionsByEvent(rescheduleEvent.id, 2000).filter(tx => tx.reverted).length, 1);
    assert.equal(rescheduleTx.id, rescheduledResult.revertedIds[0]);

    const recurringId = 'INSTANCE_TEST_EVENT';
    const eventsData = eventTools.readEventData();
    eventsData.events[recurringId] = {
        id: recurringId,
        guild_id: 'TEST_GUILD',
        name: 'Recurring Test',
        description: null,
        type: 'voice',
        voice_channel_id: 'TEST_CHANNEL',
        location: null,
        interested_members: [accountId],
        status: 'scheduled',
        start_time: 3000,
        end_time: 4000,
        recurring: true,
        recurrence_rule: null
    };
    eventTools.writeEventData(eventsData);

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12, 0, 0, 0);
    const instanceTime1 = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 3, 12, 0, 0, 0).getTime();
    const instanceTime2 = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 10, 12, 0, 0, 0).getTime();

    const recurringTx1 = {
        id: 'RECURRING_TX_1',
        userId: accountId,
        type: 'deposit',
        start_balance: data.accounts[accountId].balance,
        minutes: 10,
        event: { id: recurringId, name: 'Recurring Test', start_time: instanceTime1, instance_id: `${recurringId}:${instanceTime1}` },
        authorId: null,
        auto: true,
        timestamp: instanceTime1,
        reverted: false
    };
    const recurringTx2 = {
        id: 'RECURRING_TX_2',
        userId: accountId,
        type: 'deposit',
        start_balance: data.accounts[accountId].balance + 10,
        minutes: 5,
        event: { id: recurringId, name: 'Recurring Test', start_time: instanceTime2, instance_id: `${recurringId}:${instanceTime2}` },
        authorId: null,
        auto: true,
        timestamp: instanceTime2,
        reverted: false
    };

    data.transactions.push(recurringTx1, recurringTx2);
    data.accounts[accountId].balance += 15;
    t.writeTimebankData(data);

    const summary = await t.getSummaryStatement({ guild: { iconURL: () => null } });
    const summaryEventsField = summary.data.fields.find(f => f.name === '📆 Recent Events');
    assert.ok(summaryEventsField, 'summary events field missing');
    assert.equal((summaryEventsField.value.match(/Recurring Test/g) || []).length, 2, 'summary should separate recurring instances');

    const monthly = await t.getMonthlyStatement({ iconURL: () => null });
    const eventField = monthly.data.fields.find(f => f.name === 'Events');
    assert.ok(eventField, 'monthly events field missing');
    assert.equal((eventField.value.match(/Recurring Test/g) || []).length, 2, 'monthly statement should separate recurring instances');

    console.log('occurrence timebank regression checks passed');
};

run();
