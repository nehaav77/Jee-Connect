// JEE Connect - Saathi AI Companion Tab
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, Animated, Image,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { getDatabase } from '@/src/db/database';
import { generateId } from '@/src/repositories/BaseRepository';
import { ocrService } from '@/src/services/OCRService';
import { gamificationService } from '@/src/services/GamificationService';
import { buildMnemonic } from '@/src/data/mnemonicBuilder';
import { SaathiTranslations } from '@/src/data/saathiTranslations';
import { Feather } from '@expo/vector-icons';

interface ChatMessage {
    id: string; role: 'user' | 'assistant'; content: string;
    timestamp: string; sentiment_score?: number; imageUri?: string;
}

function analyzeSentiment(text: string): number {
    const l = text.toLowerCase();
    const neg = ['stress', 'worried', 'anxious', 'fail', 'difficult', 'confused', 'hopeless', 'tired',
        'frustrated', 'panic', 'nervous', 'scared', 'afraid', 'depressed', 'sad', 'stuck', 'hard',
        'struggling', 'overwhelm', 'hate', 'boring', 'terrible', 'worst', 'bad', 'upset',
        'angry', 'irritated', 'exhausted', 'burned', 'burnout'];
    const pos = ['good', 'great', 'happy', 'solved', 'understood', 'confident', 'motivated', 'easy',
        'progress', 'awesome', 'amazing', 'excellent', 'perfect', 'clear', 'love', 'enjoy', 'excited',
        'better', 'improved', 'strong', 'ready', 'focused', 'calm', 'relaxed', 'proud'];
    let s = 0.5;
    neg.forEach(w => { if (l.includes(w)) s -= 0.15; });
    pos.forEach(w => { if (l.includes(w)) s += 0.12; });
    return Math.max(0, Math.min(1, s));
}

