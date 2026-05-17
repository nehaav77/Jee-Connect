// Mnemonic Builder - deeply personalized JEE mnemonics

interface TopicData {
  subject: 'Physics'|'Chemistry'|'Math';
  formulas: string;
  concepts: string[];
  acronym: string;
}

const TOPICS: Record<string, TopicData> = {
  'Kinematics': { subject:'Physics', formulas: 'v=u+at, s=ut+½at², v²=u²+2as\nProjectile: R=u²sin2θ/g, H=u²sin²θ/2g, T=2usinθ/g', concepts: ['SUVAT equations govern all motion','Projectile splits into horizontal (constant v) + vertical (gravity)','Graphs: slope of x-t=velocity, slope of v-t=acceleration'], acronym: 'SUVAT' },
  "Newton's Laws": { subject:'Physics', formulas: 'F=ma, f=μN, Pulley: a=(m₁-m₂)g/(m₁+m₂)\nFBD → resolve → ΣF=ma per axis', concepts: ['1st Law: no net force = no change (inertia)','2nd Law: F=ma — more force, more acceleration','3rd Law: every action has equal opposite reaction'], acronym: 'I-FAR (Inertia, F=ma, Action-Reaction)' },
  'Work Energy & Power': { subject:'Physics', formulas: 'W=Fd·cosθ, KE=½mv², PE=mgh\nW_net=ΔKE, P=W/t=Fv, e=v₂-v₁/u₁-u₂', concepts: ['Work = force × displacement × cosθ','KE + PE = constant in conservative systems','Elastic collision conserves KE; inelastic doesn\'t'], acronym: 'WEP (Work-Energy-Power)' },
  'Rotational Motion': { subject:'Physics', formulas: 'τ=Iα, L=Iω, KE=½Iω²\nDisc=MR²/2, Ring=MR², Sphere=2MR²/5\nRolling: v=Rω', concepts: ['Torque = rotational force (τ=r×F)','Moment of inertia = how hard to spin (rotational mass)','Angular momentum L=Iω is conserved when no external torque'], acronym: 'TIL (Torque, Inertia, L=angular momentum)' },
  'Gravitation': { subject:'Physics', formulas: 'F=GMm/r², g=GM/R²\nv_escape=√(2gR), v_orbital=√(gR)\nKepler T²∝r³', concepts: ['Gravity force ∝ 1/r² (inverse square law)','Escape velocity = minimum speed to leave planet','Kepler: planets trace ellipses, equal areas in equal time'], acronym: 'GEK (Gravity, Escape, Kepler)' },
  'Thermodynamics': { subject:'Physics', formulas: 'ΔQ=ΔU+ΔW (1st Law)\nIsothermal: W=nRT·ln(V₂/V₁)\nAdiabatic: PVᵞ=const, Carnot η=1-Tc/Th', concepts: ['1st Law: energy in = energy stored + work done','4 processes: Isothermal(T), Adiabatic(Q=0), Isobaric(P), Isochoric(V)','Carnot engine = maximum possible efficiency'], acronym: '"I Am In Isolation" (Isothermal, Adiabatic, Isobaric, Isochoric)' },
  'SHM & Waves': { subject:'Physics', formulas: 'x=Asin(ωt+φ), a=-ω²x\nT_spring=2π√(m/k), T_pendulum=2π√(L/g)\nWave: v=fλ, Beats=|f₁-f₂|', concepts: ['SHM: restoring force proportional to displacement','Energy oscillates between KE and PE endlessly','Superposition: waves add up — constructive or destructive'], acronym: 'SAV (SHM, Amplitude, Velocity cycle)' },
  'Electrostatics': { subject:'Physics', formulas: 'F=kq₁q₂/r², E=kQ/r², V=kQ/r\nGauss: Φ=q/ε₀\nC=ε₀A/d, Series:1/C=Σ1/Cᵢ, Parallel:C=ΣCᵢ', concepts: ['Coulomb force between charges ∝ 1/r²','Electric field = force felt per unit positive charge','Capacitors store energy: U=½CV²'], acronym: 'CEFV (Coulomb, E-field, Force, Voltage)' },
  'Current Electricity': { subject:'Physics', formulas: 'V=IR, R=ρL/A, P=VI=I²R\nKirchhoff: ΣI=0, ΣV=0\nWheatstone: P/Q=R/S', concepts: ['Ohm\'s Law: voltage drives current through resistance','Kirchhoff: charge conserved at junctions, energy conserved in loops','Power dissipated as heat: P=I²R'], acronym: 'OKW (Ohm, Kirchhoff, Wheatstone)' },
  'Magnetism & EMI': { subject:'Physics', formulas: 'F=qv×B, B_wire=μ₀I/(2πr)\nFaraday: EMF=-dΦ/dt\nAC: Z=√(R²+(XL-XC)²), resonance ω=1/√(LC)', concepts: ['Moving charge creates + feels magnetic force','Faraday: changing magnetic flux induces EMF','Lenz Law: induced current always opposes the change'], acronym: 'FFL (Force, Faraday, Lenz)' },
  'Optics': { subject:'Physics', formulas: 'Mirror: 1/v+1/u=1/f, Lens: 1/v-1/u=1/f\nSnell: n₁sinθ₁=n₂sinθ₂\nYDSE fringe: β=λD/d', concepts: ['Real images are inverted, virtual are upright','Snell\'s Law: light bends toward normal in denser medium','Young\'s experiment proves light is a wave (interference)'], acronym: '"Real Is Inverted" + Snell' },
  'Modern Physics': { subject:'Physics', formulas: 'E=hf, KE=hf-φ (photoelectric)\nde Broglie: λ=h/mv\nBohr: E=-13.6/n² eV, t½=0.693/λ', concepts: ['Light has dual nature: wave AND particle','Bohr: electrons only in quantized orbits','Radioactive decay: N halves every half-life'], acronym: 'PDB (Photoelectric, de Broglie, Bohr)' },
  'Mole Concept': { subject:'Chemistry', formulas: 'n=mass/M, 1 mol=6.022×10²³\nIdeal gas: PV=nRT\nStoichiometry: balance→moles→convert', concepts: ['1 mole = Avogadro\'s number of particles','Molar mass bridges grams and moles','Limiting reagent runs out first and decides product amount'], acronym: 'NAM (N_A, Avogadro, Molar mass)' },
  'Atomic Structure': { subject:'Chemistry', formulas: 'E=-13.6Z²/n² eV, r=0.529n²/Z Å\nQuantum numbers: n, l, mₗ, mₛ\nAufbau: 1s 2s 2p 3s 3p 4s 3d...', concepts: ['4 quantum numbers uniquely define every electron','Aufbau: fill lowest energy orbital first','Hund: electrons spread out before pairing (max multiplicity)'], acronym: 'ALPH (Aufbau, Lowest-energy, Pauli, Hund)' },
  'Chemical Thermo': { subject:'Chemistry', formulas: 'ΔG=ΔH-TΔS\nΔG<0 spontaneous, =0 equilibrium\nHess: ΔH path independent, ΔG°=-RTlnK', concepts: ['Enthalpy H = heat at constant pressure','Entropy S = disorder — universe entropy always increases','Gibbs free energy decides spontaneity: negative = spontaneous'], acronym: 'HEG (entHalpy, Entropy, Gibbs)' },
  'Equilibrium': { subject:'Chemistry', formulas: 'Kc=[products]/[reactants], Kp=Kc(RT)^Δn\npH=-log[H⁺], Ka×Kb=Kw=10⁻¹⁴\nBuffer: pH=pKa+log([A⁻]/[HA])', concepts: ['At equilibrium, forward rate = reverse rate','Le Chatelier: disturb equilibrium → it shifts to oppose you','pH 7=neutral, <7=acidic, >7=basic'], acronym: 'LCK (Le Chatelier, Constants, Ka/Kb)' },
  'Chemical Kinetics': { subject:'Chemistry', formulas: 'Rate=k[A]^n, t½(1st order)=0.693/k\nArrhenius: k=Ae^(-Ea/RT)\nln(k₂/k₁)=Ea/R·(1/T₁-1/T₂)', concepts: ['Reaction rate depends on concentration and temperature','Half-life of 1st order is constant (doesn\'t depend on concentration)','Catalyst lowers activation energy without being consumed'], acronym: 'RAC (Rate, Arrhenius, Catalyst)' },
  'Electrochemistry': { subject:'Chemistry', formulas: 'E°cell=E°cathode-E°anode, ΔG°=-nFE°\nNernst: E=E°-(0.0591/n)logQ\nFaraday: m=MIt/(nF)', concepts: ['AN OX RED CAT: Anode=Oxidation, Cathode=Reduction','Positive E°cell = spontaneous reaction','Faraday: charge passed determines mass deposited'], acronym: 'AN OX RED CAT' },
  'Organic Chemistry': { subject:'Chemistry', formulas: 'SN1: 3°>2°>1° (carbocation intermediate)\nSN2: CH₃>1°>2° (backside attack, inversion)\nMarkovnikov: H adds to C with more H', concepts: ['SN1 = Slow, Needs 1 step (unimolecular) via carbocation','SN2 = Swift, Needs 2 molecules (bimolecular) with inversion','Markovnikov: "Rich get Richer" — H goes to more H-bearing carbon'], acronym: '"SN1=Slow Needs 1, SN2=Swift Needs 2"' },
  'Inorganic Chemistry': { subject:'Chemistry', formulas: 'IE increases L→R, decreases top→bottom\nEA: Cl>F>Br>I (F too small)\nCFT: octahedral splitting t₂g/eg', concepts: ['Periodic trends (IE, EA, radius, EN) explain most inorganic','NCERT is gold for p-block: memorize compounds per group','d-block: variable oxidation states → colored compounds'], acronym: 'PIER (Periodic, IE, EA, Radius)' },
  'Algebra': { subject:'Math', formulas: 'Quadratic: x=(-b±√D)/2a, D=b²-4ac\nComplex: |z|=√(a²+b²), De Moivre\'s theorem\nVieta: α+β=-b/a, αβ=c/a', concepts: ['Discriminant D decides roots: D>0 real, D=0 equal, D<0 complex','Complex numbers are points on a 2D plane (Argand diagram)','Vieta\'s: sum & product of roots without solving'], acronym: 'DCV (Discriminant, Complex, Vieta)' },
  'Sequences & Series': { subject:'Math', formulas: 'AP: aₙ=a+(n-1)d, Sₙ=n/2[2a+(n-1)d]\nGP: aₙ=arⁿ⁻¹, S∞=a/(1-r) |r|<1\nAM≥GM≥HM', concepts: ['AP: constant difference d between terms','GP: constant ratio r between terms','AM-GM inequality: AM ≥ GM always (powerful for optimization)'], acronym: 'ADR (AP=Difference, GP=Ratio)' },
  'Matrices': { subject:'Math', formulas: '|AB|=|A|·|B|, |kA|=kⁿ|A|\nA⁻¹=adj(A)/|A|, (AB)⁻¹=B⁻¹A⁻¹\nCramer: x=Dx/D, y=Dy/D', concepts: ['Determinant = 0 means singular (no inverse)','Inverse reverses multiplication order: (AB)⁻¹=B⁻¹A⁻¹','Cramer\'s rule: solve systems using determinant ratios'], acronym: 'DIC (Determinant, Inverse, Cramer)' },
  'Calculus': { subject:'Math', formulas: 'd/dx(xⁿ)=nxⁿ⁻¹, Chain: f\'(g(x))·g\'(x)\n∫xⁿdx=xⁿ⁺¹/(n+1)+C\nBy parts: ∫udv=uv-∫vdu (LIATE order)', concepts: ['Derivative = instantaneous rate of change (slope of tangent)','Integral = area under curve (accumulated total)','LIATE order for by-parts: Log, Inverse trig, Algebraic, Trig, Exp'], acronym: 'LIATE + "Low D-High minus High D-Low / square below"' },
  'Coordinate Geometry': { subject:'Math', formulas: 'Line: y-y₁=m(x-x₁), dist=|ax₁+by₁+c|/√(a²+b²)\nCircle: centre(-g,-f), r=√(g²+f²-c)\nEllipse LR=2b²/a, e=√(1-b²/a²)', concepts: ['Slope m = tanθ with x-axis; parallel=same m, perp=m₁m₂=-1','Conics classified by eccentricity: e<1 ellipse, e=1 parabola, e>1 hyperbola','Always sketch the curve before solving — visualize!'], acronym: 'SPEC (Slope, Point, Eccentricity, Conic)' },
  'Trigonometry': { subject:'Math', formulas: 'sin²θ+cos²θ=1\nsin(A±B)=sinAcosB±cosAsinB\nsin2A=2sinAcosA, cos2A=cos²A-sin²A', concepts: ['SOH-CAH-TOA: Sin=Opp/Hyp, Cos=Adj/Hyp, Tan=Opp/Adj','Quadrant signs: "All Students Take Coffee" (Q1 all+, Q2 sin+, Q3 tan+, Q4 cos+)','Convert everything to sin & cos first — simplifies most problems'], acronym: '"All Students Take Coffee" (ASTC)' },
  'Vectors & 3D': { subject:'Math', formulas: 'Dot: a·b=|a||b|cosθ → scalar\nCross: |a×b|=|a||b|sinθ → vector\nPlane dist: |ax₁+by₁+cz₁-d|/√(a²+b²+c²)', concepts: ['Dot product → projection (scalar), Cross product → area (vector)','Cross product direction: right-hand rule','Coplanar vectors: scalar triple product [a b c] = 0'], acronym: 'DCA (Dot, Cross, Area)' },
  'Probability': { subject:'Math', formulas: 'P(A∪B)=P(A)+P(B)-P(A∩B)\nBayes: P(A|B)=P(B|A)·P(A)/P(B)\nBinomial: P(X=r)=nCr·pʳ·qⁿ⁻ʳ', concepts: ['P = favorable outcomes / total outcomes','Independent events: P(A∩B) = P(A) × P(B)','Bayes\' theorem flips conditional probability'], acronym: 'BAT (Bayes, Addition, Total probability)' },
};

