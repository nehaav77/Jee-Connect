import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACdzHfG2_mHP0bYYHKzYWhqXbB-3wOTws",
  authDomain: "jee-connect.firebaseapp.com",
  projectId: "jee-connect",
  storageBucket: "jee-connect.firebasestorage.app",
  messagingSenderId: "440484760844",
  appId: "1:440484760844:web:6ec978f1805c79a5478d29",
  measurementId: "G-NQ0NZQD1R1"
};

// Initialize Firebase securely
const app = initializeApp(firebaseConfig);

// Initialize simple, fast Firestore (No IndexedDB locks)
export const firestoreDb = getFirestore(app);
