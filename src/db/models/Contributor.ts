import mongoose, { Schema, Document } from 'mongoose';

// Matches the schema from the first project exactly so both projects share the same collection
export interface IContributor extends Document {
  username: string;
  avatarUrl: string | null;
  name: string | null;
  email: string | null;
  blog: string | null;
  twitterUsername: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  githubUrl: string;
  'source-project': string[];
  isConnectionSent: boolean;
  outreachHistory: {
    channel: string;
    message: string;
    subject?: string;
    generatedAt: Date;
  }[];
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
  outreachHistory: {
    type: [{
      channel: { type: String, required: true },
      message: { type: String, required: true },
      subject: { type: String },
      generatedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
}, {
  timestamps: true, // Automatically manages createdAt and updatedAt
});

// Compile model from schema
export const ContributorModel = mongoose.models.Contributor || mongoose.model<IContributor>('Contributor', ContributorSchema);
