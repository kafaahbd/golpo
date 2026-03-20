// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker

importScripts(
	"https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
);
importScripts(
	"https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
	apiKey: "AIzaSyAhYH1rMuj9iB9mtAWT41CvrMG5cB4j1_s",
	authDomain: "golpo-b830b.firebaseapp.com",
	projectId: "golpo-b830b",
	storageBucket: "golpo-b830b.firebasestorage.app",
	messagingSenderId: "699801859455",
	appId: "1:699801859455:web:0698187f20b9fd6a57164a",
	measurementId: "G-1KW0E9J0QR",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
	const { title, body } = payload.notification || {};
	const { type, callId, callType, callerNickname } = payload.data || {};

	const notifOptions = {
		body: body || "New notification",
		icon: "/favicon.svg",
		badge: "/favicon.svg",
		vibrate: [200, 100, 200],
		data: payload.data,
		actions:
			type === "incoming_call"
				? [
						{ action: "accept", title: "✅ Accept" },
						{ action: "reject", title: "❌ Decline" },
					]
				: [],
	};

	self.registration.showNotification(title || "Golpo", notifOptions);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const data = event.notification.data || {};

	if (event.action === "reject" && data.callId) {
		// Handle reject from notification
		return;
	}

	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if (client.url.includes(self.location.origin) && "focus" in client) {
						client.focus();
						client.postMessage({ type: "NOTIFICATION_CLICK", data });
						return;
					}
				}
				clients.openWindow("/");
			}),
	);
});
