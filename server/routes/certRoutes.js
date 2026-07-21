const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Multer storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// @desc    Upload certificate (Internal or External)
// @route   POST /api/certs/upload
// @access  Private (Institution/Admin)
router.post('/upload', protect, authorize('institution', 'admin'), upload.single('certificateFile'), async (req, res) => {
  const { studentEmail, title, institution, isExternal, externalUrl, externalId } = req.body;
  
  const student = await User.findOne({ email: studentEmail });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  let certHash = '';
  let fileUrl = '';

  if (req.file) {
    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path);
    certHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    // Here you would upload to IPFS and get the hash/URL
    fileUrl = `/uploads/${req.file.filename}`; 
  } else if (isExternal === 'true') {
    certHash = crypto.createHash('sha256').update(externalUrl + externalId).digest('hex');
    fileUrl = externalUrl;
  } else {
    return res.status(400).json({ message: 'Please upload a file or provide external URL' });
  }

  const certificate = await Certificate.create({
    student: student._id,
    issuedBy: req.user._id,
    title,
    institution,
    fileUrl,
    certHash,
    isExternal: isExternal === 'true',
    externalUrl,
    externalId,
    status: isExternal === 'true' ? 'pending' : 'verified'
  });

  res.status(201).json(certificate);
});

// @desc    Get user's certificates
// @route   GET /api/certs/my
// @access  Private (Student)
router.get('/my', protect, async (req, res) => {
  const certificates = await Certificate.find({ student: req.user._id }).populate('issuedBy', 'name');
  res.json(certificates);
});

// @desc    Verify certificate by hash
// @route   POST /api/certs/verify
// @access  Public (Employer)
router.post('/verify', async (req, res) => {
  const { hash } = req.body;
  if (!hash) return res.status(400).json({ valid: false, message: 'Hash is required' });
  
  const cleanHash = hash.trim();
  const certificate = await Certificate.findOne({ certHash: cleanHash })
    .populate('student', 'name email')
    .populate('issuedBy', 'name');

  if (certificate) {
    res.json({
      valid: true,
      certificate
    });
  } else {
    res.json({ valid: false });
  }
});

// @desc    Update blockchain tx hash
// @route   PUT /api/certs/:id/blockchain
// @access  Private (Institution)
router.put('/:id/blockchain', protect, authorize('institution', 'admin'), async (req, res) => {
  const certificate = await Certificate.findById(req.params.id);
  if (certificate) {
    certificate.blockchainTx = req.body.txHash;
    certificate.status = 'verified';
    const updatedCert = await certificate.save();
    res.json(updatedCert);
  } else {
    res.status(404).json({ message: 'Certificate not found' });
  }
});

// @desc    Get certificates by student ID (Public)
// @route   GET /api/certs/public/student/:id
// @access  Public
router.get('/public/student/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('name email');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const certificates = await Certificate.find({ 
      student: req.params.id, 
      status: 'verified' 
    }).populate('issuedBy', 'name walletAddress');

    res.json({
      student,
      certificates
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