async function generateResponse(msg: string, sentiment: number): Promise<string> {
    const l = msg.toLowerCase();

    // Detect requested language
    let lang = 'en';
    if (l.includes('hindi') || l.includes('हिंदी')) lang = 'hi';
    else if (l.includes('telugu') || l.includes('తెలుగు')) lang = 'te';
    else if (l.includes('tamil') || l.includes('தமிழ்')) lang = 'ta';
    else if (l.includes('bengali') || l.includes('bangla') || l.includes('বাংলা')) lang = 'bn';
    else if (l.includes('marathi') || l.includes('मराठी')) lang = 'mr';
    else if (l.includes('gujarati') || l.includes('ગુજરાતી')) lang = 'gu';
    else if (l.includes('urdu') || l.includes('اردو')) lang = 'ur';
    else if (l.includes('kannada') || l.includes('ಕನ್ನಡ')) lang = 'kn';
    else if (l.includes('odia') || l.includes('ଓଡ଼ିଆ') || l.includes('ଓଡିଆ')) lang = 'or';
    else if (l.includes('malayalam') || l.includes('മലയാളം')) lang = 'ml';

    const getTopicText = (topic: string, def: string) => {
        if (lang !== 'en' && SaathiTranslations[lang] && SaathiTranslations[lang][topic]) {
            return SaathiTranslations[lang][topic];
        }
        return def;
    };

    // Check if the user is asking a specific database question
    try {
        const db = await getDatabase();
        const questions = await db.getAllAsync<{ question_text: string, solution_text: string, correct_answers: string }>(
            'SELECT question_text, solution_text, correct_answers FROM questions'
        );
        for (const q of questions) {
            const cleanQ = q.question_text.toLowerCase().replace(/\[.*?\]\s*/g, '').trim();
            const first40 = cleanQ.substring(0, 40);
            const userClean = l.trim();

            // Allow matching if the first 40 chars overlap significantly
            if (first40.length > 20 && (userClean.includes(first40) || cleanQ.includes(userClean.substring(0, 40)))) {
                let ansText = 'check options';
                try {
                    const ansArr = JSON.parse(q.correct_answers);
                    if (ansArr && ansArr.length > 0) ansText = ansArr[0];
                } catch (e) { }

                return `Here is the step-by-step solution! 🤖💡\n\n📝 **Question:**\n${q.question_text}\n\n✅ **Correct Answer:** ${ansText}\n\n🧠 **Solution Explanation:**\n${q.solution_text || 'Please apply standard concepts to solve this.'}`;
            }
        }
    } catch (e) { console.log('Saathi DB match err:', e); }

    // ============ MNEMONIC MODE — triggers the personalized flow ============
    if (l.includes('mnemonic') || l.includes('trick') || l.includes('shortcut') || l.includes('remember')
        || l.includes('memorize') || l.includes('memory trick') || l.includes('fun mode') || l.includes('pop culture')
        || l.includes('explain using') || l.includes('explain with')) {
        return '__MNEMONIC_START__';
    }

    // Stress / emotional support — highest priority
    if (sentiment < 0.45 || l.includes('stress') || l.includes('anxious') || l.includes('worried')
        || l.includes('scared') || l.includes('depress') || l.includes('panic') || l.includes('nervous')) {
        const r = [
            "I'm sorry you're carrying that right now. Stress can build up fast, especially when you've been juggling exams, projects, coding work, presentations, and everything else you've been handling recently.\n\nRight now, don't try to solve everything at once. Try this for the next 10 minutes:\n\n1. Put your phone/laptop down for 2 minutes.\n2. Take slow breaths:\n   • inhale for 4 seconds\n   • hold for 4\n   • exhale for 6\n3. Drink some water.\n4. Write down only 3 things that are actually urgent today.\n\nWhen stress gets high, the brain treats *everything* like an emergency. Making the list smaller helps regain control.\n\nAlso remember:\n\n• One bad exam/question/score does not define your future.\n• Feeling overwhelmed does not mean you're failing.\n• You've already handled difficult things before — research work, coding projects, presentations, and technical subjects. This feeling will pass too.\n\nIf you want, you can also tell me:\n\n• what's stressing you most right now (exam, marks, project, people, future, etc.)\n• or whether you want help calming down, planning tasks, or just venting.",
            "It sounds like things are feeling really heavy right now. I hear you. 🫂\n\nWhen the pressure of preparation mounts up, it's easy to feel lost. Let's take a step back and reset your mind.\n\nHere is a quick circuit breaker for your stress:\n\n1. Look around you and name 3 things you can see.\n2. Unclench your jaw and drop your shoulders. 🧘\n3. Splash some cold water on your face.\n4. Step outside or look out a window for 5 minutes.\n\nRight now, your mind is racing. Let's slow it down:\n\n• You don't need to finish the whole syllabus today.\n• Taking a break is not a waste of time; it's a necessary recharge.\n• Your mental health is far more important than any test score.\n\nWhen you're ready, try writing down exactly what's bothering you. Is it a specific subject? A pending deadline? Fear of the outcome?\nLet me know if you want to talk about it, or if you'd rather we do a fun Quiz or Pomodoro session to distract you!",
            "I can feel how overwhelmed you are, and I want you to know it's completely valid to feel this way. 💙\n\nThis is a marathon, and sometimes you just hit a wall. It happens to the absolute best of students.\n\nLet's try a quick 'Reset Protocol':\n\n1. 🛑 Stop studying for the next 15 minutes.\n2. 🎧 Put on your favorite instrumental or calming music.\n3. 📝 Do a \"Brain Dump\" — write down every single thing you're worried about on a blank piece of paper.\n4. 🗑️ Cross out everything that is out of your control.\n\nKeep these truths in mind:\n\n• A low score today is just feedback, not a final verdict.\n• Progress isn't always a straight line; setbacks are part of the process.\n• You have the resilience to get through this, just like you've overcome past challenges.\n\nWould you like to:\n\n• Just vent to me? I'm here to listen.\n• Plan a small, easy task to get your momentum back?\n• Do a quick breathing exercise?",
            "Take a deep breath. 🌬️ I'm here for you.\n\nIt is completely normal to feel burnt out and stressed when you're working so hard for a massive goal.\n\nLet's do a quick 'Grounding Exercise' to get you out of the stress loop:\n\n1. 🦶 Plant your feet firmly on the floor.\n2. 🌬️ Breathe in deeply for 4 seconds, hold for 4, exhale for 6. (Repeat this 3 times).\n3. 💧 Go drink a full glass of water.\n4. 🛌 Rest your eyes by looking at something 20 feet away for 20 seconds.\n\nRemember this:\n\n• The effort you are putting in right now is already making you stronger.\n• You don't have to be perfect; you just have to be consistent.\n• Give yourself permission to have a bad day. It's okay.\n\nWhat do you need right now?\n\n• We can map out a study plan for just the next 1 hour.\n• We can review a simple topic to build your confidence.\n• Or we can just talk about what's making you anxious. I'm all ears!"
        ];
        return r[Math.floor(Math.random() * r.length)];
    }

    // ============ PHYSICS SUB-TOPICS ============
    if (l.includes('kinematic') || l.includes('motion') || (l.includes('velocity') || l.includes('accelerat'))) {
        return getTopicText('kinematics', "📖 Kinematics — Study of Motion\n\n🔑 Key Equations:\n• v = u + at\n• s = ut + ½at²\n• v² = u² + 2as\n• s = ½(u+v)t\n\nWhere: u = initial velocity, v = final velocity, a = acceleration, t = time, s = displacement\n\n⚡ JEE Focus:\n• Relative motion problems\n• Projectile motion (split into x & y components)\n• Graphs: slope of x-t = velocity, slope of v-t = acceleration\n\n📌 To practice: Go to Subjects → Physics → Kinematics chapter for resources & PYQs!\n\n🎯 Most asked: Projectile at angle θ → time of flight = 2u·sinθ/g, Range = u²·sin2θ/g");
    }

    if (l.includes('newton') || l.includes('force') || l.includes('friction')) {
        return getTopicText('newton', "📖 Newton's Laws & Forces\n\n🔑 The Three Laws:\n1️⃣ Law of Inertia: Object stays at rest/motion unless acted on by net force\n2️⃣ F = ma (Force = mass × acceleration)\n3️⃣ Every action has equal & opposite reaction\n\n📐 Problem-Solving Strategy:\n1. Draw Free Body Diagram (FBD)\n2. Identify ALL forces (gravity, normal, friction, tension)\n3. Resolve forces into components\n4. Apply F = ma for each axis\n\n🔥 Friction: f = μN (static: f ≤ μₛN, kinetic: f = μₖN)\n\n📌 Go to Subjects → Physics → Laws of Motion for PYQs!\n\n💡 JEE Tip: ~15% questions come from Mechanics. Master FBDs!");
    }

    if (l.includes('energy') || l.includes('work') || l.includes('power') || l.includes('conservat')) {
        return getTopicText('work', "📖 Work, Energy & Power\n\n🔑 Key Formulas:\n• Work: W = F·d·cosθ\n• Kinetic Energy: KE = ½mv²\n• Potential Energy: PE = mgh (gravity), ½kx² (spring)\n• Power: P = W/t = F·v\n\n⚡ Work-Energy Theorem:\nNet work = Change in KE → W_net = ½mv² - ½mu²\n\n🔄 Conservation of Energy:\nTotal E = KE + PE = constant (in conservative systems)\n\n📐 JEE Strategy:\n• Always check if forces are conservative → use energy conservation\n• Non-conservative forces → use work-energy theorem\n\n📌 Go to Subjects → Physics → Work, Energy & Power for resources & PYQs!");
    }

    if (l.includes('electric') || l.includes('coulomb') || l.includes('charge') || l.includes('field')) {
        return getTopicText('electrostatics', "📖 Electrostatics\n\n🔑 Key Laws:\n• Coulomb's Law: F = kq₁q₂/r² (k = 9×10⁹ Nm²/C²)\n• Electric Field: E = F/q = kQ/r²\n• Electric Potential: V = kQ/r\n• Gauss's Law: Φ = q_enclosed/ε₀\n\n📐 Problem Strategy:\n1. For point charges → use Coulomb's law\n2. For symmetric distributions → use Gauss's law\n3. For conductors → E_inside = 0, charge on surface\n\n⚡ Capacitance: C = Q/V\n• Parallel plate: C = ε₀A/d\n• Series: 1/C = 1/C₁ + 1/C₂\n• Parallel: C = C₁ + C₂\n\n📌 Go to Subjects → Physics → Electrostatics for chapter resources & PYQs!");
    }

    if (l.includes('magnet') || l.includes('induct') || l.includes('faraday')) {
        return getTopicText('magnetism', "📖 Magnetism & Electromagnetic Induction\n\n🔑 Key Formulas:\n• Force on moving charge: F = qv×B (direction: right-hand rule)\n• Force on wire: F = BIL·sinθ\n• Biot-Savart Law: dB = μ₀/4π · Idl×r̂/r²\n• Faraday's Law: EMF = -dΦ/dt\n• Lenz's Law: Induced current opposes change\n\n📐 Strategy:\n• Use right-hand rule for force direction\n• Ampere's law for symmetric current distributions\n• Self-inductance: L = NΦ/I, EMF = -L·dI/dt\n\n📌 Go to Subjects → Physics → Magnetism for resources & PYQs!\n\n💡 JEE Tip: EMI + AC circuits = ~8% of paper. Very scoring!");
    }

    if (l.includes('optic') || l.includes('lens') || l.includes('mirror') || l.includes('refract') || l.includes('light')) {
        return getTopicText('optics', "📖 Optics\n\n🔑 Key Formulas:\n• Mirror: 1/v + 1/u = 1/f (sign convention!)\n• Lens: 1/v - 1/u = 1/f\n• Snell's Law: n₁sinθ₁ = n₂sinθ₂\n• Critical angle: sinC = n₂/n₁ (for total internal reflection)\n• Magnification: m = -v/u (mirror), m = v/u (lens)\n\n🌈 Wave Optics:\n• Young's double slit: fringe width β = λD/d\n• Diffraction: first minimum at sinθ = λ/a\n\n📐 Strategy: Always draw ray diagrams first!\n\n📌 Go to Subjects → Physics → Optics for resources & PYQs!");
    }

    if (l.includes('wave') || l.includes('oscillat') || l.includes('shm') || l.includes('pendulum')) {
        return getTopicText('waves', "📖 Waves & Oscillations (SHM)\n\n🔑 SHM Equations:\n• x = A·sin(ωt + φ)\n• v = Aω·cos(ωt + φ)\n• a = -ω²x\n• Time period: T = 2π/ω\n• Spring: T = 2π√(m/k)\n• Pendulum: T = 2π√(l/g)\n\n🌊 Wave Equation: v = fλ\n• Speed of sound: v = √(γP/ρ)\n• Doppler Effect: f' = f(v±v₀)/(v∓vₛ)\n\n📐 Remember: SHM is projection of uniform circular motion!\n\n📌 Go to Subjects → Physics → Waves & SHM for resources & PYQs!");
    }

    if (l.includes('thermo') || l.includes('heat') || l.includes('entropy') || l.includes('carnot')) {
        return getTopicText('thermo', "📖 Thermodynamics\n\n🔑 Laws:\n• 1st Law: ΔQ = ΔU + ΔW (energy conservation)\n• 2nd Law: Entropy always increases in isolated systems\n\n📐 Processes:\n• Isothermal (const T): W = nRT·ln(V₂/V₁)\n• Adiabatic (no heat): PVᵞ = const, TV^(γ-1) = const\n• Isobaric (const P): W = PΔV\n• Isochoric (const V): W = 0\n\n🔥 Carnot Efficiency: η = 1 - T_cold/T_hot\n\n💡 JEE Tip: Know Cp - Cv = R and γ = Cp/Cv\n\n📌 Go to Subjects → Physics → Thermodynamics for resources & PYQs!");
    }

    // General physics fallback
    if (l.includes('physics') || l.includes('mechanic') || l.includes('circuit') || l.includes('capacit')
        || l.includes('momentum') || l.includes('rotation') || l.includes('fluid') || l.includes('gravit')) {
        return getTopicText('fallback', "📖 Physics — Let's dive deeper! 🔬\n\nTell me the specific topic:\n• Mechanics: Kinematics, Newton's Laws, Work-Energy, Rotation\n• Electrodynamics: Electrostatics, Current, Magnetism, EMI\n• Waves & Optics: SHM, Wave Optics, Ray Optics\n• Thermodynamics & Modern Physics\n\n📐 Each topic in the Subjects → Physics section has:\n• 📖 Chapter notes & resources\n• 📝 Previous Year Questions (PYQs)\n• 🎯 Practice problems\n\nJust type the topic name and I'll explain the key concepts & formulas!");
    }

    // ============ CHEMISTRY SUB-TOPICS ============
    if (l.includes('organic') || l.includes('sn1') || l.includes('sn2') || l.includes('aldehyde')
        || l.includes('ketone') || l.includes('alcohol') || l.includes('amine') || l.includes('alkyl')
        || l.includes('aromatic') || l.includes('benzene') || l.includes('isomer')) {
        return getTopicText('organic', "📖 Organic Chemistry\n\n🔑 Core Mechanisms:\n• SN1: Tertiary substrate → carbocation → racemization\n• SN2: Primary substrate → backside attack → inversion\n• E1: Unimolecular elimination → Zaitsev's rule\n• E2: Bimolecular → anti-periplanar geometry\n\n📐 Key Reactions to Master:\n• Grignard (RMgX + carbonyl)\n• Aldol condensation\n• Cannizzaro reaction\n• Friedel-Crafts (alkylation/acylation)\n\n💡 Strategy: Don't memorize blindly — understand electron flow with curved arrows!\n\n📌 Go to Subjects → Chemistry → Organic chapters for resources & PYQs!\n\n🎯 ~28% of Chemistry paper is Organic. Very high weightage!");
    }

    if (l.includes('inorganic') || l.includes('periodic') || l.includes('coordination')
        || l.includes('metallurgy') || l.includes('salt') || l.includes('qualitative')) {
        return getTopicText('inorganic', "📖 Inorganic Chemistry\n\n🔑 Key Areas:\n• Periodic Properties: IE, EA, EN, atomic radius trends\n• Chemical Bonding: VSEPR theory, hybridization, MOT\n• Coordination Chemistry: CFT, isomerism, EAN rule\n• p-block: Group 15-18 reactions & compounds\n• d-block: Color, magnetic properties, variable oxidation states\n\n📐 Strategy:\n1. Learn periodic trends FIRST — they explain 60% of inorganic\n2. Make tables for p-block compounds & their properties\n3. Practice coordination complex naming\n\n📌 Go to Subjects → Chemistry → Inorganic chapters for resources & PYQs!\n\n💡 NCERT is GOLD for inorganic — read it cover to cover!");
    }

    if (l.includes('mole') || l.includes('stoich') || l.includes('equilibrium') || l.includes('ionic')
        || l.includes('electrode') || l.includes('electroch') || l.includes('kinetics') || l.includes('rate')) {
        return getTopicText('physical', "📖 Physical Chemistry\n\n🔑 Must-Know Formulas:\n• Mole concept: n = mass/molar mass = PV/RT (ideal gas)\n• Equilibrium: Kc = [products]/[reactants], ΔG = -RT·lnK\n• Electrochemistry: E°cell = E°cathode - E°anode\n  Nernst: E = E° - (RT/nF)·lnQ\n• Kinetics: Rate = k[A]ⁿ, t½ = 0.693/k (first order)\n\n📐 Strategy:\n• Physical Chem is MOST scoring — pure formula application\n• Practice numerical problems daily\n• Master dimensional analysis for checking answers\n\n📌 Go to Subjects → Chemistry for chapter-wise resources & PYQs!\n\n🎯 Physical Chem = ~35% of Chemistry paper!");
    }

    // General chemistry fallback
    if (l.includes('chemistry') || l.includes('reaction') || l.includes('bond') || l.includes('acid')
        || l.includes('base') || l.includes('atom') || l.includes('compound') || l.includes('element')
        || l.includes('solution') || l.includes('polymer') || l.includes('oxidat')) {
        return getTopicText('fallback', "📖 Chemistry — Let me help! 🧪\n\nWhich branch?\n• 🧬 Organic: Reactions, mechanisms, named reactions\n• ⚛️ Inorganic: Periodic table, coordination, p-block, d-block\n• 🔢 Physical: Mole concept, equilibrium, kinetics, electrochemistry\n\n📌 Each topic in Subjects → Chemistry has:\n• 📖 Chapter notes & resources\n• 📝 PYQs with solutions\n• 🎯 Practice problems\n\nType the specific topic (e.g., 'organic reactions', 'equilibrium') for a detailed explanation!");
    }

    // ============ MATH SUB-TOPICS ============
    if (l.includes('calculus') || l.includes('integral') || l.includes('differen') || l.includes('limit')
        || l.includes('continu') || l.includes('derivative')) {
        return getTopicText('calculus', "📖 Calculus\n\n🔑 Differentiation Rules:\n• Power: d/dx(xⁿ) = nxⁿ⁻¹\n• Chain: d/dx[f(g(x))] = f'(g(x))·g'(x)\n• Product: d/dx(uv) = u'v + uv'\n• Quotient: d/dx(u/v) = (u'v - uv')/v²\n\n🔑 Integration Techniques:\n1. Substitution: ∫f(g(x))g'(x)dx\n2. By Parts: ∫udv = uv - ∫vdu (LIATE rule)\n3. Partial Fractions: for rational functions\n\n📐 Key Results:\n• ∫sinx dx = -cosx + C\n• ∫eˣ dx = eˣ + C\n• ∫1/x dx = ln|x| + C\n\n📌 Go to Subjects → Mathematics → Calculus for resources & PYQs!\n\n🎯 Calculus = ~20% of JEE Math. Very important!");
    }

    if (l.includes('algebra') || l.includes('quadrat') || l.includes('complex') || l.includes('polynom')
        || l.includes('matrix') || l.includes('matrices') || l.includes('determinant') || l.includes('binomial')) {
        return getTopicText('algebra', "📖 Algebra\n\n🔑 Quadratic: ax² + bx + c = 0\n• Roots: x = (-b ± √(b²-4ac)) / 2a\n• Discriminant: D > 0 (real), D = 0 (equal), D < 0 (complex)\n• Sum of roots: -b/a, Product: c/a\n\n🔑 Complex Numbers:\n• z = a + ib, |z| = √(a²+b²)\n• Euler: e^(iθ) = cosθ + isinθ\n• De Moivre: (cosθ + isinθ)ⁿ = cos(nθ) + isin(nθ)\n\n📊 Matrices:\n• |AB| = |A|·|B|\n• A·A⁻¹ = I (inverse exists when |A| ≠ 0)\n\n📌 Go to Subjects → Mathematics → Algebra for resources & PYQs!\n\n💡 JEE Tip: Complex numbers + quadratics = most asked algebra topics!");
    }

    if (l.includes('trigono') || l.includes('sine') || l.includes('cosine') || l.includes('tan')) {
        return getTopicText('trigonometry', "📖 Trigonometry\n\n🔑 Key Identities:\n• sin²θ + cos²θ = 1\n• 1 + tan²θ = sec²θ\n• sin(A±B) = sinA·cosB ± cosA·sinB\n• cos(A±B) = cosA·cosB ∓ sinA·sinB\n• sin2A = 2sinA·cosA\n• cos2A = cos²A - sin²A = 2cos²A - 1\n\n📐 Triangle formulas:\n• Sine rule: a/sinA = b/sinB = c/sinC = 2R\n• Cosine rule: c² = a² + b² - 2ab·cosC\n\n💡 Strategy: Convert everything to sin & cos first!\n\n📌 Go to Subjects → Mathematics → Trigonometry for resources & PYQs!");
    }

    if (l.includes('coordinate') || l.includes('conic') || l.includes('parabola') || l.includes('ellipse')
        || l.includes('hyperbola') || l.includes('circle') || l.includes('straight line')) {
        return getTopicText('coordinate', "📖 Coordinate Geometry & Conics\n\n🔑 Straight Line: y - y₁ = m(x - x₁)\n• Distance: d = |ax₁+by₁+c| / √(a²+b²)\n\n⭕ Circle: x² + y² + 2gx + 2fy + c = 0\n• Center: (-g, -f), Radius: √(g²+f²-c)\n\n🔑 Conics (standard forms):\n• Parabola: y² = 4ax → Focus (a,0), Directrix x = -a\n• Ellipse: x²/a² + y²/b² = 1 → e = √(1-b²/a²)\n• Hyperbola: x²/a² - y²/b² = 1 → e = √(1+b²/a²)\n\n📐 Strategy: Always sketch the curve first!\n\n📌 Go to Subjects → Mathematics → Coordinate Geometry for PYQs!\n\n🎯 Conics carry very high weightage in JEE!");
    }

    if (l.includes('probab') || l.includes('permut') || l.includes('combinat') || l.includes('p&c')
        || l.includes('pnc') || l.includes('bayes')) {
        return getTopicText('probability', "📖 Probability & Combinatorics\n\n🔑 Permutations & Combinations:\n• nPr = n!/(n-r)! (order matters)\n• nCr = n!/[r!(n-r)!] (order doesn't matter)\n\n🎲 Probability:\n• P(A) = favorable outcomes / total outcomes\n• P(A∪B) = P(A) + P(B) - P(A∩B)\n• P(A|B) = P(A∩B)/P(B) (conditional)\n• Bayes: P(A|B) = P(B|A)·P(A) / P(B)\n\n📐 Distributions:\n• Binomial: P(x=r) = nCr · p^r · q^(n-r)\n\n📌 Go to Subjects → Mathematics → Probability for resources & PYQs!\n\n💡 Draw tree diagrams for conditional probability — makes it visual!");
    }

    if (l.includes('vector') || l.includes('3d') || l.includes('three dim') || l.includes('plane')) {
        return getTopicText('vectors', "📖 Vectors & 3D Geometry\n\n🔑 Vector Operations:\n• Dot product: a·b = |a||b|cosθ (gives scalar)\n• Cross product: a×b = |a||b|sinθ·n̂ (gives vector)\n• a·b = a₁b₁ + a₂b₂ + a₃b₃\n\n📐 3D Geometry:\n• Direction cosines: l² + m² + n² = 1\n• Line: (x-x₁)/a = (y-y₁)/b = (z-z₁)/c\n• Plane: ax + by + cz = d\n• Distance from point to plane: |ax₁+by₁+cz₁-d| / √(a²+b²+c²)\n\n📌 Go to Subjects → Mathematics → Vectors & 3D for PYQs!\n\n💡 Cross product direction → right-hand rule!");
    }

    // General math fallback
    if (l.includes('math') || l.includes('sequence') || l.includes('function') || l.includes('equation')
        || l.includes('geometry')) {
        return getTopicText('fallback', "📖 Mathematics — Let's solve it! 📐\n\nWhich area?\n• 📊 Algebra: Quadratics, Complex Numbers, Matrices\n• 📈 Calculus: Limits, Differentiation, Integration\n• 📐 Coordinate: Lines, Circles, Conics\n• 🔺 Trigonometry: Identities, Equations\n• 🎲 Probability & Combinatorics\n• ➡️ Vectors & 3D Geometry\n\n📌 Each topic in the Subjects → Math section has:\n• 📖 Chapter notes & learning resources\n• 📝 PYQs with step-by-step solutions  \n\nType the specific topic for a detailed explanation with formulas!");
    }

    // ============ MULTILINGUAL SUPPORT ============
    // Query about supported languages
    if (l.includes('language') || l.includes('languages')) {
        return "🌐 I support multiple languages!\n\nYou can ask me questions in:\n• 🇬🇧 English\n• 🇮🇳 Hindi (हिंदी)\n• 🇮🇳 Bengali (বাংলা)\n• 🇮🇳 Marathi (मराठी)\n• 🇮🇳 Telugu (తెలుగు)\n• 🇮🇳 Tamil (தமிழ்)\n• 🇮🇳 Gujarati (ગુજરાતી)\n• 🇮🇳 Urdu (اردو)\n• 🇮🇳 Kannada (ಕನ್ನಡ)\n• 🇮🇳 Odia (ଓଡ଼ିଆ)\n• 🇮🇳 Malayalam (മലയാളം)\n\nJust type your question in your preferred language, or say 'Explain [topic] in [language]'!";
    }
    // Hindi
    if (l.includes('hindi') || l.includes('हिंदी') || l.includes('हिन्दी') || l.includes('बात')
        || l.includes('समझ') || l.includes('मदद') || l.includes('कैसे') || l.includes('क्या')) {
        return "बिल्कुल! मैं हिंदी में मदद कर सकता हूं 🇮🇳\n\nआप किस विषय में doubt पूछना चाहते हैं?\n• ⚛️ Physics (भौतिकी)\n• 🧪 Chemistry (रसायन)\n• 📐 Mathematics (गणित)\n\n📌 Resources और PYQs के लिए:\nSubjects tab → अपना विषय चुनें → Chapter खोलें\n\n🧠 Mnemonics: \"मुझे [topic] समझाओ [movie/game] से\" बोलो!\n\nबेझिझक पूछिए! 😊";
    }
    // Bengali
    if (l.includes('bengali') || l.includes('bangla') || l.includes('বাংলা') || l.includes('কিভাবে') || l.includes('সাহায্য')) {
        return "অবশ্যই! আমি বাংলায় সাহায্য করতে পারি 🇮🇳\n\nআপনি কোন বিষয়ে doubt জিজ্ঞাসা করতে চান?\n• ⚛️ Physics (পদার্থবিদ্যা)\n• 🧪 Chemistry (রসায়ন)\n• 📐 Mathematics (গণিত)\n\n📌 Subjects tab → বিষয় নির্বাচন → Chapter খুলুন\n\nনির্দ্বিধায় জিজ্ঞাসা করুন! 😊";
    }
    // Marathi
    if (l.includes('marathi') || l.includes('मराठी') || l.includes('कसे') || l.includes('मदत')) {
        return "नक्कीच! मी मराठीत मदत करू शकतो 🇮🇳\n\nतुम्हाला कोणत्या विषयात doubt विचारायचा आहे?\n• ⚛️ Physics (भौतिकशास्त्र)\n• 🧪 Chemistry (रसायनशास्त्र)\n• 📐 Mathematics (गणित)\n\n📌 Subjects tab → विषय निवडा → Chapter उघडा\n\nमोकळेपणाने विचारा! 😊";
    }
    // Telugu
    if (l.includes('telugu') || l.includes('తెలుగు') || l.includes('ఎలా') || l.includes('సహాయం')) {
        return "తప్పకుండా! నేను తెలుగులో సహాయం చేయగలను 🇮🇳\n\nమీరు ఏ సబ్జెక్ట్‌లో doubt అడగాలనుకుంటున్నారు?\n• ⚛️ Physics (భౌతిక శాస్త్రం)\n• 🧪 Chemistry (రసాయన శాస్త్రం)\n• 📐 Mathematics (గణితం)\n\n📌 Subjects tab → సబ్జెక్ట్ ఎంచుకోండి → Chapter తెరవండి\n\nధైర్యంగా అడగండి! 😊";
    }
    // Tamil
    if (l.includes('tamil') || l.includes('தமிழ்') || l.includes('எப்படி') || l.includes('உதவி')) {
        return "நிச்சயமாக! நான் தமிழில் உதவ முடியும் 🇮🇳\n\nஎந்த பாடத்தில் doubt கேட்க விரும்புகிறீர்கள்?\n• ⚛️ Physics (இயற்பியல்)\n• 🧪 Chemistry (வேதியியல்)\n• 📐 Mathematics (கணிதம்)\n\n📌 Subjects tab → பாடம் தேர்வு → Chapter திறக்கவும்\n\nதைரியமாக கேளுங்கள்! 😊";
    }
    // Gujarati
    if (l.includes('gujarati') || l.includes('ગુજરાતી') || l.includes('કેમ') || l.includes('મદદ')) {
        return "ચોક્કસ! હું ગુજરાતીમાં મદદ કરી શકું છું 🇮🇳\n\nતમારે કયા વિષયમાં doubt પૂછવો છે?\n• ⚛️ Physics (ભૌતિકવિજ્ઞાન)\n• 🧪 Chemistry (રસાયણવિજ્ઞાન)\n• 📐 Mathematics (ગણિત)\n\n📌 Subjects tab → વિષય પસંદ કરો → Chapter ખોલો\n\nનિઃસંકોચ પૂછો! 😊";
    }
    // Urdu
    if (l.includes('urdu') || l.includes('اردو') || l.includes('کیسے') || l.includes('مدد')) {
        return "بالکل! میں اردو میں مدد کر سکتا ہوں 🇮🇳\n\nآپ کس مضمون میں doubt پوچھنا چاہتے ہیں؟\n• ⚛️ Physics (طبیعیات)\n• 🧪 Chemistry (کیمسٹری)\n• 📐 Mathematics (ریاضی)\n\n📌 Subjects tab → مضمون منتخب کریں → Chapter کھولیں\n\nبلا جھجھک پوچھیں! 😊";
    }
    // Kannada
    if (l.includes('kannada') || l.includes('ಕನ್ನಡ') || l.includes('ಹೇಗೆ') || l.includes('ಸಹಾಯ')) {
        return "ಖಂಡಿತ! ನಾನು ಕನ್ನಡದಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ 🇮🇳\n\nನೀವು ಯಾವ ವಿಷಯದಲ್ಲಿ doubt ಕೇಳಲು ಬಯಸುತ್ತೀರಿ?\n• ⚛️ Physics (ಭೌತಶಾಸ್ತ್ರ)\n• 🧪 Chemistry (ರಸಾಯನಶಾಸ್ತ್ರ)\n• 📐 Mathematics (ಗಣಿತ)\n\n📌 Subjects tab → ವಿಷಯ ಆಯ್ಕೆಮಾಡಿ → Chapter ತೆರೆಯಿರಿ\n\nಮುಕ್ತವಾಗಿ ಕೇಳಿ! 😊";
    }
    // Odia
    if (l.includes('odia') || l.includes('ଓଡିଆ') || l.includes('ଓଡ଼ିଆ') || l.includes('କିପରି') || l.includes('ସାହାଯ୍ୟ')) {
        return "ନିଶ୍ଚିତ! ମୁଁ ଓଡ଼ିଆରେ ସାହାଯ୍ୟ କରିପାରିବି 🇮🇳\n\nଆପଣ କେଉଁ ବିଷୟରେ doubt ପଚାରିବାକୁ ଚାହୁଁଛନ୍ତି?\n• ⚛️ Physics (ପଦାର୍ଥ ବିଜ୍ଞାନ)\n• 🧪 Chemistry (ରସାୟନ ବିଜ୍ଞାନ)\n• 📐 Mathematics (ଗଣିତ)\n\n📌 Subjects tab → ବିଷୟ ବାଛନ୍ତୁ → Chapter ଖୋଲନ୍ତୁ\n\nନିର୍ଭୟରେ ପଚାରନ୍ତୁ! 😊";
    }
    // Malayalam
    if (l.includes('malayalam') || l.includes('മലയാളം') || l.includes('എങ്ങനെ') || l.includes('സഹായം')) {
        return "തീർച്ചയായും! എനിക്ക് മലയാളത്തിൽ സഹായിക്കാൻ കഴിയും 🇮🇳\n\nഏത് വിഷയത്തിലാണ് നിങ്ങൾ doubt ചോദിക്കാൻ ആഗ്രഹിക്കുന്നത്?\n• ⚛️ Physics (ഭൗതികശാസ്ത്രം)\n• 🧪 Chemistry (രസതന്ത്രം)\n• 📐 Mathematics (ഗണിതം)\n\n📌 Subjects tab → വിഷയം തിരഞ്ഞെടുക്കുക → Chapter തുറക്കുക\n\nധൈര്യമായി ചോദിക്കൂ! 😊";
    }

    // Resources / PYQ specific questions
    if (l.includes('resource') || l.includes('pyq') || l.includes('previous year') || l.includes('material')
        || l.includes('notes') || l.includes('book') || l.includes('download') || l.includes('where')) {
        return "📚 How to Access Resources & PYQs:\n\n1️⃣ Go to the Subjects tab (bottom bar)\n2️⃣ Tap on Physics / Chemistry / Mathematics\n3️⃣ Select the Unit → then the Chapter\n4️⃣ Inside each chapter you'll find:\n   • 📖 Chapter notes & key formulas\n   • 📝 Previous Year Questions (PYQs)\n   • 🎯 Each PYQ shows year, marks & solution\n\n🧪 For Mock Tests:\n• Go to Tests tab → Start a test\n• Tests are auto-generated from PYQ database\n• Works 100% offline!\n\n💡 Tip: Start with PYQs — they show exactly what JEE asks!";
    }

    // Study plan / strategy
    if (l.includes('study') || l.includes('plan') || l.includes('schedule') || l.includes('routine')
        || l.includes('prepare') || l.includes('strategy') || l.includes('revision') || l.includes('tips')) {
        return "Study strategy 📚\n\nProven JEE plan:\n1. ⏰ 2-hour focused blocks + 15-min breaks\n2. 🧠 Active recall — close book, write from memory\n3. 🔄 Spaced repetition — revise after 1, 3, 7 days\n4. 📝 Solve 5+ PYQs daily per subject\n5. 🎯 Weak topics in morning, revision at night\n\n📌 Use this app to practice:\n• Subjects → any chapter → PYQs section\n• Tests → Mock Tests for exam simulation\n\n💡 Pomodoro (25m study + 5m break) builds focus fast!";
    }

    // Greetings (Gamification-enhanced)
    if (l.includes('hello') || l.includes('hi ') || l.includes('hey') || l.includes('namaste')
        || l.includes('morning') || l.includes('evening') || l === 'hi') {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        return `${timeGreeting}! 🙏 Great to see you!\n\nI can help with:\n• 📚 Explain any Physics/Chemistry/Math concept\n• 🧘 Stress management & motivation\n• 📋 Study planning & strategy\n• ⏱️ Pomodoro timer (say \"start pomodoro\")\n• 🃏 Flash quiz (say \"quiz me\")\n• 📝 Guide you to PYQs & resources\n• 🗣 Hindi support\n\nJust type a topic like 'Kinematics', 'Organic Chemistry', or 'Calculus' — I'll explain the concept with formulas! 💪`;
    }

    // Pomodoro Timer
    if (l.includes('pomodoro') || l.includes('timer') || l.includes('focus mode') || l.includes('25 min')) {
        return "⏱️ Pomodoro Study Timer\n\n🍅 The Technique:\n1. 📚 Study for 25 minutes (ONE topic only)\n2. ☕ Break for 5 minutes\n3. 🔄 Repeat 4 times\n4. 🎉 Take a 15-min break after 4 rounds\n\n📌 For your session now:\n1. Pick your weakest topic from the Focus Today card on Home\n2. Set a 25-min timer on your phone\n3. Solve PYQs from that chapter\n4. Come back and tell me how it went!\n\n💡 Pro tip: Put your phone on DND (except this app 😄)\n\nReady? Go to Subjects → pick your chapter → START! 🚀";
    }

    // Quiz Me / Flashcard
    if (l.includes('quiz me') || l.includes('flash') || l.includes('test me') || l.includes('random question')) {
        try {
            const db = await getDatabase();
            const allQs = await db.getAllAsync<any>('SELECT * FROM questions');
            // Fisher-Yates shuffle for true randomness
            const shuffled = [...allQs];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const qs = shuffled.slice(0, 5);
            if (qs.length > 0) {
                let quizText = '🃏 Flash Quiz (5 Questions)!\n\n';
                
                for (let i = 0; i < qs.length; i++) {
                    const q = qs[i];
                    const opts = q.options ? JSON.parse(q.options) : null;
                    let optsText = '';
                    if (opts && Array.isArray(opts) && opts[0] !== null) {
                        optsText = '\n\n' + opts.join('\n');
                    }
                    quizText += `📝 Q${i + 1}: ${q.question_text}${optsText}\n\n---\n\n`;
                }
                
                quizText += `⏰ Take your time! Tap "Show Answers" or scroll below 👇\n\n`;
                
                let answersText2 = `✅ Answers:\n\n`;
                for (let i = 0; i < qs.length; i++) {
                    const q = qs[i];
                    const ans = q.correct_answers ? JSON.parse(q.correct_answers)[0] : '';
                    answersText2 += `Q${i + 1}: ${ans}\n📖 ${q.solution_text || 'Apply standard concepts!'}\n\n`;
                }
                answersText2 += `+50 XP for practicing! Type "quiz me" for another round! 🎯`;
                return '__QUIZ_SPLIT__' + quizText + '__QUIZ_ANSWERS__' + answersText2;
            }
        } catch(e) {}
        return "Let me find some questions for you... Try going to Tests tab for a structured quiz! 📝";
    }

    // Default
    return "I can explain any JEE concept in detail! 🤔\n\nTry asking about:\n• Physics: 'Kinematics', 'Newton's Laws', 'Electrostatics', 'Optics'\n• Chemistry: 'Organic reactions', 'Equilibrium', 'Periodic table'\n• Math: 'Calculus', 'Trigonometry', 'Conics', 'Vectors'\n• ⏱️ 'Start pomodoro' for focused study\n• 🃏 'Quiz me' for a flash question\n\n📌 For resources & PYQs:\nGo to Subjects tab → choose chapter → find notes & PYQs!\n\nType any topic name and I'll explain it with key formulas! 💪";
}

