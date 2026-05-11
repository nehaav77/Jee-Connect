// JEE Connect - User Repository
import { BaseRepository, generateId } from './BaseRepository';
import { getDatabase } from '../db/database';

export interface User {
    id: string;
    email: string;
    name: string;
    password?: string; // Optional because we don't always want to fetch it
    created_at?: string;
}

class UserRepositoryClass extends BaseRepository<User> {
    tableName = 'users';

    // Find a user by email (for login)
    async findByEmail(email: string): Promise<User | null> {
        const db = await getDatabase();
        const result = await db.getFirstAsync<User>(
            `SELECT * FROM ${this.tableName} WHERE email = ?`,
            [email.toLowerCase().trim()]
        );
        return result || null;
    }

    // Create a new user
    async create(email: string, name: string, password?: string): Promise<User> {
        const user: User = {
            id: generateId(),
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password: password || 'nopassword', // Fallback for simulated auth
            created_at: new Date().toISOString()
        };

        await this.save(
            user,
            ['id', 'email', 'name', 'password', 'created_at'],
            [user.id, user.email, user.name, user.password, user.created_at]
        );

        return user;
    }

    // Verify password (plain text for now as per project scope)
    async verifyPassword(email: string, password?: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user || user.password !== password) return null;
        return user;
    }

    // Debug: Print all users to console
    async debugListAll(): Promise<void> {
        try {
            const db = await getDatabase();
            const users = await db.getAllAsync<User>(`SELECT * FROM ${this.tableName}`);
            console.log('--- USER DATABASE (SELECT * FROM users) ---');
            if (users.length === 0) {
                console.log('No users found in database.');
            } else {
                console.table(users);
            }
            console.log('-------------------------------------------');
        } catch (e) {
            console.error('Debug query failed:', e);
        }
    }
}

export const userRepository = new UserRepositoryClass();
