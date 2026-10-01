const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { isAddress } = require('ethers');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'student', walletAddress } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Name, valid email, and password (at least 8 characters) are required' });
  }
  if (!['student', 'employer', 'institution'].includes(role)) {
    return res.status(400).json({ message: 'Invalid account type' });
  }
  if (role === 'institution' && !isAddress(walletAddress || '')) {
    return res.status(400).json({ message: 'Institution accounts must provide a valid issuing wallet address' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const userExists = await User.findOne({ email: normalizedEmail });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role,
    walletAddress,
    isApproved: role !== 'institution'
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      token: generateToken(user._id),
      walletAddress: user.walletAddress
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = await User.findOne({ email: typeof email === 'string' ? email.trim().toLowerCase() : '' });

  if (user && (await user.matchPassword(password))) {
    if (!user.isApproved) {
      return res.status(403).json({ message: 'This institution account is awaiting approval' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      token: generateToken(user._id),
      walletAddress: user.walletAddress
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

module.exports = router;
