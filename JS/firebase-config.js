import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBz-bG6PQwYA3_2I9e-sQyuNKwGuJhIGWE",

  authDomain: "daleel-4838c.firebaseapp.com",

  projectId: "daleel-4838c",

  storageBucket: "daleel-4838c.firebasestorage.app",

  messagingSenderId: "1054617655196",

  appId: "1:1054617655196:web:d85db31cd1f872e4d75a59",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);
