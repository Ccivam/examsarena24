import mongoose, { Document, Schema } from 'mongoose';

export interface IOption {
  label: string;
  text: string;
}

export interface IProblem extends Document {
  title: string;
  content: string;
  imageUrl?: string;
  options: IOption[];
  correctOption: string; // 'A', 'B', 'C', or 'D'
  explanation: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  marks: number;
  negativeMarks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  author: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IOption>({
  label: { type: String, required: true },
  text: { type: String, required: true },
});

const ProblemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String },
    options: { type: [OptionSchema], required: true },
    correctOption: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    explanation: { type: String, default: '' },
    subject: {
      type: String,
      required: true,
      enum: ['Physics', 'Chemistry', 'Mathematics'],
    },
    marks: { type: Number, default: 4 },
    negativeMarks: { type: Number, default: 1 },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    tags: [{ type: String }],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

ProblemSchema.index({ status: 1 });
ProblemSchema.index({ status: 1, subject: 1, createdAt: -1 });

export default mongoose.model<IProblem>('Problem', ProblemSchema);
