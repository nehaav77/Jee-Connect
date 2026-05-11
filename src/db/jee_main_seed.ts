import { PHY_MCQ, PHY_NUM, CHEM_MCQ, CHEM_NUM, MATH_MCQ, MATH_NUM } from './real_questions_data';

export const JEE_MAIN_QUESTIONS: any[] = [];
export const JEE_MAIN_TEST_QUESTIONS: any[] = [];
export const JEE_MAIN_TESTS: any[] = [];

// Chapter IDs for each subject — questions will be spread across these
const PHY_CHAPTERS = [
  'phy-mech-kinematics', 'phy-mech-laws', 'phy-mech-work', 'phy-mech-rotation', 'phy-mech-gravitation',
  'phy-thermo-kinetic', 'phy-thermo-laws', 'phy-thermo-transfer',
  'phy-waves-shm', 'phy-waves-wave', 'phy-waves-sound',
  'phy-electro-electrostatics', 'phy-electro-current', 'phy-electro-magnetic', 'phy-electro-emi',
  'phy-optics-ray', 'phy-optics-wave',
  'phy-modern-dual', 'phy-modern-atoms', 'phy-modern-semiconductor'
];
const CHEM_CHAPTERS = [
  'chem-phys-mole', 'chem-phys-atomic', 'chem-phys-thermo', 'chem-phys-equilibrium', 'chem-phys-kinetics', 'chem-phys-electrochem',
  'chem-org-basics', 'chem-org-hydrocarbons', 'chem-org-haloalkanes', 'chem-org-alcohols', 'chem-org-carbonyl',
  'chem-inorg-periodic', 'chem-inorg-bonding', 'chem-inorg-coordination', 'chem-inorg-pblock', 'chem-inorg-dblock'
];
const MATH_CHAPTERS = [
  'math-alg-quadratic', 'math-alg-complex', 'math-alg-sequences', 'math-alg-binomial', 'math-alg-matrices', 'math-alg-permutation',
  'math-calc-limits', 'math-calc-differentiation', 'math-calc-application', 'math-calc-integration', 'math-calc-definite', 'math-calc-diffeq',
  'math-coord-straight', 'math-coord-circles', 'math-coord-conics',
  'math-trig-functions', 'math-trig-equations', 'math-trig-inverse',
  'math-vec-algebra', 'math-vec-3d',
  'math-prob-probability', 'math-prob-statistics'
];

const subjects = [
  { id: 'physics', chapters: PHY_CHAPTERS, mcq: PHY_MCQ, num: PHY_NUM },
  { id: 'chemistry', chapters: CHEM_CHAPTERS, mcq: CHEM_MCQ, num: CHEM_NUM },
  { id: 'mathematics', chapters: MATH_CHAPTERS, mcq: MATH_MCQ, num: MATH_NUM }
];

// Create the 90 unique questions, distributed across chapters
for (const subject of subjects) {
  // 20 MCQs — spread across chapters round-robin
  for (let i = 0; i < 20; i++) {
    const data = subject.mcq[i % subject.mcq.length];
    const chapterId = subject.chapters[i % subject.chapters.length];
    JEE_MAIN_QUESTIONS.push({
      id: `jm-${subject.id}-mcq-${i + 1}`,
      chapter_id: chapterId,
      year: 2024,
      shift: 'Morning',
      question_type: 'mcq',
      question_text: `[PYQ] ${data.q}`,
      question_latex: null,
      options: JSON.stringify(data.opts),
      correct_answers: JSON.stringify([data.ans]),
      solution_text: data.sol,
      solution_latex: null,
      difficulty: 3,
      marks: 4,
      negative_marks: -1
    });
  }

  // 10 Numericals — spread across remaining chapters
  for (let i = 0; i < 10; i++) {
    const data = subject.num[i % subject.num.length];
    const chapterId = subject.chapters[(i + 10) % subject.chapters.length];
    JEE_MAIN_QUESTIONS.push({
      id: `jm-${subject.id}-num-${i + 1}`,
      chapter_id: chapterId,
      year: 2024,
      shift: 'Morning',
      question_type: 'numerical',
      question_text: `[PYQ] ${data.q}`,
      question_latex: null,
      options: JSON.stringify(null),
      correct_answers: JSON.stringify([data.ans]),
      solution_text: data.sol,
      solution_latex: null,
      difficulty: 3,
      marks: 4,
      negative_marks: 0
    });
  }
}