function getSubjectEmoji(s: string) { return s==='Physics'?'⚛️':s==='Chemistry'?'🧪':'📐'; }

const CAT_TEMPLATES: Record<string, (f: string, td: TopicData, tp: string) => string> = {
  cricket: (f, td, tp) => {
    const se = getSubjectEmoji(td.subject);
    return `🏏 ${f}'s Cricket Guide to ${tp}! ${se}\n\n` +
      `Imagine ${f} at the crease:\n\n` +
      `🏟️ ${f}'s BATTING stance = ${td.concepts[0]}\n  → Just like ${f} reads the bowler's pace!\n\n` +
      `🎯 ${f}'s BOWLING strategy = ${td.concepts[1]}\n  → ${f} adjusts swing angle like adjusting variables!\n\n` +
      `🏆 ${f}'s MATCH-WINNING moment = ${td.concepts[2]}\n  → When ${f} hits the winning six, THIS is the formula!\n\n` +
      `🧠 ${f}'s Dressing Room Cheat Sheet:\n"${td.acronym}"\n${f} memorizes this before every match!\n\n` +
      `📝 ${td.subject} Formulas:\n${td.formulas}`;
  },
  movies: (f, td, tp) => {
    const se = getSubjectEmoji(td.subject);
    return `🎬 ${f} presents: "${tp} — The Movie" ${se}\n\n` +
      `🎥 ACT 1 — ${f}'s Setup:\n"${td.concepts[0]}"\n  → Like ${f}'s opening scene that hooks you!\n\n` +
      `🎥 ACT 2 — ${f}'s Plot Twist:\n"${td.concepts[1]}"\n  → The ${f} moment where everything changes!\n\n` +
      `🎥 ACT 3 — ${f}'s Climax:\n"${td.concepts[2]}"\n  → ${f}'s grand finale — the formula that wins the exam!\n\n` +
      `🧠 ${f}'s Dialogue: "${td.acronym}"\nThe iconic line from ${f} you'll never forget!\n\n` +
      `📝 ${td.subject} Formulas:\n${td.formulas}`;
  },
  games: (f, td, tp) => {
    const se = getSubjectEmoji(td.subject);
    return `🎮 ${f} — ${tp} Walkthrough! ${se}\n\n` +
      `🕹️ LEVEL 1 — ${f} Tutorial:\n"${td.concepts[0]}"\n  → The basic ${f} mechanic you master first!\n\n` +
      `🕹️ LEVEL 2 — ${f} Mid-Game:\n"${td.concepts[1]}"\n  → ${f}'s advanced ability that changes the game!\n\n` +
      `🕹️ BOSS FIGHT — ${f} Endgame:\n"${td.concepts[2]}"\n  → ${f}'s ultimate power-up for JEE!\n\n` +
      `🧠 ${f} Cheat Code: "${td.acronym}"\nEnter this code and dominate ${tp}!\n\n` +
      `📝 ${td.subject} Formulas:\n${td.formulas}`;
  },
  anime: (f, td, tp) => {
    const se = getSubjectEmoji(td.subject);
    return `🎌 ${f}'s Training Arc: ${tp}! ${se}\n\n` +
      `⚔️ TECHNIQUE 1 — ${f}'s Basic Jutsu:\n"${td.concepts[0]}"\n  → What ${f} learned at the academy!\n\n` +
      `⚔️ TECHNIQUE 2 — ${f}'s Power-Up:\n"${td.concepts[1]}"\n  → ${f}'s transformation that shocks everyone!\n\n` +
      `⚔️ ULTIMATE MOVE — ${f}'s Final Form:\n"${td.concepts[2]}"\n  → ${f}'s S-rank technique for the JEE battle!\n\n` +
      `🧠 ${f}'s Sacred Scroll: "${td.acronym}"\nWritten on ${f}'s training scroll in gold!\n\n` +
      `📝 ${td.subject} Formulas:\n${td.formulas}`;
  },
  memes: (f, td, tp) => {
    const se = getSubjectEmoji(td.subject);
    const teacher = td.subject==='Physics'?'Physics':td.subject==='Chemistry'?'Chemistry':'Math';
    return `😂 ${tp} × ${f} — Meme Edition! ${se}\n\n` +
      `🤣 *${f} meme format*\n"Nobody:\n${teacher} teacher: ${td.concepts[0]}"\n\n` +
      `🤣 *${f} reaction meme*\n"POV: You finally understand that\n${td.concepts[1]}\n*${f} shocked face* 😱"\n\n` +
      `🤣 *${f} brain meme*\n"Me at 2 AM realizing:\n${td.concepts[2]}\n*galaxy brain ${f} moment* 🧠✨"\n\n` +
      `🧠 ${f} Viral Caption: "${td.acronym}"\nShare this with your study group! 🔥\n\n` +
      `📝 ${td.subject} Formulas:\n${td.formulas}`;
  },
};

export function buildMnemonic(tp: string, fav: string, cat: string): string {
  const f = fav.split('/')[0];
  const h = `🎮🧠 ${tp} × ${fav}\n\n`;
  const ft = `\n\n📌 Go to Subjects → ${tp} chapter → PYQs!\n💡 Type "mnemonic" to learn another topic with ${fav}! 🔥`;
  const td = TOPICS[tp];
  if (!td) return h + `Connect ${tp} to ${f} — analogies make concepts stick! 🧠` + ft;
  const template = CAT_TEMPLATES[cat] || CAT_TEMPLATES['movies'];
  return h + template(f, td, tp) + ft;
}
