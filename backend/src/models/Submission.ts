import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  problem: mongoose.Types.ObjectId;
  selectedOption: string | null; // 'A', 'B', 'C', 'D' or null if not answered
  submittedAt: Date;
}

export interface ISubmission extends Document {
  user: mongoose.Types.ObjectId;
  test: mongoose.Types.ObjectId;
  answers: IAnswer[];
  startedAt: Date;
  submittedAt?: Date;
  isSubmitted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  problem: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
  selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  submittedAt: { type: Date, default: Date.now },
});

const SubmissionSchema = new Schema<ISubmission>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    answers: [AnswerSchema],
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    isSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SubmissionSchema.index({ user: 1, test: 1 }, { unique: true });
SubmissionSchema.index({ test: 1, isSubmitted: 1 });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
