const fs = require('fs');
const path = require('path');

const pendingPath = path.join(__dirname, '..', 'savedata', 'notesPending.json');
const logPath = path.join(__dirname, '..', 'savedata', 'notesLog.json');

// ensure files exist
if (!fs.existsSync(pendingPath)) fs.writeFileSync(pendingPath, '{}');
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '[]');

function load(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
        console.log("Saved:", file);
    } catch (err) {
        console.log("Error saving:", err.message);
    }
}


module.exports = {
    createPending(note) {
        const data = load(pendingPath);
        console.log("Saving pending:", note.id);
        data[note.id] = note;
        console.log(data[note.id]);
        save(pendingPath, data);
        return note;
    },

    getPending(noteId) {
        const data = load(pendingPath);
        return data[noteId] || null;
    },

    updatePending(noteId, update) {
        const data = load(pendingPath);
        if (!data[noteId]) return null;
        Object.assign(data[noteId], update);
        save(pendingPath, data);
        return data[noteId];
    },

    deletePending(noteId) {
        const data = load(pendingPath);
        delete data[noteId];
        save(pendingPath, data);
    },

    logNote(note) {
        const log = load(logPath);
        log.push(note);
        save(logPath, log);
    }
};

// DEFENSIVE/DEBUG VERSION:
// const fs = require('fs');
// const path = require('path');

// const pendingPath = path.join(__dirname, '..', 'savedata', 'notesPending.json');
// const logPath = path.join(__dirname, '..', 'savedata', 'notesLog.json');
// const tempSuffix = '.tmp';

// // Ensure directory exists
// function ensureDir(filePath) {
//   const dir = path.dirname(filePath);
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// }

// function safeReadJSON(file) {
//   try {
//     if (!fs.existsSync(file)) return {};
//     const raw = fs.readFileSync(file, 'utf8').trim();
//     if (!raw) return {};
//     return JSON.parse(raw);
//   } catch (err) {
//     console.error(`[noteStorage] safeReadJSON parse error for ${file}:`, err.message);
//     // Do NOT overwrite file here; return empty object and let caller decide
//     return {};
//   }
// }

// function safeWriteJSONAtomic(file, data) {
//   // Writes atomically by writing to a temp file then renaming
//   try {
//     ensureDir(file);
//     const dir = path.dirname(file);
//     const base = path.basename(file);
//     const tmp = path.join(dir, `${base}${tempSuffix}`);

//     const json = JSON.stringify(data, null, 2);
//     fs.writeFileSync(tmp, json, { encoding: 'utf8' });
//     // fs.renameSync is atomic on the same filesystem
//     fs.renameSync(tmp, file);
//     console.log(`[noteStorage] Saved ${file} (size ${json.length} bytes)`);
//     return true;
//   } catch (err) {
//     console.error(`[noteStorage] safeWriteJSONAtomic error for ${file}:`, err.message);
//     try {
//       // attempt cleanup of tmp if exists
//       const tmp = path.join(path.dirname(file), `${path.basename(file)}${tempSuffix}`);
//       if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
//     } catch (e) {}
//     return false;
//   }
// }

// // Ensure files exist but do not initialize with wrong type
// ensureDir(pendingPath);
// if (!fs.existsSync(pendingPath)) fs.writeFileSync(pendingPath, '{}', 'utf8');
// if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '[]', 'utf8');

// module.exports = {
//   createPending(note) {
//     const data = safeReadJSON(pendingPath);
//     data[note.id] = note;
//     const ok = safeWriteJSONAtomic(pendingPath, data);
//     if (!ok) {
//       console.error('[noteStorage] createPending: failed to write file');
//       return null;
//     }
//     console.log('[noteStorage] createPending saved noteId=', note.id);
//     return note;
//   },

//   getPending(noteId) {
//     const data = safeReadJSON(pendingPath);
//     return data[noteId] || null;
//   },

//   updatePending(noteId, update) {
//     const data = safeReadJSON(pendingPath);
//     if (!data[noteId]) return null;
//     Object.assign(data[noteId], update);
//     const ok = safeWriteJSONAtomic(pendingPath, data);
//     if (!ok) {
//       console.error('[noteStorage] updatePending: failed to write file');
//       return null;
//     }
//     return data[noteId];
//   },

//   deletePending(noteId) {
//     const data = safeReadJSON(pendingPath);
//     if (!data[noteId]) return false;
//     delete data[noteId];
//     const ok = safeWriteJSONAtomic(pendingPath, data);
//     if (!ok) {
//       console.error('[noteStorage] deletePending: failed to write file');
//       return false;
//     }
//     return true;
//   },

//   logNote(note) {
//     // append to array
//     const arr = (() => {
//       try {
//         if (!fs.existsSync(logPath)) return [];
//         const raw = fs.readFileSync(logPath, 'utf8').trim();
//         if (!raw) return [];
//         return JSON.parse(raw);
//       } catch (err) {
//         console.error('[noteStorage] logNote: parse error, starting fresh array:', err.message);
//         return [];
//       }
//     })();

//     arr.push(note);
//     const ok = safeWriteJSONAtomic(logPath, arr);
//     if (!ok) {
//       console.error('[noteStorage] logNote: failed to write log file');
//       return false;
//     }
//     return true;
//   }
// };