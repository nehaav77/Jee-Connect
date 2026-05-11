// JEE Connect - Packet-Based Download Manager
// Sprint 2: Manages downloads with compression awareness, queue, and offline storage

import { getDatabase } from '../db/database';
import { generateId } from '../repositories/BaseRepository';

export interface DownloadTask {
    id: string;
    resource_id: string;
    title: string;
    url: string;
    total_bytes: number;
    downloaded_bytes: number;
    status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
    compression_type: 'hevc' | 'webm' | 'none';
    created_at: string;
}

export interface DownloadProgress {
    taskId: string;
    progress: number; // 0-100
    speed: string; // e.g., "1.2 MB/s"
    eta: string; // e.g., "2m 30s"
}

class DownloadManagerService {
    private activeDownloads: Map<string, DownloadTask> = new Map();
    private maxConcurrent = 2;

    // Enqueue a new download with packet-based chunking
    async enqueueDownload(
        resourceId: string,
        title: string,
        url: string,
        totalBytes: number,
        compression: DownloadTask['compression_type'] = 'none'
    ): Promise<string> {
        const db = await getDatabase();
        const id = generateId();

        // Apply compression ratio estimation
        const compressedSize = this.estimateCompressedSize(totalBytes, compression);

        await db.runAsync(
            `INSERT INTO download_queue (id, resource_id, title, url, total_bytes, downloaded_bytes, status, compression_type)
             VALUES (?, ?, ?, ?, ?, 0, 'queued', ?)`,
            [id, resourceId, title, url, compressedSize, compression]
        );

        const task: DownloadTask = {
            id, resource_id: resourceId, title, url,
            total_bytes: compressedSize, downloaded_bytes: 0,
            status: 'queued', compression_type: compression,
            created_at: new Date().toISOString(),
        };
        this.activeDownloads.set(id, task);

        return id;
    }

    // Estimate compressed size based on codec
    private estimateCompressedSize(originalBytes: number, compression: DownloadTask['compression_type']): number {
        switch (compression) {
            case 'hevc': return Math.round(originalBytes * 0.4); // ~60% compression
            case 'webm': return Math.round(originalBytes * 0.5); // ~50% compression
            default: return originalBytes;
        }
    }

    // Pause a download
    async pauseDownload(taskId: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(
            `UPDATE download_queue SET status = 'paused' WHERE id = ?`,
            [taskId]
        );
        const task = this.activeDownloads.get(taskId);
        if (task) task.status = 'paused';
    }

    // Resume a paused download
    async resumeDownload(taskId: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(
            `UPDATE download_queue SET status = 'queued' WHERE id = ?`,
            [taskId]
        );
        const task = this.activeDownloads.get(taskId);
        if (task) task.status = 'queued';
    }

    // Cancel and remove a download
    async cancelDownload(taskId: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(`DELETE FROM download_queue WHERE id = ?`, [taskId]);
        this.activeDownloads.delete(taskId);
    }

    // Get all downloads with their current status
    async getAllDownloads(): Promise<DownloadTask[]> {
        const db = await getDatabase();
        return db.getAllAsync<DownloadTask>(
            'SELECT * FROM download_queue ORDER BY created_at DESC'
        );
    }

    // Get downloads by status
    async getDownloadsByStatus(status: DownloadTask['status']): Promise<DownloadTask[]> {
        const db = await getDatabase();
        return db.getAllAsync<DownloadTask>(
            'SELECT * FROM download_queue WHERE status = ? ORDER BY created_at DESC',
            [status]
        );
    }

    // Simulate packet-based download progress (for demo/offline mode)
    async simulateDownloadProgress(taskId: string): Promise<void> {
        const db = await getDatabase();
        const task = await db.getFirstAsync<DownloadTask>(
            'SELECT * FROM download_queue WHERE id = ?', [taskId]
        );
        if (!task || task.status === 'completed') return;

        // Simulate downloading in chunks (packets)
        const packetSize = Math.round(task.total_bytes / 10);
        const newDownloaded = Math.min(task.downloaded_bytes + packetSize, task.total_bytes);
        const newStatus = newDownloaded >= task.total_bytes ? 'completed' : 'downloading';

        await db.runAsync(
            `UPDATE download_queue SET downloaded_bytes = ?, status = ? WHERE id = ?`,
            [newDownloaded, newStatus, taskId]
        );

        if (newStatus === 'completed') {
            // Mark the associated resource as downloaded
            await db.runAsync(
                `UPDATE resources SET is_downloaded = 1 WHERE id = ?`,
                [task.resource_id]
            );
        }
    }

    // Get total storage used by downloads
    async getTotalStorageUsed(): Promise<number> {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(downloaded_bytes), 0) as total FROM download_queue WHERE status = 'completed'`
        );
        return result?.total || 0;
    }

    // Format bytes to human readable
    formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
}

export const downloadManager = new DownloadManagerService();
