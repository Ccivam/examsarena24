import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpCode extends Document {
  identifier: string; // email address
  code: string;
  purpose: 'register' | 'reset-password';
  expiresAt: Date;
}

const OtpCodeSchema = new Schema<IOtpCode>({
  identifier: { type: String, required: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['register', 'reset-password'], required: true },
  expiresAt: { type: Date, required: true },
});

// Auto-delete expired documents
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpCodeSchema.index({ identifier: 1, purpose: 1 });

export default mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema);
