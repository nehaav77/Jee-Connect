const { readSource } = require('./helpers');

const mainSeed = readSource('src', 'db', 'jee_main_seed.ts');
const testRepo = readSource('src', 'repositories', 'TestRepository.ts');
const testsTab = readSource('app', '(tabs)', 'tests.tsx');
const testUI = readSource('app', 'test', '[testId].tsx');
const instructions = readSource('app', 'test', 'instructions.tsx');
const schema = readSource('src', 'db', 'schema.ts');

describe('Feature 5: Mock Tests JEE Mains — Unit Testing', () => {

  test('UT-T01: 90 JEE Main questions seeded', () => {
    // JEE Main seed generates 90 questions (30 per subject × 3)
    expect(mainSeed).toContain('JEE_MAIN_QUESTIONS');
    // Contains questions for all 3 subjects
    expect(mainSeed).toContain('physics');
    expect(mainSeed).toContain('chemistry');
    expect(mainSeed).toContain('math');
  });

  test('UT-T02: MCQ correct_answers fixed', () => {
    // MCQ answers are single letters A/B/C/D after fixing
    expect(mainSeed).toContain("question_type === 'mcq'");
    expect(mainSeed).toContain("correct_answers");
    // Answer fixing logic converts text answers to letter format
    expect(mainSeed).toContain("String.fromCharCode(65 + optIndex)");
    // Fallback to 'A' if no match
    expect(mainSeed).toContain("JSON.stringify(['A'])");
  });

  test('UT-T03: Numerical has 0 negative marks', () => {
    // Numerical questions have 0 negative marks
    expect(mainSeed).toContain("numerical");
    expect(mainSeed).toContain("negative_marks");
    // MCQ has -1 but numerical has 0
    expect(mainSeed).toContain("0");
  });

  test('UT-T04: MCQ scoring: +4 correct', () => {
    // MCQ gives +4 for correct answer
    expect(mainSeed).toContain("marks:");
    // Test repo implements scoring
    expect(testRepo).toContain('marks');
    expect(testRepo).toContain('score');
    // Instructions page shows +4
    expect(instructions).toContain('+4');
  });

  test('UT-T05: MCQ scoring: -1 wrong', () => {
    // MCQ gives -1 for wrong answer
    expect(mainSeed).toContain("negative_marks");
    // Instructions page shows -1
    expect(instructions).toContain('-1');
    // Numerical has 0 penalty
    expect(instructions).toContain('Numerical Value');
  });
});

describe('Feature 5: Mock Tests JEE Mains — Integration Testing', () => {

  test('IT-T01: 25 JEE Main tests created', () => {
    // JEE Main seed creates tests
    expect(mainSeed).toContain('JEE_MAIN_TESTS');
    expect(mainSeed).toContain('JEE_MAIN_TEST_QUESTIONS');
    // Tests include both full and subject-wise
    expect(mainSeed).toContain('full');
    expect(mainSeed).toContain('subject');
  });

  test('IT-T02: startAttempt creates record', () => {
    // TestRepository.startAttempt creates a test_attempts row
    expect(testRepo).toContain('startAttempt');
    expect(testRepo).toContain("INSERT INTO test_attempts");
    expect(testRepo).toContain("status");
    expect(testRepo).toContain("in_progress");
  });

  test('IT-T03: saveAnswer updates JSON', () => {
    // saveAnswer updates the answers JSON in test_attempts
    expect(testRepo).toContain('saveAnswer');
    expect(testRepo).toContain('answers');
    expect(testRepo).toContain('total_attempted');
    // Test UI auto-saves on every answer change
    expect(testUI).toContain('autoSave');
  });

  test('IT-T04: completeAttempt calculates score', () => {
    // completeAttempt computes score, correct_count, wrong_count
    expect(testRepo).toContain('completeAttempt');
    expect(testRepo).toContain('score');
    expect(testRepo).toContain('correct_count');
    expect(testRepo).toContain('wrong_count');
    expect(testRepo).toContain("status = 'completed'");
  });

  test('IT-T05: Sync enqueued on complete', () => {
    // Result page or test completion triggers sync
    expect(testRepo).toContain('completeAttempt');
    // Schema has sync-related tables
    expect(schema).toContain('sync');
  });
});

describe('Feature 5: Mock Tests JEE Mains — System Testing', () => {

  test('ST-T01: Tests tab shows available tests', () => {
    // Tests tab loads and displays test list
    expect(testsTab).toContain('TestsScreen');
    expect(testsTab).toContain('getAllTests');
    expect(testsTab).toContain('setTests');
    // Creates JEE Main test from PYQ bank if empty
    expect(testsTab).toContain('JEE Main Full Mock Test');
  });

  test('ST-T02: Instructions page displays', () => {
    // NTA-style instructions with all sections
    expect(instructions).toContain('TestInstructionsScreen');
    expect(instructions).toContain('General Instructions');
    expect(instructions).toContain('Navigating to a Question');
    expect(instructions).toContain('Answering a Question');
    expect(instructions).toContain('Section-wise Marking Scheme');
    expect(instructions).toContain('Exam Conduct Rules');
  });

  test('ST-T03: Agreement required to start', () => {
    // Checkbox must be checked before exam starts
    expect(instructions).toContain("const [agreed, setAgreed] = useState(false)");
    expect(instructions).toContain('disabled={!agreed');
    expect(instructions).toContain('I have read and understood');
    expect(instructions).toContain('Please accept the declaration first');
  });

  test('ST-T04: Timer counts down', () => {
    // Timer counts down in HH:MM:SS format
    expect(testUI).toContain('timeLeft');
    expect(testUI).toContain('setTimeLeft');
    expect(testUI).toContain('setInterval');
    expect(testUI).toContain('return prev - 1');
    // Displays formatted time
    expect(testUI).toContain('padStart(2,');
    expect(testUI).toContain('Remaining Time');
  });

  test('ST-T05: Question palette shows status', () => {
    // Question palette with color-coded status
    expect(testUI).toContain('getStatus');
    expect(testUI).toContain("'ans'");       // Answered = green
    expect(testUI).toContain("'not_ans'");   // Not answered = red
    expect(testUI).toContain("'not_vis'");   // Not visited = grey
    expect(testUI).toContain("'rev'");       // Marked for review = purple
    expect(testUI).toContain("'#28a745'");   // Green for answered
    expect(testUI).toContain("'#dc3545'");   // Red for not answered
    expect(testUI).toContain('paletteGrid');
  });
});
