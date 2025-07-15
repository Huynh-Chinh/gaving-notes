import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

let app, auth;

export const initializeFirebase = () => {
  if (!app) {
    const firebaseConfig = JSON.parse(
      typeof __firebase_config !== 'undefined' ? __firebase_config : '{}'
    );
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return { app, auth };
};

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};