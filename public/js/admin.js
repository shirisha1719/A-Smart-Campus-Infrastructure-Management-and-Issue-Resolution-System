/**
 * Fix My Campus - Admin Portal Controller
 */
const AdminPortal = {
  complaints: [],
  staffList: [],
  usersList: [],
  stats: null,
  activeSubTab: 'overview', // 'overview', 'complaints', 'users'

  async init() {
    await this.loadData();
    await this.loadStaff();
    this.setupEventListeners();
  },

  async loadData() {
    try {
      // 1. Fetch dashboard statistics
      const statsRes = await API.getDashboardStats();
      if (statsRes.success) {
        this.stats = statsRes.stats;
        this.renderKPIs(this.stats);
        AnalyticsCharts.initCharts(this.stats);
      }

      // 2. Fetch all complaints
      await this.loadComplaints();
    } catch (err) {
      console.error('[Admin Portal Data Error]', err);
    }
  },

  async loadComplaints() {
    try {
      const status = document.getElementById('adminFilterStatus')?.value || '';
      const category = document.getElementById('adminFilterCategory')?.value || '';
      const priority = document.getElementById('adminFilterPriority')?.value || '';
      const buildingId = document.getElementById('adminFilterBuilding')?.value || '';
      const search = document.getElementById('adminSearchInput')?.value || '';

      const res = await API.getComplaints({ status, category, priority, buildingId, search });
      if (res.success) {
        this.complaints = res.complaints;
        this.renderComplaintsTable();
      }
    } catch (err) {
      console.error('[Admin Load Complaints Error]', err);
    }
  },

  async loadStaff() {
    try {
      const res = await API.getStaff();
      if (res.success) {
        this.staffList = res.staff;
      }
    } catch (err) {
      console.error('[Admin Staff Error]', err);
    }
  },

  async loadUsers(roleFilter = '') {
    try {
      const res = await API.getUsers(roleFilter);
      if (res.success) {
        this.usersList = res.users;
        this.renderUsersTable();
      }
    } catch (err) {
      console.error('[Admin Users Error]', err);
    }
  },

  renderKPIs(s) {
    const totalEl = document.getElementById('adminKpiTotal');
    const pendingEl = document.getElementById('adminKpiPending');
    const progressEl = document.getElementById('adminKpiProgress');
    const rateEl = document.getElementById('adminKpiRate');
    const avgTimeEl = document.getElementById('adminKpiAvgTime');

    if (totalEl) totalEl.innerText = s.total || 0;
    if (pendingEl) pendingEl.innerText = s.pending || 0;
    if (progressEl) progressEl.innerText = (s.inProgress || 0) + (s.assigned || 0);
    if (rateEl) rateEl.innerText = `${s.resolutionRate || 0}%`;
    if (avgTimeEl) avgTimeEl.innerText = `${s.avgResolutionHours || 0} hrs`;
  },

  renderComplaintsTable() {
    const tbody = document.getElementById('adminComplaintsTbody');
    const countBadge = document.getElementById('adminComplaintsCount');
    if (countBadge) countBadge.innerText = `${this.complaints.length} tickets`;
    if (!tbody) return;

    if (this.complaints.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            No campus complaints match your active filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.complaints.map(c => {
      const statusClass = `status-${c.status.toLowerCase().replace(/\s+/g, '')}`;
      const priorityClass = `priority-${c.priority.toLowerCase()}`;
      
      const staffDisplay = c.staff_name 
        ? `<div style="font-weight: 600;"><i class="fa-solid fa-user-check" style="color:var(--success); font-size: 0.8rem;"></i> ${c.staff_name}</div>
           <div style="font-size: 0.72rem; color: var(--text-muted);">${c.staff_specialization || 'Maintenance'}</div>`
        : `<button class="btn btn-sm btn-outline" style="border-style: dashed; font-size: 0.75rem;" onclick="AdminPortal.openAssignModal(${c.id})">
             <i class="fa-solid fa-user-plus"></i> Assign Staff
           </button>`;

      return `
        <tr>
          <td>
            <strong>#${c.ticket_number}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${new Date(c.created_at).toLocaleDateString()}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${c.title}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${c.specific_location || c.building_name}</div>
          </td>
          <td><span class="badge" style="background:var(--secondary-light); color:var(--text-main);">${c.category}</span></td>
          <td>
            <span class="badge ${priorityClass}" style="cursor: pointer;" onclick="AdminPortal.openPriorityModal(${c.id}, '${c.priority}')" title="Click to change priority">
              ${c.priority} <i class="fa-solid fa-caret-down" style="font-size: 0.7rem; margin-left: 2px;"></i>
            </span>
          </td>
          <td>
            <span class="badge ${statusClass}">
              <span class="badge-dot"></span> ${c.status}
            </span>
          </td>
          <td>${staffDisplay}</td>
          <td>
            <div style="font-size: 0.82rem; font-weight: 600;">${c.reporter_name}</div>
            <div style="font-size: 0.72rem; color: var(--text-light);">${c.reporter_id || ''}</div>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-sm btn-outline" onclick="App.loadComplaintDetails(${c.id})" title="View Details">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-primary" onclick="AdminPortal.openAssignModal(${c.id})" title="Assign / Reassign Staff">
                <i class="fa-solid fa-user-gear"></i>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="AdminPortal.openStatusModal(${c.id}, '${c.status}')" title="Update Status">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderUsersTable() {
    const tbody = document.getElementById('adminUsersTbody');
    if (!tbody) return;

    if (this.usersList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.usersList.map(u => {
      const isStaff = u.role === 'staff';
      const roleBadge = u.role === 'admin' 
        ? `<span class="badge" style="background:#fee2e2; color:#b91c1c;">Admin</span>`
        : (u.role === 'staff' 
          ? `<span class="badge" style="background:#e0e7ff; color:#3730a3;">Staff (${u.specialization || 'General'})</span>`
          : `<span class="badge" style="background:#ecfdf5; color:#065f46;">Student</span>`);

      const statusBadge = u.status === 'active'
        ? `<span class="badge" style="background:#d1fae5; color:#065f46;"><span class="badge-dot" style="background:#10b981;"></span> Active</span>`
        : `<span class="badge" style="background:#f1f5f9; color:#64748b;">Inactive</span>`;

      return `
        <tr>
          <td><strong>${u.id}</strong></td>
          <td>
            <div style="font-weight: 700;">${u.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-light);">${u.identifier || 'No ID'}</div>
          </td>
          <td>${u.email}</td>
          <td>${roleBadge}</td>
          <td>${u.department || 'N/A'}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="AdminPortal.toggleUserStatus(${u.id}, '${u.status}')">
              ${u.status === 'active' ? '<i class="fa-solid fa-ban" style="color:#ef4444;"></i> Deactivate' : '<i class="fa-solid fa-check" style="color:#10b981;"></i> Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async toggleUserStatus(userId, currentStatus) {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await API.updateUserStatus(userId, nextStatus);
      if (res.success) {
        App.showToast('User Updated', `User account status changed to ${nextStatus}.`, 'success');
        this.loadUsers();
      }
    } catch (err) {
      App.showToast('Error', err.message, 'error');
    }
  },

  // Modals Handlers
  openAssignModal(complaintId) {
    const complaint = this.complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    document.getElementById('assignComplaintId').value = complaint.id;
    document.getElementById('assignTicketNumber').innerText = `#${complaint.ticket_number}`;
    document.getElementById('assignTitle').innerText = complaint.title;
    document.getElementById('assignCategory').innerText = complaint.category;
    document.getElementById('assignPrioritySelect').value = complaint.priority;

    // Populate Staff select options
    const staffSelect = document.getElementById('assignStaffSelect');
    staffSelect.innerHTML = '<option value="">-- Choose Maintenance Specialist --</option>' +
      this.staffList.map(s => `
        <option value="${s.id}" ${complaint.assigned_to === s.id ? 'selected' : ''}>
          ${s.name} - ${s.specialization || 'Maintenance'} (${s.department || 'Facilities'})
        </option>
      `).join('');

    App.openModal('assignStaffModal');
  },

  async handleAssignSubmit(e) {
    e.preventDefault();
    const complaintId = document.getElementById('assignComplaintId').value;
    const staffId = document.getElementById('assignStaffSelect').value;
    const priority = document.getElementById('assignPrioritySelect').value;
    const comment = document.getElementById('assignComment').value;

    if (!staffId) {
      App.showToast('Selection Required', 'Please choose a maintenance staff member.', 'warning');
      return;
    }

    try {
      const res = await API.assignComplaint(complaintId, staffId, priority, comment);
      if (res.success) {
        App.showToast('Work Order Assigned', res.message, 'success');
        App.closeModal('assignStaffModal');
        this.loadData();
      }
    } catch (err) {
      App.showToast('Assignment Error', err.message, 'error');
    }
  },

  openPriorityModal(complaintId, currentPriority) {
    const complaint = this.complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    document.getElementById('priorityComplaintId').value = complaint.id;
    document.getElementById('priorityTicketNumber').innerText = `#${complaint.ticket_number}`;
    document.getElementById('prioritySelectVal').value = currentPriority;
    document.getElementById('priorityReason').value = '';

    App.openModal('setPriorityModal');
  },

  async handlePrioritySubmit(e) {
    e.preventDefault();
    const complaintId = document.getElementById('priorityComplaintId').value;
    const priority = document.getElementById('prioritySelectVal').value;
    const reason = document.getElementById('priorityReason').value;

    try {
      const res = await API.updateComplaintPriority(complaintId, priority, reason);
      if (res.success) {
        App.showToast('Priority Updated', `Priority set to ${priority}`, 'success');
        App.closeModal('setPriorityModal');
        this.loadData();
      }
    } catch (err) {
      App.showToast('Priority Error', err.message, 'error');
    }
  },

  openStatusModal(complaintId, currentStatus) {
    document.getElementById('statusComplaintId').value = complaintId;
    document.getElementById('statusSelectVal').value = currentStatus;
    document.getElementById('statusNote').value = '';
    App.openModal('updateStatusModal');
  },

  async handleStatusSubmit(e) {
    e.preventDefault();
    const complaintId = document.getElementById('statusComplaintId').value;
    const status = document.getElementById('statusSelectVal').value;
    const note = document.getElementById('statusNote').value;
    const fileInput = document.getElementById('statusResolutionPhoto');

    const formData = new FormData();
    formData.append('status', status);
    formData.append('note', note);
    if (fileInput && fileInput.files[0]) {
      formData.append('resolutionImage', fileInput.files[0]);
    }

    try {
      const res = await API.updateComplaintStatus(complaintId, formData);
      if (res.success) {
        App.showToast('Status Updated', res.message, 'success');
        App.closeModal('updateStatusModal');
        this.loadData();
      }
    } catch (err) {
      App.showToast('Status Error', err.message, 'error');
    }
  },

  openAddStaffModal() {
    document.getElementById('addStaffForm').reset();
    App.openModal('addStaffModal');
  },

  async handleAddStaffSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('staffName').value;
    const email = document.getElementById('staffEmail').value;
    const password = document.getElementById('staffPassword').value;
    const specialization = document.getElementById('staffSpecialization').value;
    const department = document.getElementById('staffDepartment').value;
    const phone = document.getElementById('staffPhone').value;

    try {
      const res = await API.createUser({
        name,
        email,
        password,
        role: 'staff',
        specialization,
        department,
        phone,
        identifier: `STF-${Date.now().toString().slice(-4)}`
      });

      if (res.success) {
        App.showToast('Staff Member Created', `Account for ${res.user.name} created successfully!`, 'success');
        App.closeModal('addStaffModal');
        this.loadStaff();
        this.loadUsers('staff');
      }
    } catch (err) {
      App.showToast('Creation Failed', err.message, 'error');
    }
  },

  setupEventListeners() {
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.loadComplaints());
    }

    ['adminFilterStatus', 'adminFilterCategory', 'adminFilterPriority', 'adminFilterBuilding'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.loadComplaints());
    });
  }
};
