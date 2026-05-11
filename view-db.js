const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'temp_db.json');

function viewDb() {
    if (!fs.existsSync(DB_FILE)) {
        console.log('\n❌ ERROR: No database data found yet.');
        console.log('1. Make sure you are running "node scripts/db-bridge.js" in another terminal.');
        console.log('2. Perform an action in the app (Login/Signup) to sync the data.\n');
        return;
    }

    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const db = JSON.parse(raw);

        const users = db.users || [];
        const attempts = db.test_attempts || [];

        console.log('\n=== JEE CONNECT: USER ACTIVITY DATABASE ===\n');

        if (users.length === 0) {
            console.log('No users found in the database yet.');
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
                        const test = (db.tests || []).find(t => t.id === a.test_id);
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
        console.log('============================================\n');

        // --- Second Table: Individual Test Marks ---
        console.log('\n=== JEE CONNECT: DETAILED TEST MARKS ===\n');
        
        const completedAttempts = attempts.filter(a => a.status === 'completed' && a.user_email);
        
        if (completedAttempts.length === 0) {
            console.log('No completed tests found yet.');
        } else {
            const marksData = completedAttempts.map(a => {
                const user = users.find(u => u.email === a.user_email);
                const test = (db.tests || []).find(t => t.id === a.test_id);
                
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
        console.log('============================================\n');
    } catch (e) {
        console.error('❌ Failed to read database:', e.message);
    }
}

viewDb();
