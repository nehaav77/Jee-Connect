const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyACdzHfG2_mHP0bYYHKzYWhqXbB-3wOTws",
  authDomain: "jee-connect.firebaseapp.com",
  projectId: "jee-connect",
  storageBucket: "jee-connect.firebasestorage.app",
  messagingSenderId: "440484760844",
  appId: "1:440484760844:web:6ec978f1805c79a5478d29",
  measurementId: "G-NQ0NZQD1R1"
};

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);

const DB_FILE = path.join(__dirname, 'temp_db.json');

async function viewDb() {
    let localDb = { tests: [], test_attempts: [] };
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            localDb = JSON.parse(raw);
        } catch(e) {}
    }

    try {
        console.log('\nFetching live data from Firebase Cloud...');
        const usersRef = collection(firestoreDb, 'users');
        const snapshot = await getDocs(usersRef);
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));

        const attempts = localDb.test_attempts || [];

        console.log('\n=== JEE CONNECT: USER ACTIVITY DATABASE (CLOUD SYNCED) ===\n');

        if (users.length === 0) {
            console.log('No users found in Firebase Cloud yet. Go sign up!');
        } else {
            const tableData = users.map(u => {
                const completed = attempts.filter(a =>
                    a.status === 'completed' && a.user_email === u.email
                );
                let totalMin = 0;
                completed.forEach(a => {
                    let usedActualTime = false;
                    if (a.started_at && a.ended_at) {
                        const start = new Date(a.started_at).getTime();
                        const end = new Date(a.ended_at).getTime();
                        const diffMin = (end - start) / (1000 * 60);
                        if (diffMin > 0 && !isNaN(diffMin)) {
                            totalMin += diffMin;
                            usedActualTime = true;
                        }
                    }
                    if (!usedActualTime) {
                        const test = (localDb.tests || []).find(t => t.id === a.test_id);
                        totalMin += (test && test.duration_min) ? test.duration_min : 15;
                    }
                });
                
                const testsWritten = completed.length;
                let studyHours = 0;
                if (totalMin > 0) {
                    studyHours = Math.max(0.1, Math.round((totalMin / 60) * 10) / 10);
                }
                const streak = testsWritten > 0 ? 1 : 0;

                return {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    password: u.password,
                    created_at: u.created_at,
                    tests_written: testsWritten,
                    study_hours: studyHours + 'h',
                    streak: streak
                };
            });
            console.table(tableData);
        }
        console.log('==========================================================\n');

        // --- Third Table: Study Clans (New) ---
        console.log('\n=== JEE CONNECT: LIVE SPRINT CLANS (CLOUD) ===\n');
        const clansRef = collection(firestoreDb, 'study_clans');
        const clanSnap = await getDocs(clansRef);
        const clans = [];
        clanSnap.forEach(doc => clans.push(doc.data()));

        if (clans.length === 0) {
            console.log('No clans created yet.');
        } else {
            const clanData = clans.map(c => ({
                id: c.id,
                name: c.name,
                owner: c.owner_name,
                members: c.member_count,
                status: c.planned_sprint_status || 'none'
            }));
            console.table(clanData);
        }
        console.log('==============================================\n');


        // --- Second Table: Individual Test Marks ---
        console.log('\n=== JEE CONNECT: DETAILED TEST MARKS (LOCAL) ===\n');
        
        const completedAttempts = attempts.filter(a => a.status === 'completed' && a.user_email);
        
        if (completedAttempts.length === 0) {
            console.log('No completed tests found yet.');
        } else {
            const marksData = completedAttempts.map(a => {
                const user = users.find(u => u.email === a.user_email);
                const test = (localDb.tests || []).find(t => t.id === a.test_id);
                
                return {
                    student_name: user ? user.name : 'Unknown',
                    email: a.user_email,
                    test_title: test ? test.title : a.test_id,
                    score: a.score !== undefined ? a.score : 'N/A',
                    correct: a.correct_count !== undefined ? a.correct_count : 'N/A',
                    wrong: a.wrong_count !== undefined ? a.wrong_count : 'N/A',
                    total_questions: test ? test.total_questions : 'N/A',
                    date_taken: a.started_at ? new Date(a.started_at).toLocaleString() : 'Unknown'
                };
            });
            console.table(marksData);
        }
        console.log('================================================\n');

        process.exit(0);

    } catch (e) {
        console.error('❌ Failed to read database:', e.message);
        process.exit(1);
    }
}

viewDb();
