const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  institution: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  fileUrl: { type: String }, // External verification URL or legacy local path; uploaded files live in fileData
  fileData: { type: Buffer, select: false },
  fileContentType: { type: String },
  certHash: { type: String, required: true, unique: true }, // SHA-256 of the file
  blockchainTx: { type: String }, // Transaction hash on blockchain
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'revoked'], 
    default: 'pending' 
  },
  isExternal: { type: Boolean, default: false },
  externalUrl: { type: String },
  externalId: { type: String },
  aiScreening: {
    status: { type: String, enum: ['not_run', 'no_obvious_issue', 'review_required', 'unavailable'], default: 'not_run' },
    summary: { type: String },
    observations: [{ type: String }],
    findings: [{
      _id: false,
      observation: { type: String },
      evidence: { type: String },
      location: { type: String },
      comparedWith: { type: String, enum: ['title', 'institution', 'issueDate', 'visual_consistency', 'other'] }
    }],
    limitations: [{ type: String }],
    model: { type: String },
    analyzedAt: { type: Date },
    reviewAcknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewAcknowledgedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
