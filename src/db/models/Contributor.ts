import mongoose, { Schema, Document } from 'mongoose';
import type { Contributor } from '../../agent/state.js';

export interface IOutreachDraft {
  subject: string;
  message: string;
  generatedAt: Date;
  sentAt?: Date;
  emailTo?: string;
  emailMessageId?: string;
  research?: Record<string, unknown>;
}

// Keep the shared contributor fields aligned with the discovery agent, then add outreach metadata.
export interface IContributor extends Omit<Contributor, 'isConnectionSent'>, Document {
  isConnectionSent: boolean;
  'source-project': string[];
  outreachDraft?: IOutreachDraft;
}

const ContributorSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  avatarUrl: { type: String, default: null },
  name: { type: String, default: null },
  email: { type: String, default: null },
  blog: { type: String, default: null },
  twitterUsername: { type: String, default: null },
  linkedinUrl: { type: String, default: null },
  bio: { type: String, default: null },
  company: { type: String, default: null },
  location: { type: String, default: null },
  githubUrl: { type: String, required: true },
  'source-project': { type: [String], default: [] },
  isConnectionSent: { type: Boolean, default: false },
  outreachDraft: {
    subject: { type: String },
    message: { type: String },
    generatedAt: { type: Date },
    sentAt: { type: Date },
    emailTo: { type: String },
    emailMessageId: { type: String },
    research: { type: Schema.Types.Mixed },
  },
}, {
  timestamps: true, // Automatically manages createdAt and updatedAt
});

// Compile model from schema
export const ContributorModel = mongoose.models.Contributor || mongoose.model<IContributor>('Contributor', ContributorSchema);
