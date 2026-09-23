# 🍽️ Meal Picker

A mobile-friendly, 2-page web app that solves "What to make for dinner?". Built with HTML5, Tailwind CSS, Tone.js sound effects, and Firebase Cloud Firestore database sync (with automatic LocalStorage fallback).

## Features

- 🎰 **Horizontal Card Reel Game**: Spin meal cards in a horizontal slot-machine style drum to pick a meal for dinner.
- ⚡ **Quick Pick**: Instant meal decision for busy evenings.
- 📖 **My Cookbook (Manage Meals)**: Add, edit, search, filter, and delete your family recipes and meals.
- 🔥 **Firebase Integration**: Connect to Firebase Cloud Firestore for multi-device real-time sync.
- 📱 **Mobile-First & GitHub Pages Ready**: Responsive bottom navigation bar and lightweight client-side structure.

## Getting Started

1. Clone or download this repository.
2. Open `index.html` in any web browser to test locally immediately (uses LocalStorage by default).

### Connecting your Firebase Database

To sync meals across multiple devices using Firebase Firestore:

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Create a Firestore Database in Production/Test mode.
3. Add a Web App in Firebase Project Settings and copy your `firebaseConfig` object.
4. Open `firebase-config.js` and paste your credentials into the `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Hosting on GitHub Pages

1. Push your repository to GitHub.
2. Go to **Settings** -> **Pages**.
3. Under **Build and deployment**, set Source to `Deploy from a branch` and select `main` (or `master`) branch `/ (root)`.
4. Click **Save**. Your app will be live in seconds!