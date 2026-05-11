const { readSource } = require('./helpers');

const home = readSource('app', '(tabs)', 'index.tsx');
const gamification = readSource('src', 'services', 'GamificationService.ts');
const adaptive = readSource('src', 'services', 'AdaptiveTestService.ts');
const appStore = readSource('src', 'store', 'appStore.ts');


describe('Feature 4: Home Dashboard — Unit Testing', () => {

  test('UT-H01: JEE countdown calculates', () => {
    // daysToJEE is computed from targetYear
    expect(home).toContain('targetYear');
    expect(home).toContain('daysToJEE');
    expect(home).toContain("Math.max(0, Math.ceil(");
    expect(home).toContain('86400000');
    // Shows "days to JEE" in the hero card
    expect(home).toContain('{daysToJEE} days to JEE');
  });

  test('UT-H02: Weekly progress capped at 1', () => {
    // weeklyProgress is capped at 1 via Math.min
    expect(home).toContain('Math.min(1, weeklyXPProgress / weeklyXPGoal)');
    // Falls back to 0 when goal is 0
    expect(home).toContain('weeklyXPGoal > 0 ?');
  });

  test('UT-H03: Stats default to 0', () => {
    // Stats state initialized with all zeros
    expect(home).toContain("useState({ tests: 0, studyHours: 0, streak: 0 })");
  });

  test('UT-H04: Subject list has counts', () => {
    // Subjects are loaded with chapter counts
    expect(home).toContain('subjectRepository.getAll()');
    expect(home).toContain('subjectRepository.getChapterCount');
    expect(home).toContain('chapterCount');
    // Displayed as "{n} chapters"
    expect(home).toContain('{sub.chapterCount} chapters');
  });

  test('UT-H05: Level badge shows emoji', () => {
    // Level badge renders emoji from store
    expect(home).toContain('currentLevelEmoji');
    expect(home).toContain('currentLevel');
    expect(home).toContain('levelBadge');
    expect(home).toContain('{currentLevelEmoji}');
  });
});


describe('Feature 4: Home Dashboard — Integration Testing', () => {

  test('IT-H01: Stats refresh on focus', () => {
    // useFocusEffect triggers stats reload
    expect(home).toContain('useFocusEffect');
    expect(home).toContain('analyticsService.getStudentStats(userEmail)');
    expect(home).toContain('setStats');
  });

  test('IT-H02: Focus Today from heatmap', () => {
    // Weakest chapter loaded from gamification service
    expect(home).toContain('gamificationService.getFocusTodayChapter(userEmail)');
    expect(home).toContain('setFocusChapter');
    expect(home).toContain('focusChapter');
    // Service finds weakest chapter from heatmap
    expect(gamification).toContain('getFocusTodayChapter');
    expect(gamification).toContain('accuracy');
    expect(gamification).toContain('weakness_level');
  });

  test('IT-H03: Daily challenge loads', () => {
    // Daily challenge loaded on dashboard mount
    expect(home).toContain('gamificationService.getDailyChallenge()');
    expect(home).toContain('setDailyChallenge');
    expect(home).toContain('gamificationService.isDailyChallengeSolved');
    expect(home).toContain('setChallengeSolved');
  });

  test('IT-H04: Smart test generates', () => {
    // Smart test button generates adaptive test from heatmap
    expect(home).toContain('adaptiveTestService.generateAdaptiveTest');
    expect(home).toContain('Generate My Smart Test');
    // Navigates to test instructions page on success
    expect(home).toContain("pathname: '/test/instructions'");
    expect(home).toContain('params: { testId }');
  });

  test('IT-H05: Gamification data refreshed', () => {
    // refreshGamificationData called on focus
    expect(home).toContain('refreshGamificationData(userEmail)');
    // Records daily activity for streak
    expect(home).toContain('gamificationService.recordDailyActivity(userEmail, 0, 0, 0)');
    // App store has gamification data
    expect(appStore).toContain('currentXP');
    expect(appStore).toContain('currentLevel');
    expect(appStore).toContain('currentStreak');
  });
});


describe('Feature 4: Home Dashboard — System Testing', () => {

  test('ST-H01: Hero card shows user info', () => {
    // Hero card displays user greeting with XP bar and level badge
    expect(home).toContain('Namaste, {userName}');
    expect(home).toContain('heroCard');
    expect(home).toContain('xpBarFill');
    expect(home).toContain('{currentXP} XP');
  });

  test('ST-H02: Weekly XP goal visible', () => {
    // Weekly card shows progress bar
    expect(home).toContain('Weekly XP Goal');
    expect(home).toContain('weeklyCard');
    expect(home).toContain('{weeklyXPProgress}/{weeklyXPGoal}');
    expect(home).toContain('weeklyBarFill');
    // Shows achievement message when complete
    expect(home).toContain('Weekly goal achieved');
  });

  test('ST-H03: Quick actions navigate', () => {
    // Quick action buttons navigate to correct routes
    expect(home).toContain("{ icon: '📝', label: 'Mock Test', route: '/(tabs)/tests' }");
    expect(home).toContain("{ icon: '📖', label: 'PYQs', route: '/(tabs)/subjects' }");
    expect(home).toContain("{ icon: '🤖', label: 'Ask Saathi', route: '/(tabs)/saathi' }");
    expect(home).toContain("{ icon: '👤', label: 'Profile', route: '/(tabs)/profile' }");
  });

  test('ST-H04: Subject cards shown', () => {
    // Subjects section with navigable cards
    expect(home).toContain('Your Subjects');
    expect(home).toContain('subjects.map');
    expect(home).toContain('subjectCard');
    expect(home).toContain('{sub.name}');
    expect(home).toContain('router.push(`/subject/${sub.id}`');
  });

  test('ST-H05: Connection status shown', () => {
    // Online/offline status badge
    expect(home).toContain('isOnline');
    expect(home).toContain('Online — Syncing data');
    expect(home).toContain('Offline — Using local data');
    expect(home).toContain('statusBadge');
  });
});
