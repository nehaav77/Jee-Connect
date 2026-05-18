// JEE Connect - Database Manager (Singleton)
// Handles initialization, migrations, and seeding
// Platform-aware: uses expo-sqlite on native, in-memory fallback on web

import { Platform } from 'react-native';
import {
    CREATE_TABLES_SQL,
    SEED_SUBJECTS,
    SEED_UNITS,
    SEED_CHAPTERS,
    SEED_QUESTIONS,
    SEED_QUESTIONS_EXTRA,
    SEED_RESOURCES,
    SEED_TESTS,
    SEED_TEST_QUESTIONS,
    SEED_ACHIEVEMENTS,
} from './schema';
import { JEE_MAIN_QUESTIONS, JEE_MAIN_TESTS, JEE_MAIN_TEST_QUESTIONS } from './jee_main_seed';
import { JEE_ADVANCED_QUESTIONS, JEE_ADVANCED_TESTS, JEE_ADVANCED_TEST_QUESTIONS } from './jee_advanced_seed';

// Typed Database interface matching expo-sqlite API
export interface Database {
    execAsync(sql: string): Promise<void>;
    getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
    getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
    runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
    closeAsync?(): Promise<void>;
}

// In-memory storage fallback for web
const webStore: Record<string, any[]> = {};

let dbInstance: Database | null = null;
let isWeb = Platform.OS === 'web';

// Get or create the database instance
export async function getDatabase(): Promise<Database> {
    if (dbInstance) return dbInstance;

    if (isWeb) {
        // Web fallback: return a mock DB interface backed by in-memory store
        dbInstance = createWebFallbackDb();
        
        // --- DEBUG HELPER for USER ---
        if (typeof window !== 'undefined') {
            (window as any).viewJeeDb = (table?: string) => {
                if (table) {
                    console.log(`--- Table: ${table} ---`);
                    console.table(webStore[table] || []);
                } else {
                    console.log('--- JEE Connect Full Database ---');
                    console.log('Tables:', Object.keys(webStore));
                    console.log('Use viewJeeDb("tableName") to see data.');
                    return webStore;
                }
            };
            (window as any).resetJeeDb = () => {
                localStorage.removeItem('jee_connect_web_db');
                window.location.reload();
            };
            (window as any).resetClans = () => {
                const saved = localStorage.getItem('jee_connect_web_db');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    parsed['study_clans'] = [];
                    parsed['clan_members'] = [];
                    parsed['clan_requests'] = [];
                    parsed['clan_messages'] = [];
                    parsed['clan_lobby_ready'] = [];
                    localStorage.setItem('jee_connect_web_db', JSON.stringify(parsed));
                    window.location.reload();
                }
            };
            console.log('💡 Tip: Type viewJeeDb() to view DB, resetJeeDb() to reset everything, or resetClans() to ONLY reset clans while keeping your history.');
        }
        
        return dbInstance;
    }

    // Native: use expo-sqlite
    const SQLite = require('expo-sqlite');
    dbInstance = await SQLite.openDatabaseAsync('jeeconnect.db') as Database;
    await dbInstance!.execAsync('PRAGMA journal_mode = WAL;');
    await dbInstance!.execAsync('PRAGMA foreign_keys = ON;');
    return dbInstance!;
}

// Initialize all tables
export async function initializeDatabase(): Promise<void> {
    const db = await getDatabase();

    if (isWeb) {
        // Seed web store directly
        await seedWebStore();
        return;
    }

    // Native: create tables
    for (const sql of CREATE_TABLES_SQL) {
        await db.execAsync(sql);
    }

    // Migration: add user_email column to tests table if missing (for existing databases)
    try {
        await db.execAsync('ALTER TABLE tests ADD COLUMN user_email TEXT');
    } catch (_) {
        // Column already exists, ignore
    }

    // Migration: add tab_violations column to test_attempts if missing
    try {
        await db.execAsync('ALTER TABLE test_attempts ADD COLUMN tab_violations INTEGER DEFAULT 0');
    } catch (_) {
        // Column already exists, ignore
    }

    // Migration: add is_disqualified column to test_attempts if missing
    try {
        await db.execAsync('ALTER TABLE test_attempts ADD COLUMN is_disqualified INTEGER DEFAULT 0');
    } catch (_) {
        // Column already exists, ignore
    }

    // Migration: add question_ids column to test_attempts for dynamic retakes
    try {
        await db.execAsync('ALTER TABLE test_attempts ADD COLUMN question_ids TEXT');
    } catch (_) {
        // Column already exists, ignore
    }

    // Migration: add xp_awarded column to test_attempts
    try {
        await db.execAsync('ALTER TABLE test_attempts ADD COLUMN xp_awarded INTEGER DEFAULT 0');
    } catch (_) {
        // Column already exists, ignore
    }

    // Migration: add scheduled_sprint_time to study_clans
    try {
        await db.execAsync('ALTER TABLE study_clans ADD COLUMN scheduled_sprint_time TEXT');
    } catch (_) {
        // Column already exists, ignore
    }

    // Migration: add clan_name to leaderboard_entries
    try {
        await db.execAsync('ALTER TABLE leaderboard_entries ADD COLUMN clan_name TEXT');
    } catch (_) {
        // Column already exists, ignore
    }

    // Seed data if subjects are empty
    const existing = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM subjects'
    );
    if (!existing || existing.count === 0) {
        await seedDatabase(db);
    }
}

