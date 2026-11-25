/**
 * Fix My Campus - Main Application Coordinator
 * Academic Domain: Software Engineering and System Designs (SESD)
 */
const App = {
  currentUser: null,
  activeTab: 'dashboard',
  currentOpenComplaintId: null,
  notifications: [],
  audioCtx: null,

  async init() {
    console.log('[Fix My Campus] Booting SESD application...');
    
    // 1. Setup DOM event listeners
    this.setupEventListeners();

    // 2. Fetch live public statistics for the landing page
    this.loadPublicStats();

    // 3. Check existing user session
    await this.checkAuth();

    // 4. Initialize campus map
    CampusMap.init();
  },

  async loadPublicStats() {
    try {
      const res = await API.getSummaryStats();
      if (res.success && res.summary) {
        const totalEl = document.getElementById('publicStatTotal');
        const activeEl = document.getElementById('publicStatActive');
        if (totalEl) totalEl.innerText = `${res.summary.total + 140}+`;
        if (activeEl) activeEl.innerText = res.summary.inProgress + res.summary.pending;
      }
    } catch (e) {
      // Graceful fallback
    }
  },

  async checkAuth() {
    try {
      const res = await API.getMe();
      if (res.success && res.user) {
        this.setUserSession(res.user);
        this.openPortalView();
      } else {
        this.openLandingView();
      }
    } catch (err) {
      this.openLandingView();
    }
  },

  openLandingView() {
    const landing = document.getElementById('publicLandingView');
    const appWrap = document.getElementById('authenticatedAppWrap');
    if (landing) landing.style.display = 'block';
    if (appWrap) appWrap.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openPortalView() {
    const landing = document.getElementById('publicLandingView');
    const appWrap = document.getElementById('authenticatedAppWrap');
    if (landing) landing.style.display = 'none';
    if (appWrap) appWrap.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setUserSession(user) {
    this.currentUser = user;

    const nameEl = document.getElementById('topUserName');
    const roleEl = document.getElementById('topUserRole');
    const avatarEl = document.getElementById('topUserAvatar');

    if (nameEl) nameEl.innerText = user.name;
    if (roleEl) roleEl.innerText = user.role.toUpperCase();
    if (avatarEl) avatarEl.src = user.avatar || '/assets/images/default-avatar.svg';

    // Highlight active role pill
    document.querySelectorAll('.role-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.role === user.role);
    });

    // Update Header titles based on role
    const titleEl = document.getElementById('topHeaderTitle');
    const subtitleEl = document.getElementById('topHeaderSubtitle');
    if (user.role === 'admin') {
      if (titleEl) titleEl.innerText = 'Admin Command Center';
      if (subtitleEl) subtitleEl.innerText = 'Comprehensive Campus Facility Analytics & Triage';
    } else if (user.role === 'staff') {
      if (titleEl) titleEl.innerText = 'Maintenance Staff Portal';
      if (subtitleEl) subtitleEl.innerText = `Assigned Work Orders • ${user.specialization || 'Facilities'}`;
    } else {
      if (titleEl) titleEl.innerText = 'Student Campus Portal';
      if (subtitleEl) subtitleEl.innerText = 'Track Repairs & Report Infrastructure Issues';
    }

    // Configure role-based views and navigation
    this.configureRoleView(user.role);

    // Initialize Socket.IO with user
    Realtime.init(user);

    // Refresh notifications
    this.refreshNotifications();
  },

  configureRoleView(role) {
    // Hide all portal wrappers
    document.getElementById('studentPortalWrap').style.display = 'none';
    document.getElementById('adminPortalWrap').style.display = 'none';
    document.getElementById('staffPortalWrap').style.display = 'none';

    // Show active portal
    if (role === 'admin') {
      document.getElementById('adminPortalWrap').style.display = 'block';
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
      document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'none');
      AdminPortal.init();
    } else if (role === 'staff') {
      document.getElementById('staffPortalWrap').style.display = 'block';
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'flex');
      StaffPortal.init();
    } else {
      // student / faculty
      document.getElementById('studentPortalWrap').style.display = 'block';
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.student-only').forEach(el => el.style.display = 'flex');
      document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'none');
      StudentPortal.init();
    }

    this.switchTab('dashboard');
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Toggle tab sections
    document.querySelectorAll('.tab-section').forEach(sec => {
      sec.style.display = sec.dataset.tab === tabName ? 'block' : 'none';
    });

    // Close mobile sidebar if open
    document.getElementById('appSidebar')?.classList.remove('open');

    // Trigger tab-specific refresh
    if (tabName === 'map') {
      setTimeout(() => CampusMap.init(), 100);
    } else if (tabName === 'users' && this.currentUser && this.currentUser.role === 'admin') {
      AdminPortal.loadUsers();
    }
  },

  async switchRole(targetRole) {
    try {
      const res = await API.switchDemoUser(targetRole);
      if (res.success) {
        this.setUserSession(res.user);
        this.openPortalView();
        this.showToast('Role Switched', `Logged in as ${res.user.name} (${res.user.role})`, 'info');
      }
    } catch (err) {
      console.error('[Switch Role Error]', err);
    }
  },

  async quickDemoLogin(role) {
    this.closeModal('authLoginModal');
    await this.switchRole(role);
  },

  handleHeroReportClick() {
    if (this.currentUser) {
      this.openPortalView();
      this.openReportModal();
    } else {
      this.showToast('Authentication Required', 'Please sign in or select a demo account to submit complaints.', 'info');
      this.openLoginModal();
    }
  },

  async handleLogout() {
    try {
      await API.logout();
      this.currentUser = null;
      this.openLandingView();
      this.showToast('Logged Out', 'You have been signed out safely.', 'info');
    } catch (err) {
      this.openLandingView();
    }
  },

  // Auth Modals
  openLoginModal() {
    this.openModal('authLoginModal');
  },

  openRegisterModal() {
    this.openModal('authRegisterModal');
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await API.login(email, password);
      if (res.success) {
        this.closeModal('authLoginModal');
        this.setUserSession(res.user);
        this.openPortalView();
        this.showToast('Welcome!', `Signed in successfully as ${res.user.name}.`, 'success');
      }
    } catch (err) {
      this.showToast('Login Failed', err.message, 'error');
    }
  },

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const identifier = document.getElementById('regIdentifier').value;
    const department = document.getElementById('regDepartment').value;
    const phone = document.getElementById('regPhone').value;

    try {
      const res = await API.register({ name, email, password, identifier, department, phone, role: 'student' });
      if (res.success) {
        this.closeModal('authRegisterModal');
        this.setUserSession(res.user);
        this.openPortalView();
        this.showToast('Account Created', `Welcome to Fix My Campus, ${res.user.name}!`, 'success');
      }
    } catch (err) {
      this.showToast('Registration Error', err.message, 'error');
    }
  },

  // Modals management
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('show');
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('show');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    if (this.currentOpenComplaintId) {
      Realtime.leaveComplaint(this.currentOpenComplaintId);
      this.currentOpenComplaintId = null;
    }
  },

  // Report Issue Modal
  async openReportModal(preselectedBuildingId = null) {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }

    document.getElementById('reportIssueForm').reset();
    document.getElementById('reportImgPreviewBox').style.display = 'none';
    document.getElementById('reportLocationId').innerHTML = '<option value="">-- Choose building first --</option>';

    await CampusMap.populateBuildingSelector('reportBuildingGrid');

    if (preselectedBuildingId) {
      CampusMap.handleBuildingCardSelect(preselectedBuildingId);
    }

    this.openModal('reportIssueModal');
  },

  async handleReportSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('reportTitle').value;
    const category = document.getElementById('reportCategory').value;
    const buildingId = document.getElementById('reportBuildingId').value;
    const locationId = document.getElementById('reportLocationId').value;
    const specificLocation = document.getElementById('reportSpecificLocation').value;
    const priority = document.getElementById('reportPriority').value;
    const description = document.getElementById('reportDescription').value;
    const fileInput = document.getElementById('reportImageFile');

    if (!buildingId) {
      this.showToast('Building Required', 'Please select a campus building on the grid.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('buildingId', buildingId);
    if (locationId) formData.append('locationId', locationId);
    if (specificLocation) formData.append('specificLocation', specificLocation);
    if (priority) formData.append('priority', priority);
    formData.append('description', description);

    if (fileInput && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    const submitBtn = document.getElementById('btnSubmitReport');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Ticket...';
    }

    try {
      const res = await API.createComplaint(formData);
      if (res.success) {
        this.showToast('Complaint Submitted', res.message, 'success');
        this.closeModal('reportIssueModal');

        // Refresh relevant lists
        if (this.currentUser.role === 'student') {
          StudentPortal.loadComplaints();
        } else if (this.currentUser.role === 'admin') {
          AdminPortal.loadData();
        }
      }
    } catch (err) {
      this.showToast('Submission Error', err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Campus Complaint';
      }
    }
  },

  // Complaint Details & Tracker Modal
  async loadComplaintDetails(complaintId, showModal = true) {
    this.currentOpenComplaintId = complaintId;
    Realtime.joinComplaint(complaintId);

    try {
      const res = await API.getComplaintById(complaintId);
      if (!res.success) throw new Error(res.message);

      const c = res.complaint;
      this.renderComplaintModalContent(c);

      if (showModal) {
        this.openModal('complaintDetailModal');
      }
    } catch (err) {
      this.showToast('Error', err.message, 'error');
    }
  },

  renderComplaintModalContent(c) {
    document.getElementById('detailTicketNumber').innerText = `#${c.ticket_number}`;
    document.getElementById('detailTitle').innerText = c.title;
    document.getElementById('detailCategory').innerText = c.category;
    document.getElementById('detailBuilding').innerText = c.building_name;
    document.getElementById('detailLocation').innerText = c.specific_location || c.room_or_zone || 'Campus Area';
    document.getElementById('detailDate').innerText = new Date(c.created_at).toLocaleString();
    document.getElementById('detailReporter').innerText = `${c.reporter_name} (${c.reporter_email})`;
    document.getElementById('detailDescription').innerText = c.description;

    // Badges
    const statusClass = `status-${c.status.toLowerCase().replace(/\s+/g, '')}`;
    const priorityClass = `priority-${c.priority.toLowerCase()}`;
    const statusWrap = document.getElementById('detailStatusBadge');
    const priorityWrap = document.getElementById('detailPriorityBadge');

    if (statusWrap) statusWrap.innerHTML = `<span class="badge ${statusClass}"><span class="badge-dot"></span> ${c.status}</span>`;
    if (priorityWrap) priorityWrap.innerHTML = `<span class="badge ${priorityClass}">${c.priority}</span>`;

    // Staff
    const staffBox = document.getElementById('detailStaffBox');
    if (staffBox) {
      staffBox.innerHTML = c.staff_name 
        ? `<div style="display:flex; align-items:center; gap:0.5rem;">
             <i class="fa-solid fa-user-gear" style="color:var(--accent); font-size:1.1rem;"></i>
             <div>
               <strong>${c.staff_name}</strong>
               <div style="font-size:0.75rem; color:var(--text-muted);">${c.staff_specialization || 'Maintenance Specialist'}</div>
             </div>
           </div>`
        : `<span style="color:var(--text-muted); font-style:italic;">Pending Assignment</span>`;
    }

    // Photographs
    const photoContainer = document.getElementById('detailPhotosContainer');
    if (photoContainer) {
      let photosHtml = '';
      if (c.image_url) {
        photosHtml += `
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">REPORTED ISSUE PHOTO</div>
            <img src="${c.image_url}" alt="Report Photo" style="width:100%; max-height:220px; object-fit:cover; border-radius:var(--radius-md); border:1px solid var(--border-color); cursor:pointer;" onclick="window.open('${c.image_url}', '_blank')" />
          </div>
        `;
      }
      if (c.resolution_image_url) {
        photosHtml += `
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--success); margin-bottom:0.25rem;"><i class="fa-solid fa-circle-check"></i> PROOF OF RESOLUTION PHOTO</div>
            <img src="${c.resolution_image_url}" alt="Resolution Photo" style="width:100%; max-height:220px; object-fit:cover; border-radius:var(--radius-md); border:2px solid var(--success); cursor:pointer;" onclick="window.open('${c.resolution_image_url}', '_blank')" />
          </div>
        `;
      }
      photoContainer.innerHTML = photosHtml;
    }

    // Resolution Notes
    const notesBox = document.getElementById('detailResolutionNotesBox');
    if (notesBox) {
      if (c.resolution_notes) {
        notesBox.style.display = 'block';
        document.getElementById('detailResolutionNotesText').innerText = c.resolution_notes;
      } else {
        notesBox.style.display = 'none';
      }
    }

    // Stepper Tracker
    this.updateStepperProgress(c.status);

    // Timeline History
    const historyList = document.getElementById('detailTimelineList');
    if (historyList) {
      historyList.innerHTML = (c.history || []).map(h => `
        <div class="timeline-entry">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">${h.action_title}</span>
              <span class="timeline-time">${new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(h.created_at).toLocaleDateString()}</span>
            </div>
            <div class="timeline-text">${h.comment || ''}</div>
          </div>
        </div>
      `).join('');
    }

    // Feedback Section
    const feedbackWrap = document.getElementById('detailFeedbackWrap');
    if (feedbackWrap) {
      if (c.status === 'Resolved') {
        feedbackWrap.style.display = 'block';
        if (c.feedback) {
          const stars = '★'.repeat(c.feedback.rating) + '☆'.repeat(5 - c.feedback.rating);
          feedbackWrap.innerHTML = `
            <div style="background:var(--success-light); padding:1rem; border-radius:var(--radius-md); border:1px solid #a7f3d0;">
              <div style="font-weight:700; color:#065f46; display:flex; justify-content:space-between;">
                <span>Student Review</span>
                <span style="color:#d97706; font-size:1.1rem;">${stars} (${c.feedback.rating}/5)</span>
              </div>
              <p style="font-size:0.85rem; color:#047857; margin-top:0.35rem;">"${c.feedback.comment || 'No comment provided.'}"</p>
            </div>
          `;
        } else if (this.currentUser && this.currentUser.role === 'student' && c.user_id === this.currentUser.id) {
          feedbackWrap.innerHTML = `
            <div style="text-align:center; padding:1rem; background:var(--secondary-light); border-radius:var(--radius-md);">
              <p style="font-size:0.85rem; margin-bottom:0.75rem;">This campus issue was marked resolved. How was the maintenance service?</p>
              <button class="btn btn-accent btn-sm" onclick="App.openFeedbackModal(${c.id})">
                <i class="fa-solid fa-star"></i> Leave Rating & Review
              </button>
            </div>
          `;
        } else {
          feedbackWrap.innerHTML = `<p style="font-size:0.8rem; color:var(--text-light); font-style:italic;">Awaiting student rating & feedback.</p>`;
        }
      } else {
        feedbackWrap.style.display = 'none';
      }
    }
  },

  updateStepperProgress(status) {
    const steps = ['Pending', 'Assigned', 'In Progress', 'Resolved'];
    const idx = steps.indexOf(status);

    const stepNodes = document.querySelectorAll('.tracker-stepper .step-node');
    const fillEl = document.getElementById('stepperProgressFill');

    stepNodes.forEach((node, i) => {
      node.classList.remove('active', 'completed');
      if (i < idx) {
        node.classList.add('completed');
      } else if (i === idx) {
        node.classList.add('active');
      }
    });

    if (fillEl) {
      if (idx === -1) {
        fillEl.style.width = '0%';
      } else {
        const pct = (idx / (steps.length - 1)) * 100;
        fillEl.style.width = `${pct}%`;
      }
    }
  },

  // Feedback Modal
  openFeedbackModal(complaintId) {
    document.getElementById('feedbackComplaintId').value = complaintId;
    document.getElementById('feedbackRatingVal').value = 5;
    document.getElementById('feedbackComment').value = '';
    this.updateStarRatingDisplay(5);
    this.openModal('feedbackModal');
  },

  updateStarRatingDisplay(rating) {
    document.querySelectorAll('#starRatingBox i').forEach(star => {
      const val = Number(star.dataset.val);
      star.classList.toggle('selected', val <= rating);
    });
  },

  async handleFeedbackSubmit(e) {
    e.preventDefault();
    const complaintId = document.getElementById('feedbackComplaintId').value;
    const rating = document.getElementById('feedbackRatingVal').value;
    const comment = document.getElementById('feedbackComment').value;

    try {
      const res = await API.submitFeedback(complaintId, rating, comment);
      if (res.success) {
        this.showToast('Thank You!', res.message, 'success');
        this.closeModal('feedbackModal');
        if (this.currentOpenComplaintId === Number(complaintId)) {
          this.loadComplaintDetails(complaintId, false);
        }
        if (this.currentUser && this.currentUser.role === 'student') {
          StudentPortal.loadComplaints();
        }
      }
    } catch (err) {
      this.showToast('Error', err.message, 'error');
    }
  },

  // Notifications
  async refreshNotifications() {
    if (!this.currentUser) return;
    try {
      const res = await API.getNotifications();
      if (res.success) {
        this.notifications = res.notifications;
        const unreadBadge = document.getElementById('notifUnreadDot');
        if (unreadBadge) {
          unreadBadge.style.display = res.unreadCount > 0 ? 'block' : 'none';
        }
        this.renderNotificationsList();
      }
    } catch (err) {
      console.warn('Could not refresh notifications', err);
    }
  },

  renderNotificationsList() {
    const list = document.getElementById('notifListContainer');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-light); font-size: 0.85rem;">No notifications yet.</div>`;
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="App.handleNotifClick(${n.id}, ${n.complaint_id})">
        <div class="notif-icon ${n.type || 'info'}">
          <i class="fa-solid ${n.type === 'success' ? 'fa-check' : (n.type === 'danger' ? 'fa-triangle-exclamation' : 'fa-bell')}"></i>
        </div>
        <div class="notif-body">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.message}</div>
          <div class="notif-time">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(n.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    `).join('');
  },

  async handleNotifClick(notifId, complaintId) {
    await API.markNotificationRead(notifId);
    this.refreshNotifications();
    document.getElementById('notificationsDropdown')?.classList.remove('show');
    if (complaintId) {
      this.loadComplaintDetails(complaintId);
    }
  },

  async markAllNotificationsRead() {
    await API.markAllNotificationsRead();
    this.refreshNotifications();
    this.showToast('Notifications', 'All marked as read.', 'info');
  },

  toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  },

  // Toast System
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  // Audio Chime via Web Audio API
  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio playback restrictions or unsupported
    }
  },

  setupEventListeners() {
    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        document.getElementById('appSidebar')?.classList.toggle('open');
      });
    }

    // Role switcher pills
    document.querySelectorAll('.role-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const role = pill.dataset.role;
        this.switchRole(role);
      });
    });

    // Nav items
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
      item.addEventListener('click', () => {
        this.switchTab(item.dataset.tab);
      });
    });

    // Image preview for file upload
    const fileInput = document.getElementById('reportImageFile');
    const previewBox = document.getElementById('reportImgPreviewBox');
    const previewImg = document.getElementById('reportImgPreview');
    const removeImgBtn = document.getElementById('removeReportImgBtn');

    if (fileInput && previewBox && previewImg) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            previewImg.src = re.target.result;
            previewBox.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => {
        fileInput.value = '';
        previewBox.style.display = 'none';
        previewImg.src = '';
      });
    }

    // Drag and drop for upload area
    const dropArea = document.getElementById('reportDropArea');
    if (dropArea) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropArea.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropArea.classList.remove('dragover');
        });
      });
      dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0 && fileInput) {
          fileInput.files = files;
          fileInput.dispatchEvent(new Event('change'));
        }
      });
    }

    // Star rating interactions
    document.querySelectorAll('#starRatingBox i').forEach(star => {
      star.addEventListener('mouseover', () => {
        const val = Number(star.dataset.val);
        document.querySelectorAll('#starRatingBox i').forEach(s => {
          s.classList.toggle('hovered', Number(s.dataset.val) <= val);
        });
      });
      star.addEventListener('mouseout', () => {
        document.querySelectorAll('#starRatingBox i').forEach(s => s.classList.remove('hovered'));
      });
      star.addEventListener('click', () => {
        const val = Number(star.dataset.val);
        document.getElementById('feedbackRatingVal').value = val;
        this.updateStarRatingDisplay(val);
      });
    });

    // Close notifications dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const btn = document.getElementById('notifBellBtn');
      const dropdown = document.getElementById('notificationsDropdown');
      if (dropdown && !dropdown.contains(e.target) && btn && !btn.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });

    // Form Submissions
    document.getElementById('authLoginForm')?.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    document.getElementById('authRegisterForm')?.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
    document.getElementById('reportIssueForm')?.addEventListener('submit', (e) => this.handleReportSubmit(e));
    document.getElementById('assignStaffForm')?.addEventListener('submit', (e) => AdminPortal.handleAssignSubmit(e));
    document.getElementById('setPriorityForm')?.addEventListener('submit', (e) => AdminPortal.handlePrioritySubmit(e));
    document.getElementById('updateStatusForm')?.addEventListener('submit', (e) => AdminPortal.handleStatusSubmit(e));
    document.getElementById('addStaffForm')?.addEventListener('submit', (e) => AdminPortal.handleAddStaffSubmit(e));
    document.getElementById('feedbackForm')?.addEventListener('submit', (e) => this.handleFeedbackSubmit(e));
  }
};

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
