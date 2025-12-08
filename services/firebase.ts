import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC1vtlYvUoR5UdB-QnrSQnsMKvr6vUgdRo",
  authDomain: "gestaobsun.firebaseapp.com",
  projectId: "gestaobsun",
  storageBucket: "gestaobsun.firebasestorage.app",
  messagingSenderId: "90041727546",
  appId: "1:90041727546:web:ca091e79624af5e7e7d303",
  measurementId: "G-TKMP2EJJQ3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
