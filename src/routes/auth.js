const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await db.findUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'This account is inactive. Please contact the administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
    }

    // Optional role check if logging into a role-specific portal
    if (role && role !== user.role && !(user.role === 'admin')) {
      // allow admin to access all portals
      return res.status(403).json({ success: false, message: `Access denied. You do not have permissions for the ${role} portal.` });
    }

    // Save session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      identifier: user.identifier,
      department: user.department,
      phone: user.phone,
      specialization: user.specialization,
      avatar: user.avatar || '/assets/images/default-avatar.svg'
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: req.session.user
    });
  } catch (err) {
    console.error('[Auth Error]', err);
    return res.status(500).json({ success: false, message: 'An unexpected server error occurred during login.' });
  }
});

// POST /api/auth/register (Student / Faculty)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, identifier, department, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existing = await db.findUserByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const assignedRole = role === 'faculty' ? 'student' : (role === 'student' ? 'student' : 'student'); // self-register is student role
    const newUser = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: assignedRole,
      identifier: identifier ? identifier.trim() : `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      department: department ? department.trim() : 'General Studies',
      phone: phone ? phone.trim() : null
    });

    // Auto login
    req.session.user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      identifier: newUser.identifier,
      department: newUser.department,
      phone: newUser.phone,
      avatar: '/assets/images/default-avatar.svg'
    };

    // Welcome notification
    await db.createNotification(newUser.id, null, 'Welcome to Fix My Campus!', 'You can now report maintenance issues, track live repairs, and submit resolution feedback.', 'success');

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      user: req.session.user
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ success: false, message: 'Registration failed due to a server error.' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ success: true, user: req.session.user });
  }
  return res.json({ success: false, user: null });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Logout failed.' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully.' });
    });
  } else {
    return res.json({ success: true, message: 'Already logged out.' });
  }
});

// POST /api/auth/switch-demo-user (Instant demo switch for testing)
router.post('/switch-demo-user', async (req, res) => {
  const { targetRole } = req.body;
  let targetEmail = 'student@campus.edu';
  if (targetRole === 'admin') targetEmail = 'admin@campus.edu';
  if (targetRole === 'staff') targetEmail = 'electrician@campus.edu';

  const user = await db.findUserByEmail(targetEmail);
  if (user) {
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      identifier: user.identifier,
      department: user.department,
      phone: user.phone,
      specialization: user.specialization,
      avatar: user.avatar || '/assets/images/default-avatar.svg'
    };
    return res.json({ success: true, user: req.session.user, message: `Switched session to ${user.name} (${user.role})` });
  }
  return res.status(404).json({ success: false, message: 'Target demo account not found' });
});

module.exports = router;
