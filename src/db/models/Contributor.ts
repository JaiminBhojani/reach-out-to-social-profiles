import mongoose, { Schema, Document } from 'mongoose';
import type { Contributor } from '../../agent/state.js';

export interface IOutreachHistoryEntry {
  channel: 'linkedin' | 'twitter' | 'email';
  message: string;
  subject?: string;
  generatedAt: Date;
  sentAt?: Date;
}

export interface IOutreachDraft {
  message: string;
  generatedAt: Date;
}

// Keep the shared contributor fields aligned with the discovery agent, then add outreach metadata.
export interface IContributor extends Omit<Contributor, 'isConnectionSent'>, Document {
  isConnectionSent: boolean;
  'source-project': string[];
  outreachDraft?: IOutreachDraft;
  outreachHistory: IOutreachHistoryEntry[];
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
    message: { type: String },
    generatedAt: { type: Date },
  },
  outreachHistory: {
    type: [{
      channel: { type: String, enum: ['linkedin', 'twitter', 'email'], required: true },
      message: { type: String, required: true },
      subject: { type: String },
      generatedAt: { type: Date, default: Date.now },
      sentAt: { type: Date },
    }],
    default: [],
  },
}, {
  timestamps: true, // Automatically manages createdAt and updatedAt
});

// Compile model from schema
export const ContributorModel = mongoose.models.Contributor || mongoose.model<IContributor>('Contributor', ContributorSchema);
