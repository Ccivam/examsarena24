import mongoose, { Document, Schema } from 'mongoose';

export interface IPracticeSolve extends Document {
  user: mongoose.Types.ObjectId;
  problem: mongoose.Types.ObjectId;
  lastSelectedOption: string;
  correct: boolean;
  attempts: number;
  solvedAt: Date;
}

const PracticeSolveSchema = new Schema<IPracticeSolve>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  problem: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
  lastSelectedOption: { type: String },
  correct: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  solvedAt: { type: Date, default: Date.now },
});

PracticeSolveSchema.index({ user: 1, problem: 1 }, { unique: true });
PracticeSolveSchema.index({ user: 1, correct: 1 });

export default mongoose.model<IPracticeSolve>('PracticeSolve', PracticeSolveSchema);
