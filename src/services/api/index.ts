import axios, { AxiosResponse } from 'axios';

// ─── Axios Instance ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request: attach JWT ───────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  // Primary: direct key written by setAuth / onRehydrateStorage
  let token = localStorage.getItem('golpo_token');

  // Fallback: read from Zustand persist blob in case primary key is missing
  if (!token) {
    try {
      const raw = localStorage.getItem('golpo_auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        token = parsed?.state?.token ?? null;
        // Restore primary key so next requests don't need fallback
        if (token) localStorage.setItem('golpo_token', token);
      }
    } catch { /* ignore parse errors */ }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response: unwrap { success, data } wrapper + handle errors ────────────
api.interceptors.response.use(
  (res: AxiosResponse) => {
    // Backend TransformInterceptor wraps: { success: true, data: ..., timestamp }
    // Unwrap so every caller gets res.data as the actual payload
    if (
      res.data &&
      typeof res.data === 'object' &&
      'success' in res.data &&
      'data' in res.data
    ) {
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('golpo_token');
      localStorage.removeItem('golpo_user');
      window.location.href = '/auth/login';
    }
    // Surface the clearest error message to callers
    err.displayMessage =
      err.response?.data?.message ||
      err.response?.data?.data?.message ||
      err.message ||
      'Something went wrong';
    return Promise.reject(err);
  },
);

export default api;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data: { email: string; nickname: string; password: string; phone?: string }) =>
    api.post<{ message: string }>('/auth/signup', data),

  login: (email: string, password: string) =>
    api.post<{
      token?: string;
      user?: { id: string; email: string; nickname: string; phone?: string; avatarUrl?: string; publicKey?: string };
      requiresVerification?: boolean;
      message?: string;
    }>('/auth/login', { email, password }),

  verifyOtp: (email: string, code: string) =>
    api.post<{
      token: string;
      user: {
        id: string;
        email: string;
        nickname: string;
        phone?: string;
        avatarUrl?: string;
        publicKey?: string;
      };
    }>('/auth/verify-otp', { email, code }),

  resendOtp: (email: string) =>
    api.post<{ message: string }>('/auth/resend-otp', { email }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me'),

  getUser: (id: string) => api.get(`/users/${id}`),

  searchUsers: (q: string) =>
    api.get(`/users/search?q=${encodeURIComponent(q.trim())}`),

  updateProfile: (data: { nickname?: string; phone?: string; publicKey?: string }) =>
    api.patch('/users/me', data),

  updateAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch('/users/me/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateFcmToken: (token: string) =>
    api.patch('/users/me/fcm-token', { token }),

  updatePublicKey: (publicKey: string) =>
    api.patch('/users/me', { publicKey }),

  blockUser: (id: string) => api.post(`/users/block/${id}`),
  unblockUser: (id: string) => api.delete(`/users/block/${id}`),
  getBlocked: () => api.get('/users/me/blocked'),

  pinChat: (chatId: string) => api.post(`/users/me/pin/${chatId}`),
  unpinChat: (chatId: string) => api.delete(`/users/me/pin/${chatId}`),

  archiveChat: (chatId: string) => api.post(`/users/me/archive/${chatId}`),
  unarchiveChat: (chatId: string) => api.delete(`/users/me/archive/${chatId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// CHATS
// ─────────────────────────────────────────────────────────────────────────────
export const chatsApi = {
  getMyChats: () => api.get('/chats'),

  getOrCreateDm: (targetId: string) => api.post(`/chats/dm/${targetId}`),

  createGroup: (data: { name: string; memberIds: string[] }, avatar?: File) => {
    const fd = new FormData();
    fd.append('name', data.name);
    data.memberIds.forEach((id) => fd.append('memberIds', id));
    if (avatar) fd.append('avatar', avatar);
    return api.post('/chats/group', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getChatDetails: (id: string) => api.get(`/chats/${id}`),

  addMember: (chatId: string, userId: string) =>
    api.post(`/chats/${chatId}/members/${userId}`),

  removeMember: (chatId: string, userId: string) =>
    api.delete(`/chats/${chatId}/members/${userId}`),

  leaveGroup: (chatId: string) => api.delete(`/chats/${chatId}/leave`),

  updateGroup: (chatId: string, data: { name?: string }, avatar?: File) => {
    const fd = new FormData();
    if (data.name) fd.append('name', data.name);
    if (avatar) fd.append('avatar', avatar);
    return api.patch(`/chats/${chatId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
export const messagesApi = {
  // Cursor = ISO timestamp of oldest visible message (for infinite scroll upward)
  getMessages: (chatId: string, cursor?: string, limit = 40) =>
    api.get(`/messages/${chatId}`, {
      params: { ...(cursor && { cursor }), limit },
    }),

  sendMessage: (data: {
    chatId: string;
    encryptedContent: string;
    type: 'text' | 'image' | 'voice';
    replyToId?: string;
    mediaUrl?: string;
    mediaMeta?: string;
  }) => api.post('/messages', data),

  // Returns { url: string }
  uploadMedia: (chatId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ url: string }>(`/messages/upload/${chatId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  markSeen: (chatId: string) =>
    api.post(`/messages/seen/${chatId}`),

  deleteMessage: (id: string, forEveryone = false) =>
    api.delete(`/messages/${id}`, { params: { forEveryone } }),

  addReaction: (messageId: string, reaction: string) =>
    api.post(`/messages/${messageId}/reactions`, { reaction }),

  removeReaction: (messageId: string) =>
    api.delete(`/messages/${messageId}/reactions`),
};

// ─────────────────────────────────────────────────────────────────────────────
// CALLS
// ─────────────────────────────────────────────────────────────────────────────
export const callsApi = {
  getHistory: (limit = 30) =>
    api.get('/calls/history', { params: { limit } }),

  getMissed: () =>
    api.get('/calls/missed'),

  logCall: (data: {
    receiverId: string;
    type: 'audio' | 'video';
    status: 'missed' | 'accepted' | 'rejected';
    durationSeconds?: number;
  }) => api.post('/calls/log', data),
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};
