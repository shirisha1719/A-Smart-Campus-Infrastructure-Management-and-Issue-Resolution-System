/**
 * Fix My Campus - REST API Client Module
 */
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {};

    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({
        success: false,
        message: `HTTP Error ${response.status}: ${response.statusText}`
      }));

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async login(email, password, role) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
  },

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },

  async switchDemoUser(targetRole) {
    return this.request('/auth/switch-demo-user', {
      method: 'POST',
      body: JSON.stringify({ targetRole })
    });
  },

  // Campus Endpoints
  async getBuildings() {
    return this.request('/campus/buildings');
  },

  async getLocations(buildingId) {
    const q = buildingId ? `?buildingId=${buildingId}` : '';
    return this.request(`/campus/locations${q}`);
  },

  async getMapData() {
    return this.request('/campus/map-data');
  },

  // Complaints Endpoints
  async getComplaints(params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/complaints${qStr}`);
  },

  async getComplaintById(id) {
    return this.request(`/complaints/${id}`);
  },

  async createComplaint(formData) {
    return this.request('/complaints', {
      method: 'POST',
      body: formData // FormData with file
    });
  },

  async updateComplaintStatus(id, formData) {
    return this.request(`/complaints/${id}/status`, {
      method: 'PUT',
      body: formData // FormData with optional resolutionImage
    });
  },

  async updateComplaintPriority(id, priority, reason) {
    return this.request(`/complaints/${id}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority, reason })
    });
  },

  async assignComplaint(id, staffId, priority, comment) {
    return this.request(`/complaints/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ staffId, priority, comment })
    });
  },

  async submitFeedback(id, rating, comment) {
    return this.request(`/complaints/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  },

  // Stats Endpoints
  async getDashboardStats() {
    return this.request('/stats/dashboard');
  },

  async getSummaryStats() {
    return this.request('/stats/summary');
  },

  // User Management
  async getUsers(role) {
    const q = role ? `?role=${role}` : '';
    return this.request(`/users${q}`);
  },

  async getStaff() {
    return this.request('/users/staff');
  },

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUserStatus(userId, status) {
    return this.request(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  },

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  }
};
