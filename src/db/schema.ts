// JEE Connect - Database Schema Definitions
// All tables for the offline-first learning ecosystem

export const DB_NAME = 'jeeconnect.db';
export const DB_VERSION = 1;

export const CREATE_TABLES_SQL = [
  // ─── Subject Hierarchy (Subject → Unit → Chapter) ───
  `CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    order_num INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    summary TEXT,
    content_uri TEXT,
    is_downloaded INTEGER DEFAULT 0,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
  )`,

  // ─── Knowledge Base (Textbooks & Notes) ───
  `CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('textbook','notes','video','formula_sheet')) NOT NULL,
    content TEXT,
    file_uri TEXT,
    size_bytes INTEGER DEFAULT 0,
    is_downloaded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  )`,

  // ─── PYQ Questions ───
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    shift TEXT,
    question_type TEXT CHECK(question_type IN ('mcq','multi_answer','numerical')) NOT NULL,
    question_text TEXT NOT NULL,
    question_latex TEXT,
    options TEXT,
    correct_answers TEXT NOT NULL,
    solution_text TEXT,
    solution_latex TEXT,
    difficulty INTEGER DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
    marks REAL DEFAULT 4.0,
    negative_marks REAL DEFAULT -1.0,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  )`,

  // ─── Mock Tests ───
  `CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration_min INTEGER NOT NULL DEFAULT 180,
    total_marks REAL DEFAULT 300,
    total_questions INTEGER DEFAULT 0,
    test_type TEXT CHECK(test_type IN ('full','subject','chapter','custom')) DEFAULT 'chapter',
    user_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS test_questions (
    test_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    order_num INTEGER DEFAULT 0,
    PRIMARY KEY (test_id, question_id),
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS test_attempts (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT CHECK(status IN ('in_progress','completed','abandoned')) DEFAULT 'in_progress',
    answers TEXT DEFAULT '{}',
    score REAL,
    total_attempted INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    time_per_question TEXT DEFAULT '{}',
    tab_violations INTEGER DEFAULT 0,
    is_disqualified INTEGER DEFAULT 0,
    xp_awarded INTEGER DEFAULT 0,
    question_ids TEXT,
    user_email TEXT,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
  )`,

  // ─── Saathi AI Chat ───
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    role TEXT CHECK(role IN ('user','assistant','system')) NOT NULL,
    content TEXT NOT NULL,
    sentiment_score REAL,
    language TEXT DEFAULT 'en',
    user_email TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS mindfulness_logs (
    id TEXT PRIMARY KEY,
    trigger_reason TEXT NOT NULL,
    duration_sec INTEGER,
    completed INTEGER DEFAULT 0,
    user_email TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Sync Queue ───
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT CHECK(action IN ('insert','update','delete')) NOT NULL,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    synced INTEGER DEFAULT 0,
    sync_attempts INTEGER DEFAULT 0
  )`,

  // ─── User Preferences ───
  `CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Sprint 2: Download Queue (Packet-Based Downloads) ───
  `CREATE TABLE IF NOT EXISTS download_queue (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    total_bytes INTEGER DEFAULT 0,
    downloaded_bytes INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('queued','downloading','paused','completed','failed')) DEFAULT 'queued',
    compression_type TEXT CHECK(compression_type IN ('hevc','webm','none')) DEFAULT 'none',
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Sprint 7: Leaderboards ───
  `CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    score REAL DEFAULT 0,
    accuracy REAL DEFAULT 0,
    time_taken_sec INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 0,
    sprint_id TEXT,
    clan_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Sprint 7: Study Clans ───
  `CREATE TABLE IF NOT EXISTS study_clans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    owner_name TEXT,
    member_count INTEGER DEFAULT 0,
    weekly_score REAL DEFAULT 0,
    rank INTEGER DEFAULT 0,
    planned_sprint_id TEXT,
    planned_sprint_status TEXT DEFAULT 'none',
    scheduled_sprint_time TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS clan_lobby_ready (
    clan_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    PRIMARY KEY (clan_id, user_name),
    FOREIGN KEY (clan_id) REFERENCES study_clans(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS clan_members (
    clan_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (clan_id, user_name),
    FOREIGN KEY (clan_id) REFERENCES study_clans(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS clan_requests (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clan_id) REFERENCES study_clans(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS clan_messages (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clan_id) REFERENCES study_clans(id) ON DELETE CASCADE
  )`,

  // ─── Sprint 7: Doubt Marketplace ───
  `CREATE TABLE IF NOT EXISTS doubt_marketplace (
    id TEXT PRIMARY KEY,
    question_text TEXT NOT NULL,
    subject TEXT,
    chapter TEXT,
    posted_by TEXT,
    answers_count INTEGER DEFAULT 0,
    is_resolved INTEGER DEFAULT 0,
    image_uri TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS doubt_answers (
    id TEXT PRIMARY KEY,
    doubt_id TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    answered_by TEXT,
    upvotes INTEGER DEFAULT 0,
    is_accepted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (doubt_id) REFERENCES doubt_marketplace(id) ON DELETE CASCADE
  )`,

  // ─── Sprint 8: Analytics Snapshots ───
  `CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_date TEXT NOT NULL,
    subject_id TEXT,
    chapter_id TEXT,
    accuracy REAL DEFAULT 0,
    total_attempted INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    weakness_level TEXT CHECK(weakness_level IN ('strong','moderate','weak','critical')) DEFAULT 'moderate',
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Sprint 8: Parent Access ───
  `CREATE TABLE IF NOT EXISTS parent_access (
    id TEXT PRIMARY KEY,
    parent_phone TEXT NOT NULL,
    student_name TEXT NOT NULL,
    access_code TEXT NOT NULL,
    sms_enabled INTEGER DEFAULT 1,
    last_alert_sent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Sprint 8: User Accounts ───
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── Indexes for Performance ───
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_unit ON chapters(unit_id)`,
  `CREATE INDEX IF NOT EXISTS idx_resources_chapter ON resources(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON test_attempts(test_id)`,
  `CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_download_status ON download_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_doubt_resolved ON doubt_marketplace(is_resolved)`,
  `CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(rank)`,
  `CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_email)`,

  // ─── Sprint 9: Gamification — XP & Streaks ───
  `CREATE TABLE IF NOT EXISTS user_xp_log (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS daily_streaks (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    date TEXT NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    questions_solved INTEGER DEFAULT 0,
    tests_completed INTEGER DEFAULT 0,
    UNIQUE(user_email, date)
  )`,

  // ─── Sprint 9: Achievements & Badges ───
  `CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT DEFAULT 'general',
    unlock_condition TEXT,
    xp_reward INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_email, achievement_id)
  )`,

  // ─── Sprint 9: Spaced Repetition ───
  `CREATE TABLE IF NOT EXISTS spaced_repetition (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    last_reviewed_at TEXT,
    next_review_at TEXT,
    review_count INTEGER DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    UNIQUE(user_email, chapter_id)
  )`,

  // ─── Sprint 9: Saathi Memory ───
  `CREATE TABLE IF NOT EXISTS saathi_memory (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_email, key)
  )`,

  // ─── Sprint 9: User Profile Extensions ───
  `CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_email, key)
  )`,

  // ─── Sprint 9 Indexes ───
  `CREATE INDEX IF NOT EXISTS idx_xp_log_user ON user_xp_log(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_streaks_user ON daily_streaks(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_spaced_rep_user ON spaced_repetition(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_saathi_mem_user ON saathi_memory(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_user_profile_user ON user_profile(user_email)`,
];

// Seed data for subjects
export const SEED_SUBJECTS = [
  { id: 'physics', name: 'Physics', icon: '⚛️', color: '#6366f1', order_num: 1 },
  { id: 'chemistry', name: 'Chemistry', icon: '🧪', color: '#10b981', order_num: 2 },
  { id: 'mathematics', name: 'Mathematics', icon: '📐', color: '#f59e0b', order_num: 3 },
];

// Seed data: Physics Units & Chapters
export const SEED_UNITS = [
  // Physics
  { id: 'phy-mechanics', subject_id: 'physics', name: 'Mechanics', order_num: 1 },
  { id: 'phy-thermo', subject_id: 'physics', name: 'Thermodynamics', order_num: 2 },
  { id: 'phy-waves', subject_id: 'physics', name: 'Waves & Oscillations', order_num: 3 },
  { id: 'phy-electro', subject_id: 'physics', name: 'Electrodynamics', order_num: 4 },
  { id: 'phy-optics', subject_id: 'physics', name: 'Optics', order_num: 5 },
  { id: 'phy-modern', subject_id: 'physics', name: 'Modern Physics', order_num: 6 },
  // Chemistry
  { id: 'chem-physical', subject_id: 'chemistry', name: 'Physical Chemistry', order_num: 1 },
  { id: 'chem-organic', subject_id: 'chemistry', name: 'Organic Chemistry', order_num: 2 },
  { id: 'chem-inorganic', subject_id: 'chemistry', name: 'Inorganic Chemistry', order_num: 3 },
  // Mathematics
  { id: 'math-algebra', subject_id: 'mathematics', name: 'Algebra', order_num: 1 },
  { id: 'math-calculus', subject_id: 'mathematics', name: 'Calculus', order_num: 2 },
  { id: 'math-coordinate', subject_id: 'mathematics', name: 'Coordinate Geometry', order_num: 3 },
  { id: 'math-trigonometry', subject_id: 'mathematics', name: 'Trigonometry', order_num: 4 },
  { id: 'math-vectors', subject_id: 'mathematics', name: 'Vectors & 3D Geometry', order_num: 5 },
  { id: 'math-probability', subject_id: 'mathematics', name: 'Probability & Statistics', order_num: 6 },
];

export const SEED_CHAPTERS = [
  // Physics - Mechanics
  { id: 'phy-mech-kinematics', unit_id: 'phy-mechanics', name: 'Kinematics', order_num: 1 },
  { id: 'phy-mech-laws', unit_id: 'phy-mechanics', name: 'Laws of Motion', order_num: 2 },
  { id: 'phy-mech-work', unit_id: 'phy-mechanics', name: 'Work, Energy & Power', order_num: 3 },
  { id: 'phy-mech-rotation', unit_id: 'phy-mechanics', name: 'Rotational Motion', order_num: 4 },
  { id: 'phy-mech-gravitation', unit_id: 'phy-mechanics', name: 'Gravitation', order_num: 5 },
  // Physics - Thermodynamics
  { id: 'phy-thermo-kinetic', unit_id: 'phy-thermo', name: 'Kinetic Theory of Gases', order_num: 1 },
  { id: 'phy-thermo-laws', unit_id: 'phy-thermo', name: 'Laws of Thermodynamics', order_num: 2 },
  { id: 'phy-thermo-transfer', unit_id: 'phy-thermo', name: 'Heat Transfer', order_num: 3 },
  // Physics - Waves
  { id: 'phy-waves-shm', unit_id: 'phy-waves', name: 'Simple Harmonic Motion', order_num: 1 },
  { id: 'phy-waves-wave', unit_id: 'phy-waves', name: 'Wave Motion', order_num: 2 },
  { id: 'phy-waves-sound', unit_id: 'phy-waves', name: 'Sound Waves', order_num: 3 },
  // Physics - Electrodynamics
  { id: 'phy-electro-electrostatics', unit_id: 'phy-electro', name: 'Electrostatics', order_num: 1 },
  { id: 'phy-electro-current', unit_id: 'phy-electro', name: 'Current Electricity', order_num: 2 },
  { id: 'phy-electro-magnetic', unit_id: 'phy-electro', name: 'Magnetic Effects of Current', order_num: 3 },
  { id: 'phy-electro-emi', unit_id: 'phy-electro', name: 'Electromagnetic Induction', order_num: 4 },
  // Physics - Optics
  { id: 'phy-optics-ray', unit_id: 'phy-optics', name: 'Ray Optics', order_num: 1 },
  { id: 'phy-optics-wave', unit_id: 'phy-optics', name: 'Wave Optics', order_num: 2 },
  // Physics - Modern
  { id: 'phy-modern-dual', unit_id: 'phy-modern', name: 'Dual Nature of Matter', order_num: 1 },
  { id: 'phy-modern-atoms', unit_id: 'phy-modern', name: 'Atoms & Nuclei', order_num: 2 },
  { id: 'phy-modern-semiconductor', unit_id: 'phy-modern', name: 'Semiconductor Electronics', order_num: 3 },
  // Chemistry - Physical
  { id: 'chem-phys-mole', unit_id: 'chem-physical', name: 'Mole Concept', order_num: 1 },
  { id: 'chem-phys-atomic', unit_id: 'chem-physical', name: 'Atomic Structure', order_num: 2 },
  { id: 'chem-phys-thermo', unit_id: 'chem-physical', name: 'Chemical Thermodynamics', order_num: 3 },
  { id: 'chem-phys-equilibrium', unit_id: 'chem-physical', name: 'Chemical Equilibrium', order_num: 4 },
  { id: 'chem-phys-kinetics', unit_id: 'chem-physical', name: 'Chemical Kinetics', order_num: 5 },
  { id: 'chem-phys-electrochem', unit_id: 'chem-physical', name: 'Electrochemistry', order_num: 6 },
  // Chemistry - Organic
  { id: 'chem-org-basics', unit_id: 'chem-organic', name: 'General Organic Chemistry', order_num: 1 },
  { id: 'chem-org-hydrocarbons', unit_id: 'chem-organic', name: 'Hydrocarbons', order_num: 2 },
  { id: 'chem-org-haloalkanes', unit_id: 'chem-organic', name: 'Haloalkanes & Haloarenes', order_num: 3 },
  { id: 'chem-org-alcohols', unit_id: 'chem-organic', name: 'Alcohols, Phenols & Ethers', order_num: 4 },
  { id: 'chem-org-carbonyl', unit_id: 'chem-organic', name: 'Aldehydes, Ketones & Acids', order_num: 5 },
  // Chemistry - Inorganic
  { id: 'chem-inorg-periodic', unit_id: 'chem-inorganic', name: 'Periodic Table & Properties', order_num: 1 },
  { id: 'chem-inorg-bonding', unit_id: 'chem-inorganic', name: 'Chemical Bonding', order_num: 2 },
  { id: 'chem-inorg-coordination', unit_id: 'chem-inorganic', name: 'Coordination Compounds', order_num: 3 },
  { id: 'chem-inorg-pblock', unit_id: 'chem-inorganic', name: 'p-Block Elements', order_num: 4 },
  { id: 'chem-inorg-dblock', unit_id: 'chem-inorganic', name: 'd & f Block Elements', order_num: 5 },
  // Mathematics - Algebra
  { id: 'math-alg-quadratic', unit_id: 'math-algebra', name: 'Quadratic Equations', order_num: 1 },
  { id: 'math-alg-complex', unit_id: 'math-algebra', name: 'Complex Numbers', order_num: 2 },
  { id: 'math-alg-sequences', unit_id: 'math-algebra', name: 'Sequences & Series', order_num: 3 },
  { id: 'math-alg-binomial', unit_id: 'math-algebra', name: 'Binomial Theorem', order_num: 4 },
  { id: 'math-alg-matrices', unit_id: 'math-algebra', name: 'Matrices & Determinants', order_num: 5 },
  { id: 'math-alg-permutation', unit_id: 'math-algebra', name: 'Permutations & Combinations', order_num: 6 },
  // Mathematics - Calculus
  { id: 'math-calc-limits', unit_id: 'math-calculus', name: 'Limits & Continuity', order_num: 1 },
  { id: 'math-calc-differentiation', unit_id: 'math-calculus', name: 'Differentiation', order_num: 2 },
  { id: 'math-calc-application', unit_id: 'math-calculus', name: 'Application of Derivatives', order_num: 3 },
  { id: 'math-calc-integration', unit_id: 'math-calculus', name: 'Indefinite Integration', order_num: 4 },
  { id: 'math-calc-definite', unit_id: 'math-calculus', name: 'Definite Integration', order_num: 5 },
  { id: 'math-calc-diffeq', unit_id: 'math-calculus', name: 'Differential Equations', order_num: 6 },
  // Mathematics - Coordinate Geometry
  { id: 'math-coord-straight', unit_id: 'math-coordinate', name: 'Straight Lines', order_num: 1 },
  { id: 'math-coord-circles', unit_id: 'math-coordinate', name: 'Circles', order_num: 2 },
  { id: 'math-coord-conics', unit_id: 'math-coordinate', name: 'Conic Sections', order_num: 3 },
  // Mathematics - Trigonometry
  { id: 'math-trig-functions', unit_id: 'math-trigonometry', name: 'Trigonometric Functions', order_num: 1 },
  { id: 'math-trig-equations', unit_id: 'math-trigonometry', name: 'Trigonometric Equations', order_num: 2 },
  { id: 'math-trig-inverse', unit_id: 'math-trigonometry', name: 'Inverse Trigonometry', order_num: 3 },
  // Mathematics - Vectors
  { id: 'math-vec-algebra', unit_id: 'math-vectors', name: 'Vector Algebra', order_num: 1 },
  { id: 'math-vec-3d', unit_id: 'math-vectors', name: '3D Geometry', order_num: 2 },
  // Mathematics - Probability
  { id: 'math-prob-probability', unit_id: 'math-probability', name: 'Probability', order_num: 1 },
  { id: 'math-prob-statistics', unit_id: 'math-probability', name: 'Statistics', order_num: 2 },
];

// PYQ questions for seeding — covers Physics, Chemistry, Mathematics
export const SEED_QUESTIONS = [
  // ─── PHYSICS ───
  {
    id: 'pyq-phy-2024-1', chapter_id: 'phy-mech-kinematics', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'A particle moves along a straight line such that its displacement at any time t is given by s = t³ - 6t² + 3t + 4. The velocity when the acceleration is zero is:',
    question_latex: 's = t^3 - 6t^2 + 3t + 4', options: JSON.stringify(['A) -9 m/s', 'B) -12 m/s', 'C) 3 m/s', 'D) 42 m/s']),
    correct_answers: JSON.stringify(['A']), solution_text: 'a = 6t - 12 = 0 → t = 2. v = 3t² - 12t + 3 = 12 - 24 + 3 = -9 m/s',
    solution_latex: 'v(2) = 3(4) - 12(2) + 3 = -9', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-phy-2024-2', chapter_id: 'phy-mech-kinematics', year: 2024, shift: 'Evening', question_type: 'mcq',
    question_text: 'A ball is thrown vertically upward with velocity 20 m/s from the top of a building 40 m high. The time after which the ball hits the ground is (g = 10 m/s²):',
    question_latex: null, options: JSON.stringify(['A) 2 s', 'B) 4 s', 'C) 2(1+√2) s', 'D) 2+2√2 s']),
    correct_answers: JSON.stringify(['B']), solution_text: '-40 = 20t - 5t². 5t² - 20t - 40 = 0. t² - 4t - 8 = 0. t = (4+√48)/2 = 4s (taking positive root)',
    solution_latex: 't = 4\\text{ s}', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-phy-2023-1', chapter_id: 'phy-mech-laws', year: 2023, shift: 'Morning', question_type: 'mcq',
    question_text: 'Two blocks of masses 5 kg and 10 kg are connected by a string passing over a frictionless pulley. The acceleration of the system is (g = 10 m/s²):',
    question_latex: null, options: JSON.stringify(['A) 10/3 m/s²', 'B) 5/3 m/s²', 'C) g/3 m/s²', 'D) g/6 m/s²']),
    correct_answers: JSON.stringify(['C']), solution_text: 'a = (m₂-m₁)g/(m₁+m₂) = (10-5)×10/(10+5) = 50/15 = 10/3 = g/3 m/s²',
    solution_latex: 'a = \\frac{(10-5)g}{10+5} = \\frac{g}{3}', difficulty: 2, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-phy-2023-2', chapter_id: 'phy-mech-work', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'A body of mass 2 kg has kinetic energy 8 J. A constant force of 4 N is applied on it in the direction of motion. The kinetic energy after 3 m displacement is:',
    question_latex: null, options: JSON.stringify(['A) 20 J', 'B) 12 J', 'C) 16 J', 'D) 24 J']),
    correct_answers: JSON.stringify(['A']), solution_text: 'Work = Fd = 4×3 = 12J. Final KE = initial KE + Work = 8 + 12 = 20 J',
    solution_latex: 'KE_f = 8 + 4(3) = 20\\text{ J}', difficulty: 2, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-phy-2023-3', chapter_id: 'phy-electro-electrostatics', year: 2023, shift: 'Morning', question_type: 'mcq',
    question_text: 'Two point charges +3μC and -3μC are placed 20 cm apart. The electric potential at the midpoint of the line joining them is:',
    question_latex: null, options: JSON.stringify(['A) 0 V', 'B) 2.7 × 10⁵ V', 'C) -2.7 × 10⁵ V', 'D) 5.4 × 10⁵ V']),
    correct_answers: JSON.stringify(['A']), solution_text: 'At midpoint, distance from each charge = 10 cm. V = kq₁/r + kq₂/r = k(3-3)/0.1 = 0',
    solution_latex: 'V = k\\frac{q_1+q_2}{r} = 0', difficulty: 2, marks: 4, negative_marks: -1
  },

  // ─── CHEMISTRY ───
  {
    id: 'pyq-chem-2024-1', chapter_id: 'chem-phys-equilibrium', year: 2024, shift: 'Morning', question_type: 'numerical',
    question_text: 'For N₂(g) + 3H₂(g) ⇌ 2NH₃(g), if Kp = 1.6 × 10⁻⁴ at 400°C, find Kc. (R = 0.0821). Answer in × 10⁻².',
    question_latex: 'K_p = 1.6 \\times 10^{-4}', options: JSON.stringify(null),
    correct_answers: JSON.stringify(['49']), solution_text: 'Kc = Kp(RT)^(-Δn) = 1.6×10⁻⁴ × (0.0821×673)² ≈ 0.49 → 49×10⁻²',
    solution_latex: 'K_c \\approx 0.49', difficulty: 4, marks: 4, negative_marks: 0
  },

  {
    id: 'pyq-chem-2024-2', chapter_id: 'chem-phys-mole', year: 2024, shift: 'Evening', question_type: 'mcq',
    question_text: 'How many moles of electrons are required for the reduction of 1 mole of Cr₂O₇²⁻ to Cr³⁺?',
    question_latex: null, options: JSON.stringify(['A) 3', 'B) 6', 'C) 2', 'D) 7']),
    correct_answers: JSON.stringify(['B']), solution_text: 'Cr₂O₇²⁻ → 2Cr³⁺. Each Cr goes from +6 to +3 (gains 3e⁻). Two Cr atoms → 6 electrons total.',
    solution_latex: '2 \\times 3 = 6\\text{ mol } e^-', difficulty: 2, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-chem-2023-1', chapter_id: 'chem-org-basics', year: 2023, shift: 'Morning', question_type: 'mcq',
    question_text: 'Which of the following carbocations is most stable?',
    question_latex: null, options: JSON.stringify(['A) CH₃⁺', 'B) (CH₃)₂CH⁺', 'C) (CH₃)₃C⁺', 'D) C₂H₅⁺']),
    correct_answers: JSON.stringify(['C']), solution_text: 'Tertiary carbocation (CH₃)₃C⁺ is most stable due to +I effect of 3 methyl groups and hyperconjugation.',
    solution_latex: '3° > 2° > 1° > CH_3^+', difficulty: 1, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-chem-2023-2', chapter_id: 'chem-inorg-periodic', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'Among Li, Na, K, Rb, which has the highest ionization energy?',
    question_latex: null, options: JSON.stringify(['A) Li', 'B) Na', 'C) K', 'D) Rb']),
    correct_answers: JSON.stringify(['A']), solution_text: 'IE decreases down a group. Li is smallest, most electronegative → highest IE in Group 1.',
    solution_latex: 'Li > Na > K > Rb', difficulty: 1, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-chem-2022-1', chapter_id: 'chem-phys-kinetics', year: 2022, shift: 'Morning', question_type: 'mcq',
    question_text: 'For a first-order reaction, the half-life is 693 seconds. The rate constant is:',
    question_latex: null, options: JSON.stringify(['A) 10⁻³ s⁻¹', 'B) 10⁻² s⁻¹', 'C) 0.693 s⁻¹', 'D) 1.44 × 10⁻³ s⁻¹']),
    correct_answers: JSON.stringify(['A']), solution_text: 'For first order: t₁/₂ = 0.693/k → k = 0.693/693 = 10⁻³ s⁻¹',
    solution_latex: 'k = \\frac{0.693}{693} = 10^{-3}', difficulty: 2, marks: 4, negative_marks: -1
  },

  // ─── MATHEMATICS ───
  {
    id: 'pyq-math-2024-1', chapter_id: 'math-calc-differentiation', year: 2024, shift: 'Evening', question_type: 'multi_answer',
    question_text: 'If f(x) = x³ - 3x² + 3x - 1, which of the following are true?',
    question_latex: 'f(x) = (x-1)^3', options: JSON.stringify(["A) f(1) = 0", "B) f'(1) = 0", "C) f''(1) = 0", "D) f has a point of inflection at x=1"]),
    correct_answers: JSON.stringify(['A', 'B', 'C', 'D']), solution_text: "f(x)=(x-1)³. f(1)=0 ✓. f'(x)=3(x-1)², f'(1)=0 ✓. f''(x)=6(x-1), f''(1)=0 ✓. Inflection ✓",
    solution_latex: "f''(x) = 6(x-1)", difficulty: 2, marks: 4, negative_marks: -2
  },

  {
    id: 'pyq-math-2024-2', chapter_id: 'math-alg-quadratic', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'If α, β are roots of x² - 5x + 6 = 0, the value of α³ + β³ is:',
    question_latex: null, options: JSON.stringify(['A) 35', 'B) 65', 'C) 125', 'D) 45']),
    correct_answers: JSON.stringify(['A']), solution_text: 'α+β=5, αβ=6. α³+β³ = (α+β)³ - 3αβ(α+β) = 125 - 3(6)(5) = 125 - 90 = 35',
    solution_latex: '\\alpha^3+\\beta^3 = 5^3 - 3(6)(5) = 35', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-math-2023-1', chapter_id: 'math-calc-integration', year: 2023, shift: 'Morning', question_type: 'mcq',
    question_text: 'The value of ∫₀^π sin²x dx is:',
    question_latex: '\\int_0^{\\pi} \\sin^2 x\\, dx', options: JSON.stringify(['A) π/2', 'B) π', 'C) π/4', 'D) 2π']),
    correct_answers: JSON.stringify(['A']), solution_text: '∫sin²x dx = ∫(1-cos2x)/2 dx = x/2 - sin2x/4. At π: π/2 - 0 = π/2. At 0: 0. Answer = π/2',
    solution_latex: '\\frac{\\pi}{2}', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-math-2023-2', chapter_id: 'math-trig-functions', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'If sin A + sin B = 1 and cos A + cos B = 0, then the value of 12 cos 2A + 4 cos 2B is:',
    question_latex: null, options: JSON.stringify(['A) -4', 'B) 4', 'C) -7', 'D) 7']),
    correct_answers: JSON.stringify(['C']), solution_text: 'cosA = -cosB → A+B=π → B=π-A. sinA+sin(π-A)=1 → 2sinA=1 → A=π/6,B=5π/6. 12cos(π/3)+4cos(5π/3) = 12(1/2)+4(1/2) = -6-1=-7',
    solution_latex: '-7', difficulty: 4, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-math-2022-1', chapter_id: 'math-prob-probability', year: 2022, shift: 'Morning', question_type: 'mcq',
    question_text: 'A bag contains 5 red and 3 blue balls. Two balls are drawn at random without replacement. The probability that both are red is:',
    question_latex: null, options: JSON.stringify(['A) 5/14', 'B) 5/28', 'C) 25/64', 'D) 10/28']),
    correct_answers: JSON.stringify(['A']), solution_text: 'P = (5/8)(4/7) = 20/56 = 5/14',
    solution_latex: 'P = \\frac{5}{8} \\times \\frac{4}{7} = \\frac{5}{14}', difficulty: 2, marks: 4, negative_marks: -1
  },

  // ─── MORE PHYSICS (JEE Main Standard) ───
  {
    id: 'pyq-phy-2024-3', chapter_id: 'phy-thermo-laws', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'An ideal gas undergoes an isothermal expansion at 300 K. If the volume doubles, the work done by 2 moles of gas is (R = 8.314 J/mol·K):',
    question_latex: 'W = nRT\\ln(V_2/V_1)', options: JSON.stringify(['A) 3456 J', 'B) 2456 J', 'C) 1728 J', 'D) 4988 J']),
    correct_answers: JSON.stringify(['A']), solution_text: 'W = nRT·ln(V₂/V₁) = 2 × 8.314 × 300 × ln(2) = 4988.4 × 0.693 = 3456 J',
    solution_latex: 'W = 2(8.314)(300)\\ln 2 \\approx 3456\\text{ J}', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-phy-2024-4', chapter_id: 'phy-optics-ray', year: 2024, shift: 'Evening', question_type: 'mcq',
    question_text: 'A convex lens of focal length 20 cm produces a real image that is 3 times the size of the object. The object distance is:',
    question_latex: '\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}', options: JSON.stringify(['A) -80/3 cm', 'B) -40/3 cm', 'C) -26.67 cm', 'D) -80/3 cm']),
    correct_answers: JSON.stringify(['A']), solution_text: 'For real image m = -v/u = -3, so v = 3u (but v is positive). u = -u₀, v = 3u₀. 1/(3u₀) + 1/u₀ = 1/20. 4/(3u₀) = 1/20. u₀ = 80/3 cm.',
    solution_latex: 'u = -\\frac{80}{3}\\text{ cm}', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-phy-2023-4', chapter_id: 'phy-mech-kinematics', year: 2023, shift: 'Evening', question_type: 'numerical',
    question_text: 'A projectile is launched at 60° to the horizontal with speed 40 m/s. The maximum height reached is ___ m. (Take g = 10 m/s²)',
    question_latex: 'H = \\frac{u^2 \\sin^2\\theta}{2g}', options: JSON.stringify(null),
    correct_answers: JSON.stringify(['60']), solution_text: 'H = u²sin²θ/(2g) = (40)²×sin²60°/(2×10) = 1600×(3/4)/20 = 1200/20 = 60 m',
    solution_latex: 'H = \\frac{1600 \\times 3/4}{20} = 60\\text{ m}', difficulty: 2, marks: 4, negative_marks: 0
  },

  {
    id: 'pyq-phy-2022-1', chapter_id: 'phy-electro-electrostatics', year: 2022, shift: 'Evening', question_type: 'numerical',
    question_text: 'Three capacitors of 2μF, 3μF, and 6μF are connected in series. The equivalent capacitance in μF is ___.',
    question_latex: '\\frac{1}{C_{eq}} = \\frac{1}{C_1}+\\frac{1}{C_2}+\\frac{1}{C_3}', options: JSON.stringify(null),
    correct_answers: JSON.stringify(['1']), solution_text: '1/C = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. C = 1 μF',
    solution_latex: 'C_{eq} = 1\\,\\mu F', difficulty: 2, marks: 4, negative_marks: 0
  },

  {
    id: 'pyq-phy-2022-2', chapter_id: 'phy-mech-laws', year: 2022, shift: 'Morning', question_type: 'mcq',
    question_text: 'A block of mass 10 kg is placed on a rough inclined plane of inclination 30°. If μ = 1/√3, the force required to just move the block up the incline is:',
    question_latex: null, options: JSON.stringify(['A) 100 N', 'B) 50√3 N', 'C) 100√3 N', 'D) 50 N']),
    correct_answers: JSON.stringify(['A']), solution_text: 'F = mg(sinθ + μcosθ) = 10×10(sin30° + (1/√3)cos30°) = 100(0.5 + 0.5) = 100 N',
    solution_latex: 'F = 100(\\sin 30° + \\frac{1}{\\sqrt{3}}\\cos 30°) = 100\\text{ N}', difficulty: 3, marks: 4, negative_marks: -1
  },

  // ─── MORE CHEMISTRY (JEE Main Standard) ───
  {
    id: 'pyq-chem-2024-3', chapter_id: 'chem-phys-kinetics', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'The rate of a reaction doubles when temperature increases from 27°C to 37°C. The activation energy of the reaction is approximately:',
    question_latex: null, options: JSON.stringify(['A) 53.6 kJ/mol', 'B) 26.8 kJ/mol', 'C) 107.2 kJ/mol', 'D) 80.4 kJ/mol']),
    correct_answers: JSON.stringify(['A']), solution_text: 'Using ln(k₂/k₁) = Ea/R × (1/T₁ - 1/T₂). ln2 = Ea/8.314 × (1/300 - 1/310). Ea ≈ 53.6 kJ/mol',
    solution_latex: 'E_a \\approx 53.6\\text{ kJ/mol}', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-chem-2024-4', chapter_id: 'chem-org-basics', year: 2024, shift: 'Evening', question_type: 'mcq',
    question_text: 'The correct order of decreasing acidity of the following compounds is: (I) Phenol (II) p-Nitrophenol (III) p-Methylphenol (IV) p-Chlorophenol',
    question_latex: null, options: JSON.stringify(['A) II > IV > I > III', 'B) II > I > IV > III', 'C) IV > II > I > III', 'D) I > II > III > IV']),
    correct_answers: JSON.stringify(['A']), solution_text: 'p-NO₂ (strong -M,-I) > p-Cl (-I) > H > p-CH₃ (+I, decreases acidity). So II > IV > I > III.',
    solution_latex: 'p\\text{-}NO_2 > p\\text{-}Cl > H > p\\text{-}CH_3', difficulty: 3, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-chem-2023-3', chapter_id: 'chem-phys-mole', year: 2023, shift: 'Morning', question_type: 'numerical',
    question_text: 'How many grams of NaOH (molar mass = 40 g/mol) are needed to prepare 500 mL of 0.1 M solution?',
    question_latex: 'M = \\frac{n}{V(L)}', options: JSON.stringify(null),
    correct_answers: JSON.stringify(['2']), solution_text: 'n = M × V = 0.1 × 0.5 = 0.05 mol. Mass = 0.05 × 40 = 2 g',
    solution_latex: 'm = 0.1 \\times 0.5 \\times 40 = 2\\text{ g}', difficulty: 1, marks: 4, negative_marks: 0
  },

  {
    id: 'pyq-chem-2022-2', chapter_id: 'chem-inorg-periodic', year: 2022, shift: 'Evening', question_type: 'mcq',
    question_text: 'Which of the following has the highest electron affinity?',
    question_latex: null, options: JSON.stringify(['A) F', 'B) Cl', 'C) Br', 'D) I']),
    correct_answers: JSON.stringify(['B']), solution_text: 'Cl has higher EA than F because F is too small — incoming e⁻ faces inter-electronic repulsion. Cl has optimal size.',
    solution_latex: 'EA: Cl > F > Br > I', difficulty: 2, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-chem-2022-3', chapter_id: 'chem-phys-equilibrium', year: 2022, shift: 'Morning', question_type: 'mcq',
    question_text: 'The pH of 0.001 M HCl solution is:',
    question_latex: 'pH = -\\log[H^+]', options: JSON.stringify(['A) 1', 'B) 2', 'C) 3', 'D) 4']),
    correct_answers: JSON.stringify(['C']), solution_text: 'HCl is a strong acid, fully ionized. [H⁺] = 0.001 = 10⁻³. pH = -log(10⁻³) = 3',
    solution_latex: 'pH = -\\log(10^{-3}) = 3', difficulty: 1, marks: 4, negative_marks: -1
  },

  // ─── MORE MATHEMATICS (JEE Main Standard) ───
  {
    id: 'pyq-math-2024-3', chapter_id: 'math-coord-conics', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'The length of the latus rectum of the ellipse 9x² + 25y² = 225 is:',
    question_latex: '\\frac{x^2}{25} + \\frac{y^2}{9} = 1', options: JSON.stringify(['A) 18/5', 'B) 25/3', 'C) 9/5', 'D) 50/9']),
    correct_answers: JSON.stringify(['A']), solution_text: 'Dividing by 225: x²/25 + y²/9 = 1. So a²=25, b²=9. LR = 2b²/a = 2(9)/5 = 18/5',
    solution_latex: 'LR = \\frac{2b^2}{a} = \\frac{18}{5}', difficulty: 2, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-math-2024-4', chapter_id: 'math-alg-matrices', year: 2024, shift: 'Evening', question_type: 'numerical',
    question_text: 'If A is a 3×3 matrix with |A| = 5, then |3A| is ___.',
    question_latex: '|kA| = k^n|A|', options: JSON.stringify(null),
    correct_answers: JSON.stringify(['135']), solution_text: 'For n×n matrix, |kA| = kⁿ|A|. So |3A| = 3³ × 5 = 27 × 5 = 135',
    solution_latex: '|3A| = 3^3 \\times 5 = 135', difficulty: 2, marks: 4, negative_marks: 0
  },

  {
    id: 'pyq-math-2023-3', chapter_id: 'math-calc-differentiation', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'The function f(x) = x³ - 3x has a local minimum at:',
    question_latex: null, options: JSON.stringify(['A) x = 0', 'B) x = 1', 'C) x = -1', 'D) x = 2']),
    correct_answers: JSON.stringify(['B']), solution_text: "f'(x) = 3x² - 3 = 0 → x = ±1. f''(x) = 6x. f''(1) = 6 > 0 → minimum at x=1. f''(-1) = -6 < 0 → maximum at x=-1.",
    solution_latex: "f'(x)=0 \\Rightarrow x = \\pm 1, \\quad f''(1)=6>0", difficulty: 2, marks: 4, negative_marks: -1
  },

  {
    id: 'pyq-math-2022-2', chapter_id: 'math-calc-integration', year: 2022, shift: 'Evening', question_type: 'numerical',
    question_text: 'The value of ∫₀¹ (3x² + 2x) dx is ___.',
    question_latex: '\\int_0^1 (3x^2 + 2x)\\,dx', options: JSON.stringify(null),
    correct_answers: JSON.stringify(['2']), solution_text: '∫(3x²+2x)dx = x³ + x². At x=1: 1+1=2. At x=0: 0. Answer = 2',
    solution_latex: '[x^3+x^2]_0^1 = 2', difficulty: 1, marks: 4, negative_marks: 0
  },

  {
    id: 'pyq-math-2022-3', chapter_id: 'math-prob-probability', year: 2022, shift: 'Evening', question_type: 'mcq',
    question_text: 'If P(A) = 0.6, P(B) = 0.4, and A and B are independent, then P(A ∩ B) is:',
    question_latex: null, options: JSON.stringify(['A) 0.24', 'B) 1.0', 'C) 0.76', 'D) 0.40']),
    correct_answers: JSON.stringify(['A']), solution_text: 'For independent events: P(A∩B) = P(A) × P(B) = 0.6 × 0.4 = 0.24',
    solution_latex: 'P(A \\cap B) = 0.6 \\times 0.4 = 0.24', difficulty: 1, marks: 4, negative_marks: -1
  },
];

// Seed resources for chapters
export const SEED_RESOURCES = [
  // ─── PHYSICS ───
  { id: 'res-phy-kin-notes', chapter_id: 'phy-mech-kinematics', title: 'Kinematics — Key Concepts', type: 'notes', content: '📖 KINEMATICS — STUDY OF MOTION\n\n🔑 Key Equations of Motion:\n• v = u + at\n• s = ut + ½at²\n• v² = u² + 2as\n• s = ½(u+v)t\n\nWhere: u = initial velocity, v = final velocity, a = acceleration, t = time, s = displacement\n\n📐 Projectile Motion:\n• Time of flight: T = 2u·sinθ/g\n• Max height: H = u²sin²θ/2g\n• Range: R = u²sin2θ/g\n• Max range at θ = 45°\n\n📊 Graph Analysis:\n• Slope of x-t graph = velocity\n• Slope of v-t graph = acceleration\n• Area under v-t graph = displacement\n\n⚡ Relative Motion:\n• v_AB = v_A - v_B\n• Rain-man problems: use vector addition', is_downloaded: 1, size_bytes: 2048 },
  { id: 'res-phy-kin-formula', chapter_id: 'phy-mech-kinematics', title: 'Kinematics — Formula Sheet', type: 'formula_sheet', content: '📋 KINEMATICS FORMULAS\n\n1D Motion:\n  v = u + at\n  s = ut + ½at²\n  v² = u² + 2as\n  s_nth = u + a(2n-1)/2\n\n2D Projectile:\n  x = u·cosθ·t\n  y = u·sinθ·t - ½gt²\n  T = 2u·sinθ/g\n  H = u²sin²θ/(2g)\n  R = u²sin2θ/g\n\nCircular Motion:\n  v = rω\n  a_c = v²/r = rω²\n  T = 2π/ω', is_downloaded: 1, size_bytes: 1024 },

  { id: 'res-phy-laws-notes', chapter_id: 'phy-mech-laws', title: 'Newton\'s Laws — Key Concepts', type: 'notes', content: '📖 NEWTON\'S LAWS OF MOTION\n\n1st Law (Inertia): Body remains at rest or uniform motion unless acted on by external force.\n\n2nd Law: F = ma (net force = mass × acceleration)\n\n3rd Law: Every action has an equal and opposite reaction.\n\n📐 Free Body Diagram Steps:\n1. Isolate the body\n2. Draw all forces (gravity, normal, friction, tension, applied)\n3. Choose coordinate axes\n4. Resolve forces into components\n5. Apply ΣFx = max, ΣFy = may\n\n🔥 Friction:\n• Static: f ≤ μₛN\n• Kinetic: f = μₖN\n• μₛ > μₖ always\n\n📊 Connected Bodies:\n• Same string → same tension (massless string)\n• Same surface → same acceleration', is_downloaded: 1, size_bytes: 1800 },
  { id: 'res-phy-laws-formula', chapter_id: 'phy-mech-laws', title: 'Laws of Motion — Formulas', type: 'formula_sheet', content: '📋 LAWS OF MOTION FORMULAS\n\nF = ma\nW = mg\nf_s ≤ μₛN\nf_k = μₖN\nT = m(g±a) [lift problems]\nPulley: a = (m₁-m₂)g/(m₁+m₂)\nBanking: tanθ = v²/(rg)', is_downloaded: 1, size_bytes: 512 },

  { id: 'res-phy-work-notes', chapter_id: 'phy-mech-work', title: 'Work, Energy & Power — Notes', type: 'notes', content: '📖 WORK, ENERGY & POWER\n\nWork: W = F·d·cosθ\n• Positive work: θ < 90°\n• Negative work: θ > 90°\n• Zero work: θ = 90°\n\nKinetic Energy: KE = ½mv²\nPotential Energy: PE = mgh (gravity), ½kx² (spring)\n\nWork-Energy Theorem: W_net = ΔKE\n\nConservation of Energy: KE + PE = constant (conservative forces)\n\nPower: P = W/t = F·v\n\nCollisions:\n• Elastic: KE conserved, e = 1\n• Inelastic: KE not conserved, e < 1\n• Perfectly inelastic: Bodies stick, e = 0', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-phy-electro-notes', chapter_id: 'phy-electro-electrostatics', title: 'Electrostatics — Key Concepts', type: 'notes', content: '📖 ELECTROSTATICS\n\nCoulomb\'s Law: F = kq₁q₂/r²  (k = 9×10⁹ Nm²/C²)\n\nElectric Field: E = F/q = kQ/r²\nField due to:\n• Point charge: E = kQ/r²\n• Infinite line: E = 2kλ/r\n• Infinite plane: E = σ/(2ε₀)\n\nElectric Potential: V = kQ/r\nRelation: E = -dV/dr\n\nGauss\'s Law: Φ = q_enclosed/ε₀\n\nCapacitance: C = Q/V\n• Parallel plate: C = ε₀A/d\n• Series: 1/C = 1/C₁ + 1/C₂\n• Parallel: C = C₁ + C₂\n• With dielectric: C = Kε₀A/d', is_downloaded: 1, size_bytes: 1800 },

  { id: 'res-phy-thermo-notes', chapter_id: 'phy-thermo-laws', title: 'Thermodynamics — Key Concepts', type: 'notes', content: '📖 THERMODYNAMICS\n\n1st Law: ΔQ = ΔU + ΔW\n\nProcesses:\n• Isothermal (T=const): W = nRT·ln(V₂/V₁)\n• Adiabatic (Q=0): PVᵞ = const\n• Isobaric (P=const): W = PΔV\n• Isochoric (V=const): W = 0\n\nCarnot Efficiency: η = 1 - T_cold/T_hot\nCp - Cv = R\nγ = Cp/Cv', is_downloaded: 1, size_bytes: 1200 },

  { id: 'res-phy-optics-notes', chapter_id: 'phy-optics-ray', title: 'Ray Optics — Key Concepts', type: 'notes', content: '📖 RAY OPTICS\n\nMirror Formula: 1/v + 1/u = 1/f\nLens Formula: 1/v - 1/u = 1/f\nSnell\'s Law: n₁sinθ₁ = n₂sinθ₂\nCritical Angle: sinC = n₂/n₁\nMagnification: m = -v/u (mirror), v/u (lens)\nPower: P = 1/f (in metres) → unit: Dioptre\nLensmaker\'s: 1/f = (n-1)(1/R₁ - 1/R₂)', is_downloaded: 1, size_bytes: 1000 },

  { id: 'res-phy-rotation-notes', chapter_id: 'phy-mech-rotation', title: 'Rotational Motion — Notes', type: 'notes', content: '📖 ROTATIONAL MOTION\n\n🔑 Moment of Inertia (I):\n• Point mass: I = mr²\n• Rod (centre): ML²/12, Rod (end): ML²/3\n• Disc: MR²/2, Ring: MR²\n• Solid sphere: 2MR²/5, Hollow sphere: 2MR²/3\n\n📐 Parallel Axis: I = I_cm + Md²\nPerpendicular Axis: I_z = I_x + I_y (planar)\n\nTorque: τ = r × F = Iα\nAngular Momentum: L = Iω\nConservation: If τ_ext = 0, L = constant\n\n🔄 Rolling: v_cm = Rω, KE = ½mv² + ½Iω²\nAcceleration on incline: a = gsinθ/(1+I/mR²)', is_downloaded: 1, size_bytes: 2000 },
  { id: 'res-phy-rotation-formula', chapter_id: 'phy-mech-rotation', title: 'Rotational Motion — Formulas', type: 'formula_sheet', content: '📋 ROTATIONAL FORMULAS\n\nω = ω₀ + αt\nθ = ω₀t + ½αt²\nω² = ω₀² + 2αθ\nτ = Iα = r×F\nL = Iω = r×p\nKE_rot = ½Iω²\nRolling: KE = ½mv²(1+k²/R²)', is_downloaded: 1, size_bytes: 600 },

  { id: 'res-phy-grav-notes', chapter_id: 'phy-mech-gravitation', title: 'Gravitation — Notes', type: 'notes', content: '📖 GRAVITATION\n\nNewton Law: F = GMm/r²\ng = GM/R² (surface)\nAt height h: g_h = g(1-2h/R) for h<<R\nAt depth d: g_d = g(1-d/R)\n\nGravitational PE: U = -GMm/r\nEscape Velocity: v_e = √(2gR) = 11.2 km/s\nOrbital Velocity: v_o = √(gR)\n\nKepler Laws:\n1. Elliptical orbits, Sun at focus\n2. Equal areas in equal time\n3. T² ∝ a³\n\nSatellite: T = 2π√(r³/GM)\nBinding Energy = GMm/(2r)', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-phy-ktg-notes', chapter_id: 'phy-thermo-kinetic', title: 'Kinetic Theory of Gases — Notes', type: 'notes', content: '📖 KINETIC THEORY OF GASES\n\nIdeal Gas: PV = nRT\nPressure: P = (1/3)ρv²_rms\nKE per molecule = (3/2)kT\nKE per mole = (3/2)RT\n\nv_rms = √(3RT/M)\nv_mp = √(2RT/M)\nv_avg = √(8RT/πM)\n\nDegrees of Freedom:\n• Monoatomic: f=3, γ=5/3\n• Diatomic: f=5, γ=7/5\n• Polyatomic: f=6, γ=4/3\n\nU = (f/2)nRT\nMean free path: λ = 1/(√2·π·d²·n)', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-phy-heat-notes', chapter_id: 'phy-thermo-transfer', title: 'Heat Transfer — Notes', type: 'notes', content: '📖 HEAT TRANSFER\n\nConduction: Q/t = KA(T₁-T₂)/L\nR_thermal = L/(KA)\nSeries: R = R₁+R₂, Parallel: 1/R = 1/R₁+1/R₂\n\nConvection: Newton law of cooling\ndT/dt = -k(T - T₀)\n\nRadiation:\nStefan Law: E = σT⁴\nNet: P = σA(T⁴ - T₀⁴)\nWien Law: λ_max·T = b (b=2.9×10⁻³ m·K)', is_downloaded: 1, size_bytes: 1200 },

  { id: 'res-phy-shm-notes', chapter_id: 'phy-waves-shm', title: 'Simple Harmonic Motion — Notes', type: 'notes', content: '📖 SIMPLE HARMONIC MOTION\n\na = -ω²x\nx = Asin(ωt+φ)\nv = Aωcos(ωt+φ) = ω√(A²-x²)\na = -Aω²sin(ωt+φ)\n\nTime Period:\n• Spring: T = 2π√(m/k)\n• Pendulum: T = 2π√(L/g)\n• Physical: T = 2π√(I/mgd)\n\nEnergy:\n• KE = ½mω²(A²-x²)\n• PE = ½mω²x²\n• Total E = ½mω²A² = constant\n\nSprings:\nSeries: 1/k = 1/k₁+1/k₂\nParallel: k = k₁+k₂', is_downloaded: 1, size_bytes: 1800 },
  { id: 'res-phy-shm-formula', chapter_id: 'phy-waves-shm', title: 'SHM — Formula Sheet', type: 'formula_sheet', content: '📋 SHM FORMULAS\n\nx = Asin(ωt+φ), v = ω√(A²-x²), a = -ω²x\nT = 2π/ω, f = 1/T\nE = ½kA², v_max = Aω, a_max = Aω²\nT_spring = 2π√(m/k), T_pendulum = 2π√(L/g)', is_downloaded: 1, size_bytes: 500 },

  { id: 'res-phy-wave-notes', chapter_id: 'phy-waves-wave', title: 'Wave Motion — Notes', type: 'notes', content: '📖 WAVE MOTION\n\ny = Asin(kx-ωt), k=2π/λ, ω=2πf, v=fλ\n\nSpeed: String v=√(T/μ), Gas v=√(γRT/M)\n\nSuperposition & Interference:\n• Constructive: path diff = nλ\n• Destructive: path diff = (2n+1)λ/2\n\nStanding Waves:\n• Strings: f_n = nv/(2L)\n• Beats: f_beat = |f₁-f₂|', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-phy-sound-notes', chapter_id: 'phy-waves-sound', title: 'Sound Waves — Notes', type: 'notes', content: '📖 SOUND WAVES\n\nLongitudinal wave, v ≈ 343 m/s in air\n\nOrgan Pipes:\nClosed: f_n = (2n-1)v/(4L) — odd harmonics only\nOpen: f_n = nv/(2L) — all harmonics\n\nDoppler Effect:\nf\' = f(v±v_obs)/(v∓v_src)\nSource approaching → f↑\n\nIntensity: I = P/(4πr²)\nLoudness: β = 10log₁₀(I/I₀) dB', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-phy-current-notes', chapter_id: 'phy-electro-current', title: 'Current Electricity — Notes', type: 'notes', content: '📖 CURRENT ELECTRICITY\n\nOhm Law: V = IR, R = ρL/A\nSeries: R = R₁+R₂+R₃\nParallel: 1/R = 1/R₁+1/R₂+1/R₃\n\nKirchhoff Laws:\n• KCL: ΣI_in = ΣI_out\n• KVL: ΣV = 0 around loop\n\nEMF: V = E - Ir\nPower: P = VI = I²R = V²/R\n\nWheatstone Bridge: P/Q = R/S\nMeter Bridge: R = S(100-l)/l\nPotentiometer: E₁/E₂ = l₁/l₂', is_downloaded: 1, size_bytes: 1600 },

  { id: 'res-phy-mag-notes', chapter_id: 'phy-electro-magnetic', title: 'Magnetic Effects — Notes', type: 'notes', content: '📖 MAGNETIC EFFECTS OF CURRENT\n\nBiot-Savart: dB = (μ₀/4π)(Idl×r̂)/r²\n\nFields:\n• Long wire: B = μ₀I/(2πr)\n• Loop centre: B = μ₀I/(2R)\n• Solenoid: B = μ₀nI\n\nAmpere Law: ∮B·dl = μ₀I_enc\nForce: F = IL×B\nParallel wires: F/L = μ₀I₁I₂/(2πd)\n\nLorentz Force: F = q(v×B)\nCircular motion: r = mv/(qB), T = 2πm/(qB)\nMagnetic moment: M = NIA, τ = M×B', is_downloaded: 1, size_bytes: 1700 },

  { id: 'res-phy-emi-notes', chapter_id: 'phy-electro-emi', title: 'Electromagnetic Induction — Notes', type: 'notes', content: '📖 ELECTROMAGNETIC INDUCTION\n\nFaraday Law: EMF = -dΦ/dt\nΦ = BAcosθ\nLenz Law: opposes change\n\nMotional EMF: ε = Blv\nSelf Inductance: ε = -LdI/dt\nSolenoid: L = μ₀n²Al\nEnergy: U = ½LI²\n\nAC Circuits:\nV = V₀sin(ωt), V_rms = V₀/√2\nZ = √(R²+(X_L-X_C)²)\nX_L = ωL, X_C = 1/(ωC)\nResonance: ω = 1/√(LC)\nPower factor: cosφ = R/Z', is_downloaded: 1, size_bytes: 1600 },

  { id: 'res-phy-waveoptics-notes', chapter_id: 'phy-optics-wave', title: 'Wave Optics — Notes', type: 'notes', content: '📖 WAVE OPTICS\n\nYDSE:\nBright: dsinθ = nλ\nDark: dsinθ = (2n+1)λ/2\nFringe width: β = λD/d\n\nSingle Slit: Central max = 2λD/a\nMinima: asinθ = nλ\n\nPolarization:\nMalus Law: I = I₀cos²θ\nBrewster: tanθ_B = n\n\nOptical Path = μ × geometric path', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-phy-dual-notes', chapter_id: 'phy-modern-dual', title: 'Dual Nature of Matter — Notes', type: 'notes', content: '📖 DUAL NATURE OF MATTER\n\nPhotoelectric: E = hf = hc/λ\nKE_max = hf - φ\nStopping potential: eV₀ = KE_max\nThreshold: f₀ = φ/h\n\nde Broglie: λ = h/p = h/(mv)\nFor electron: λ = 12.27/√V Å\n\nh = 6.63×10⁻³⁴ J·s\n1 eV = 1.6×10⁻¹⁹ J', is_downloaded: 1, size_bytes: 1200 },

  { id: 'res-phy-atoms-notes', chapter_id: 'phy-modern-atoms', title: 'Atoms & Nuclei — Notes', type: 'notes', content: '📖 ATOMS & NUCLEI\n\nBohr Model:\nr_n = 0.529n² Å\nE_n = -13.6/n² eV\n1/λ = R(1/n₁² - 1/n₂²)\n\nLyman(UV n→1), Balmer(Vis n→2), Paschen(IR n→3)\n\nNuclear:\nΔm = Zm_p + Nm_n - M\nBE = Δmc²\n\nRadioactivity:\nN = N₀e^(-λt)\nT½ = 0.693/λ\nα: Z-2,A-4  β⁻: Z+1  γ: no change', is_downloaded: 1, size_bytes: 1700 },

  { id: 'res-phy-semi-notes', chapter_id: 'phy-modern-semiconductor', title: 'Semiconductor Electronics — Notes', type: 'notes', content: '📖 SEMICONDUCTORS\n\nIntrinsic: pure Si/Ge, n_e = n_h\nn-type: pentavalent dopant (P, As)\np-type: trivalent dopant (B, Al)\n\np-n Junction:\nForward bias: current flows, V > 0.7V\nReverse bias: tiny current\nBreakdown: Zener / Avalanche\n\nTransistor: I_E = I_B + I_C\nβ = I_C/I_B\n\nApplications: Rectifier, Zener regulator, LED, Solar cell\nLogic Gates: AND, OR, NOT, NAND, NOR', is_downloaded: 1, size_bytes: 1500 },

  // ─── CHEMISTRY ───
  { id: 'res-chem-mole-notes', chapter_id: 'chem-phys-mole', title: 'Mole Concept — Key Concepts', type: 'notes', content: '📖 MOLE CONCEPT\n\n1 mole = 6.022 × 10²³ particles (Avogadro\'s number)\n\nn = mass/molar mass = PV/RT (ideal gas)\n\nEmpirical vs Molecular formula:\n• Empirical = simplest ratio\n• Molecular = actual formula\n\nStoichiometry:\n1. Balance the equation\n2. Convert given to moles\n3. Use mole ratio\n4. Convert to required unit\n\n% Composition = (mass of element/molar mass) × 100\n\nLimiting Reagent: reagent that gets consumed first', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-chem-organic-notes', chapter_id: 'chem-org-basics', title: 'Organic Chemistry Basics — Notes', type: 'notes', content: '📖 GENERAL ORGANIC CHEMISTRY\n\nHybridization:\n• sp³ → tetrahedral (109.5°)\n• sp² → trigonal planar (120°)\n• sp → linear (180°)\n\nElectronic Effects:\n• Inductive: +I (electron donating), -I (withdrawing)\n• Resonance/Mesomeric: +M, -M\n• Hyperconjugation: no-bond resonance\n\nReaction Intermediates:\n• Carbocation: sp², planar, electrophilic\n  Stability: 3° > 2° > 1° > CH₃⁺\n• Carbanion: sp³, pyramidal, nucleophilic\n• Free radical: sp², planar\n\nAcidity: -I and -M groups increase acidity\nBasicity: +I and +M groups increase basicity', is_downloaded: 1, size_bytes: 1600 },

  { id: 'res-chem-equilibrium-notes', chapter_id: 'chem-phys-equilibrium', title: 'Chemical Equilibrium — Notes', type: 'notes', content: '📖 CHEMICAL EQUILIBRIUM\n\nLaw of Mass Action: Kc = [Products]/[Reactants]\n\nRelation: Kp = Kc(RT)^Δn\n\nLe Chatelier\'s Principle:\n• Increase conc → shifts away\n• Increase pressure → shifts to fewer moles\n• Increase temp → shifts to endothermic side\n\nIonic Equilibrium:\npH = -log[H⁺]\npOH = -log[OH⁻]\npH + pOH = 14\nKa × Kb = Kw = 10⁻¹⁴\n\nBuffer: pH = pKa + log([salt]/[acid])', is_downloaded: 1, size_bytes: 1300 },

  { id: 'res-chem-periodic-notes', chapter_id: 'chem-inorg-periodic', title: 'Periodic Properties — Notes', type: 'notes', content: '📖 PERIODIC TABLE & PROPERTIES\n\nTrends across a period (L→R):\n• Atomic radius: decreases\n• Ionization energy: increases\n• Electronegativity: increases\n• Electron affinity: generally increases\n\nTrends down a group:\n• Atomic radius: increases\n• IE: decreases\n• EN: decreases\n• Metallic character: increases\n\nExceptions:\n• IE: N > O (half-filled stability)\n• EA: F < Cl (small size, e⁻ repulsion)\n• Noble gases: very high IE, ~0 EA', is_downloaded: 1, size_bytes: 1200 },

  { id: 'res-chem-atomic-notes', chapter_id: 'chem-phys-atomic', title: 'Atomic Structure — Notes', type: 'notes', content: '📖 ATOMIC STRUCTURE\n\nBohr Model: E_n = -13.6Z²/n² eV\nRadius: r_n = 0.529n²/Z Å\n\nQuantum Numbers:\n• n: principal (1,2,3...)\n• l: azimuthal (0 to n-1)\n• m_l: magnetic (-l to +l)\n• m_s: spin (±½)\n\nOrbitals: s(l=0), p(l=1), d(l=2), f(l=3)\nAufbau: 1s 2s 2p 3s 3p 4s 3d 4p...\nHund Rule: max multiplicity first\nPauli: no two e⁻ same 4 quantum numbers\n\nde Broglie: λ = h/(mv)\nHeisenberg: Δx·Δp ≥ h/(4π)\n\nNodes: radial = n-l-1, angular = l', is_downloaded: 1, size_bytes: 1600 },

  { id: 'res-chem-thermo-notes', chapter_id: 'chem-phys-thermo', title: 'Chemical Thermodynamics — Notes', type: 'notes', content: '📖 CHEMICAL THERMODYNAMICS\n\n1st Law: ΔU = q + w\nEnthalpy: H = U + PV, ΔH = qp\n\nHess Law: ΔH is path independent\nBond dissociation: ΔH = Σ(BE reactants) - Σ(BE products)\n\nEntropy: ΔS = q_rev/T\n2nd Law: ΔS_universe ≥ 0\n\nGibbs Energy: ΔG = ΔH - TΔS\n• ΔG < 0: spontaneous\n• ΔG = 0: equilibrium\n• ΔG > 0: non-spontaneous\n\nΔG° = -RTlnK = -nFE°cell\n\nCp - Cv = R (ideal gas)\nKirchhoff: ΔH₂ = ΔH₁ + ΔCp(T₂-T₁)', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-chem-kinetics-notes', chapter_id: 'chem-phys-kinetics', title: 'Chemical Kinetics — Notes', type: 'notes', content: '📖 CHEMICAL KINETICS\n\nRate = -d[R]/dt = d[P]/dt\nRate law: r = k[A]^m[B]^n\nOrder = m+n\n\nZero order: [A] = [A₀] - kt, t½ = [A₀]/(2k)\nFirst order: ln[A] = ln[A₀] - kt, t½ = 0.693/k\nSecond order: 1/[A] = 1/[A₀] + kt, t½ = 1/(k[A₀])\n\nArrhenius: k = Ae^(-Ea/RT)\nln(k₂/k₁) = Ea/R(1/T₁ - 1/T₂)\n\nCatalyst lowers Ea\nMolecularity vs Order: molecularity is theoretical, order is experimental', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-chem-electrochem-notes', chapter_id: 'chem-phys-electrochem', title: 'Electrochemistry — Notes', type: 'notes', content: '📖 ELECTROCHEMISTRY\n\nNernst: E = E° - (RT/nF)lnQ\nAt 25°C: E = E° - (0.0591/n)logQ\n\nE°cell = E°cathode - E°anode\nΔG° = -nFE°\n\nFaraday Laws:\n1st: m = ZIt = MIt/(nF)\n2nd: m₁/m₂ = E₁/E₂\n\nF = 96500 C/mol\n\nKohlrausch: Λ°m = Σλ°(cations) + Σλ°(anions)\nMolar conductivity: Λm = κ/c\n\nConductance = 1/R\nCell constant = l/A', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-chem-hydrocarbons-notes', chapter_id: 'chem-org-hydrocarbons', title: 'Hydrocarbons — Notes', type: 'notes', content: '📖 HYDROCARBONS\n\nAlkanes (CₙH₂ₙ₊₂): sp³, σ bonds only\n• Reactions: combustion, halogenation (free radical)\n\nAlkenes (CₙH₂ₙ): sp², C=C\n• Addition reactions: H₂, HX, H₂O, X₂\n• Markovnikov rule: H to more H-bearing C\n• Anti-Markovnikov: HBr + peroxide\n\nAlkynes (CₙH₂ₙ₋₂): sp, C≡C\n• Acidic H (terminal)\n• Addition: 2 equiv of reagent\n\nArenes: Benzene is aromatic\n• EAS: halogenation, nitration, sulfonation, Friedel-Crafts\n• Directive effects: ortho-para (activating) vs meta (deactivating)', is_downloaded: 1, size_bytes: 1600 },

  { id: 'res-chem-haloalkane-notes', chapter_id: 'chem-org-haloalkanes', title: 'Haloalkanes & Haloarenes — Notes', type: 'notes', content: '📖 HALOALKANES & HALOARENES\n\nSN1: 3° > 2° > 1°, carbocation intermediate, racemization\nSN2: 1° > 2° > 3°, backside attack, Walden inversion\nE1: unimolecular, carbocation, Saytzeff\nE2: bimolecular, anti-periplanar, Saytzeff\n\nReactivity: R-I > R-Br > R-Cl > R-F\n\nGrignard: RMgX + CO₂ → RCOOH\nWurtz: 2RX + 2Na → R-R\n\nHaloarenes: less reactive due to resonance\nSandmeyer reaction for ArX preparation', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-chem-alcohol-notes', chapter_id: 'chem-org-alcohols', title: 'Alcohols, Phenols & Ethers — Notes', type: 'notes', content: '📖 ALCOHOLS, PHENOLS & ETHERS\n\nAlcohols (R-OH):\n• Acidity: PhOH > H₂O > ROH\n• Reactions: dehydration, oxidation, ester formation\n• Lucas test: 3° instant, 2° 5min, 1° no rxn\n\nPhenols:\n• More acidic than alcohols (resonance stabilization)\n• EAS: activated ring, ortho-para directing\n• Reimer-Tiemann: salicylaldehyde\n• Kolbe: salicylic acid\n\nEthers (R-O-R):\n• Williamson synthesis: RONa + RX → ROR\n• Cleavage with HI', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-chem-carbonyl-notes', chapter_id: 'chem-org-carbonyl', title: 'Aldehydes, Ketones & Acids — Notes', type: 'notes', content: '📖 ALDEHYDES, KETONES & CARBOXYLIC ACIDS\n\nNucleophilic Addition (C=O):\n• HCN → cyanohydrin\n• NaHSO₃ → bisulphite addition\n• Grignard → alcohol\n\nAldol condensation: base-catalyzed\nCannizzaro: no α-H aldehydes\nTollen test: Ag mirror (aldehyde only)\nFehling test: red ppt (aldehyde only)\n\nCarboxylic Acids:\n• Acidity: RCOOH > PhOH > ROH\n• Hell-Volhard-Zelinsky: α-halogenation\n• Decarboxylation: RCOONa + NaOH → RH\n• Ester: RCOOH + ROH → RCOOR (Fischer)', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-chem-bonding-notes', chapter_id: 'chem-inorg-bonding', title: 'Chemical Bonding — Notes', type: 'notes', content: '📖 CHEMICAL BONDING\n\nIonic: transfer of electrons, high MP/BP\nCovalent: sharing of electrons\n\nVSEPR Theory:\n• AB₂: linear (180°)\n• AB₃: trigonal (120°)\n• AB₄: tetrahedral (109.5°)\n• AB₅: trigonal bipyramidal\n• AB₆: octahedral (90°)\n\nHybridization: sp(180°), sp²(120°), sp³(109.5°)\nsp³d(TBP), sp³d²(octahedral)\n\nMO Theory:\nBond order = (bonding - antibonding)/2\nO₂ is paramagnetic (BO=2)\n\nH-bonding: F-H...F strongest\nDipole moment: μ = q × d', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-chem-coord-notes', chapter_id: 'chem-inorg-coordination', title: 'Coordination Compounds — Notes', type: 'notes', content: '📖 COORDINATION COMPOUNDS\n\nTerminology:\n• Ligand: electron pair donor\n• Coordination number: bonds to metal\n• Chelate: polydentate ligand ring\n\nIsomerism:\n• Geometric (cis-trans)\n• Optical (mirror images)\n• Ionization, Linkage, Hydrate\n\nCFT (Crystal Field Theory):\n• Octahedral: t₂g and eg splitting\n• Tetrahedral: smaller splitting\n• CFSE determines color, magnetism\n\nSpectrochemical series:\nI⁻ < Br⁻ < Cl⁻ < F⁻ < OH⁻ < H₂O < NH₃ < en < CN⁻ < CO', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-chem-pblock-notes', chapter_id: 'chem-inorg-pblock', title: 'p-Block Elements — Notes', type: 'notes', content: '📖 p-BLOCK ELEMENTS\n\nGroup 13 (B family): B₂H₆ (diborane), BF₃ (Lewis acid)\nGroup 14 (C family): CO₂, SiO₂, allotropes of carbon\nGroup 15 (N family): NH₃, HNO₃, N₂O₅\nGroup 16 (O family): O₃, H₂SO₄, SO₂\nGroup 17 (Halogens): HF, Cl₂, interhalogen compounds\nGroup 18 (Noble gases): XeF₂, XeF₄, XeF₆\n\nKey trends:\n• Oxidation states: max = group number\n• Acidic strength of oxoacids varies\n• Anomalous behavior of first member\n\nImportant compounds: Borax, Silicones, Phosphine, Ozone', is_downloaded: 1, size_bytes: 1400 },

  // ─── MATHEMATICS ───
  { id: 'res-math-quad-notes', chapter_id: 'math-alg-quadratic', title: 'Quadratic Equations — Notes', type: 'notes', content: '📖 QUADRATIC EQUATIONS\n\nGeneral form: ax² + bx + c = 0\n\nRoots: x = (-b ± √(b²-4ac)) / 2a\n\nDiscriminant D = b²-4ac:\n• D > 0: Two real distinct roots\n• D = 0: Two equal real roots\n• D < 0: Two complex roots\n\nVieta\'s formulas:\n• Sum of roots: α+β = -b/a\n• Product of roots: αβ = c/a\n\nNature of roots:\n• D > 0 & D is perfect square → rational roots\n• D > 0 & D not perfect square → irrational roots\n\nIf α,β are roots: ax²+bx+c = a(x-α)(x-β)', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-calc-diff-notes', chapter_id: 'math-calc-differentiation', title: 'Differentiation — Key Concepts', type: 'notes', content: '📖 DIFFERENTIATION\n\nBasic Rules:\n• d/dx(xⁿ) = nxⁿ⁻¹\n• d/dx(eˣ) = eˣ\n• d/dx(ln x) = 1/x\n• d/dx(sin x) = cos x\n• d/dx(cos x) = -sin x\n• d/dx(tan x) = sec²x\n\nChain Rule: d/dx[f(g(x))] = f\'(g(x))·g\'(x)\nProduct Rule: d/dx(uv) = u\'v + uv\'\nQuotient Rule: d/dx(u/v) = (u\'v - uv\')/v²\n\nApplications:\n• Tangent slope: dy/dx at point\n• Maxima/Minima: f\'(x) = 0, check f\'\'(x)\n• Rate of change\n• Increasing: f\'(x) > 0\n• Decreasing: f\'(x) < 0', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-math-calc-int-notes', chapter_id: 'math-calc-integration', title: 'Integration — Key Concepts', type: 'notes', content: '📖 INDEFINITE INTEGRATION\n\nBasic Rules:\n• ∫xⁿ dx = xⁿ⁺¹/(n+1) + C\n• ∫eˣ dx = eˣ + C\n• ∫1/x dx = ln|x| + C\n• ∫sin x dx = -cos x + C\n• ∫cos x dx = sin x + C\n\nTechniques:\n1. Substitution: ∫f(g(x))g\'(x)dx = ∫f(u)du\n2. By Parts: ∫u dv = uv - ∫v du (LIATE rule)\n3. Partial Fractions: for P(x)/Q(x)\n\nLIATE priority:\nL - Logarithmic\nI - Inverse trig\nA - Algebraic\nT - Trigonometric\nE - Exponential', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-trig-notes', chapter_id: 'math-trig-functions', title: 'Trigonometry — Key Identities', type: 'formula_sheet', content: '📋 TRIGONOMETRIC IDENTITIES\n\nFundamental:\n• sin²θ + cos²θ = 1\n• 1 + tan²θ = sec²θ\n• 1 + cot²θ = cosec²θ\n\nCompound Angles:\n• sin(A±B) = sinA·cosB ± cosA·sinB\n• cos(A±B) = cosA·cosB ∓ sinA·sinB\n• tan(A±B) = (tanA ± tanB)/(1 ∓ tanA·tanB)\n\nDouble Angle:\n• sin2A = 2sinA·cosA\n• cos2A = cos²A - sin²A = 1 - 2sin²A = 2cos²A - 1\n• tan2A = 2tanA/(1-tan²A)\n\nTriangle:\n• Sine rule: a/sinA = b/sinB = c/sinC = 2R\n• Cosine rule: c² = a² + b² - 2ab·cosC\n• Area = ½ab·sinC', is_downloaded: 1, size_bytes: 1300 },

  { id: 'res-math-conics-notes', chapter_id: 'math-coord-conics', title: 'Conic Sections — Key Formulas', type: 'formula_sheet', content: '📋 CONIC SECTIONS\n\nParabola: y² = 4ax\n• Focus: (a, 0)\n• Directrix: x = -a\n• Latus rectum: 4a\n\nEllipse: x²/a² + y²/b² = 1\n• e = √(1 - b²/a²) < 1\n• Foci: (±ae, 0)\n• Latus rectum: 2b²/a\n\nHyperbola: x²/a² - y²/b² = 1\n• e = √(1 + b²/a²) > 1\n• Foci: (±ae, 0)\n• Asymptotes: y = ±(b/a)x\n\nCircle: x² + y² + 2gx + 2fy + c = 0\n• Centre: (-g, -f)\n• Radius: √(g² + f² - c)', is_downloaded: 1, size_bytes: 1200 },

  { id: 'res-math-prob-notes', chapter_id: 'math-prob-probability', title: 'Probability — Key Concepts', type: 'notes', content: '📖 PROBABILITY\n\nBasic: P(A) = n(A)/n(S)\n\nAddition: P(A∪B) = P(A) + P(B) - P(A∩B)\nFor mutually exclusive: P(A∪B) = P(A) + P(B)\n\nConditional: P(A|B) = P(A∩B)/P(B)\n\nBayes\' Theorem:\nP(Aᵢ|B) = P(B|Aᵢ)·P(Aᵢ) / ΣP(B|Aⱼ)·P(Aⱼ)\n\nBinomial Distribution:\nP(X=r) = ⁿCᵣ · pʳ · qⁿ⁻ʳ\nMean = np, Variance = npq\n\nIndependent events: P(A∩B) = P(A)·P(B)', is_downloaded: 1, size_bytes: 1100 },

  { id: 'res-math-complex-notes', chapter_id: 'math-alg-complex', title: 'Complex Numbers — Notes', type: 'notes', content: '📖 COMPLEX NUMBERS\n\ni = √(-1), i²=-1, i³=-i, i⁴=1\nz = a+bi, |z| = √(a²+b²)\nConjugate: z̄ = a-bi\n\nPolar: z = r(cosθ+isinθ) = re^(iθ)\nDe Moivre: (cosθ+isinθ)ⁿ = cos(nθ)+isin(nθ)\nRoots of unity: zₖ = e^(2πik/n)\nTriangle inequality: |z₁+z₂| ≤ |z₁|+|z₂|', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-binomial-notes', chapter_id: 'math-alg-binomial', title: 'Binomial Theorem — Notes', type: 'notes', content: '📖 BINOMIAL THEOREM\n\n(a+b)ⁿ = Σ ⁿCᵣ aⁿ⁻ʳ bʳ\nGeneral term: T(r+1) = ⁿCᵣ aⁿ⁻ʳ bʳ\nMiddle term: T((n+2)/2) if n even\n\nⁿCᵣ = n!/(r!(n-r)!)\nⁿC₀+ⁿC₁+...+ⁿCₙ = 2ⁿ\n\nFor rational index:\n(1+x)ⁿ = 1+nx+n(n-1)x²/2!+... for |x|<1', is_downloaded: 1, size_bytes: 1300 },

  { id: 'res-math-seq-notes', chapter_id: 'math-alg-sequences', title: 'Sequences & Series — Notes', type: 'notes', content: '📖 SEQUENCES & SERIES\n\nAP: aₙ = a+(n-1)d, Sₙ = n/2[2a+(n-1)d]\nGP: aₙ = arⁿ⁻¹, Sₙ = a(rⁿ-1)/(r-1), S∞ = a/(1-r)\n\nAM = (a+b)/2, GM = √(ab), HM = 2ab/(a+b)\nAM ≥ GM ≥ HM\n\nΣn = n(n+1)/2\nΣn² = n(n+1)(2n+1)/6\nΣn³ = [n(n+1)/2]²', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-math-matrix-notes', chapter_id: 'math-alg-matrices', title: 'Matrices & Determinants — Notes', type: 'notes', content: '📖 MATRICES & DETERMINANTS\n\n(AB)ᵀ = BᵀAᵀ, (AB)⁻¹ = B⁻¹A⁻¹\n|AB| = |A|·|B|, |kA| = kⁿ|A| (n×n)\nA⁻¹ = adj(A)/|A|\n\nCramer Rule: x = Dₓ/D\nRow swap → sign change\nTwo identical rows → |A| = 0', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-pnc-notes', chapter_id: 'math-alg-permutations', title: 'Permutations & Combinations — Notes', type: 'notes', content: '📖 PERMUTATIONS & COMBINATIONS\n\nnPr = n!/(n-r)!\nnCr = n!/(r!(n-r)!)\nCircular permutation: (n-1)!\nWith repetition: n!/(p!q!r!...)\n\nnCr = nCn-r\nnCr+nCr-1 = (n+1)Cr\n\nDerangements: D(n) = n![1-1/1!+1/2!-1/3!+...]\nDistribution: n identical into r distinct: (n+r-1)C(r-1)', is_downloaded: 1, size_bytes: 1500 },

  { id: 'res-math-limits-notes', chapter_id: 'math-calc-limits', title: 'Limits & Continuity — Notes', type: 'notes', content: '📖 LIMITS & CONTINUITY\\n\\nlim sinx/x = 1 as x tends to 0\\nlim (ex-1)/x = 1 as x tends to 0\\nlim ln(1+x)/x = 1 as x tends to 0\\nlim (1+1/x)^x = e as x tends to infinity\\n\\nL Hopital Rule: if 0/0 or infinity/infinity then differentiate top and bottom\\n\\nContinuity at x=a: f(a) defined, limit exists, both equal\\nSandwich theorem, IVT', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-diffeq-notes', chapter_id: 'math-calc-differential-eq', title: 'Differential Equations — Notes', type: 'notes', content: '📖 DIFFERENTIAL EQUATIONS\\n\\nOrder = highest derivative, Degree = its power\\n\\nTypes:\\n1. Variable separable: dy/dx = f(x)g(y)\\n2. Homogeneous: put y=vx\\n3. Linear: dy/dx+Py=Q, IF=e^(integral Pdx)\\n   y*IF = integral(Q*IF dx) + C\\n4. Exact: Mdx+Ndy=0', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-straight-notes', chapter_id: 'math-coord-straight', title: 'Straight Lines — Notes', type: 'notes', content: '📖 STRAIGHT LINES\\n\\ny = mx+c, y-y1 = m(x-x1)\\nx/a + y/b = 1\\n\\nAngle: tan theta = |m1-m2|/(1+m1*m2)\\nParallel: m1=m2, Perpendicular: m1*m2=-1\\n\\nDistance from point to line: |ax1+by1+c|/sqrt(a2+b2)\\nFamily: L1+lambda*L2 = 0', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-circle-notes', chapter_id: 'math-coord-circles', title: 'Circles — Notes', type: 'notes', content: '📖 CIRCLES\\n\\n(x-h)2+(y-k)2=r2\\nGeneral: x2+y2+2gx+2fy+c=0\\nCentre(-g,-f), radius sqrt(g2+f2-c)\\n\\nTangent length = sqrt(S1)\\nRadical axis: S1-S2=0\\nOrthogonal: 2g1*g2+2f1*f2=c1+c2', is_downloaded: 1, size_bytes: 1300 },

  { id: 'res-math-vectors-notes', chapter_id: 'math-vectors-vectors', title: 'Vectors — Notes', type: 'notes', content: '📖 VECTORS\\n\\nDot product: a.b = |a||b|cos theta\\nCross product: axb = |a||b|sin theta * n_hat\\n|axb| = area of parallelogram\\n\\nProjection of a on b: (a.b)/|b|\\nScalar triple product: [a b c] = volume\\nCoplanar if [a b c] = 0', is_downloaded: 1, size_bytes: 1300 },

  { id: 'res-math-3d-notes', chapter_id: 'math-vectors-3d', title: '3D Geometry — Notes', type: 'notes', content: '📖 3D GEOMETRY\\n\\nLine: (x-x1)/a = (y-y1)/b = (z-z1)/c\\nPlane: ax+by+cz=d\\nDistance from point: |ax1+by1+cz1-d|/sqrt(a2+b2+c2)\\n\\nAngle between planes: cos theta = |n1.n2|/(|n1||n2|)\\nSkew line dist: |[b1xb2].(a2-a1)|/|b1xb2|', is_downloaded: 1, size_bytes: 1400 },

  { id: 'res-math-stats-notes', chapter_id: 'math-prob-statistics', title: 'Statistics — Notes', type: 'notes', content: '📖 STATISTICS\\\\n\\\\nMean = Sum xi / n\\\\nVariance = Sum(xi-xbar)2 / n\\\\nSD = sqrt(variance)\\\\n\\\\nCV = (sigma/xbar)*100\\\\nRange = max-min\\\\nQuartiles: Q1, Q2(median), Q3\\\\nIQR = Q3-Q1', is_downloaded: 1, size_bytes: 1200 },
];

// ─── Additional PYQ Questions (2021, 2023, 2024) ───
export const SEED_QUESTIONS_EXTRA = [
  {
    id: 'pyq-phy-2024-1', chapter_id: 'phy-mech-kinematics', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'A stone is thrown vertically upwards with a speed of 20 m/s from the top of a building of height 25 m. The speed with which it hits the ground is (g = 10 m/s²):',
    question_latex: null, options: JSON.stringify(['A) 25 m/s', 'B) 30 m/s', 'C) 35 m/s', 'D) 40 m/s']),
    correct_answers: JSON.stringify(['B']), solution_text: 'v² = u² + 2g(h) = 400 + 500 = 900, v = 30 m/s',
    solution_latex: 'v = 30\\text{ m/s}', difficulty: 2, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-phy-2024-2', chapter_id: 'phy-mech-work', year: 2024, shift: 'Evening', question_type: 'mcq',
    question_text: 'A body of mass 2 kg moving with velocity 4 m/s makes a head-on elastic collision with a body of mass 6 kg at rest. The velocity of the 2 kg body after collision is:',
    question_latex: null, options: JSON.stringify(['A) -2 m/s', 'B) +2 m/s', 'C) 0 m/s', 'D) -4 m/s']),
    correct_answers: JSON.stringify(['A']), solution_text: 'v₁ = (m₁-m₂)u₁/(m₁+m₂) = (2-6)(4)/8 = -2 m/s',
    solution_latex: 'v_1 = -2\\text{ m/s}', difficulty: 3, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-phy-2023-1', chapter_id: 'phy-mech-rotation', year: 2023, shift: 'Morning', question_type: 'numerical',
    question_text: 'A solid sphere of mass 1 kg and radius 10 cm rolls without slipping with velocity 2 m/s. Its total KE in joules is ___.',
    question_latex: null, options: JSON.stringify(null),
    correct_answers: JSON.stringify(['2.8']), solution_text: 'KE = ½mv²(1+k²/R²) = ½(1)(4)(7/5) = 2.8 J',
    solution_latex: 'KE = 2.8\\text{ J}', difficulty: 3, marks: 4, negative_marks: 0
  },
  {
    id: 'pyq-phy-2023-2', chapter_id: 'phy-electro-current', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'In a Wheatstone bridge, if P = 100Ω, Q = 1000Ω, S = 100Ω, for balanced condition R is:',
    question_latex: null, options: JSON.stringify(['A) 10 Ω', 'B) 100 Ω', 'C) 1000 Ω', 'D) 1 Ω']),
    correct_answers: JSON.stringify(['A']), solution_text: 'P/Q = R/S → R = PS/Q = 10 Ω',
    solution_latex: 'R = 10\\,\\Omega', difficulty: 2, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-phy-2021-1', chapter_id: 'phy-optics-ray', year: 2021, shift: 'Morning', question_type: 'mcq',
    question_text: 'A convex lens of focal length 20 cm produces a real image 3× the object size. Object distance is:',
    question_latex: null, options: JSON.stringify(['A) 26.67 cm', 'B) 20 cm', 'C) 40 cm', 'D) 6.67 cm']),
    correct_answers: JSON.stringify(['A']), solution_text: 'm=-3, v=3|u|. 1/3|u|+1/|u|=1/20 → |u|=80/3=26.67',
    solution_latex: 'u = 26.67\\text{ cm}', difficulty: 3, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-chem-2024-1', chapter_id: 'chem-phys-equilibrium', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'For N₂ + 3H₂ ⇌ 2NH₃, Kp and Kc are related as:',
    question_latex: null, options: JSON.stringify(['A) Kp = Kc(RT)⁻²', 'B) Kp = Kc(RT)²', 'C) Kp = Kc', 'D) Kp = Kc(RT)⁻¹']),
    correct_answers: JSON.stringify(['A']), solution_text: 'Δn = 2-4 = -2. Kp = Kc(RT)^(-2)',
    solution_latex: 'K_p = K_c(RT)^{-2}', difficulty: 2, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-chem-2024-2', chapter_id: 'chem-org-haloalkanes', year: 2024, shift: 'Evening', question_type: 'mcq',
    question_text: 'Which undergoes SN1 reaction fastest?',
    question_latex: null, options: JSON.stringify(['A) CH₃Cl', 'B) (CH₃)₃CCl', 'C) CH₃CH₂Cl', 'D) (CH₃)₂CHCl']),
    correct_answers: JSON.stringify(['B']), solution_text: '3° halide forms most stable carbocation → fastest SN1.',
    solution_latex: null, difficulty: 2, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-chem-2023-1', chapter_id: 'chem-phys-kinetics', year: 2023, shift: 'Morning', question_type: 'numerical',
    question_text: 'For a first-order reaction, 75% consumed in 32 min. Half-life in minutes is ___.',
    question_latex: null, options: JSON.stringify(null),
    correct_answers: JSON.stringify(['16']), solution_text: '25% left = (½)², so 2 half-lives = 32 → t½ = 16',
    solution_latex: 't_{1/2} = 16', difficulty: 2, marks: 4, negative_marks: 0
  },
  {
    id: 'pyq-chem-2023-2', chapter_id: 'chem-phys-electrochem', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'E° of Zn|Zn²⁺||Cu²⁺|Cu cell is: (E°Zn=-0.76V, E°Cu=+0.34V)',
    question_latex: null, options: JSON.stringify(['A) 1.10 V', 'B) 0.42 V', 'C) -1.10 V', 'D) -0.42 V']),
    correct_answers: JSON.stringify(['A']), solution_text: 'E° = 0.34-(-0.76) = 1.10 V',
    solution_latex: 'E^\\circ = 1.10\\text{ V}', difficulty: 1, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-chem-2021-1', chapter_id: 'chem-inorg-periodic', year: 2021, shift: 'Morning', question_type: 'mcq',
    question_text: 'Among Li, Be, B, C, the element with highest first IE is:',
    question_latex: null, options: JSON.stringify(['A) Li', 'B) Be', 'C) B', 'D) C']),
    correct_answers: JSON.stringify(['B']), solution_text: 'Be has fully filled 2s² → extra stability → higher IE.',
    solution_latex: null, difficulty: 2, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-math-2024-1', chapter_id: 'math-calc-differentiation', year: 2024, shift: 'Morning', question_type: 'mcq',
    question_text: 'If f(x) = x³ − 3x² + 3x − 1, then f\'(1) is:',
    question_latex: null, options: JSON.stringify(['A) 0', 'B) 1', 'C) 3', 'D) -1']),
    correct_answers: JSON.stringify(['A']), solution_text: 'f\'(x) = 3x²-6x+3. f\'(1) = 3-6+3 = 0',
    solution_latex: "f'(1) = 0", difficulty: 1, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-math-2024-2', chapter_id: 'math-alg-matrices', year: 2024, shift: 'Evening', question_type: 'numerical',
    question_text: 'If A is a 3×3 matrix with |A| = 5, then |3A| is ___.',
    question_latex: null, options: JSON.stringify(null),
    correct_answers: JSON.stringify(['135']), solution_text: '|3A| = 3³×5 = 135',
    solution_latex: '|3A| = 135', difficulty: 2, marks: 4, negative_marks: 0
  },
  {
    id: 'pyq-math-2023-1', chapter_id: 'math-alg-complex', year: 2023, shift: 'Morning', question_type: 'mcq',
    question_text: 'If z = 1 + i, then |z²| is:',
    question_latex: null, options: JSON.stringify(['A) 1', 'B) √2', 'C) 2', 'D) 4']),
    correct_answers: JSON.stringify(['C']), solution_text: '|z|=√2. |z²|=|z|²=2',
    solution_latex: '|z^2| = 2', difficulty: 1, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-math-2023-2', chapter_id: 'math-coord-conics', year: 2023, shift: 'Evening', question_type: 'mcq',
    question_text: 'Eccentricity of ellipse x²/25 + y²/16 = 1 is:',
    question_latex: null, options: JSON.stringify(['A) 3/5', 'B) 4/5', 'C) 3/4', 'D) 5/3']),
    correct_answers: JSON.stringify(['A']), solution_text: 'e = √(1-16/25) = √(9/25) = 3/5',
    solution_latex: 'e = 3/5', difficulty: 2, marks: 4, negative_marks: -1
  },
  {
    id: 'pyq-math-2021-1', chapter_id: 'math-vectors-vectors', year: 2021, shift: 'Morning', question_type: 'numerical',
    question_text: 'Evaluate the dot product of the two vectors given the following properties:',
    question_latex: '|\\vec{a}|=3, \\quad |\\vec{b}|=4, \\quad \\text{Angle between them} = 60^\\circ \\\\ \\text{Find } \\vec{a} \\cdot \\vec{b}',
    options: JSON.stringify(null),
    correct_answers: JSON.stringify(['6']), solution_text: 'a·b = 3×4×cos60° = 6',
    solution_latex: '\\vec{a}\\cdot\\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta = 3 \\times 4 \\times \\cos 60^\\circ = 6', difficulty: 1, marks: 4, negative_marks: 0
  },
];

// ─── Pre-Seeded Mock Tests ───
export const SEED_TESTS = [
  {
    id: 'test-phy-quick', title: 'Physics Quick Test', description: 'Quick 7-question physics test covering mechanics and electrostatics',
    duration_min: 15, total_marks: 28, total_questions: 7, test_type: 'subject', status: 'draft', created_at: '2024-01-15'
  },
  {
    id: 'test-chem-quick', title: 'Chemistry Quick Test', description: 'Quick test on physical and organic chemistry fundamentals',
    duration_min: 15, total_marks: 28, total_questions: 7, test_type: 'subject', status: 'draft', created_at: '2024-01-15'
  },
  {
    id: 'test-math-quick', title: 'Mathematics Quick Test', description: 'Quick test on algebra, calculus, and coordinate geometry',
    duration_min: 15, total_marks: 32, total_questions: 8, test_type: 'subject', status: 'draft', created_at: '2024-01-15'
  },
  {
    id: 'test-mixed-full', title: 'JEE Mini Mock — All Subjects', description: 'Mixed test with P/C/M questions',
    duration_min: 30, total_marks: 60, total_questions: 15, test_type: 'full', status: 'draft', created_at: '2024-01-20'
  },
];

export const SEED_TEST_QUESTIONS = [
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2022-1', order_num: 1 },
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2022-2', order_num: 2 },
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2024-1', order_num: 3 },
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2024-2', order_num: 4 },
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2023-1', order_num: 5 },
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2023-2', order_num: 6 },
  { test_id: 'test-phy-quick', question_id: 'pyq-phy-2021-1', order_num: 7 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2022-1', order_num: 1 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2022-2', order_num: 2 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2024-1', order_num: 3 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2024-2', order_num: 4 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2023-1', order_num: 5 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2023-2', order_num: 6 },
  { test_id: 'test-chem-quick', question_id: 'pyq-chem-2021-1', order_num: 7 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2022-1', order_num: 1 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2022-2', order_num: 2 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2022-3', order_num: 3 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2024-1', order_num: 4 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2024-2', order_num: 5 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2023-1', order_num: 6 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2023-2', order_num: 7 },
  { test_id: 'test-math-quick', question_id: 'pyq-math-2021-1', order_num: 8 },
  { test_id: 'test-mixed-full', question_id: 'pyq-phy-2024-1', order_num: 1 },
  { test_id: 'test-mixed-full', question_id: 'pyq-phy-2023-2', order_num: 2 },
  { test_id: 'test-mixed-full', question_id: 'pyq-phy-2022-1', order_num: 3 },
  { test_id: 'test-mixed-full', question_id: 'pyq-phy-2021-1', order_num: 4 },
  { test_id: 'test-mixed-full', question_id: 'pyq-phy-2024-2', order_num: 5 },
  { test_id: 'test-mixed-full', question_id: 'pyq-chem-2024-1', order_num: 6 },
  { test_id: 'test-mixed-full', question_id: 'pyq-chem-2023-2', order_num: 7 },
  { test_id: 'test-mixed-full', question_id: 'pyq-chem-2022-1', order_num: 8 },
  { test_id: 'test-mixed-full', question_id: 'pyq-chem-2021-1', order_num: 9 },
  { test_id: 'test-mixed-full', question_id: 'pyq-chem-2024-2', order_num: 10 },
  { test_id: 'test-mixed-full', question_id: 'pyq-math-2024-1', order_num: 11 },
  { test_id: 'test-mixed-full', question_id: 'pyq-math-2023-2', order_num: 12 },
  { test_id: 'test-mixed-full', question_id: 'pyq-math-2022-1', order_num: 13 },
  { test_id: 'test-mixed-full', question_id: 'pyq-math-2021-1', order_num: 14 },
  { test_id: 'test-mixed-full', question_id: 'pyq-math-2024-2', order_num: 15 },
];

// ─── Sprint 9: Achievement Badges Seed Data ───
export const SEED_ACHIEVEMENTS = [
  { id: 'ach-first-test', title: 'First Test', description: 'Complete your first mock test', icon: '🎓', category: 'milestone', unlock_condition: 'tests_completed >= 1', xp_reward: 50 },
  { id: 'ach-week-warrior', title: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: '🔥', category: 'streak', unlock_condition: 'streak >= 7', xp_reward: 100 },
  { id: 'ach-perfect-score', title: 'Perfect Score', description: 'Score 100% on any test', icon: '💯', category: 'performance', unlock_condition: 'perfect_score', xp_reward: 200 },
  { id: 'ach-physics-master', title: 'Physics Master', description: 'Attempt questions from all Physics chapters', icon: '🧠', category: 'subject', unlock_condition: 'physics_chapters_complete', xp_reward: 150 },
  { id: 'ach-chemistry-whiz', title: 'Chemistry Whiz', description: 'Attempt questions from all Chemistry chapters', icon: '🧪', category: 'subject', unlock_condition: 'chemistry_chapters_complete', xp_reward: 150 },
  { id: 'ach-math-genius', title: 'Math Genius', description: 'Attempt questions from all Math chapters', icon: '📐', category: 'subject', unlock_condition: 'math_chapters_complete', xp_reward: 150 },
  { id: 'ach-night-owl', title: 'Night Owl', description: 'Study after 10 PM', icon: '🦉', category: 'time', unlock_condition: 'study_after_22', xp_reward: 30 },
  { id: 'ach-early-bird', title: 'Early Bird', description: 'Study before 7 AM', icon: '🌅', category: 'time', unlock_condition: 'study_before_7', xp_reward: 30 },
  { id: 'ach-doubt-solver', title: 'Doubt Solver', description: 'Answer 10 doubts in the marketplace', icon: '🤝', category: 'social', unlock_condition: 'doubts_answered >= 10', xp_reward: 100 },
  { id: 'ach-sprint-champ', title: 'Sprint Champion', description: 'Win a live sprint', icon: '⚡', category: 'social', unlock_condition: 'sprint_won', xp_reward: 100 },
  { id: 'ach-pyq-crusher', title: 'PYQ Crusher', description: 'Solve 100 PYQ questions', icon: '📚', category: 'milestone', unlock_condition: 'pyqs_solved >= 100', xp_reward: 200 },
  { id: 'ach-comeback-kid', title: 'Comeback Kid', description: 'Recover a broken streak', icon: '🔄', category: 'streak', unlock_condition: 'streak_recovered', xp_reward: 50 },
  { id: 'ach-five-tests', title: 'Test Veteran', description: 'Complete 5 mock tests', icon: '🏅', category: 'milestone', unlock_condition: 'tests_completed >= 5', xp_reward: 75 },
  { id: 'ach-xp-500', title: 'XP Hunter', description: 'Earn 500 total XP', icon: '⭐', category: 'milestone', unlock_condition: 'total_xp >= 500', xp_reward: 50 },
];
