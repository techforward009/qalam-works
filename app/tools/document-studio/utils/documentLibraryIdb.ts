/**
 * Native IndexedDB backend for the local document library.
 * Isolated from React. Falls back is handled by getDocumentLibrary().
 */

import {
  createDocumentRecord,
  normalizeDocumentRecord,
  sortDocumentsNewestFirst,
  type DocumentLibrary,
  type DocumentRecord,
  type DocumentWriteInput,
} from "./documentLibrary";
import { sanitizeDocumentTitle } from "./documentTitle";

const DB_NAME = "qalam-document-studio";
const DB_VERSION = 1;
const STORE = "documents";

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export async function createIndexedDBDocumentLibrary(): Promise<DocumentLibrary> {
  const db = await openDatabase();

  const withStore = <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = fn(store);
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  };

  return {
    durability: "persistent",
    async listDocuments() {
      const rows = await withStore("readonly", (store) => store.getAll());
      const records = (rows as unknown[])
        .map((row) => normalizeDocumentRecord(row))
        .filter((row): row is DocumentRecord => Boolean(row));
      return sortDocumentsNewestFirst(records).map((record) => ({
        id: record.id,
        title: record.title,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
    },
    async getDocument(id) {
      const row = await withStore("readonly", (store) => store.get(id));
      return normalizeDocumentRecord(row);
    },
    async createDocument(input: DocumentWriteInput = {}) {
      const record = createDocumentRecord(input);
      await withStore("readwrite", (store) => store.put(record));
      return record;
    },
    async updateDocument(id, patch) {
      const current = normalizeDocumentRecord(await withStore("readonly", (store) => store.get(id)));
      if (!current) throw new Error(`Document not found: ${id}`);
      const next: DocumentRecord = {
        ...current,
        title: patch.title !== undefined ? sanitizeDocumentTitle(patch.title) || current.title : current.title,
        content: patch.content ?? current.content,
        documentSettings: patch.documentSettings ?? current.documentSettings,
        updatedAt: Date.now(),
        schemaVersion: 1,
      };
      await withStore("readwrite", (store) => store.put(next));
      return next;
    },
    async deleteDocument(id) {
      await withStore("readwrite", (store) => store.delete(id));
    },
    async renameDocument(id, title) {
      const current = normalizeDocumentRecord(await withStore("readonly", (store) => store.get(id)));
      if (!current) throw new Error(`Document not found: ${id}`);
      const next: DocumentRecord = {
        ...current,
        title: sanitizeDocumentTitle(title) || current.title,
        updatedAt: Date.now(),
        schemaVersion: 1,
      };
      await withStore("readwrite", (store) => store.put(next));
      return next;
    },
  };
}
