# BuddyChat — Setup Guide

## What you get
- Real-time messaging (updates instantly on all devices)
- 1-on-1 direct messages
- Group chats with any number of friends
- Works on any browser over Wi-Fi or mobile data
- All messages stored securely in Firebase

---

## Step 1 — Install Node.js
Download from https://nodejs.org (choose the LTS version).

---

## Step 2 — Set up Firebase (free)

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → give it any name (e.g. "buddychat") → click through
3. Once the project is created, click the **web icon (</>)** to add a web app
4. Give it a nickname (e.g. "buddychat-web") → click **Register app**
5. You'll see a `firebaseConfig` block — copy it

### Enable Authentication
- In the left sidebar: **Build → Authentication → Get started**
- Click **Email/Password** → Enable → Save

### Enable Firestore
- In the left sidebar: **Build → Firestore Database → Create database**
- Choose **"Start in test mode"** → pick any region → Done

### Enable Storage (optional, for future file sharing)
- In the left sidebar: **Build → Storage → Get started** → follow prompts

---

## Step 3 — Paste your Firebase config

Open the file:
```
buddychat/src/firebase/config.js
```

Replace the placeholder values with your actual config:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:abc..."
}
```

---

## Step 4 — Run the app

Open a terminal, navigate to the buddychat folder, then run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Step 5 — Share with friends

### Option A: Everyone runs locally (same Wi-Fi)
Run `npm run dev -- --host` and share your local IP address (shown in terminal)
e.g. http://192.168.1.5:5173

### Option B: Deploy online (anyone can access via internet)
Free deployment on Vercel:
1. Push your code to GitHub
2. Go to https://vercel.com → Import your repo
3. Click Deploy — Vercel gives you a public URL like https://buddychat-xyz.vercel.app
4. Share the URL with your friends!

---

## How to use
1. Each friend opens the app and creates their own account (Register tab)
2. Click **"✉️ Message"** → search your friend's name or email → start chatting
3. Click **"👥 Group"** → name the group → add friends → Create

Messages appear instantly in real-time on all devices!

---

## Firestore Security Rules (for production)
Once you're done testing, replace the default rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      match /messages/{msgId} {
        allow read, write: if request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.members;
      }
    }
  }
}
```
