// Firebase configuration with environment variables support
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "labflow-manager.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "labflow-manager",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "labflow-manager.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "742212306654",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:742212306654:web:a53bf890fc63cd5d05e44f",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-YVZDBCJR3B"
};
