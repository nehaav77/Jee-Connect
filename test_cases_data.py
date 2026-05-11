"""All 75 test cases for JEE Connect Test Report - Data Only."""
# Format: [TC#, Test Case, Preconditions, Steps, Expected Result, Status]
H6 = ["TC#","Test Case","Preconditions","Steps","Expected Result","Status"]

F1_UNIT = [
["UT-A01","Seed generates 36 questions","jee_advanced_seed.ts accessible","Inspect JEE_ADVANCED_QUESTIONS array; count Physics (12) + Chemistry (12) + Math (12)","Total length equals 36; each subject contributes exactly 12 questions with unique IDs","Pass"],
["UT-A02","Physics questions have correct IDs","Seed file loaded","Verify all Physics question IDs match pattern ja-physics-{type}-{n}","All IDs follow naming convention; chapter references use phy- prefix","Pass"],
["UT-A03","MCQ answers are single letters","Seed answer-fix logic present","Parse correct_answers for all MCQ-type questions after fix step","Every MCQ answer is exactly one of A, B, C, or D","Pass"],
["UT-A04","Multi-answer has array answers","Multi-answer questions exist in seed","Parse correct_answers for multi_answer type questions","Returns JSON arrays like ['A','B','C']; serialized via JSON.stringify","Pass"],
["UT-A05","Numerical answers are strings","Numerical questions exist in seed","Check correct_answers for numerical type; verify parseFloat succeeds","All numerical answers are valid float strings (e.g. '1.2', '0.6'); negative_marks=0","Pass"],
]
F1_INT = [
["IT-A01","Seed inserts into DB","Database initialization runs on app launch","App launches; query questions table for ja-* prefixed records","36 ja-* questions exist in DB with valid chapter_id, question_type, and correct_answers","Pass"],
["IT-A02","14 tests created from seed","Seed generates tests via loop","Query tests table for jeeadv prefix","5 full mock tests + 9 subject tests (3 per subject) = 14 total found","Pass"],
["IT-A03","Test-question links valid","Tests and questions seeded","Query test_questions for test-jeeadv-full-1","36 question links found; all question_ids reference valid questions","Pass"],
["IT-A04","getTestQuestions returns data","TestRepository module loaded","Call testRepository.getTestQuestions('test-jeeadv-full-1')","Returns array of 36 Question objects with all required fields populated","Pass"],
["IT-A05","completeAttempt scores correctly","Active test attempt with known answers","Submit attempt with predefined correct/wrong answers","Score matches +4/-1/0 marking scheme; correct_count and wrong_count accurate","Pass"],
]
F1_SYS = [
["ST-A01","Advanced tests visible in Tests tab","User logged in; seed data loaded","Navigate to Tests tab","JEE Advanced Full Mock Tests and subject-wise tests appear in Available Tests list","Pass"],
["ST-A02","Full mock shows 36Q, 180min","Advanced tests seeded","Open any JEE Advanced Full Mock Test card","Description shows '36 Questions' and duration is '180 minutes'","Pass"],
["ST-A03","MCQ renders with 4 options","Test started with MCQ questions","Start an Advanced test; navigate to an MCQ question","Question text prefixed with [JEE Adv YYYY]; 4 selectable options A-D displayed","Pass"],
["ST-A04","Numerical shows input field","Test has numerical questions","Navigate to a numerical-type question during test","TextInput field shown instead of option buttons; keyboardType='numeric'","Pass"],
["ST-A05","Result shows correct/wrong/score","Test completed and submitted","Complete test; view result screen","Score hero card, stats grid (correct/wrong/skipped), and solution review section available","Pass"],
]

