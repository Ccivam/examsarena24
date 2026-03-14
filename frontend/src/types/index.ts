export interface User {
  _id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  picture: string;
  role: 'student' | 'admin' | 'super_admin';
}

export interface Test {
  _id: string;
  title: string;
  description: string;
  type: 'JEE_MAINS' | 'JEE_ADVANCED' | 'TOPIC_TEST' | 'FULL_LENGTH';
  problems: TestProblem[];
  startTime: string;
  endTime: string;
  duration: number;
  fee: number;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  registrationDeadline: string;
  maxParticipants: number;
  solutionPublishedAt?: string;
  leaderboardPublishedAt?: string;
  createdBy: { name: string } | string;
}

export interface TestProblem {
  problem: Problem;
  order: number;
}

export interface Problem {
  _id: string;
  title: string;
  content: string;
  options: { label: string; text: string }[];
  correctOption?: string;
  explanation?: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  marks: number;
  negativeMarks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  author: { name: string } | string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Registration {
  _id: string;
  user: string | User;
  test: string | Test;
  paymentStatus: 'free' | 'pending' | 'verified' | 'rejected';
  utrNumber: string;
  amount: number;
  upiId: string;
  createdAt: string;
}

export interface Answer {
  problem: string;
  selectedOption: string | null;
  submittedAt: string;
}

export interface Submission {
  _id: string;
  user: string;
  test: string;
  answers: Answer[];
  startedAt: string;
  submittedAt?: string;
  isSubmitted: boolean;
}

export interface SubjectScore {
  physics: number;
  chemistry: number;
  mathematics: number;
}

export interface Result {
  _id: string;
  user: User | string;
  test: Test | string;
  scores: SubjectScore;
  totalScore: number;
  maxScore: number;
  rank: number;
  percentile: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  calculatedAt: string;
}

export interface Reply {
  _id: string;
  author: { _id: string; name: string; picture: string; role: string };
  content: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  author: { _id: string; name: string; picture: string; role: string };
  content: string;
  replies: Reply[];
  createdAt: string;
}

export interface Discussion {
  _id: string;
  title: string;
  content: string;
  type: 'editorial' | 'announcement' | 'general';
  test?: { _id: string; title: string } | null;
  author: { _id: string; name: string; picture: string; role: string };
  comments: Comment[];
  commentCount?: number;
  pinned: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  _id: string;
  avgRank: number;
  totalTests: number;
  avgScore: number;
  bestRank: number;
  totalScore: number;
  user: { _id: string; name: string; picture: string };
}
