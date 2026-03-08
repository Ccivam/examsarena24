import mongoose, { Document, Schema } from 'mongoose';

export interface ITestProblem {
  problem: mongoose.Types.ObjectId;
  order: number;
}

export interface ITest extends Document {
  title: string;
  description: string;
  type: 'JEE_MAINS' | 'JEE_ADVANCED' | 'TOPIC_TEST' | 'FULL_LENGTH';
  problems: ITestProblem[];
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  fee: number; // in INR, 0 = free
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  registrationDeadline: Date;
  maxParticipants: number;
  solutionPublishedAt?: Date;
  leaderboardPublishedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestProblemSchema = new Schema<ITestProblem>({
  problem: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
  order: { type: Number, required: true },
});

const TestSchema = new Schema<ITest>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['JEE_MAINS', 'JEE_ADVANCED', 'TOPIC_TEST', 'FULL_LENGTH'],
      required: true,
    },
    problems: [TestProblemSchema],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    registrationDeadline: { type: Date, required: true },
    maxParticipants: { type: Number, default: 10000 },
    solutionPublishedAt: { type: Date },
    leaderboardPublishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

TestSchema.index({ status: 1 });
TestSchema.index({ endTime: 1 });
TestSchema.index({ createdBy: 1 });

export default mongoose.model<ITest>('Test', TestSchema);
