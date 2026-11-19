// Recibe los avisos del cuadrante con la app cerrada.
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyAU3fZsiykk4Te9q5brLNapZq3DHZnW3N4",
  authDomain: "cuadrante-trabajo-7631e.firebaseapp.com",
  projectId: "cuadrante-trabajo-7631e",
  storageBucket: "cuadrante-trabajo-7631e.firebasestorage.app",
  messagingSenderId: "149367702645",
  appId: "1:149367702645:web:195b0714db6a779494e43c"
});
firebase.messaging();
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.FCM_MSG && e.notification.data.FCM_MSG.notification && e.notification.data.FCM_MSG.notification.click_action) || self.registration.scope;
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(ws => {
    for (const w of ws) { if (w.url.startsWith(self.registration.scope) && 'focus' in w) return w.focus(); }
    return clients.openWindow(url);
  }));
});
