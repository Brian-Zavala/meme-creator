import Dexie from 'dexie';

export const db = new Dexie('MemeCreatorDB');

// Define schema matching the existing IndexedDB structure
// 'appState' was created as a generic object store without keyPath in the old version (out-of-line keys).
// In Dexie, we define stores. For a store without a primary key (used as key-value mostly),
// we can define it with an empty string or just the name if we want to add indexes later.
// However, since we use .put(val, key), simply defining it exists is enough.
db.version(1).stores({
  appState: '' // No primary key defined in schema, allowing out-of-line keys
});
