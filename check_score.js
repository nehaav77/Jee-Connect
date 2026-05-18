const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('jeeconnect.db');

db.serialize(() => {
    db.get('SELECT * FROM test_attempts ORDER BY started_at DESC LIMIT 1', (err, attempt) => {
        if (err) console.error(err);
        console.log('Latest Attempt:', attempt);
        
        if (attempt) {
            const answers = JSON.parse(attempt.answers || '{}');
            const questionIds = Object.keys(answers).map(id => `'${id}'`).join(',');
            if (questionIds) {
                db.all(`SELECT id, question_type, marks, negative_marks FROM questions WHERE id IN (${questionIds})`, (err, rows) => {
                    if (err) console.error(err);
                    console.log('Questions:', rows);
                });
            }
        }
    });
});
