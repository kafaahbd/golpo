import { usersApi } from './api';

declare const firebase: any;

let messaging: any = null;
let initialized = false;

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export async function initFirebaseMessaging(): Promise<string | null> {
  if (!FIREBASE_CONFIG.apiKey) {
    console.warn('Firebase not configured — push notifications disabled');
    return null;
  }

  try {
    if (!initialized) {
      if (typeof firebase === 'undefined') return null;
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      messaging = firebase.messaging();
      initialized = true;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      messaging.useServiceWorker(reg);
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Get FCM token
    const token = await messaging.getToken({
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      await usersApi.updateFcmToken(token);
      return token;
    }
    return null;
  } catch (err) {
    console.error('Firebase messaging init failed:', err);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  const unsub = messaging.onMessage(callback);
  return unsub;
}

export async function deleteFcmToken(): Promise<void> {
  if (!messaging) return;
  try {
    await messaging.deleteToken();
  } catch (err) {
    console.error('Failed to delete FCM token:', err);
  }
}
