// JEE Connect - Smart Sync Engine
// Sprint 5 & 6: Delta syncing, sync queue processing, and background fetch

import { getDatabase } from '../db/database';
import { generateId } from '../repositories/BaseRepository';

export interface SyncStatus {
    pendingCount: number;
    lastSyncTime: string | null;
    isSyncing: boolean;
    failedCount: number;
}

export interface ContentPacket {
    id: string;
    type: 'questions' | 'resources' | 'tests';
    title: string;
    size_bytes: number;
    available: boolean;
    downloaded: boolean;
}

class SyncServiceClass {
    private isSyncing = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;

    // Start background sync routine (call on app startup)
    startBackgroundSync(onStatusChange?: (status: SyncStatus) => void): void {
        // Check every 60 seconds for pending syncs
        this.syncInterval = setInterval(async () => {
            const status = await this.getSyncStatus();
            if (status.pendingCount > 0) {
                await this.processSyncQueue();
                onStatusChange?.(await this.getSyncStatus());
            }
        }, 60000);
    }

    // Stop background sync
    stopBackgroundSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Get current sync status
    async getSyncStatus(): Promise<SyncStatus> {
        const db = await getDatabase();

        const pending = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`
        );

        const failed = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND sync_attempts > 3`
        );

        const lastSync = await db.getFirstAsync<{ created_at: string }>(
            `SELECT created_at FROM sync_queue WHERE synced = 1 ORDER BY created_at DESC LIMIT 1`
        );

        return {
            pendingCount: pending?.count || 0,
            lastSyncTime: lastSync?.created_at || null,
            isSyncing: this.isSyncing,
            failedCount: failed?.count || 0,
        };
    }

    // Process the sync queue — push only new/changed data (Delta Sync)
    async processSyncQueue(): Promise<{ synced: number; failed: number }> {
        if (this.isSyncing) return { synced: 0, failed: 0 };
        this.isSyncing = true;

        const db = await getDatabase();
        let synced = 0;
        let failed = 0;

        try {
            // Get all unsynced entries, ordered by creation time
            const entries = await db.getAllAsync<{
                id: string; table_name: string; record_id: string;
                action: string; payload: string; sync_attempts: number;
            }>(
                `SELECT * FROM sync_queue WHERE synced = 0 AND sync_attempts < 5 ORDER BY created_at ASC LIMIT 50`
            );

            for (const entry of entries) {
                try {
                    // In production: POST to server API
                    // await fetch(`${API_BASE}/sync/${entry.table_name}`, {
                    //     method: 'POST',
                    //     body: JSON.stringify({ action: entry.action, payload: entry.payload }),
                    // });

                    // Simulate successful sync
                    await db.runAsync(
                        `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
                        [entry.id]
                    );
                    synced++;
                } catch (e) {
                    // Increment retry counter
                    await db.runAsync(
                        `UPDATE sync_queue SET sync_attempts = sync_attempts + 1 WHERE id = ?`,
                        [entry.id]
                    );
                    failed++;
                }
            }
        } catch (e) {
            console.log('[Sync] Queue processing error:', e);
        } finally {
            this.isSyncing = false;
        }

        return { synced, failed };
    }

    // Enqueue test results for syncing
    async enqueueTestResult(attemptId: string, testData: any): Promise<void> {
        const db = await getDatabase();
        const id = generateId();

        await db.runAsync(
            `INSERT INTO sync_queue (id, table_name, record_id, action, payload, synced, sync_attempts)
             VALUES (?, 'test_attempts', ?, 'insert', ?, 0, 0)`,
            [id, attemptId, JSON.stringify(testData)]
        );
    }

    // Check for available "Mission Updates" (new content packets)
    async checkForMissionUpdates(): Promise<ContentPacket[]> {
        // In production: fetch from server
        // const response = await fetch(`${API_BASE}/content/updates`);
        // return response.json();

        // Stub: return simulated available content packets
        return [
            {
                id: 'packet-jee2025-phy', type: 'questions',
                title: 'JEE 2025 Physics PYQs', size_bytes: 51200,
                available: true, downloaded: false,
            },
            {
                id: 'packet-jee2025-chem', type: 'questions',
                title: 'JEE 2025 Chemistry PYQs', size_bytes: 48000,
                available: true, downloaded: false,
            },
            {
                id: 'packet-jee2025-math', type: 'questions',
                title: 'JEE 2025 Mathematics PYQs', size_bytes: 55000,
                available: true, downloaded: false,
            },
        ];
    }

    // Download a content packet (Mission Update)
    async downloadContentPacket(packet: ContentPacket): Promise<boolean> {
        try {
            // In production: download and insert into local DB
            // const data = await fetch(`${API_BASE}/content/download/${packet.id}`);
            // const content = await data.json();
            // Insert questions/resources into local tables

            console.log(`[Sync] Downloaded mission update: ${packet.title}`);
            return true;
        } catch (e) {
            console.log('[Sync] Download failed:', e);
            return false;
        }
    }

    // Clear synced entries older than 7 days
    async cleanupSyncQueue(): Promise<number> {
        const db = await getDatabase();
        const result = await db.runAsync(
            `DELETE FROM sync_queue WHERE synced = 1 AND created_at < datetime('now', '-7 days')`
        );
        return result.changes;
    }
}

export const syncService = new SyncServiceClass();