export default function SaathiScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { stressLevel, setStressLevel, userEmail, currentStreak, currentXP, currentLevel } = useAppStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [showMindfulness, setShowMindfulness] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    // Mnemonic personalization flow state
    const [mnemonicStep, setMnemonicStep] = useState<'idle'|'pick_category'|'pick_favorite'|'pick_topic'>('idle');
    const [mnemonicCategory, setMnemonicCategory] = useState('');
    const [mnemonicFavorite, setMnemonicFavorite] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [pendingAnswers, setPendingAnswers] = useState<string | null>(null);

    useEffect(() => { loadMessages(); }, []);

    async function loadMessages() {
        try {
            const db = await getDatabase();
            const saved = await db.getAllAsync<ChatMessage>(
                'SELECT * FROM chat_messages WHERE user_email = ? ORDER BY timestamp ASC LIMIT 50',
                [userEmail]
            );
            if (saved.length === 0) {
                const welcome: ChatMessage = {
                    id: generateId(), role: 'assistant',
                    content: "Namaste! I'm Saathi 🙏 — your offline AI study companion.\n\n• 📚 Subject doubts (Physics, Chemistry, Math)\n• 🎮 Pop-culture mnemonics (Cricket, Avengers, Games!)\n• 🌐 Hindi, Tamil, Telugu, Bengali, Marathi support\n• 🧘 Stress management & motivation\n• ⏱️ Pomodoro timer & Flash quizzes\n\nHow are you feeling today?",
                    timestamp: new Date().toISOString()
                };
                setMessages([welcome]);
                await db.runAsync('INSERT INTO chat_messages (id,role,content,timestamp,user_email) VALUES (?,?,?,?,?)',
                    [welcome.id, welcome.role, welcome.content, welcome.timestamp, userEmail]);
            } else setMessages(saved);
        } catch (e) { console.log('Load err:', e); }
    }

    async function handleSend() {
        if (!inputText.trim() && !selectedImage) return;
        const capturedInput = inputText.trim(); // capture BEFORE clearing
        const sentiment = analyzeSentiment(capturedInput);
        setStressLevel(sentiment);
        const hasImage = !!selectedImage;
        const userMsg: ChatMessage = {
            id: generateId(), role: 'user',
            content: hasImage ? (capturedInput || '🖼️ [Image uploaded]') : capturedInput,
            timestamp: new Date().toISOString(), sentiment_score: sentiment,
            imageUri: selectedImage || undefined,
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setSelectedImage(null);
        try {
            const db = await getDatabase();
            await db.runAsync('INSERT INTO chat_messages (id,role,content,sentiment_score,timestamp,user_email) VALUES (?,?,?,?,?,?)',
                [userMsg.id, userMsg.role, userMsg.content, userMsg.sentiment_score!, userMsg.timestamp, userEmail]);
        } catch (e) { }

        if (sentiment < 0.25) {
            setShowMindfulness(true);
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }

        // ─── Mnemonic Flow Handler ───
        function handleMnemonicFlow(input: string): string {
            const il = input.toLowerCase().trim();
            const CATS: Record<string, { e: string; f: string[] }> = {
                'cricket': { e: '🏏', f: ['Virat Kohli','MS Dhoni','Sachin Tendulkar','Jasprit Bumrah','IPL'] },
                'movies': { e: '🎬', f: ['Avengers/Marvel','Harry Potter','Interstellar','KGF','3 Idiots'] },
                'games': { e: '🎮', f: ['Minecraft','Valorant/PUBG','GTA','FIFA','Chess'] },
                'anime': { e: '🎌', f: ['Naruto','Dragon Ball Z','One Piece','Attack on Titan','Death Note'] },
                'memes': { e: '😂', f: ['Dank Memes','Bollywood Memes','Science Memes','Reddit','Twitter'] },
            };
            const TP = [
                'Kinematics','Newton\'s Laws','Work Energy & Power','Rotational Motion','Gravitation',
                'Thermodynamics','SHM & Waves','Electrostatics','Current Electricity','Magnetism & EMI',
                'Optics','Modern Physics',
                'Mole Concept','Atomic Structure','Chemical Thermo','Equilibrium','Chemical Kinetics',
                'Electrochemistry','Organic Chemistry','Inorganic Chemistry',
                'Algebra','Sequences & Series','Matrices','Calculus','Coordinate Geometry',
                'Trigonometry','Vectors & 3D','Probability'
            ];

            if (mnemonicStep === 'pick_category') {
                let c = '';
                if (il.includes('1')||il.includes('cricket')||il.includes('sport')) c='cricket';
                else if (il.includes('2')||il.includes('movie')||il.includes('series')||il.includes('tv')) c='movies';
                else if (il.includes('3')||il.includes('game')||il.includes('video')) c='games';
                else if (il.includes('4')||il.includes('anime')||il.includes('manga')) c='anime';
                else if (il.includes('5')||il.includes('meme')||il.includes('internet')) c='memes';
                if (!c) return 'Pick 1-5:\n1️⃣ 🏏 Cricket\n2️⃣ 🎬 Movies\n3️⃣ 🎮 Games\n4️⃣ 🎌 Anime\n5️⃣ 😂 Memes';
                setMnemonicCategory(c); setMnemonicStep('pick_favorite');
                const ci = CATS[c];
                return `${ci.e} ${c.charAt(0).toUpperCase()+c.slice(1)}! Nice!\n\nWho/what is your FAVORITE? 🤩\n\n${ci.f.map((x,j)=>`${j+1}️⃣ ${x}`).join('\n')}\n\nType number or your own!`;
            }
            if (mnemonicStep === 'pick_favorite') {
                const ci = CATS[mnemonicCategory]||CATS['movies'];
                let fv = input.trim();
                const n = parseInt(il);
                if (n>=1&&n<=ci.f.length) fv = ci.f[n-1];
                setMnemonicFavorite(fv); setMnemonicStep('pick_topic');
                try { gamificationService.saveSaathiMemory(userEmail,'mnemonic_fav',fv); } catch{}
                const phyTopics = TP.slice(0,12).map((t,j)=>`${j+1}️⃣ ${t}`).join('\n');
                const chemTopics = TP.slice(12,20).map((t,j)=>`${j+13}️⃣ ${t}`).join('\n');
                const mathTopics = TP.slice(20).map((t,j)=>`${j+21}️⃣ ${t}`).join('\n');
                return `🔥 ${fv} — love it!\n\nWhich JEE topic to explain using ${fv}?\n\n⚛️ PHYSICS:\n${phyTopics}\n\n🧪 CHEMISTRY:\n${chemTopics}\n\n📐 MATH:\n${mathTopics}\n\nType number or topic name!`;
            }
            if (mnemonicStep === 'pick_topic') {
                let ti = parseInt(il)-1;
                if (ti<0||ti>=TP.length) {
                    const keys = ['kinematic','newton','work','rotat','gravit','thermo','shm','electrostatic','current','magnet','optic','modern','mole','atomic','chem thermo','equilib','kinetic','electrochem','organic','inorganic','algebra','sequence','matri','calcul','coordin','trigo','vector','probab'];
                    ti = keys.findIndex(k=>il.includes(k.substring(0,4)));
                    if (ti<0&&(il.includes('force')||il.includes('law'))) ti=1;
                    if (ti<0&&il.includes('motion')) ti=0;
                    if (ti<0&&il.includes('wave')) ti=6;
                    if (ti<0&&il.includes('energy')||il.includes('power')) ti=2;
                    if (ti<0&&il.includes('conic')||il.includes('circle')||il.includes('parabola')) ti=24;
                }
                if (ti<0||ti>=TP.length) return `Pick 1-${TP.length}:\n${TP.map((t,j)=>`${j+1}️⃣ ${t}`).join('\n')}`;
                setMnemonicStep('idle');
                return bldM(TP[ti], mnemonicFavorite, mnemonicCategory);
            }
            setMnemonicStep('idle');
            return 'Type "mnemonic" to restart! 🎮';
        }

        function bldM(tp: string, fav: string, cat: string): string {
            return buildMnemonic(tp, fav, cat);
        }

        setTimeout(async () => {
            let resp: string;

            // ─── Personalized Mnemonic Flow ───
            if (mnemonicStep !== 'idle') {
                resp = handleMnemonicFlow(capturedInput);
            } else {
                resp = await generateResponse(capturedInput, sentiment);
                // If generateResponse triggered mnemonic start, begin the flow
                if (resp === '__MNEMONIC_START__') {
                    setMnemonicStep('pick_category');
                    resp = `🎮 Personalized Mnemonic Mode!\n\nI'll explain JEE concepts using YOUR favorite references!\n\nFirst, what do you enjoy most?\n\n1️⃣ 🏏 Cricket / Sports\n2️⃣ 🎬 Movies / TV Series\n3️⃣ 🎮 Video Games\n4️⃣ 🎌 Anime / Manga\n5️⃣ 😂 Memes / Internet Culture\n\nJust type the number or name! 👆`;
                }
            }

            // Handle quiz: show questions first, answers appear as separate message after 8s
            if (resp.startsWith('__QUIZ_SPLIT__')) {
                const parts = resp.replace('__QUIZ_SPLIT__', '').split('__QUIZ_ANSWERS__');
                const questionsText = parts[0] || '';
                const answersText = parts[1] || '';
                const questionsMsg: ChatMessage = { id: generateId(), role: 'assistant', content: questionsText, timestamp: new Date().toISOString() };
                setMessages(prev => [...prev, questionsMsg]);
                setPendingAnswers(answersText);
                try {
                    const db2 = await getDatabase();
                    await db2.runAsync('INSERT INTO chat_messages (id,role,content,timestamp,user_email) VALUES (?,?,?,?,?)',
                        [questionsMsg.id, questionsMsg.role, questionsMsg.content, questionsMsg.timestamp, userEmail]);
                } catch (e) { }
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                return;
            }

            const botMsg: ChatMessage = { id: generateId(), role: 'assistant', content: resp, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, botMsg]);
            try {
                const db = await getDatabase();
                await db.runAsync('INSERT INTO chat_messages (id,role,content,timestamp,user_email) VALUES (?,?,?,?,?)',
                    [botMsg.id, botMsg.role, botMsg.content, botMsg.timestamp, userEmail]);
            } catch (e) { }

            // Sprint 9: Memory — extract key facts from user messages
            try {
                const lower = capturedInput.toLowerCase();
                if (lower.includes('struggle') || lower.includes('weak') || lower.includes('difficult') || lower.includes('hard')) {
                    const topics = ['kinematics', 'newton', 'shm', 'optics', 'electrostatics', 'organic', 'inorganic',
                        'calculus', 'trigonometry', 'algebra', 'vectors', 'probability', 'thermodynamics', 'magnetism'];
                    for (const t of topics) {
                        if (lower.includes(t)) {
                            await gamificationService.saveSaathiMemory(userEmail, 'struggle_topic', t);
                            break;
                        }
                    }
                }
                // Award XP for chatting
                await gamificationService.awardXP(userEmail, 'saathi_chat', 5);
            } catch(e) {}

            scrollRef.current?.scrollToEnd({ animated: true });
        }, 800);
        scrollRef.current?.scrollToEnd({ animated: true });
    }

    // Image Upload Handler
    async function handleImageUpload() {
        if (Platform.OS === 'web') {
            (fileInputRef.current as any)?.click();
        } else {
            // Native: Use expo-image-picker if available
            try {
                const ImagePicker = require('expo-image-picker');
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    base64: true,
                });
                if (!result.canceled && result.assets[0]) {
                    setSelectedImage(result.assets[0].uri);
                }
            } catch {
                // expo-image-picker not installed, show message
                const msg: ChatMessage = {
                    id: generateId(), role: 'assistant',
                    content: '📷 Image upload is available on web! On mobile, use the camera button for OCR or type your question directly.',
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, msg]);
            }
        }
    }

    // Sprint 3: OCR Camera Handler
    async function handleOCR() {
        // Add a user message showing they tapped the camera
        const userMsg: ChatMessage = {
            id: generateId(), role: 'user', content: '📷 Snap a Problem',
            timestamp: new Date().toISOString(), sentiment_score: 0.5
        };
        setMessages(prev => [...prev, userMsg]);

        // Process through OCR service (stub)
        try {
            const ocrResult = await ocrService.processImage('camera://capture');
            const matches = await ocrService.searchKnowledgeBase(ocrResult.rawText);
            const responseText = ocrService.formatForChat(ocrResult, matches);

            const botMsg: ChatMessage = {
                id: generateId(), role: 'assistant', content: responseText,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);

            try {
                const db = await getDatabase();
                await db.runAsync('INSERT INTO chat_messages (id,role,content,timestamp,user_email) VALUES (?,?,?,?,?)',
                    [botMsg.id, botMsg.role, botMsg.content, botMsg.timestamp, userEmail]);
            } catch (e) { }
        } catch (e) {
            const errMsg: ChatMessage = {
                id: generateId(), role: 'assistant',
                content: "📷 Camera module isn't available right now. Try typing your question instead! 😊",
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errMsg]);
        }
        scrollRef.current?.scrollToEnd({ animated: true });
    }

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
            {showMindfulness && (
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <View style={styles.mindCard}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🧘</Text>
                        <Text style={styles.mindTitle}>Mindfulness Break</Text>
                        <Text style={styles.mindText}>Close your eyes. Breathe in 4s, hold 4s, exhale 6s. Repeat 3 times.</Text>
                        <TouchableOpacity style={styles.mindBtn} onPress={() => {
                            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShowMindfulness(false));
                        }}><Text style={styles.mindBtnText}>I feel better ✨</Text></TouchableOpacity>
                    </View>
                </Animated.View>
            )}
            <View style={[styles.stressBar, { backgroundColor: theme.surface }]}>
                <Text style={[styles.stressLabel, { color: theme.textSecondary }]}>Mood:</Text>
                <View style={[styles.stressTrack, { backgroundColor: theme.border }]}>
                    <View style={[styles.stressFill, {
                        width: `${stressLevel * 100}%`,
                        backgroundColor: stressLevel > 0.6 ? Colors.success : stressLevel > 0.3 ? Colors.warning : Colors.error
                    }]} />
                </View>
                <Text style={{ fontSize: 16 }}>{stressLevel > 0.6 ? '😊' : stressLevel > 0.3 ? '😐' : '😟'}</Text>
            </View>
            <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={{ padding: Spacing.md }}
                showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.botBubble,
                    { backgroundColor: msg.role === 'user' ? Colors.primary : isDark ? '#334155' : '#f1f5f9' }]}>
                        {msg.role === 'assistant' && <Text style={{ fontSize: 11, fontWeight: '700', opacity: 0.6, marginBottom: 2 }}>🤖 Saathi</Text>}
                        {msg.imageUri && (
                            <Image source={{ uri: msg.imageUri }} style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 8 }} resizeMode="cover" />
                        )}
                        <Text style={[styles.msgText, { color: msg.role === 'user' ? '#fff' : theme.text }]}>{msg.content}</Text>
                        <Text style={[styles.msgTime, { color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : theme.textMuted }]}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                ))}
                {pendingAnswers && (
                    <TouchableOpacity 
                        style={{ alignSelf: 'center', backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, marginVertical: 15, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3 }}
                        onPress={async () => {
                            const ansText = pendingAnswers;
                            setPendingAnswers(null);
                            const answersMsg: ChatMessage = { id: generateId(), role: 'assistant', content: "⏱️ Here are the answers:\n\n" + ansText, timestamp: new Date().toISOString() };
                            setMessages(prev => [...prev, answersMsg]);
                            try {
                                const db2 = await getDatabase();
                                await db2.runAsync('INSERT INTO chat_messages (id,role,content,timestamp,user_email) VALUES (?,?,?,?,?)',
                                    [answersMsg.id, answersMsg.role, answersMsg.content, answersMsg.timestamp, userEmail]);
                            } catch (e) { }
                            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Show Answers 👀</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, maxHeight: 40 }}>
                {['🎮 Mnemonics','Physics doubt','Feeling stressed','⏱️ Pomodoro','🃏 Quiz me','🌐 Languages'].map((r, i) => (
                    <TouchableOpacity key={i} style={[styles.qr, { borderColor: Colors.primary + '40' }]}
                        onPress={() => {
                            if (r.includes('📷') || r.includes('Upload')) { handleImageUpload(); }
                            else if (r.includes('Languages')) { setInputText('Which languages do you support?'); }
                            else if (r.includes('Mnemonics')) { setInputText('mnemonic'); }
                            else { setInputText(r.replace(/^[\u2700-\u27BF\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}]\s*/u, '')); }
                        }}><Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>{r}</Text></TouchableOpacity>
                ))}
            </ScrollView>

            {/* Image Preview */}
            {selectedImage && (
                <View style={[styles.imagePreviewBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                    <Image source={{ uri: selectedImage }} style={styles.imageThumb} />
                    <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 12 }}>Image attached</Text>
                    <TouchableOpacity onPress={() => setSelectedImage(null)}>
                        <Text style={{ color: Colors.error, fontWeight: '700', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}



            <View style={[styles.inputArea, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                {/* Plus Menu Button */}
                <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: theme.background, borderColor: theme.border, width: 44, height: 44, borderRadius: 22 }]}
                    onPress={() => setIsMenuOpen(!isMenuOpen)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 24, color: theme.text, lineHeight: 28, textAlign: 'center' }}>+</Text>
                </TouchableOpacity>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="Ask Saathi anything..." placeholderTextColor={theme.textMuted}
                    value={inputText} onChangeText={setInputText} onSubmitEditing={handleSend} returnKeyType="send" multiline maxLength={500}
                    onKeyPress={(e: any) => {
                        if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: inputText.trim() || selectedImage ? Colors.primary : theme.border }]}
                    onPress={handleSend} disabled={!inputText.trim() && !selectedImage}><Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>↑</Text></TouchableOpacity>
            </View>

            {/* Menu Container */}
            {isMenuOpen && (
                <View style={[styles.menuContainer, { backgroundColor: theme.surface, borderColor: theme.border, bottom: 70 }]}>
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => { setIsMenuOpen(false); handleImageUpload(); }}>
                        <Feather name="paperclip" size={20} color={theme.text} style={{ marginRight: 16 }} />
                        <Text style={[styles.menuText, { color: theme.text }]}>Add files or photos</Text>
                    </TouchableOpacity>
                    <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => { setIsMenuOpen(false); handleOCR(); }}>
                        <Feather name="camera" size={20} color={theme.text} style={{ marginRight: 16 }} />
                        <Text style={[styles.menuText, { color: theme.text }]}>Take a screenshot</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Hidden file input for web image upload */}
            {Platform.OS === 'web' && (
                <input
                    ref={fileInputRef as any}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e: any) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                setSelectedImage(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                        }
                    }}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    stressBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    stressLabel: { fontSize: 13, fontWeight: '600' },
    stressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    stressFill: { height: '100%', borderRadius: 3 },
    chatArea: { flex: 1 },
    bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 8 },
    userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    botBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    msgText: { fontSize: 15, lineHeight: 22 },
    msgTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
    qr: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, marginRight: 8 },
    inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 0.5, gap: 8 },
    input: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, maxHeight: 100, minHeight: 44 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cameraBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    imagePreviewBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 0.5, gap: 10 },
    imageThumb: { width: 40, height: 40, borderRadius: 8 },
    menuContainer: { position: 'absolute', bottom: 8, left: 8, borderRadius: 16, borderWidth: 1, paddingVertical: 8, width: 240, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    menuIcon: { fontSize: 18, marginRight: 16 },
    menuText: { fontSize: 15, fontWeight: '500' },
    menuDivider: { height: 1, width: '100%', marginVertical: 4 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 24 },
    mindCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', maxWidth: 360 },
    mindTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
    mindText: { color: '#94a3b8', fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
    mindBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99 },
    mindBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
