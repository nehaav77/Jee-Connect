// JEE Connect - Knowledge Base Repository
// Manages textbooks, notes, and learning resources

import { BaseRepository, generateId } from './BaseRepository';
import { getDatabase } from '../db/database';

export interface Resource {
    id: string;
    chapter_id: string;
    title: string;
    type: 'textbook' | 'notes' | 'video' | 'formula_sheet';
    content?: string;
    file_uri?: string;
    size_bytes: number;
    is_downloaded: number;
    created_at: string;
}

class KnowledgeRepository extends BaseRepository<Resource> {
    tableName = 'resources';

    // Get all resources for a chapter
    async getResourcesForChapter(chapterId: string): Promise<Resource[]> {
        return this.getWhere('chapter_id = ?', [chapterId], 'title');
    }

    // Get only downloaded resources (for offline use)
    async getDownloadedResources(): Promise<Resource[]> {
        return this.getWhere('is_downloaded = 1', [], 'title');
    }

    // Filter resources by type
    async getResourcesByType(type: Resource['type']): Promise<Resource[]> {
        return this.getWhere('type = ?', [type], 'created_at DESC');
    }

    // Mark a resource as downloaded
    async markDownloaded(resourceId: string, fileUri: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync(
            'UPDATE resources SET is_downloaded = 1, file_uri = ? WHERE id = ?',
            [fileUri, resourceId]
        );
    }

    // Add a new resource
    async addResource(
        chapterId: string,
        title: string,
        type: Resource['type'],
        content: string,
        sizeBytes: number = 0
    ): Promise<string> {
        const id = generateId();
        const db = await getDatabase();
        await db.runAsync(
            `INSERT INTO resources (id, chapter_id, title, type, content, size_bytes, is_downloaded) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [id, chapterId, title, type, content, sizeBytes]
        );
        return id;
    }

    // Get total storage used
    async getTotalStorageUsed(): Promise<number> {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ total: number }>(
            'SELECT COALESCE(SUM(size_bytes), 0) as total FROM resources WHERE is_downloaded = 1'
        );
        return result?.total || 0;
    }

    // Search resources by title
    async searchResources(query: string): Promise<Resource[]> {
        return this.getWhere('title LIKE ?', [`%${query}%`], 'title');
    }
}

export const knowledgeRepository = new KnowledgeRepository();
