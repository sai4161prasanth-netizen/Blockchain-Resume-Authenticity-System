const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { JsonRpcProvider, Interface } = require('ethers');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const certificateEvents = new Interface([
  'event CertificateIssued(bytes32 indexed certId, string studentName, string certificateHash, address issuedBy)'
]);

// Multer storage
const allowedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const matchingType = (file.mimetype === 'application/pdf' && extension === '.pdf') ||
      (file.mimetype === 'image/png' && extension === '.png') ||
      (file.mimetype === 'image/jpeg' && ['.jpg', '.jpeg'].includes(extension));
    if (!allowedTypes.has(file.mimetype) || !matchingType) return cb(new Error('Only matching PDF, PNG, and JPEG files are allowed'));
    cb(null, true);
  }
});

// @desc    Upload certificate (Internal or External)
// @route   POST /api/certs/upload
// @access  Private (Institution/Admin)
router.post('/upload', protect, authorize('institution', 'admin'), (req, res, next) => {
  upload.single('certificateFile')(req, res, (error) => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message });
    next();
  });
}, async (req, res) => {
  const { studentEmail, title, institution, isExternal, externalUrl, externalId } = req.body;
  if (typeof studentEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(studentEmail) || typeof title !== 'string' || !title.trim() || typeof institution !== 'string' || !institution.trim()) {
    return res.status(400).json({ message: 'Student email, title, and institution are required' });
  }
  if (req.user.role === 'institution' && institution.trim() !== req.user.name.trim()) {
    return res.status(403).json({ message: 'Institution name must match the signed-in institution' });
  }
  
  const student = await User.findOne({ email: studentEmail.trim().toLowerCase() });
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found' });
  }

  let certHash = '';
  let fileUrl = '';
  let fileData;
  let fileContentType;

  if (req.file) {
    const fileContent = req.file.buffer;
    const isPdf = fileContent.subarray(0, 5).toString() === '%PDF-';
    const isPng = fileContent.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = fileContent[0] === 0xff && fileContent[1] === 0xd8 && fileContent[2] === 0xff;
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (!((isPdf && extension === '.pdf') || (isPng && extension === '.png') || (isJpeg && ['.jpg', '.jpeg'].includes(extension)))) {
      return res.status(400).json({ message: 'Uploaded file content is not a valid PDF, PNG, or JPEG' });
    }
    certHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    fileData = fileContent;
    fileContentType = req.file.mimetype;
  } else if (isExternal === 'true') {
    try {
      if (typeof externalUrl !== 'string' || new URL(externalUrl).protocol !== 'https:' || typeof externalId !== 'string' || !externalId.trim()) throw new Error('invalid');
    } catch {
      return res.status(400).json({ message: 'A valid HTTPS verification URL and credential ID are required' });
    }
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
    fileData,
    fileContentType,
    certHash,
    isExternal: isExternal === 'true',
    externalUrl,
    externalId,
    status: 'pending'
  });

  const responseCertificate = certificate.toObject();
  delete responseCertificate.fileData;
  res.status(201).json(responseCertificate);
});

// @desc    Get user's certificates
// @route   GET /api/certs/my
// @access  Private (Student)
router.get('/my', protect, async (req, res) => {
  const certificates = await Certificate.find({ student: req.user._id }).populate('issuedBy', 'name');
  res.json(certificates);
});

router.get('/:id/file', protect, async (req, res) => {
  const certificate = await Certificate.findById(req.params.id).select('+fileData');
  if (!certificate) return res.status(404).json({ message: 'Certificate not found' });
  const isStudent = certificate.student.toString() === req.user._id.toString();
  const isIssuer = certificate.issuedBy.toString() === req.user._id.toString();
  if (!isStudent && !isIssuer && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not allowed to download this certificate' });
  }
  if (certificate.isExternal || (!certificate.fileData && !certificate.fileUrl?.startsWith('/uploads/'))) {
    return res.status(404).json({ message: 'No uploaded file exists for this credential' });
  }
  if (certificate.fileData) {
    const fileExtension = certificate.fileContentType === 'application/pdf' ? '.pdf' : certificate.fileContentType === 'image/png' ? '.png' : '.jpg';
    res.type(certificate.fileContentType || 'application/octet-stream');
    return res.attachment(`certificate-${certificate._id}${fileExtension}`).send(certificate.fileData);
  }
  const uploadDir = path.resolve(__dirname, '..', 'uploads');
  const filePath = path.resolve(uploadDir, path.basename(certificate.fileUrl));
  if (!filePath.startsWith(`${uploadDir}${path.sep}`)) return res.status(400).json({ message: 'Invalid file path' });
  return res.download(filePath, `certificate-${certificate._id}${path.extname(filePath)}`);
});

// @desc    Verify certificate by hash
// @route   POST /api/certs/verify
// @access  Public (Employer)
router.post('/verify', async (req, res) => {
  const { hash } = req.body;
  if (typeof hash !== 'string' || !/^\s*[a-fA-F0-9]{64}\s*$/.test(hash)) return res.status(400).json({ valid: false, message: 'A valid SHA-256 hash is required' });
  
  const cleanHash = hash.trim().toLowerCase();
  const certificate = await Certificate.findOne({ certHash: cleanHash, status: 'verified', blockchainTx: { $exists: true, $ne: '' } })
    .select('title institution issueDate certHash blockchainTx status isExternal')
    .populate('student', 'name')
    .populate('issuedBy', 'name walletAddress');

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
    if (req.user.role !== 'admin' && certificate.issuedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the issuing institution can attach a transaction' });
    }
    if (typeof req.body.txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(req.body.txHash)) {
      return res.status(400).json({ message: 'A valid transaction hash is required' });
    }
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress || !process.env.BLOCKCHAIN_RPC_URL) {
      return res.status(503).json({ message: 'Blockchain verification is not configured on the server' });
    }
    try {
      const provider = new JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      const receipt = await provider.getTransactionReceipt(req.body.txHash);
      if (!receipt || receipt.status !== 1 || receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
        return res.status(400).json({ message: 'Transaction did not succeed on the configured certificate contract' });
      }
      const issuedForCertificate = receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== contractAddress.toLowerCase()) return false;
        try {
          const parsed = certificateEvents.parseLog(log);
          return parsed?.name === 'CertificateIssued' &&
            parsed.args.certificateHash === certificate.certHash &&
            (req.user.role === 'admin' || parsed.args.issuedBy.toLowerCase() === req.user.walletAddress?.toLowerCase());
        } catch {
          return false;
        }
      });
    if (!issuedForCertificate) {
      return res.status(400).json({ message: 'Transaction does not contain an issuance event for this certificate hash' });
    }
    } catch (error) {
      console.error('Blockchain transaction lookup failed:', error.message);
      return res.status(502).json({ message: 'Could not verify the transaction on the configured blockchain' });
    }
    if (['review_required', 'unavailable'].includes(certificate.aiScreening?.status)) {
      if (req.body.reviewAcknowledged !== true) {
        return res.status(409).json({ message: 'Manual review is required before issuing this AI-flagged document' });
      }
      certificate.aiScreening.reviewAcknowledgedBy = req.user._id;
      certificate.aiScreening.reviewAcknowledgedAt = new Date();
    }
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
    const student = await User.findById(req.params.id).select('name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const certificates = await Certificate.find({ 
      student: req.params.id, 
      status: 'verified' 
    }).select('title institution issueDate certHash blockchainTx status isExternal').populate('issuedBy', 'name walletAddress');

    res.json({
      student,
      certificates
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
