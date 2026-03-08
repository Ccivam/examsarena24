import mongoose, { Document, Schema } from 'mongoose';

export interface IRegistration extends Document {
  user: mongoose.Types.ObjectId;
  test: mongoose.Types.ObjectId;
  paymentStatus: 'free' | 'pending' | 'verified' | 'rejected';
  utrNumber: string;
  amount: number;
  upiId: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  paymentScreenshot?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    paymentStatus: {
      type: String,
      enum: ['free', 'pending', 'verified', 'rejected'],
      default: 'pending',
    },
    utrNumber: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    upiId: { type: String, default: '' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    paymentScreenshot: { type: String },
  },
  { timestamps: true }
);

RegistrationSchema.index({ user: 1, test: 1 }, { unique: true });
RegistrationSchema.index({ test: 1 });
RegistrationSchema.index({ paymentStatus: 1 });

export default mongoose.model<IRegistration>('Registration', RegistrationSchema);
