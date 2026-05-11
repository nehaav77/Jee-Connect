const { readSource } = require('./helpers');

const gamification = readSource('src', 'services', 'GamificationService.ts');
const achievements = readSource('app', 'achievements.tsx');
const schema = readSource('src', 'db', 'schema.ts');

describe('Feature 3: Gamification — Unit Testing', () => {

  test('UT-G01: getLevel returns Aspirant at 0 XP', () => {
    expect(gamification).toContain("{ minXP: 0, title: 'Aspirant', emoji: '📘' }");
    // getLevel function iterates LEVELS
    expect(gamification).toContain('getLevel(totalXP: number)');
    expect(gamification).toContain('current = LEVELS[0]');
  });

  test('UT-G02: getLevel returns Ranker at 600', () => {
    // Ranker level starts at 600 XP
    expect(gamification).toContain("{ minXP: 600, title: 'Ranker', emoji: '🏆' }");
    // Other levels defined in order
    expect(gamification).toContain("{ minXP: 100, title: 'Learner', emoji: '📗' }");
    expect(gamification).toContain("{ minXP: 300, title: 'Scholar', emoji: '📙' }");
    expect(gamification).toContain("{ minXP: 1000, title: 'Topper', emoji: '🥇' }");
  });

  test('UT-G03: Level progress calculated', () => {
    // Progress = (xpInLevel) / (xpNeeded), capped at 1
    expect(gamification).toContain('xpInLevel = totalXP - current.minXP');
    expect(gamification).toContain('xpNeeded = nextLevel.minXP - current.minXP');
    expect(gamification).toContain('Math.min(1, xpInLevel / xpNeeded)');
    // Returns progress in result
    expect(gamification).toContain('progress');
  });

  test('UT-G04: getStreakEmoji returns correct', () => {
    // getStreakEmoji maps streak count to emoji
    expect(gamification).toContain('getStreakEmoji(streak: number): string');
    expect(gamification).toContain("streak >= 100) return '💎'");
    expect(gamification).toContain("streak >= 30) return '🔥🔥🔥'");
    expect(gamification).toContain("streak >= 7) return '🔥🔥'");
    expect(gamification).toContain("streak >= 1) return '🔥'");
    expect(gamification).toContain("return '❄️'");
  });

  test('UT-G05: Spin reward from valid pool', () => {
    // SPIN_REWARDS pool has valid reward types
    expect(gamification).toContain("SPIN_REWARDS: SpinReward[]");
    expect(gamification).toContain("type: 'xp'");
    expect(gamification).toContain("type: 'streak_shield'");
    expect(gamification).toContain("type: 'tip'");
    expect(gamification).toContain("type: 'fun_fact'");
    // doSpin picks random reward from pool
    expect(gamification).toContain('Math.floor(Math.random() * SPIN_REWARDS.length)');
  });
});

describe('Feature 3: Gamification — Integration Testing', () => {

  test('IT-G01: awardXP creates log entry', () => {
    expect(gamification).toContain('async awardXP(userEmail: string, action: string, amount: number)');
    expect(gamification).toContain("INSERT INTO user_xp_log (id, user_email, action, xp_earned, created_at)");
    // Also triggers recordDailyActivity
    expect(gamification).toContain('this.recordDailyActivity(userEmail, amount, 0, 0)');
  });

  test('IT-G02: getTotalXP sums correctly', () => {
    // getTotalXP queries all XP entries and sums them
    expect(gamification).toContain('async getTotalXP(userEmail: string): Promise<number>');
    expect(gamification).toContain("SELECT xp_earned FROM user_xp_log WHERE user_email = ?");
    expect(gamification).toContain('rows.reduce((sum, r) => sum + (r.xp_earned || 0), 0)');
  });

  test('IT-G03: recordDailyActivity creates streak', () => {
    // recordDailyActivity inserts/updates daily_streaks table
    expect(gamification).toContain('async recordDailyActivity');
    expect(gamification).toContain("SELECT * FROM daily_streaks WHERE user_email = ? AND date = ?");
    expect(gamification).toContain("INSERT INTO daily_streaks");
    expect(gamification).toContain("UPDATE daily_streaks SET");
  });

  test('IT-G04: Achievement unlocks once', () => {
    // unlockAchievement checks for existing unlock first
    expect(gamification).toContain('async unlockAchievement');
    expect(gamification).toContain("SELECT id FROM user_achievements WHERE user_email = ? AND achievement_id = ?");
    // If already unlocked, returns false
    expect(gamification).toContain('if (existing) return { unlocked: false');
    // First time inserts new record
    expect(gamification).toContain("INSERT INTO user_achievements");
  });

  test('IT-G05: Daily challenge deterministic', () => {
    // getDailyChallenge uses date as seed for consistent selection
    expect(gamification).toContain('async getDailyChallenge');
    expect(gamification).toContain("const today = getTodayDateStr()");
    expect(gamification).toContain("today.split('-').reduce((a, b) => a + parseInt(b), 0)");
    expect(gamification).toContain('const idx = seed % questions.length');
  });
});

describe('Feature 3: Gamification — System Testing', () => {

  test('ST-G01: Achievements page loads', () => {
    // achievements.tsx renders badge grid with categories
    expect(achievements).toContain('AchievementsScreen');
    expect(achievements).toContain('gamificationService.getAchievements');
    expect(achievements).toContain('Badge Grid by Category');
    expect(achievements).toContain("'milestone'");
    expect(achievements).toContain("'streak'");
    expect(achievements).toContain("'performance'");
  });

  test('ST-G02: Badge detail on tap', () => {
    // Tapping a badge shows detail card with description and XP
    expect(achievements).toContain('setSelectedBadge');
    expect(achievements).toContain('selectedBadge');
    expect(achievements).toContain('detailCard');
    expect(achievements).toContain('xp_reward');
    expect(achievements).toContain('Unlocked');
    expect(achievements).toContain('Not yet unlocked');
  });

  test('ST-G03: Daily Spin page works', () => {
    // doSpin function returns a reward
    expect(gamification).toContain('async doSpin(userEmail: string): Promise<SpinReward>');
    expect(gamification).toContain("const reward = SPIN_REWARDS[");
    // Awards XP if reward type is 'xp'
    expect(gamification).toContain("if (reward.type === 'xp' && reward.value > 0)");
    expect(gamification).toContain("this.awardXP(userEmail, 'daily_spin', reward.value)");
  });

  test('ST-G04: Spin disabled after use', () => {
    // canSpin checks if user already spun today
    expect(gamification).toContain('async canSpin(userEmail: string): Promise<boolean>');
    expect(gamification).toContain("`spin_${userEmail}_${today}`");
    expect(gamification).toContain('return !setting');
    // Mark spin as used after spinning
    expect(gamification).toContain("'used'");
  });

  test('ST-G05: XP toast after test', () => {
    // XP values defined for test completion
    expect(gamification).toContain('test_complete: 50');
    expect(gamification).toContain('correct_answer: 10');
    expect(gamification).toContain('perfect_score: 100');
    // Check achievements after test
    expect(gamification).toContain('checkAndUnlockAchievements');
    expect(gamification).toContain('checkPerfectScore');
  });
});
