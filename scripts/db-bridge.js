const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const DB_FILE = path.join(__dirname, '..', 'temp_db.json');

// --- 🛠️ TWILIO CONFIGURATION ---
// I've filled in your SID from the screenshot.
// Click "My first Twilio account" on your screen to find these 2 missing items:
const TWILIO_SID = 'AC6071297da2b77f498aebae782bca97e5';
const TWILIO_TOKEN = '1e9be822f25ec5d15bb82a1fbfac3897';
const TWILIO_PHONE = '+13203378607'; 

const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log(`[BRIDGE] Request Path: ${req.url}`);

                // --- ROUTE: /send-sms ---
                if (req.url === '/send-sms') {
                    let to = data.to.replace(/\s/g, ''); // Remove spaces
                    
                    // AUTO-FORMAT: If it's a 10-digit Indian number, add +91
                    if (to.length === 10 && !to.startsWith('+')) {
                        to = '+91' + to;
                    }
                    
                    console.log(`[SMS] Request received for: ${data.to} | Formatted to: ${to}`);
                    
                    if (TWILIO_SID.startsWith('YOUR_')) {
                        console.warn('[SMS] Twilio not configured. Simulating success...');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Simulated SMS' }));
                        return;
                    }

                    const postData = new URLSearchParams({
                        To: to,
                        From: TWILIO_PHONE,
                        Body: data.message
                    }).toString();

                    const options = {
                        hostname: 'api.twilio.com',
                        port: 443,
                        path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Content-Length': postData.length,
                            'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
                        }
                    };

                    const twilioReq = https.request(options, (twilioRes) => {
                        let result = '';
                        twilioRes.on('data', d => { result += d; });
                        twilioRes.on('end', () => {
                            console.log(`[SMS] Twilio Response Status: ${twilioRes.statusCode}`);
                            if (twilioRes.statusCode >= 400) {
                                console.error(`[SMS] Twilio Error Body: ${result}`);
                            }
                            res.writeHead(twilioRes.statusCode, { 'Content-Type': 'application/json' });
                            res.end(result);
                        });
                    });

                    twilioReq.on('error', (e) => {
                        console.error('[SMS] Twilio Error:', e.message);
                        res.writeHead(500);
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    });

                    twilioReq.write(postData);
                    twilioReq.end();
                    return;
                }

                // --- ROUTE: / (Default DB Sync) ---
                fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
                console.log(`[BRIDGE] Database updated at ${new Date().toLocaleTimeString()}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

            } catch (e) {
                console.error('[BRIDGE] Error:', e.message);
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 DB BRIDGE SERVER RUNNING ON PORT ${PORT}`);
    console.log(`📦 Data saved to: ${DB_FILE}`);
    console.log(`📱 SMS Gateway: http://localhost:${PORT}/send-sms`);
    console.log('⏰ Weekly Scheduler: ACTIVE (Sundays at 10:00 PM)');
    console.log('--------------------------------------------------');
});

// --- ⏰ AUTOMATED WEEKLY SCHEDULER ---
const LOG_FILE = path.join(__dirname, '..', 'sms_logs.json');

function sendActualSMS(to, message) {
    if (TWILIO_SID.startsWith('YOUR_')) return Promise.resolve({ success: false, message: 'Twilio not configured' });

    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({ To: to, From: TWILIO_PHONE, Body: message }).toString();
        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
            }
        };

        const req = https.request(options, (res) => {
            let result = '';
            res.on('data', d => { result += d; });
            res.on('end', () => resolve({ status: res.statusCode, data: result }));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function checkWeeklySchedule(forceTrigger = false) {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const is10PM = now.getHours() === 22;

    if (!isSunday || !is10PM) {
        if (!forceTrigger) return;
        console.log(`[SCHEDULER] 🧪 TEST MODE: Forcing weekly alert run...`);
    }

    console.log(`[SCHEDULER] Checking for weekly alerts... ${now.toLocaleString()}`);

    if (!fs.existsSync(DB_FILE)) return;
    
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const users = db.users || [];
        const settings = db.user_settings || [];
        const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : {};

        // Today's key for duplicate prevention (e.g. "2026-04-19")
        const todayKey = now.toISOString().split('T')[0];

        // Find parent settings
        const parentPhone = settings.find(s => s.key === 'parent_sms_phone')?.value;
        const smsActive = settings.find(s => s.key === 'parent_sms_active')?.value === 'true';

        if (parentPhone && smsActive) {
            if (logs[todayKey]) {
                // Already sent today
                return;
            }

            console.log(`[SCHEDULER] Running report for parent: ${parentPhone}`);

            // Generate Summary
            const attempts = db.test_attempts?.filter(a => a.status === 'completed') || [];
            const totalTests = attempts.length;
            let totalAccuracy = 0;
            attempts.forEach(a => {
                const acc = Math.round((a.correct_count / (a.correct_count + a.wrong_count || 1)) * 100);
                totalAccuracy += acc;
            });
            const avgAccuracy = totalTests > 0 ? Math.round(totalAccuracy / totalTests) : 0;
            const studyHours = Math.round(totalTests * 0.5);

            const studentName = users[0]?.name || 'Student';
            const message = `JEE Connect Weekly Report for ${studentName}: ` +
                            `Tests: ${totalTests}, ` +
                            `Accuracy: ${avgAccuracy}%, ` +
                            `Study: ${studyHours}h. ` +
                            `Great progress this week! 💪`;

            // Send SMS
            let to = parentPhone.replace(/\s/g, '');
            if (to.length === 10 && !to.startsWith('+')) to = '+91' + to;

            sendActualSMS(to, message).then(res => {
                console.log(`[SCHEDULER] Auto-SMS sent to ${to}. Status: ${res.status}`);
                // Log the send to prevent duplicates
                logs[todayKey] = { sent_at: new Date().toISOString(), to: to };
                fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
            }).catch(err => {
                console.error(`[SCHEDULER] Auto-SMS failed:`, err.message);
            });
        }
    } catch (e) {
        console.error('[SCHEDULER] Error during automated run:', e.message);
    }
}

// Check every 30 minutes
setInterval(checkWeeklySchedule, 30 * 60 * 1000);

// Also run once on startup
// Support --test-weekly flag for manual testing
const isTestMode = process.argv.includes('--test-weekly');
setTimeout(() => checkWeeklySchedule(isTestMode), 5000);