// Seed initial data (native)
async function seedDatabase(db: any): Promise<void> {
    for (const subject of SEED_SUBJECTS) {
        await db.runAsync(
            'INSERT OR IGNORE INTO subjects (id, name, icon, color, order_num) VALUES (?, ?, ?, ?, ?)',
            [subject.id, subject.name, subject.icon, subject.color, subject.order_num]
        );
    }
    for (const unit of SEED_UNITS) {
        await db.runAsync(
            'INSERT OR IGNORE INTO units (id, subject_id, name, order_num) VALUES (?, ?, ?, ?)',
            [unit.id, unit.subject_id, unit.name, unit.order_num]
        );
    }
    for (const chapter of SEED_CHAPTERS) {
        await db.runAsync(
            'INSERT OR IGNORE INTO chapters (id, unit_id, name, order_num) VALUES (?, ?, ?, ?)',
            [chapter.id, chapter.unit_id, chapter.name, chapter.order_num]
        );
    }
    for (const q of SEED_QUESTIONS) {
        await db.runAsync(
            `INSERT OR IGNORE INTO questions 
        (id, chapter_id, year, shift, question_type, question_text, question_latex, options, correct_answers, solution_text, solution_latex, difficulty, marks, negative_marks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [q.id, q.chapter_id, q.year, q.shift, q.question_type, q.question_text, q.question_latex,
            q.options, q.correct_answers, q.solution_text, q.solution_latex, q.difficulty, q.marks, q.negative_marks]
        );
    }
    for (const r of SEED_RESOURCES) {
        await db.runAsync(
            `INSERT OR IGNORE INTO resources (id, chapter_id, title, type, content, size_bytes, is_downloaded) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [r.id, r.chapter_id, r.title, r.type, r.content, r.size_bytes, r.is_downloaded]
        );
    }
    // Seed extra PYQ questions (2021, 2023, 2024) and JEE MAIN
    for (const q of [...SEED_QUESTIONS_EXTRA, ...JEE_MAIN_QUESTIONS, ...JEE_ADVANCED_QUESTIONS]) {
        await db.runAsync(
            `INSERT OR IGNORE INTO questions 
        (id, chapter_id, year, shift, question_type, question_text, question_latex, options, correct_answers, solution_text, solution_latex, difficulty, marks, negative_marks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [q.id, q.chapter_id, q.year, q.shift, q.question_type, q.question_text, q.question_latex,
            q.options, q.correct_answers, q.solution_text, q.solution_latex, q.difficulty, q.marks, q.negative_marks]
        );
    }
    // Seed pre-made mock tests
    for (const t of [...SEED_TESTS, ...JEE_MAIN_TESTS, ...JEE_ADVANCED_TESTS]) {
        await db.runAsync(
            `INSERT OR IGNORE INTO tests (id, title, description, duration_min, total_marks, total_questions, test_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.title, t.description, t.duration_min, t.total_marks, t.total_questions, t.test_type, t.status]
        );
    }
    for (const tq of [...SEED_TEST_QUESTIONS, ...JEE_MAIN_TEST_QUESTIONS, ...JEE_ADVANCED_TEST_QUESTIONS]) {
        await db.runAsync(
            'INSERT OR IGNORE INTO test_questions (test_id, question_id, order_num) VALUES (?, ?, ?)',
            [tq.test_id, tq.question_id, tq.order_num]
        );
    }
}

