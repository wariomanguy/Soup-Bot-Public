// test_note_storage.js (put in repo root)
const noteStore = require('../src/utils/noteStorage');
const { randomUUID } = require('crypto');

const noteId = randomUUID();
const note = {
  id: noteId,
  userId: 'TESTUSER',
  messageId: 'TESTMSG',
  channelId: 'TESTCHAN',
  content: null,
  type: null,
  createdAt: Date.now()
};

console.log('Attempting createPending for', noteId);
const saved = noteStore.createPending(note);
console.log('createPending returned:', saved ? 'OK' : 'FAILED');

const readBack = noteStore.getPending(noteId);
console.log('readBack:', readBack);

console.log('Now trying updatePending to set content...');
const updated = noteStore.updatePending(noteId, { content: 'hello world' });
console.log('updatePending returned:', updated);

const final = noteStore.getPending(noteId);
console.log('final:', final);