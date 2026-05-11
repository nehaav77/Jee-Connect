// JEE Connect - Base Repository (Offline-First Pattern)
// All repositories extend this to get local-first data access + sync queue

import { getDatabase } from '../db/database';

export interface SyncQueueEntry {
    id: string;
    table_name: string;
    record_id: string;
    action: 'insert' | 'update' | 'delete';
    payload: string;
    created_at: string;
    synced: number;
}

// Generate a unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export abstract class BaseRepository<T extends { id: string }> {
    abstract tableName: string;

    // Read all records from local DB (offline-first)
    async getAll(orderBy: string = 'rowid'): Promise<T[]> {
        const db = await getDatabase();
        const results = await db.getAllAsync<T>(
            `SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`
        );
        return results;
    }

    // Read a single record by ID from local DB
    async getById(id: string): Promise<T | null> {
        const db = await getDatabase();
        const result = await db.getFirstAsync<T>(
            `SELECT * FROM ${this.tableName} WHERE id = ?`,
            [id]
        );
        return result || null;
    }

    // Get records matching a condition
    async getWhere(
        condition: string,
        params: any[] = [],
        orderBy: string = 'rowid'
    ): Promise<T[]> {
        const db = await getDatabase();
        const results = await db.getAllAsync<T>(
            `SELECT * FROM ${this.tableName} WHERE ${condition} ORDER BY ${orderBy}`,
            params
        );
        return results;
    }

    // Count records
    async count(condition?: string, params?: any[]): Promise<number> {
        const db = await getDatabase();
        const query = condition
            ? `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${condition}`
            : `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const result = await db.getFirstAsync<{ count: number }>(query, params || []);
        return result?.count || 0;
    }

    // Save (insert or update) - writes locally and enqueues for sync
    async save(item: T, columns: string[], values: any[]): Promise<void> {
        const db = await getDatabase();
        const placeholders = columns.map(() => '?').join(', ');
        const updateCols = columns.map((c) => `${c} = ?`).join(', ');

        // Upsert
        await db.runAsync(
            `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updateCols}`,
            [...values, ...values]
        );

        // Enqueue for sync
        await this.enqueueSync(item.id, 'update', item);
    }

    // Delete a record locally and enqueue sync
    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
        await this.enqueueSync(id, 'delete', null);
    }

    // Enqueue a change for background delta-sync
    protected async enqueueSync(
        recordId: string,
        action: 'insert' | 'update' | 'delete',
        payload: T | null
    ): Promise<void> {
        const db = await getDatabase();
        const id = generateId();

        await db.runAsync(
            `INSERT INTO sync_queue (id, table_name, record_id, action, payload, synced) 
       VALUES (?, ?, ?, ?, ?, 0)`,
            [id, this.tableName, recordId, action, payload ? JSON.stringify(payload) : null]
        );
    }

    // Get unsynced changes for this table
    async getUnsyncedChanges(): Promise<SyncQueueEntry[]> {
        const db = await getDatabase();
        return db.getAllAsync<SyncQueueEntry>(
            `SELECT * FROM sync_queue WHERE table_name = ? AND synced = 0 ORDER BY created_at`,
            [this.tableName]
        );
    }

    // Mark sync queue items as synced
    async markSynced(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const db = await getDatabase();
        const placeholders = ids.map(() => '?').join(', ');
        await db.runAsync(
            `UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`,
            ids
        );
    }
}
