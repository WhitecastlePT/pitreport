import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCks-lqEQMtrY53Z8U5MGMN0eC5CtuPCew",
  authDomain: "pit-report.firebaseapp.com",
  projectId: "pit-report",
  storageBucket: "pit-report.firebasestorage.app",
  messagingSenderId: "402888703568",
  appId: "1:402888703568:web:57b0bc5089fc2464909b55",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
