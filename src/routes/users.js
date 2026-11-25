const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/users/staff (Accessible to Admin and Staff)
router.get('/staff', requireAuth, async (req, res) => {
  try {
    const staffList = await db.getAllUsers('staff');
    return res.json({ success: true, staff: staffList });
  } catch (err) {
    console.error('[Get Staff Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch maintenance staff list.' });
  }
});

// GET /api/users (Admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const users = await db.getAllUsers(role || null);
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('[Get Users Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch users.' });
  }
});

// POST /api/users (Admin create new staff / student / admin)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, identifier, department, phone, specialization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const existing = await db.findUserByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const newUser = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      identifier: identifier ? identifier.trim() : null,
      department: department ? department.trim() : null,
      phone: phone ? phone.trim() : null,
      specialization: specialization ? specialization.trim() : null
    });

    return res.status(201).json({
      success: true,
      message: `User ${newUser.name} created successfully as ${newUser.role}.`,
      user: newUser
    });
  } catch (err) {
    console.error('[Create User Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/users/:id/status (Admin toggle active status)
router.put('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "active" or "inactive".' });
    }

    const updated = await db.updateUser(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: `User status changed to ${status}.`,
      user: updated
    });
  } catch (err) {
    console.error('[Update User Status Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

module.exports = router;
