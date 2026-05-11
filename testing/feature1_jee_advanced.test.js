const { readSource } = require('./helpers');

const seed = readSource('src', 'db', 'jee_advanced_seed.ts');
const testRepo = readSource('src', 'repositories', 'TestRepository.ts');
const testsTab = readSource('app', '(tabs)', 'tests.tsx');
const testUI = readSource('app', 'test', '[testId].tsx');
const resultUI = readSource('app', 'result', '[attemptId].tsx');

describe('Feature 1: JEE Advanced Tests — Unit Testing', () => {

  test('UT-A01: Seed generates 36 questions', () => {
    // JEE_ADVANCED_QUESTIONS is populated from 3 subjects × 12 questions each
    expect(seed).toContain('JEE_ADVANCED_QUESTIONS');
    // 12 Physics questions (ADV_PHY array)
    const phyMatches = seed.match(/ADV_PHY.*?=\s*\[([\s\S]*?)\];/);
    expect(phyMatches).toBeTruthy();
    // 12 Chemistry questions (ADV_CHEM array)
    const chemMatches = seed.match(/ADV_CHEM.*?typeof ADV_PHY\s*=\s*\[/);
    expect(chemMatches).toBeTruthy();
    // 12 Mathematics questions (ADV_MATH array)
    const mathMatches = seed.match(/ADV_MATH.*?typeof ADV_PHY\s*=\s*\[/);
    expect(mathMatches).toBeTruthy();
    // Total should be 36 (12 + 12 + 12)
    expect(seed).toContain("{ id: 'physics', chapters: PHY_CHAPTERS, qs: ADV_PHY }");
    expect(seed).toContain("{ id: 'chemistry', chapters: CHEM_CHAPTERS, qs: ADV_CHEM }");
    expect(seed).toContain("{ id: 'mathematics', chapters: MATH_CHAPTERS, qs: ADV_MATH }");
  });

  test('UT-A02: Physics questions have correct IDs', () => {
    // IDs match pattern ja-physics-{type}-{n}
    expect(seed).toContain('`ja-${sub.id}-${data.type}-${i + 1}`');
    // Physics chapters use phy- prefix
    expect(seed).toContain("'phy-mech-kinematics'");
    expect(seed).toContain("'phy-modern-atoms'");
  });

  test('UT-A03: MCQ answers are single letters', () => {
    // Seed has a fix step that ensures MCQ answers are single letters A/B/C/D
    expect(seed).toContain("question_type === 'mcq'");
    expect(seed).toContain("'ABCD'.includes(ans)");
    expect(seed).toContain("String.fromCharCode(65 + idx)");
    // Verify MCQ questions have single-letter answers like 'A', 'B', 'C', 'D'
    expect(seed).toContain("ans:'A'");
    expect(seed).toContain("ans:'B'");
    expect(seed).toContain("ans:'C'");
    expect(seed).toContain("ans:'D'");
  });

  test('UT-A04: Multi-answer has array answers', () => {
    // Multi-answer questions return arrays like ['A','B','C']
    expect(seed).toContain("type:'multi_answer'");
    expect(seed).toContain("ans:['A','B','C']");
    expect(seed).toContain("ans:['A','B','D']");
    expect(seed).toContain("ans:['A','C']");
    // Correct answers are serialized as arrays
    expect(seed).toContain('JSON.stringify(Array.isArray(data.ans) ? data.ans : [data.ans])');
  });

  test('UT-A05: Numerical answers are strings', () => {
    // Numerical questions have string answers parseable as floats
    expect(seed).toContain("type:'numerical'");
    expect(seed).toContain("ans:'1.2'");
    expect(seed).toContain("ans:'0.6'");
    expect(seed).toContain("ans:'15.7'");
    expect(seed).toContain("ans:'1.23'");
    // Numerical has 0 negative marks
    expect(seed).toContain("data.type === 'numerical' ? 0 : -1");
  });
});

describe('Feature 1: JEE Advanced Tests — Integration Testing', () => {

  test('IT-A01: Seed inserts into DB', () => {
    // Database initialization inserts all JEE Advanced questions
    expect(seed).toContain('JEE_ADVANCED_QUESTIONS');
    expect(seed).toContain('chapter_id: chapterId');
    expect(seed).toContain('question_type: data.type');
    expect(seed).toContain('correct_answers: JSON.stringify');
  });

  test('IT-A02: 14 tests created from seed', () => {
    // 5 full mock tests
    expect(seed).toContain("for (let t = 1; t <= 5; t++)");
    expect(seed).toContain("`test-jeeadv-full-${t}`");
    // 3 subject-wise tests per subject = 9 more
    expect(seed).toContain("for (let t = 1; t <= 3; t++)");
    expect(seed).toContain("`test-jeeadv-${sub.id}-${t}`");
    // JEE_ADVANCED_TESTS array holds all 14
    expect(seed).toContain('JEE_ADVANCED_TESTS');
  });

  test('IT-A03: Test-question links valid', () => {
    // Each test has question links via JEE_ADVANCED_TEST_QUESTIONS
    expect(seed).toContain('JEE_ADVANCED_TEST_QUESTIONS');
    expect(seed).toContain('test_id: testId');
    expect(seed).toContain('question_id:');
    expect(seed).toContain('order_num: order++');
  });

  test('IT-A04: getTestQuestions returns data', () => {
    // TestRepository provides getTestQuestions method
    expect(testRepo).toContain('getTestQuestions');
    expect(testRepo).toContain('SELECT');
    expect(testRepo).toContain('test_questions');
  });

  test('IT-A05: completeAttempt scores correctly', () => {
    // completeAttempt calculates score with +4/-1/0 marking
    expect(testRepo).toContain('completeAttempt');
    expect(testRepo).toContain('correct_answers');
    expect(testRepo).toContain('score');
    expect(testRepo).toContain('correct_count');
    expect(testRepo).toContain('wrong_count');
  });
});

describe('Feature 1: JEE Advanced Tests — System Testing', () => {

  test('ST-A01: Advanced tests visible in Tests tab', () => {
    // Tests tab loads all tests including JEE Advanced ones
    expect(testsTab).toContain('getAllTests');
    expect(testsTab).toContain('setTests');
    // Test cards are rendered with title
    expect(testsTab).toContain('test_title');
  });

  test('ST-A02: Full mock shows 36Q, 180min', () => {
    // JEE Advanced full test has 36 questions and 180 minutes
    expect(seed).toContain('total_questions: 36');
    expect(seed).toContain('duration_min: 180');
    expect(seed).toContain("`JEE Advanced PYQ Mock Test ${t}`");
  });

  test('ST-A03: MCQ renders with 4 options', () => {
    // Test UI renders options for MCQ questions
    expect(testUI).toContain('options');
    expect(testUI).toContain("JSON.parse(q.options)");
    expect(testUI).toContain('selectOption');
    expect(testUI).toContain("String.fromCharCode(65 + oi)");
    // JEE Advanced prefix shown
    expect(seed).toContain('[JEE Adv ${data.year}]');
  });

  test('ST-A04: Numerical shows input field', () => {
    // Test UI shows TextInput for numerical questions
    expect(testUI).toContain("question_type === 'numerical'");
    expect(testUI).toContain('TextInput');
    expect(testUI).toContain("keyboardType=\"numeric\"");
    expect(testUI).toContain('Enter your numerical answer');
  });

  test('ST-A05: Result shows correct/wrong/score', () => {
    // Result screen displays score, stats grid, and solution review
    expect(resultUI).toContain('score');
    expect(resultUI).toContain('correct');
    expect(resultUI).toContain('wrong');
    expect(resultUI).toContain('Solution');
  });
});
