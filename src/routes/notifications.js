const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const notifications = await db.getNotifications(user.id);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    return res.json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (err) {
    console.error('[Notifications Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch notifications.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    await db.markNotificationRead(req.params.id, user.id);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('[Mark Read Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    await db.markAllNotificationsRead(user.id);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[Mark All Read Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
});

module.exports = router;
