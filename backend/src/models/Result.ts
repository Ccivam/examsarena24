import mongoose, { Document, Schema } from 'mongoose';

export interface ISubjectScore {
  physics: number;
  chemistry: number;
  mathematics: number;
}

export interface IResult extends Document {
  user: mongoose.Types.ObjectId;
  test: mongoose.Types.ObjectId;
  scores: ISubjectScore;
  totalScore: number;
  maxScore: number;
  rank: number;
  percentile: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectScoreSchema = new Schema<ISubjectScore>({
  physics: { type: Number, default: 0 },
  chemistry: { type: Number, default: 0 },
  mathematics: { type: Number, default: 0 },
});

const ResultSchema = new Schema<IResult>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    scores: { type: SubjectScoreSchema, required: true },
    totalScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    rank: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ResultSchema.index({ user: 1, test: 1 }, { unique: true });
ResultSchema.index({ test: 1, rank: 1 });

export default mongoose.model<IResult>('Result', ResultSchema);
