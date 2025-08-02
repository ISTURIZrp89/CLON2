// Firebase configuration example
// Copy this file to firebase.js and replace with your actual Firebase config
export const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// To get your Firebase configuration:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project or create a new one
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" section
// 5. Click on the web app or add a new web app
// 6. Copy the configuration object values to firebase.js

// Make sure to:
// 1. Enable Firestore Database in your Firebase project
// 2. Set up Firestore security rules
// 3. Create the necessary collections (usuarios, insumos, equipos, etc.)
