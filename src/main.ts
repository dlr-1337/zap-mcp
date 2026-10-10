import express from 'express';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type StoredMessage = { reference: string; conversationId: string; conversationName: string | null; text: string; originalTimestamp: string };

export function createService({ dataDir }: { dataDir: string }) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const archiveDb = new Database(join(dataDir, 'archive.sqlite'));
  const authDb = new Database(join(dataDir, 'auth.sqlite'));
  const app = express();
  return {
    app, archiveDb, authDb,
    writeMessage(_message: StoredMessage) { throw new Error('Archive path not implemented'); },
    async setPassword(_password: string) { throw new Error('Owner path not implemented'); },
    close() { archiveDb.close(); authDb.close(); }
  };
}
