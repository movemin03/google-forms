import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6YorzdG00aSwt0M6Ib9kVs9X-6ryi3YE",
  authDomain: "thinkgood-security.firebaseapp.com",
  projectId: "thinkgood-security",
  storageBucket: "thinkgood-security.firebasestorage.app",
  messagingSenderId: "988186349647",
  appId: "1:988186349647:web:c2eec983dce6052f119a3a",
  measurementId: "G-BXBVJ894SD",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const events = collection(db, "training_events");

window.logTrainingEventToFirebase = async function logTrainingEventToFirebase(event) {
  const payload = {
    ...event,
    logged_at: serverTimestamp(),
    client_logged_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
    language: navigator.language,
    path: window.location.pathname || "/",
    referrer: document.referrer || "",
  };

  await addDoc(events, payload);
};

async function flushQueuedEvents() {
  const queue = window.trainingEventQueue || [];
  window.trainingEventQueue = [];

  for (const event of queue) {
    try {
      await window.logTrainingEventToFirebase(event);
    } catch (error) {
      console.warn("[firebase] training event log failed", error);
    }
  }
}

flushQueuedEvents();
