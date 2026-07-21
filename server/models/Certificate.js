const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  institution: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  fileUrl: { type: String, required: true }, // IPFS hash or cloud link
  certHash: { type: String, required: true, unique: true }, // SHA-256 of the file
  blockchainTx: { type: String }, // Transaction hash on blockchain
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'revoked'], 
    default: 'pending' 
  },
  isExternal: { type: Boolean, default: false },
  externalUrl: { type: String },
  externalId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