F2_UNIT = [
["UT-M01","analyzeSentiment returns 0-1","saathi.tsx loaded with analyzeSentiment function","Call analyzeSentiment('stressed worried anxious')","Returns value < 0.45; clamped to [0,1] via Math.max/Math.min","Pass"],
["UT-M02","analyzeSentiment positive input","Function accessible","Call analyzeSentiment('great progress amazing confident')","Returns value > 0.6; baseline 0.5 + 0.12 per positive word","Pass"],
["UT-M03","generateResponse triggers mnemonic","Saathi chat engine loaded","Call generateResponse with input containing 'mnemonic'","Returns '__MNEMONIC_START__' trigger string","Pass"],
["UT-M04","generateResponse keyword 'trick'","Saathi chat engine loaded","Call generateResponse with 'trick to remember'","Returns '__MNEMONIC_START__'; also triggered by 'shortcut', 'memorize'","Pass"],
["UT-M05","bldM generates cricket+kinematics","bldM function accessible","Call bldM('Kinematics','Virat Kohli','cricket')","Response contains SUVAT equations, cricket analogies (Bumrah's yorker), and practice links","Pass"],
]
F2_INT = [
["IT-M01","Mnemonic favorite saved to DB","User logged in; mnemonic flow completed","Complete mnemonic flow; check saathi_memory table","Row with key='mnemonic_fav' exists via gamificationService.saveSaathiMemory","Pass"],
["IT-M02","Chat messages persisted","User has sent messages","Send mnemonic message; reload Saathi tab","Messages restored from chat_messages table via loadMessages query","Pass"],
["IT-M03","XP awarded for chat","User logged in","Send any message in Saathi","user_xp_log has new entry: action='saathi_chat', xp_earned=5","Pass"],
["IT-M04","Struggle topic detected","User logged in","Type 'struggling with kinematics' and send","saathi_memory table has row: key='struggle_topic', value contains 'kinematics'","Pass"],
["IT-M05","Sentiment updates store","User logged in","Send stressed message ('I feel anxious about exam')","appStore.stressLevel updated; if < 0.25, mindfulness overlay triggered","Pass"],
]
F2_SYS = [
["ST-M01","Type 'mnemonic' starts flow","Fresh Saathi chat session","Type 'mnemonic' in chat and send","Category picker appears: Cricket/Movies/Games/Anime/Memes with numbered options","Pass"],
["ST-M02","Select category by number","Category picker displayed","Type '1' and send","Cricket selected; favorite picker shown with Virat Kohli, MS Dhoni, etc.","Pass"],
["ST-M03","Select favorite, see topics","Category selected (Cricket)","Type '2' (MS Dhoni) and send","Confirms Dhoni selection; shows 9 JEE topic options (Kinematics, Newton's Laws, etc.)","Pass"],
["ST-M04","Get personalized response","Category=Cricket, Favorite=Dhoni","Type '1' (Kinematics) and send","Response contains Dhoni + SUVAT equations + cricket analogies + practice link","Pass"],
["ST-M05","Flow restarts after completion","Mnemonic response received","Type 'mnemonic' again and send","Fresh category picker appears; mnemonicStep reset to 'idle'","Pass"],
]