// Seed web in-memory store with persistence
async function seedWebStore(): Promise<void> {
    const STORAGE_KEY = 'jee_connect_web_db';
    
    try {
        if (Platform.OS === 'web') {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.keys(parsed).forEach(k => { webStore[k] = parsed[k]; });
                if (webStore['tests']) {
                    webStore['tests'] = webStore['tests'].map((t: any) => ({
                        ...t,
                        user_email: t.user_email ?? null,
                    }));
                }
                // Patch: ensure tab_violations, is_disqualified, and xp_awarded fields exist on all test_attempts
                if (webStore['test_attempts']) {
                    webStore['test_attempts'] = webStore['test_attempts'].map((a: any) => ({
                        ...a,
                        tab_violations: a.tab_violations ?? 0,
                        is_disqualified: a.is_disqualified ?? 0,
                        xp_awarded: a.xp_awarded ?? 0,
                    }));
                }
                // Hotfix: Force update questions to load new actual solutions
                webStore['questions'] = [
                    ...SEED_QUESTIONS.map(q => ({ ...q })),
                    ...SEED_QUESTIONS_EXTRA.map(q => ({ ...q })),
                    ...JEE_MAIN_QUESTIONS.map(q => ({ ...q })),
                    ...JEE_ADVANCED_QUESTIONS.map(q => ({ ...q }))
                ];

                // --- ONE-TIME AUTO CLEAR FOR CLANS ---
                if (!window.localStorage.getItem('jee_connect_clans_cleared_v1')) {
                    webStore['study_clans'] = [];
                    webStore['clan_members'] = [];
                    webStore['clan_requests'] = [];
                    webStore['clan_messages'] = [];
                    webStore['clan_lobby_ready'] = [];
                    window.localStorage.setItem('jee_connect_clans_cleared_v1', 'true');
                    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(webStore));
                    console.log('[DB] Auto-cleared clans data for fresh start');
                }

                // Patch: clan_name and scheduled_sprint_time
                if (webStore['study_clans']) {
                    webStore['study_clans'] = webStore['study_clans'].map((c: any) => ({
                        ...c,
                        scheduled_sprint_time: c.scheduled_sprint_time ?? null,
                    }));
                }
                if (webStore['leaderboard_entries']) {
                    webStore['leaderboard_entries'] = webStore['leaderboard_entries'].map((l: any) => ({
                        ...l,
                        clan_name: l.clan_name ?? null,
                    }));
                }

                // --- ONE-TIME MIGRATION: Sprint 9 Gamification Tables ---
                if (!window.localStorage.getItem('jee_connect_gamification_v1')) {
                    if (!webStore['user_xp_log']) webStore['user_xp_log'] = [];
                    if (!webStore['daily_streaks']) webStore['daily_streaks'] = [];
                    if (!webStore['achievements']) webStore['achievements'] = SEED_ACHIEVEMENTS.map(a => ({ ...a }));
                    if (!webStore['user_achievements']) webStore['user_achievements'] = [];
                    if (!webStore['spaced_repetition']) webStore['spaced_repetition'] = [];
                    if (!webStore['saathi_memory']) webStore['saathi_memory'] = [];
                    if (!webStore['user_profile']) webStore['user_profile'] = [];
                    window.localStorage.setItem('jee_connect_gamification_v1', 'true');
                    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(webStore));
                    console.log('[DB] Migrated: Added gamification tables');
                }

                console.log('[DB] Restored webStore from localStorage');
                // Force sync to terminal bridge on load
                saveWebStore();
                return;
            }
        }
    } catch (e) {
        console.error('[DB] Failed to load from localStorage:', e);
    }

    // Default initialization
    webStore['subjects'] = SEED_SUBJECTS.map(s => ({ ...s }));
    webStore['units'] = SEED_UNITS.map(u => ({ ...u }));
    webStore['chapters'] = SEED_CHAPTERS.map(c => ({ ...c, summary: null, content_uri: null, is_downloaded: 0 }));
    webStore['questions'] = [...SEED_QUESTIONS.map(q => ({ ...q })), ...SEED_QUESTIONS_EXTRA.map(q => ({ ...q })), ...JEE_MAIN_QUESTIONS.map(q => ({ ...q })), ...JEE_ADVANCED_QUESTIONS.map(q => ({ ...q }))];
    webStore['resources'] = SEED_RESOURCES.map(r => ({ ...r, file_uri: null, created_at: new Date().toISOString() }));
    webStore['tests'] = [...SEED_TESTS.map(t => ({ ...t })), ...JEE_MAIN_TESTS.map(t => ({ ...t })), ...JEE_ADVANCED_TESTS.map(t => ({ ...t }))];
    webStore['test_questions'] = [...SEED_TEST_QUESTIONS.map(tq => ({ ...tq })), ...JEE_MAIN_TEST_QUESTIONS.map(tq => ({ ...tq })), ...JEE_ADVANCED_TEST_QUESTIONS.map(tq => ({ ...tq }))];
    webStore['test_attempts'] = [];
    webStore['chat_messages'] = [];
    webStore['mindfulness_logs'] = [];
    webStore['sync_queue'] = [];
    webStore['user_settings'] = [];
    webStore['users'] = []; // Ensure users table exists in webStore
    webStore['download_queue'] = [];
    webStore['leaderboard_entries'] = [];
    webStore['study_clans'] = [];
    webStore['clan_members'] = [];
    webStore['clan_requests'] = [];
    webStore['clan_lobby_ready'] = [];
    webStore['clan_messages'] = [];
    webStore['doubt_marketplace'] = [];
    webStore['doubt_answers'] = [];
    webStore['analytics_snapshots'] = [];
    webStore['parent_access'] = [];

    // Sprint 9: Gamification tables
    webStore['user_xp_log'] = [];
    webStore['daily_streaks'] = [];
    webStore['achievements'] = SEED_ACHIEVEMENTS.map(a => ({ ...a }));
    webStore['user_achievements'] = [];
    webStore['spaced_repetition'] = [];
    webStore['saathi_memory'] = [];
    webStore['user_profile'] = [];

    saveWebStore();
}

