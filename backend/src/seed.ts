import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User';
import Problem from './models/Problem';
import Test from './models/Test';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jeearena');
  console.log('Connected to MongoDB');

  // Create admin user
  let admin = await User.findOne({ email: 'admin@jeearena.com' });
  if (!admin) {
    admin = await User.create({
      googleId: 'admin_seed_id_001',
      email: 'admin@jeearena.com',
      name: 'JEE Arena Admin',
      picture: '',
      role: 'admin',
    });
    console.log('Admin user created:', admin._id.toString());
  } else {
    console.log('Admin already exists');
  }

  // Create sample problems
  const problemsData = [
    {
      title: 'Projectile Motion - Fragment',
      content: 'A particle of mass <i>m</i> is projected with a velocity <i>v</i> at an angle θ with the horizontal. At the highest point of its trajectory, it breaks into two equal parts. One part falls vertically down with zero initial velocity. The range of the other part is:',
      options: [
        { label: 'A', text: 'R/2' },
        { label: 'B', text: '3R/2' },
        { label: 'C', text: 'R' },
        { label: 'D', text: '2R' },
      ],
      correctOption: 'B',
      explanation: 'Conservation of linear momentum at the highest point implies the horizontal velocity of the remaining fragment increases threefold. Using range = u²sin2θ/g, the new range becomes 3R/2.',
      subject: 'Physics' as const,
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Medium' as const,
      tags: ['projectile', 'momentum', 'mechanics'],
    },
    {
      title: 'Elastic Collision Conservation',
      content: 'If the surface is frictionless, which of the following quantities remains conserved during a perfectly elastic collision?',
      options: [
        { label: 'A', text: 'Kinetic Energy only' },
        { label: 'B', text: 'Momentum only' },
        { label: 'C', text: 'Both Kinetic Energy and Momentum' },
        { label: 'D', text: 'Neither is conserved' },
      ],
      correctOption: 'C',
      explanation: 'In a perfectly elastic collision, both kinetic energy and linear momentum are conserved. This distinguishes it from inelastic collisions where only momentum is conserved.',
      subject: 'Physics' as const,
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Easy' as const,
      tags: ['collision', 'momentum', 'energy'],
    },
    {
      title: 'Limit Evaluation',
      content: 'Evaluate: lim(x→0) [sin(x)/x]',
      options: [
        { label: 'A', text: '0' },
        { label: 'B', text: '∞' },
        { label: 'C', text: '1' },
        { label: 'D', text: 'Does not exist' },
      ],
      correctOption: 'C',
      explanation: 'This is a standard limit result: lim(x→0) sin(x)/x = 1. It can be proven using L\'Hopital\'s rule or the squeeze theorem.',
      subject: 'Mathematics' as const,
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Easy' as const,
      tags: ['limits', 'calculus', 'standard limits'],
    },
    {
      title: 'Mole Concept',
      content: 'How many molecules are present in 44 g of CO₂? (Molecular mass of CO₂ = 44 g/mol, Avogadro number = 6.022 × 10²³)',
      options: [
        { label: 'A', text: '6.022 × 10²³' },
        { label: 'B', text: '12.044 × 10²³' },
        { label: 'C', text: '3.011 × 10²³' },
        { label: 'D', text: '18.066 × 10²³' },
      ],
      correctOption: 'A',
      explanation: '44g of CO₂ = 1 mole of CO₂. Number of molecules = 1 × 6.022 × 10²³ = 6.022 × 10²³.',
      subject: 'Chemistry' as const,
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Easy' as const,
      tags: ['mole concept', 'stoichiometry'],
    },
  ];

  const createdProblems = [];
  for (const pd of problemsData) {
    let p = await Problem.findOne({ title: pd.title });
    if (!p) {
      p = await Problem.create({ ...pd, author: admin._id, status: 'approved' });
      console.log('Problem created:', p.title);
    }
    createdProblems.push(p);
  }

  const now = new Date();

  // Upcoming paid test
  if (!(await Test.findOne({ title: 'All India Open Mock Test Series - Paper 1' }))) {
    const start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    await Test.create({
      title: 'All India Open Mock Test Series - Paper 1',
      description: 'Full-syllabus JEE Advanced level mock test. Compete with students across India.',
      type: 'JEE_ADVANCED',
      problems: createdProblems.slice(0, 2).map((p, i) => ({ problem: p._id, order: i + 1 })),
      startTime: start,
      endTime: new Date(start.getTime() + 3 * 60 * 60 * 1000),
      duration: 180,
      fee: 99,
      status: 'upcoming',
      registrationDeadline: new Date(start.getTime() - 2 * 60 * 60 * 1000),
      maxParticipants: 5000,
      createdBy: admin._id,
    });
    console.log('Upcoming test created');
  }

  // Upcoming free topic test
  if (!(await Test.findOne({ title: 'Calculus Limits & Continuity Special' }))) {
    const start = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    await Test.create({
      title: 'Calculus Limits & Continuity Special',
      description: 'Topic-based test focusing on limits, continuity, and differentiability.',
      type: 'TOPIC_TEST',
      problems: [{ problem: createdProblems[2]._id, order: 1 }],
      startTime: start,
      endTime: new Date(start.getTime() + 90 * 60 * 1000),
      duration: 90,
      fee: 0,
      status: 'upcoming',
      registrationDeadline: new Date(start.getTime() - 60 * 60 * 1000),
      maxParticipants: 10000,
      createdBy: admin._id,
    });
    console.log('Free topic test created');
  }

  // Past completed test with solutions
  let pastTest = await Test.findOne({ title: 'Mock Test Series 09' });
  if (!pastTest) {
    const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    pastTest = await Test.create({
      title: 'Mock Test Series 09',
      description: 'Full-length JEE Mains pattern test. Physics + Chemistry + Mathematics.',
      type: 'JEE_MAINS',
      problems: createdProblems.map((p, i) => ({ problem: p._id, order: i + 1 })),
      startTime: pastStart,
      endTime: new Date(pastStart.getTime() + 3 * 60 * 60 * 1000),
      duration: 180,
      fee: 49,
      status: 'completed',
      registrationDeadline: new Date(pastStart.getTime() - 2 * 60 * 60 * 1000),
      maxParticipants: 5000,
      solutionPublishedAt: new Date(pastStart.getTime() + 4 * 60 * 60 * 1000),
      leaderboardPublishedAt: new Date(pastStart.getTime() + 5 * 60 * 60 * 1000),
      createdBy: admin._id,
    });
    console.log('Past test created:', pastTest._id.toString());
  }

  console.log('\n✓ Seeding complete! Database ready.');
  await mongoose.disconnect();
}

seed().catch(console.error);