F3_UNIT = [
["UT-G01","getLevel returns Aspirant at 0 XP","GamificationService loaded","Call getLevel(0)","Returns {title:'Aspirant', emoji:'📘', minXP:0}","Pass"],
["UT-G02","getLevel returns Ranker at 600","LEVELS array defined","Call getLevel(600)","Returns {title:'Ranker', emoji:'🏆', minXP:600}","Pass"],
["UT-G03","Level progress calculated","getLevel function accessible","Call getLevel(150); verify progress field","progress = (150-100)/(300-100) = 0.25; capped at 1.0 via Math.min","Pass"],
["UT-G04","getStreakEmoji returns correct","getStreakEmoji function accessible","Call getStreakEmoji(7)","Returns '🔥🔥'; streak>=100='💎', >=30='🔥🔥🔥', >=7='🔥🔥', >=1='🔥', else '❄️'","Pass"],
["UT-G05","Spin reward from valid pool","SPIN_REWARDS array defined","Call doSpin(); inspect reward type","Returns SpinReward with type in [xp, streak_shield, tip, fun_fact]","Pass"],
]
F3_INT = [
["IT-G01","awardXP creates log entry","User email available; DB initialized","Call awardXP(email, 'test', 50)","user_xp_log has new row: xp_earned=50; also triggers recordDailyActivity","Pass"],
["IT-G02","getTotalXP sums correctly","Previous XP awards exist","Award 50+30 XP; call getTotalXP(email)","Returns 80; uses reduce((sum, r) => sum + r.xp_earned, 0)","Pass"],
["IT-G03","recordDailyActivity creates streak","User logged in today","Call recordDailyActivity(email, xp, 0, 0)","daily_streaks table has row for today's date; INSERT or UPDATE executed","Pass"],
["IT-G04","Achievement unlocks once","Achievement not yet unlocked","Call unlockAchievement twice with same achievement_id","First call: {unlocked:true}; second call: {unlocked:false} (duplicate check)","Pass"],
["IT-G05","Daily challenge deterministic","Questions exist in DB","Call getDailyChallenge() twice on same day","Same question returned both times; date-seeded index selection","Pass"],
]
F3_SYS = [
["ST-G01","Achievements page loads","User logged in","Navigate to /achievements","Badge grid with categories (milestone/streak/performance); progress bar shown","Pass"],
["ST-G02","Badge detail on tap","Achievements page loaded","Tap any badge card","Detail card shows description, XP reward, and lock/unlock status","Pass"],
["ST-G03","Daily Spin page works","User logged in; spin available","Navigate to /daily-spin; tap spin","Reward card revealed with animation; XP awarded if type='xp'","Pass"],
["ST-G04","Spin disabled after use","User already spun today","Revisit /daily-spin page","Shows 'Come Back Tomorrow' with hourglass; canSpin returns false","Pass"],
["ST-G05","XP toast after test","Test completed","Complete any test; observe UI","XP toast appears with earned amount; checkAndUnlockAchievements triggered","Pass"],
]

F4_UNIT = [
["UT-H01","JEE countdown calculates","targetYear set in user profile","Compute daysToJEE from current date","daysToJEE > 0; calculated via Math.ceil((target - now) / 86400000)","Pass"],
["UT-H02","Weekly progress capped at 1","weeklyXPGoal > 0","Set weeklyXPProgress=600, weeklyXPGoal=500","weeklyProgress = Math.min(1, 600/500) = 1 (not 1.2)","Pass"],
["UT-H03","Stats default to 0","New user with no test history","Check initial stats state","useState returns {tests:0, studyHours:0, streak:0}","Pass"],
["UT-H04","Subject list has counts","Subjects seeded in DB","Load subjects via subjectRepository.getAll()","Each subject object has chapterCount > 0; displayed as '{n} chapters'","Pass"],
["UT-H05","Level badge shows emoji","User has XP in store","Read currentLevelEmoji from appStore","Displays correct emoji matching current XP level","Pass"],
]
F4_INT = [
["IT-H01","Stats refresh on focus","User navigated away and back","useFocusEffect triggers; analyticsService.getStudentStats called","Stats object updated with latest tests, studyHours, streak values","Pass"],
["IT-H02","Focus Today from heatmap","User has test history with weak chapters","Dashboard loads; gamificationService.getFocusTodayChapter called","focusChapter populated with weakest chapter based on accuracy data","Pass"],
["IT-H03","Daily challenge loads","New day; questions in DB","Dashboard mounts; getDailyChallenge() + isDailyChallengeSolved() called","dailyChallenge has question object; challengeSolved boolean set correctly","Pass"],
["IT-H04","Smart test generates","User taps Generate Smart Test","adaptiveTestService.generateAdaptiveTest called; navigates on success","Adaptive test created; router navigates to /test/instructions with testId param","Pass"],
["IT-H05","Gamification data refreshed","User returns to Home tab","refreshGamificationData(email) called on focus event","currentXP, currentLevel, currentStreak all updated from DB in appStore","Pass"],
]
F4_SYS = [
["ST-H01","Hero card shows user info","User logged in","Navigate to Home tab","'Namaste, {name}!' greeting with XP bar, level badge, and days-to-JEE counter","Pass"],
["ST-H02","Weekly XP goal visible","User has earned XP this week","Check weekly card on Home","Progress bar with '{current}/{goal} XP' text and completion message if met","Pass"],
["ST-H03","Quick actions navigate","Home dashboard loaded","Tap each quick action button (Mock Test, PYQs, Saathi, Profile)","Each navigates to correct route: /(tabs)/tests, /subjects, /saathi, /profile","Pass"],
["ST-H04","Subject cards shown","Subjects seeded","Scroll to 'Your Subjects' section","Physics/Chemistry/Math cards with chapter counts; tappable to navigate","Pass"],
["ST-H05","Connection status shown","Device has network","Check status badge on Home","Shows 'Online — Syncing data' (green) or 'Offline — Using local data' (yellow)","Pass"],
]

