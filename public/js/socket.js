/**
 * Fix My Campus - Real-time Socket.IO Client Module
 */
const Realtime = {
  socket: null,
  currentUser: null,

  init(user) {
    this.currentUser = user;
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client library not loaded.');
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[Realtime] Connected to live updates. Socket ID:', this.socket.id);
      if (this.currentUser) {
        this.socket.emit('join', {
          id: this.currentUser.id,
          role: this.currentUser.role,
          name: this.currentUser.name
        });
      }
    });

    // Handle generic incoming notification
    this.socket.on('notification', (notif) => {
      App.showToast(notif.title, notif.message, notif.type || 'info');
      App.refreshNotifications();
      App.playNotificationSound();
    });

    // Handle new complaint submitted (Admin & Staff)
    this.socket.on('complaint:new', (data) => {
      console.log('[Realtime] New complaint event:', data);
      if (App.currentUser && (App.currentUser.role === 'admin' || App.currentUser.role === 'staff')) {
        App.showToast('New Issue Reported', data.message, 'warning');
        App.playNotificationSound();
        if (App.activeTab === 'complaints' || App.activeTab === 'dashboard') {
          if (typeof AdminPortal !== 'undefined') AdminPortal.loadData();
          if (typeof StaffPortal !== 'undefined') StaffPortal.loadData();
        }
      }
    });

    // Handle complaint update for student
    this.socket.on('complaint:my_update', (data) => {
      console.log('[Realtime] My complaint updated:', data);
      if (App.currentUser && App.currentUser.role === 'student') {
        App.showToast(`Issue Update: ${data.complaint.ticket_number}`, data.message, 'info');
        App.playNotificationSound();
        if (typeof StudentPortal !== 'undefined') {
          StudentPortal.loadComplaints();
        }
      }
    });

    // Handle complaint assignment for staff
    this.socket.on('complaint:assigned_update', (data) => {
      console.log('[Realtime] Assigned work order update:', data);
      if (App.currentUser && App.currentUser.role === 'staff') {
        App.showToast('Work Order Assigned', data.message, 'warning');
        App.playNotificationSound();
        if (typeof StaffPortal !== 'undefined') {
          StaffPortal.loadData();
        }
      }
    });

    // Handle admin changes
    this.socket.on('complaint:changed', (data) => {
      if (App.currentUser && App.currentUser.role === 'admin') {
        if (typeof AdminPortal !== 'undefined' && App.activeTab === 'dashboard') {
          AdminPortal.loadData();
        }
      }
    });

    // Handle real-time updates inside Complaint Details modal
    this.socket.on('complaint:update', (data) => {
      if (App.currentOpenComplaintId && App.currentOpenComplaintId === data.complaint.id) {
        App.loadComplaintDetails(data.complaint.id, false); // silent refresh of modal
      }
    });
  },

  joinComplaint(complaintId) {
    if (this.socket && complaintId) {
      this.socket.emit('join_complaint', complaintId);
    }
  },

  leaveComplaint(complaintId) {
    if (this.socket && complaintId) {
      this.socket.emit('leave_complaint', complaintId);
    }
  }
};