function saveWebStore() {
    if (Platform.OS === 'web') {
        try {
            const data = JSON.stringify(webStore);
            window.localStorage.setItem('jee_connect_web_db', data);
        } catch (e: any) {
            console.warn('[DB] localStorage save failed:', e?.message);
            // If quota exceeded, try clearing old caches and retry
            if (e?.name === 'QuotaExceededError' || e?.code === 22) {
                try {
                    // Remove non-essential cached data to free space
                    window.localStorage.removeItem('jee_connect_clans_cleared_v1');
                    window.localStorage.removeItem('jee_connect_gamification_v1');
                    const data = JSON.stringify(webStore);
                    window.localStorage.setItem('jee_connect_web_db', data);
                    console.log('[DB] Retry save succeeded after clearing caches');
                } catch (e2) {
                    console.error('[DB] localStorage quota exceeded even after cleanup');
                }
            }
        }
        
        // SYNC TO TERMINAL BRIDGE (for node view-db.js) - only in dev
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            fetch('http://localhost:9000', {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webStore)
            }).catch(() => {});
        }
    }
}

// Web fallback DB interface matching expo-sqlite API
function createWebFallbackDb(): Database {
    return {
        async execAsync(_sql: string) { /* no-op for web */ },

        async getAllAsync<T>(sql: string, params?: any[]): Promise<T[]> {
            const table = extractTableName(sql);
            if (!table || !webStore[table]) return [];
            let rows = [...webStore[table]];

            // Improved Filtering for Simulator
            const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/i);
            if (whereMatch) {
                const whereClause = whereMatch[1];
                
                // Handle OR conditions: split on OR first, then AND within each branch
                const hasOr = /\s+OR\s+/i.test(whereClause);
                if (hasOr) {
                    const orBranches = whereClause.split(/\s+OR\s+/i);
                    let pIdx = 0;
                    rows = rows.filter(r => {
                        return orBranches.some(branch => {
                            const conditions = branch.split(/\s+AND\s+/i);
                            return conditions.every(condition => {
                                // Handle IS NULL
                                const isNullMatch = condition.match(/([\w.]+)\s+IS\s+NULL/i);
                                if (isNullMatch) {
                                    const col = isNullMatch[1].includes('.') ? isNullMatch[1].split('.')[1] : isNullMatch[1];
                                    return r[col] === null || r[col] === undefined;
                                }
                                // Handle IS NOT NULL
                                const isNotNullMatch = condition.match(/([\w.]+)\s+IS\s+NOT\s+NULL/i);
                                if (isNotNullMatch) {
                                    const col = isNotNullMatch[1].includes('.') ? isNotNullMatch[1].split('.')[1] : isNotNullMatch[1];
                                    return r[col] !== null && r[col] !== undefined;
                                }
                                const parts = condition.match(/([\w.]+)\s*=\s*(.+)/i);
                                if (parts) {
                                    const col = parts[1].includes('.') ? parts[1].split('.')[1].trim() : parts[1].trim();
                                    let target = parts[2].trim();
                                    if (target === '?' && params && pIdx < params.length) {
                                        return String(r[col]) === String(params[pIdx++]);
                                    } else if (target !== '?') {
                                        const val = target.replace(/^['"]|['"]$/g, '');
                                        return String(r[col]) === String(val);
                                    }
                                }
                                return true;
                            });
                        });
                    });
                } else {
                    const conditions = whereClause.split(/\s+AND\s+/i);
                    let pIdx = 0;

                    conditions.forEach(condition => {
                        // Handle IS NULL
                        const isNullMatch = condition.match(/([\w.]+)\s+IS\s+NULL/i);
                        if (isNullMatch) {
                            const col = isNullMatch[1].includes('.') ? isNullMatch[1].split('.')[1] : isNullMatch[1];
                            rows = rows.filter(r => r[col] === null || r[col] === undefined);
                            return;
                        }
                        const parts = condition.match(/([\w.]+)\s*=\s*(.+)/i);
                        if (parts) {
                            const colWithAlias = parts[1].trim();
                            const col = colWithAlias.includes('.') ? colWithAlias.split('.')[1] : colWithAlias;
                            let target = parts[2].trim();
                            
                            // Handle parentheses in values if any
                            if (target.toLowerCase().startsWith('datetime(')) target = new Date().toISOString();

                            if (target === '?') {
                                if (params && pIdx < params.length) {
                                    const val = params[pIdx++];
                                    rows = rows.filter(r => String(r[col]) === String(val));
                                }
                            } else {
                                // Hardcoded value
                                const val = target.replace(/^['"]|['"]$/g, '');
                                rows = rows.filter(r => String(r[col]) === String(val));
                            }
                        }
                    });
                }
            }
            // Basic ORDER BY
            const orderMatch = sql.match(/ORDER BY\s+(?:\w+\.)?(\w+)\s*(ASC|DESC)?/i);
            if (orderMatch) {
                const col = orderMatch[1];
                const desc = orderMatch[2]?.toUpperCase() === 'DESC';
                rows.sort((a, b) => {
                    if (a[col] < b[col]) return desc ? 1 : -1;
                    if (a[col] > b[col]) return desc ? -1 : 1;
                    return 0;
                });
            }
            // LIMIT
            const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
            if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1]));
            return rows as T[];
        },

        async getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null> {
            // COUNT(*) queries
            if (sql.includes('COUNT(*)')) {
                const results = await this.getAllAsync<T>(sql, params);
                return { count: results.length } as T;
            }
            const results = await this.getAllAsync<T>(sql, params);
            return results[0] || null;
        },

        async runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
            // INSERT
            if (sql.trim().toUpperCase().startsWith('INSERT')) {
                const table = extractTableName(sql);
                if (table) {
                    if (!webStore[table]) webStore[table] = [];
                    const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
                    // Extract the VALUES (...) clause
                    const valuesMatch = sql.match(/VALUES\s*\((.+?)\)\s*(?:ON\s+CONFLICT|$)/is);
                    if (colMatch && params) {
                        const cols = colMatch[1].split(',').map(c => c.trim());
                        const row: Record<string, any> = {};

                        if (valuesMatch) {
                            // Parse VALUES tokens properly to handle mixed ? and hardcoded values
                            const valuesStr = valuesMatch[1];
                            const valueTokens: string[] = [];
                            let depth = 0, current = '';
                            for (let ci = 0; ci < valuesStr.length; ci++) {
                                const ch = valuesStr[ci];
                                if (ch === '(') depth++;
                                else if (ch === ')') depth--;
                                if (ch === ',' && depth === 0) {
                                    valueTokens.push(current.trim());
                                    current = '';
                                } else {
                                    current += ch;
                                }
                            }
                            if (current.trim()) valueTokens.push(current.trim());

                            let pIdx = 0;
                            cols.forEach((c, i) => {
                                const token = valueTokens[i]?.trim() || '?';
                                if (token === '?') {
                                    row[c] = (params && pIdx < params.length) ? params[pIdx++] : null;
                                } else if (token.toLowerCase().startsWith("datetime(")) {
                                    row[c] = new Date().toISOString();
                                } else {
                                    // Strip surrounding quotes
                                    row[c] = token.replace(/^['"]|['"]$/g, '');
                                }
                            });
                        } else {
                            // Fallback: direct index mapping
                            cols.forEach((c, i) => { row[c] = params![i] !== undefined ? params![i] : null; });
                        }

                        // ON CONFLICT UPDATE - replace if exists
                        if (sql.includes('ON CONFLICT') || sql.toUpperCase().includes('OR REPLACE')) {
                            // Find existing row by id, key, or first unique column
                            let idx = -1;
                            if (row.id !== undefined) {
                                idx = webStore[table].findIndex(r => r.id === row.id);
                            } else if (row.key !== undefined) {
                                idx = webStore[table].findIndex(r => r.key === row.key);
                            }
                            if (idx >= 0) webStore[table][idx] = { ...webStore[table][idx], ...row };
                            else webStore[table].push(row);
                        } else if (row.id !== undefined) {
                            const idx = webStore[table].findIndex(r => r.id === row.id);
                            if (idx < 0) webStore[table].push(row);
                        } else {
                            webStore[table].push(row);
                        }
                    }
                }
            }
            // UPDATE
            if (sql.trim().toUpperCase().startsWith('UPDATE')) {
                const table = extractTableName(sql);
                if (table && webStore[table] && params) {
                    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
                    if (whereMatch) {
                        const idCol = whereMatch[1];
                        const idVal = params[params.length - 1];
                        const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
                        if (setMatch) {
                            const assignments = setMatch[1].split(',').map(s => s.trim());
                            const row = webStore[table].find(r => String(r[idCol]) === String(idVal));
                            if (row) {
                                let pIdx = 0;
                                assignments.forEach(a => {
                                    const parts = a.split('=').map(s => s.trim());
                                    const col = parts[0];
                                    const valPart = parts[1];
                                    if (valPart === '?' && pIdx < params!.length - 1) {
                                        row[col] = params![pIdx++];
                                    } else if (valPart && valPart.toLowerCase().startsWith('datetime(')) {
                                        row[col] = new Date().toISOString();
                                    } else if (valPart && !valPart.includes('?')) {
                                        row[col] = valPart.replace(/^['"]|['"]$/g, '');
                                    }
                                });
                            }
                        }
                    }
                }
            }
            // DELETE
            if (sql.trim().toUpperCase().startsWith('DELETE')) {
                const table = extractTableName(sql);
                if (table && webStore[table] && params) {
                    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
                    if (whereMatch) {
                        const col = whereMatch[1];
                        webStore[table] = webStore[table].filter(r => String(r[col]) !== String(params![0]));
                    }
                }
            }
            saveWebStore();
            return { lastInsertRowId: 0, changes: 1 };
        },
    };
}

function extractTableName(sql: string): string | null {
    const from = sql.match(/FROM\s+(\w+)/i);
    if (from) return from[1];
    const into = sql.match(/INTO\s+(\w+)/i);
    if (into) return into[1];
    const update = sql.match(/UPDATE\s+(\w+)/i);
    if (update) return update[1];
    const del = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (del) return del[1];
    const create = sql.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (create) return create[1];
    return null;
}

// Reset database
export async function resetDatabase(): Promise<void> {
    if (isWeb) {
        Object.keys(webStore).forEach(k => { webStore[k] = []; });
        await seedWebStore();
        return;
    }
    const db = await getDatabase();
    const tables = ['sync_queue', 'mindfulness_logs', 'chat_messages', 'test_attempts',
        'test_questions', 'tests', 'questions', 'resources', 'chapters', 'units', 'subjects', 'user_settings'];
    for (const table of tables) { await db.execAsync(`DROP TABLE IF EXISTS ${table}`); }
    await initializeDatabase();
}

// Close database
export async function closeDatabase(): Promise<void> {
    if (dbInstance && !isWeb && dbInstance.closeAsync) {
        await dbInstance.closeAsync();
    }
    dbInstance = null;
}
