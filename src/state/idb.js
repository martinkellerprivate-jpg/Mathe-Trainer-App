import { openDB } from "idb";

// Lokaler Cache (7.4). Zwei Stores:
//   docs   — pro doc_key { data, updated_at }
//   queue  — Offline-Schreibvorgänge { id(auto), key, data, updated_at }
const DB_NAME = "zahlenheld";
const DB_VERSION = 1;

let _db;
function db() {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("docs")) d.createObjectStore("docs");
        if (!d.objectStoreNames.contains("queue")) d.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
      },
    });
  }
  return _db;
}

export async function idbGet(key) {
  return (await db()).get("docs", key);
}
export async function idbPut(key, value) {
  return (await db()).put("docs", value, key);
}
export async function idbDelete(key) {
  return (await db()).delete("docs", key);
}
export async function idbEnqueue(entry) {
  return (await db()).add("queue", entry);
}
export async function idbQueueAll() {
  return (await db()).getAll("queue");
}
export async function idbQueueDelete(id) {
  return (await db()).delete("queue", id);
}
export async function idbQueueClear() {
  return (await db()).clear("queue");
}
