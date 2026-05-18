// JEE Connect - User Repository (Firebase Migrated)
import { BaseRepository, generateId } from './BaseRepository';
import { firestoreDb } from '../db/firebaseConfig';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

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
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return null;
        }
        
        return querySnapshot.docs[0].data() as User;
    }

    // Create a new user
    async create(email: string, name: string, password?: string): Promise<User> {
        const user: User = {
            id: generateId(),
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password: password || 'nopassword',
            created_at: new Date().toISOString()
        };

        const userDocRef = doc(firestoreDb, 'users', user.id);
        await setDoc(userDocRef, user);

        return user;
    }

    // Verify password
    async verifyPassword(email: string, password?: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user || user.password !== password) return null;
        return user;
    }

    // Update existing user
    async updateUser(user: User): Promise<void> {
        const userDocRef = doc(firestoreDb, 'users', user.id);
        await setDoc(userDocRef, user, { merge: true });
    }

    // Override getAll to fetch from Firestore
    async getAll(): Promise<User[]> {
        const usersRef = collection(firestoreDb, 'users');
        const querySnapshot = await getDocs(usersRef);
        return querySnapshot.docs.map(doc => doc.data() as User);
    }

    // Debug: Print all users to console
    async debugListAll(): Promise<void> {
        try {
            const users = await this.getAll();
            console.log('--- USER DATABASE (FIREBASE FIRESTORE) ---');
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