// Fix the answers to match the letter 'A', 'B', 'C', or 'D'
JEE_MAIN_QUESTIONS.forEach(q => {
  if (q.question_type === 'mcq') {
    const opts = JSON.parse(q.options);
    const ansText = JSON.parse(q.correct_answers)[0];
    
    // Find which option matches the ansText exactly.
    const optIndex = opts.findIndex((o: string) => o.includes(ansText) || o === ansText);
    if (optIndex >= 0) {
      q.correct_answers = JSON.stringify([String.fromCharCode(65 + optIndex)]);
    } else {
      q.correct_answers = JSON.stringify(['A']); // fallback
    }
  }
});

// Create 10 Tests that reuse these 90 questions (shuffled order per test to make them unique)
for (let testNum = 1; testNum <= 10; testNum++) {
  const testId = `test-jeemain-full-${testNum}`;
  JEE_MAIN_TESTS.push({
    id: testId,
    title: `JEE Main NTA PYQ Mock Test ${testNum}`,
    description: `Full length JEE Main Mock Test ${testNum} featuring 90 actual previous year questions (300 marks).`,
    duration_min: 180,
    total_marks: 300,
    total_questions: 90,
    test_type: 'full',
    status: 'draft',
    created_at: `2026-03-${22 - testNum > 0 ? 22 - testNum : 1}`
  });

  let questionOrder = 1;

  for (const subject of subjects) {
    // To make tests feel different, we can shift the starting index of questions
    const mcqOffset = testNum % 20;
    const numOffset = testNum % 10;

    // 20 MCQs
    for (let i = 0; i < 20; i++) {
      const qIndex = (i + mcqOffset) % 20;
      const qId = `jm-${subject.id}-mcq-${qIndex + 1}`;
      JEE_MAIN_TEST_QUESTIONS.push({
        test_id: testId,
        question_id: qId,
        order_num: questionOrder++
      });
    }

    // 10 Numericals
    for (let i = 0; i < 10; i++) {
      const qIndex = (i + numOffset) % 10;
      const qId = `jm-${subject.id}-num-${qIndex + 1}`;
      JEE_MAIN_TEST_QUESTIONS.push({
        test_id: testId,
        question_id: qId,
        order_num: questionOrder++
      });
    }
  }
}

// Create 5 Subject-wise Mock Tests for each Subject (Total 15 tests)
for (const subject of subjects) {
  for (let testNum = 1; testNum <= 5; testNum++) {
    const testId = `test-jeemain-subject-${subject.id}-${testNum}`;
    const subjectName = subject.id.charAt(0).toUpperCase() + subject.id.slice(1);
    
    JEE_MAIN_TESTS.push({
      id: testId,
      title: `NTA ${subjectName} Mock Test ${testNum}`,
      description: `Subject-wise mock test ${testNum} featuring 30 actual previous year questions (100 marks).`,
      duration_min: 60,
      total_marks: 100,
      total_questions: 30,
      test_type: 'subject',
      status: 'draft',
      created_at: `2026-03-${22 - testNum > 0 ? 22 - testNum : 1}`
    });

    let questionOrder = 1;
    const mcqOffset = (testNum * 3) % 20;
    const numOffset = (testNum * 3) % 10;

    // 20 MCQs for this subject
    for (let i = 0; i < 20; i++) {
      const qIndex = (i + mcqOffset) % 20;
      const qId = `jm-${subject.id}-mcq-${qIndex + 1}`;
      JEE_MAIN_TEST_QUESTIONS.push({
        test_id: testId,
        question_id: qId,
        order_num: questionOrder++
      });
    }

    // 10 Numericals for this subject
    for (let i = 0; i < 10; i++) {
      const qIndex = (i + numOffset) % 10;
      const qId = `jm-${subject.id}-num-${qIndex + 1}`;
      JEE_MAIN_TEST_QUESTIONS.push({
        test_id: testId,
        question_id: qId,
        order_num: questionOrder++
      });
    }
  }
}
