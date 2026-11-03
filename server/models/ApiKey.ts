import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApiKey extends Document {
  userId: string;
  name: string;
  description?: string;
  keyPrefix: string;
  keyHash: string;
  permissions: string[];
  status: 'active' | 'revoked';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: ['models:read', 'inference:run', 'chat:completions'],
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes
ApiKeySchema.index({ userId: 1, status: 1 });
ApiKeySchema.index({ keyHash: 1, status: 1 });

export const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
