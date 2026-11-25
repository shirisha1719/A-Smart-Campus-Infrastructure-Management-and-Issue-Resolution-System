let ioInstance = null;

function initSockets(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Client sends user identity on connect or join
    socket.on('join', (userData) => {
      if (userData && userData.id) {
        socket.join(`user:${userData.id}`);
        if (userData.role) {
          socket.join(`role:${userData.role}`);
        }
        socket.emit('joined', { success: true, user: userData.id, role: userData.role });
      }
    });

    socket.on('join_complaint', (complaintId) => {
      socket.join(`complaint:${complaintId}`);
    });

    socket.on('leave_complaint', (complaintId) => {
      socket.leave(`complaint:${complaintId}`);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function notifyUser(userId, notification) {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit('notification', notification);
  }
}

function notifyComplaintUpdate(complaint, changeType, message) {
  if (!ioInstance || !complaint) return;

  const payload = {
    complaint,
    changeType,
    message,
    timestamp: new Date().toISOString()
  };

  // Broadcast to complaint room
  ioInstance.to(`complaint:${complaint.id}`).emit('complaint:update', payload);

  // Notify Admin role room
  ioInstance.to('role:admin').emit('complaint:changed', payload);

  // Notify assigned staff
  if (complaint.assigned_to) {
    ioInstance.to(`user:${complaint.assigned_to}`).emit('complaint:assigned_update', payload);
  }

  // Notify reporting student
  if (complaint.user_id) {
    ioInstance.to(`user:${complaint.user_id}`).emit('complaint:my_update', payload);
  }
}

function notifyNewComplaint(complaint) {
  if (!ioInstance || !complaint) return;

  const payload = {
    complaint,
    message: `New Issue Reported: ${complaint.title} (${complaint.category})`,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all admins and staff
  ioInstance.to('role:admin').emit('complaint:new', payload);
  ioInstance.to('role:staff').emit('complaint:new', payload);
}

module.exports = {
  initSockets,
  getIO,
  notifyUser,
  notifyComplaintUpdate,
  notifyNewComplaint
};