F5_UNIT = [
["UT-T01","90 JEE Main questions seeded","jee_main_seed.ts accessible","Check JEE_MAIN_QUESTIONS array length","Equals 90: 30 per subject (20 MCQ + 10 Numerical) x 3 subjects","Pass"],
["UT-T02","MCQ correct_answers fixed","Answer-fix logic in seed","Inspect MCQ answers after fix step","All MCQ answers converted to single letter A/B/C/D via String.fromCharCode","Pass"],
["UT-T03","Numerical has 0 negative marks","Numerical questions in seed","Check negative_marks for all jm-*-num-* questions","All numerical questions have negative_marks = 0","Pass"],
["UT-T04","MCQ scoring: +4 correct","Marking scheme defined","Score MCQ with correct answer","score += 4; marks field = 4 for all questions","Pass"],
["UT-T05","MCQ scoring: -1 wrong","Marking scheme defined","Score MCQ with wrong answer","score += -1; instructions page shows -1 for wrong MCQ","Pass"],
]
F5_INT = [
["IT-T01","25 JEE Main tests created","Seed generates tests","Query tests table for jeemain prefix","10 full mock tests + 15 subject tests (5 per subject) = 25 total","Pass"],
["IT-T02","startAttempt creates record","Test exists in DB","Call testRepository.startAttempt(testId, email)","test_attempts row created with status='in_progress' and started_at timestamp","Pass"],
["IT-T03","saveAnswer updates JSON","Active attempt exists","Save answer for question Q1 during test","answers JSON has Q1 entry; total_attempted incremented; auto-save every 30s","Pass"],
["IT-T04","completeAttempt calculates score","Attempt with answers exists","Call completeAttempt(attemptId, false)","score, correct_count, wrong_count computed; status='completed'","Pass"],
["IT-T05","Sync enqueued on complete","Test completed","Complete attempt; check sync queue","syncService.enqueueTestResult called; sync tables updated","Pass"],
]
F5_SYS = [
["ST-T01","Tests tab shows available tests","User logged in; tests seeded","Navigate to Tests tab","JEE Main Full Mock Tests listed with question count and duration","Pass"],
["ST-T02","Instructions page displays","User taps Start Test","Tap Start Test on any mock test","NTA-style instructions with General, Navigation, Answering, Marking, Conduct sections","Pass"],
["ST-T03","Agreement required to start","Instructions page loaded","Check Begin Exam button state","Button disabled until 'I have read and understood' checkbox is checked","Pass"],
["ST-T04","Timer counts down","Test started","Start test; observe timer display","HH:MM:SS timer decreasing every second; red warning when < 5 minutes","Pass"],
["ST-T05","Question palette shows status","Test in progress; some questions answered","Answer Q1, visit Q2, skip Q3; check palette","Green=answered, Red=not answered, Grey=not visited, Purple=marked for review","Pass"],
]
