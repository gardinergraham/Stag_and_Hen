import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// Backend URL from environment variable (required for production)
// In Expo, use Constants.expoConfig.extra or process.env
const getBackendUrl = () => {
  // Check Expo config first, then process.env
  const envUrl = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!envUrl) {
    console.warn('EXPO_PUBLIC_BACKEND_URL not set, using preview URL');
    return 'https://group-event-hub.preview.emergentagent.com';
  }
  return envUrl;
};

const API_BASE_URL = `${getBackendUrl()}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Events API
export const eventsApi = {
  create: (data) => api.post('/events/', data),
  getAll: () => api.get('/events/'),
  getById: (eventId) => api.get(`/events/${eventId}`),
  update: (eventId, data, ownerPin) => 
    api.put(`/events/${eventId}?owner_pin=${ownerPin}`, data),
  delete: (eventId, ownerPin) => 
    api.delete(`/events/${eventId}?owner_pin=${ownerPin}`),
  deleteAllOwnerEvents: (ownerName, ownerPin, includeOwnerData = false) =>
    api.delete('/events/owner/all', {
      params: {
        owner_name: ownerName,
        owner_pin: ownerPin,
        include_owner_data: includeOwnerData,
      },
    }),
  getQRCode: (eventId, ownerPin) => 
    api.get(`/events/${eventId}/qr-code?owner_pin=${ownerPin}`),
  getMembers: (eventId) => api.get(`/events/${eventId}/members`),
};

// Auth API
export const authApi = {
  accessViaQR: (data) => api.post('/auth/access-qr', data),
  accessManual: (data) => api.post('/auth/access-manual', data),
  ownerLogin: (data) => api.post('/auth/owner-login', data),
};

// Media API
export const mediaApi = {
  upload: (data) => api.post('/media/', data),
  getByEvent: (eventId) => api.get(`/media/event/${eventId}`),
  getById: (mediaId) => api.get(`/media/${mediaId}`),
  delete: (mediaId, memberName) => 
    api.delete(`/media/${mediaId}?member_name=${memberName}`),
};

// Shop API
export const shopApi = {
  getItems: (category) => {
    const url = category ? `/shop/items?category=${category}` : '/shop/items';
    return api.get(url);
  },
  getCategories: () => api.get('/shop/categories'),
  trackClick: (itemId, memberName, eventId) =>
    api.post(`/shop/track-click/${itemId}`, null, {
      params: {
        member_name: memberName,
        event_id: eventId,
      },
    }),
  createRequest: (data) => api.post('/shop-requests/', data),
};

// Dares API
export const daresApi = {
  getDares: (eventId, eventType) =>
    api.get('/dares/', {
      params: {
        event_id: eventId,
        event_type: eventType,
      },
    }),
  getSpinnerPairs: (eventId, eventType) =>
    api.get('/dares/spinner-pairs', {
      params: {
        event_id: eventId,
        event_type: eventType,
      },
    }),
  createSpinnerPair: (data, ownerPin) =>
    api.post('/dares/spinner-pairs', data, {
      params: {
        owner_pin: ownerPin,
      },
    }),
  deleteSpinnerPair: (pairId, ownerPin) =>
    api.delete(`/dares/spinner-pairs/${pairId}`, {
      params: {
        owner_pin: ownerPin,
      },
    }),
  getSpinResults: (eventId) => api.get(`/dares/spin-results/${eventId}`),
  createSpinResult: (data) => api.post('/dares/spin-results', data),
  getSecretMission: (eventId, memberName) =>
    api.get(`/dares/secret-mission/${eventId}`, {
      params: {
        member_name: memberName,
      },
    }),
  assignSecretMission: (data) => api.post('/dares/secret-mission/assign', data),
  completeSecretMission: (missionId, memberName, evidence) =>
    api.put(`/dares/secret-mission/${missionId}/complete`, { evidence }, {
      params: {
        member_name: memberName,
      },
    }),
  getSecretMissionCompletions: (eventId) => api.get(`/dares/secret-missions/${eventId}/completions`),
  deleteSecretMission: (missionId, ownerPin) =>
    api.delete(`/dares/secret-mission/${missionId}`, {
      params: {
        owner_pin: ownerPin,
      },
    }),
  create: (data, ownerPin) =>
    api.post('/dares/', data, {
      params: {
        owner_pin: ownerPin,
      },
    }),
  delete: (dareId, ownerPin) =>
    api.delete(`/dares/${dareId}`, {
      params: {
        owner_pin: ownerPin,
      },
    }),
};

// Kitty API
export const kittyApi = {
  contribute: (data) => api.post('/kitty/contribute', data),
  createContributionCheckout: (data) => api.post('/kitty/contribution-checkout', data),
  withdraw: (data) => api.post('/kitty/withdraw', data),
  getBalance: (eventId) => api.get(`/kitty/balance/${eventId}`),
  getTransactions: (eventId) => api.get(`/kitty/transactions/${eventId}`),
  startConnect: (data) => api.post('/kitty/connect/start', data),
  openConnectDashboard: (data) => api.post('/kitty/connect/dashboard', data),
  getConnectStatus: (eventId, ownerPin) =>
    api.get(`/kitty/connect/status/${eventId}`, {
      params: {
        owner_pin: ownerPin,
      },
    }),
};

// Points API
export const pointsApi = {
  getLeaderboard: (eventId) => api.get(`/points/${eventId}/leaderboard`),
  getAwards: (eventId) => api.get(`/points/${eventId}/awards`),
  award: (data, ownerPin) =>
    api.post('/points/award', data, {
      params: {
        owner_pin: ownerPin,
      },
    }),
};

// Payments API
export const paymentsApi = {
  createEventCheckout: (data) => api.post('/payments/event-checkout', data),
  completeIOSIAP: (data) => api.post('/payments/ios-iap/complete', data),
  getEventStatus: (eventId, ownerPin) =>
    api.get(`/payments/event-status/${eventId}`, {
      params: {
        owner_pin: ownerPin,
      },
    }),
};

// Session Storage
export const sessionStorage = {
  async saveSession(data) {
    await AsyncStorage.setItem('session', JSON.stringify(data));
  },
  
  async getSession() {
    const data = await AsyncStorage.getItem('session');
    return data ? JSON.parse(data) : null;
  },
  
  async clearSession() {
    await AsyncStorage.removeItem('session');
  },
  
  async saveEventDetails(eventId, data) {
    await AsyncStorage.setItem(`event_${eventId}`, JSON.stringify(data));
  },
  
  async getEventDetails(eventId) {
    const data = await AsyncStorage.getItem(`event_${eventId}`);
    return data ? JSON.parse(data) : null;
  },
};

export default api;
