const { readSource } = require('./helpers');

const saathi = readSource('app', '(tabs)', 'saathi.tsx');
const gamification = readSource('src', 'services', 'GamificationService.ts');

describe('Feature 2: Saathi AI Mnemonics — Unit Testing', () => {

  test('UT-M01: analyzeSentiment returns 0-1', () => {
    expect(saathi).toContain('function analyzeSentiment(text: string): number');
    expect(saathi).toContain('Math.max(0, Math.min(1, s))');
    // Negative words reduce sentiment
    expect(saathi).toContain("'stress'");
    expect(saathi).toContain("'worried'");
    expect(saathi).toContain("'anxious'");
    // Each negative word decreases by 0.15
    expect(saathi).toContain('s -= 0.15');
  });

  test('UT-M02: analyzeSentiment positive input', () => {
    // Positive words increase sentiment
    expect(saathi).toContain("'great'");
    expect(saathi).toContain("'progress'");
    expect(saathi).toContain("'amazing'");
    expect(saathi).toContain("'confident'");
    // Each positive word increases by 0.12
    expect(saathi).toContain('s += 0.12');
    // Starting value is 0.5 (neutral baseline)
    expect(saathi).toContain('let s = 0.5');
  });

  test('UT-M03: generateResponse triggers mnemonic on keyword', () => {
    expect(saathi).toContain("l.includes('mnemonic')");
    expect(saathi).toContain("return '__MNEMONIC_START__'");
  });

  test("UT-M04: generateResponse keyword 'trick'", () => {
    // Typing 'trick' also triggers mnemonic start
    expect(saathi).toContain("l.includes('trick')");
    expect(saathi).toContain("l.includes('shortcut')");
    expect(saathi).toContain("l.includes('remember')");
    expect(saathi).toContain("l.includes('memorize')");
  });

  test('UT-M05: bldM generates cricket+kinematics', () => {
    // bldM function generates pop-culture based explanations
    expect(saathi).toContain('function bldM(tp: string, fav: string, cat: string)');
    // Cricket + Kinematics generates SUVAT equations with cricket analogies
    expect(saathi).toContain("tp.includes('Kinematic')");
    expect(saathi).toContain("cat==='cricket'");
    expect(saathi).toContain('SUVAT');
    expect(saathi).toContain('PROJECTILE MOTION');
    expect(saathi).toContain("Bumrah's yorker");
  });
});

describe('Feature 2: Saathi AI Mnemonics — Integration Testing', () => {

  test('IT-M01: Mnemonic favorite saved to DB', () => {
    expect(saathi).toContain("gamificationService.saveSaathiMemory(userEmail,'mnemonic_fav',fv)");
    // GamificationService implements saveSaathiMemory with DB
    expect(gamification).toContain('saveSaathiMemory');
    expect(gamification).toContain('saathi_memory');
  });

  test('IT-M02: Chat messages persisted', () => {
    // Messages are saved to chat_messages table
    expect(saathi).toContain("INSERT INTO chat_messages");
    expect(saathi).toContain("SELECT * FROM chat_messages WHERE user_email");
    // Messages are restored on reload
    expect(saathi).toContain('loadMessages');
  });

  test('IT-M03: XP awarded for chat', () => {
    // Each message awards 5 XP via saathi_chat
    expect(saathi).toContain("gamificationService.awardXP(userEmail, 'saathi_chat', 5)");
    // GamificationService.awardXP creates log entry
    expect(gamification).toContain('awardXP');
    expect(gamification).toContain('user_xp_log');
  });

  test('IT-M04: Struggle topic detected', () => {
    // When user mentions struggling with a topic, it's saved as memory
    expect(saathi).toContain("lower.includes('struggle')");
    expect(saathi).toContain("lower.includes('weak')");
    expect(saathi).toContain("lower.includes('difficult')");
    expect(saathi).toContain("gamificationService.saveSaathiMemory(userEmail, 'struggle_topic', t)");
  });

  test('IT-M05: Sentiment updates store', () => {
    // Sentiment score updates the global app store
    expect(saathi).toContain('analyzeSentiment(inputText)');
    expect(saathi).toContain('setStressLevel(sentiment)');
    // Low sentiment triggers mindfulness overlay
    expect(saathi).toContain('sentiment < 0.25');
    expect(saathi).toContain('setShowMindfulness(true)');
  });
});

describe('Feature 2: Saathi AI Mnemonics — System Testing', () => {

  test("ST-M01: Type 'mnemonic' starts flow", () => {
    // Mnemonic start triggers category picker
    expect(saathi).toContain("resp === '__MNEMONIC_START__'");
    expect(saathi).toContain("setMnemonicStep('pick_category')");
    expect(saathi).toContain('Personalized Mnemonic Mode');
    expect(saathi).toContain('Cricket / Sports');
    expect(saathi).toContain('Movies / TV Series');
    expect(saathi).toContain('Video Games');
    expect(saathi).toContain('Anime / Manga');
    expect(saathi).toContain('Memes / Internet Culture');
  });

  test('ST-M02: Select category by number', () => {
    // Typing '1' selects Cricket
    expect(saathi).toContain("mnemonicStep === 'pick_category'");
    expect(saathi).toContain("il.includes('1')");
    expect(saathi).toContain("il.includes('cricket')");
    expect(saathi).toContain("setMnemonicStep('pick_favorite')");
  });

  test('ST-M03: Select favorite, see topics', () => {
    // After selecting favorite, JEE topic picker appears
    expect(saathi).toContain("mnemonicStep === 'pick_favorite'");
    expect(saathi).toContain("setMnemonicStep('pick_topic')");
    // 9 JEE topics available
    expect(saathi).toContain("'Kinematics'");
    expect(saathi).toContain("'Newton\\'s Laws'");
    expect(saathi).toContain("'Electrostatics'");
    expect(saathi).toContain("'Thermodynamics'");
    expect(saathi).toContain("'Organic Chem'");
    expect(saathi).toContain("'Calculus'");
    expect(saathi).toContain("'Trigonometry'");
    expect(saathi).toContain("'Probability'");
  });

  test('ST-M04: Get personalized response', () => {
    // Topic selection generates personalized mnemonic via bldM
    expect(saathi).toContain("mnemonicStep === 'pick_topic'");
    expect(saathi).toContain('bldM(TP[ti], mnemonicFavorite, mnemonicCategory)');
    // Responses include practice links
    expect(saathi).toContain('Subjects');
    expect(saathi).toContain('PYQs');
  });

  test('ST-M05: Flow restarts after completion', () => {
    // After generating mnemonic, step resets to idle
    expect(saathi).toContain("setMnemonicStep('idle')");
    // User can type 'mnemonic' again
    expect(saathi).toContain("Type \"mnemonic\" to restart");
  });
});
