// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// أهم خطوتين: استيراد أدوات الدخول وقاعدة البيانات والتخزين
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfZQU7ycNYaR5iZtJtb_jqyVc0-qeTdhg",
    authDomain: "zaitandfilters.firebaseapp.com",
    projectId: "zaitandfilters",
    storageBucket: "zaitandfilters.firebasestorage.app",
    messagingSenderId: "859605041284",
    appId: "1:859605041284:web:06c1798f54796b72a582d1",
    measurementId: "G-TL2G9T3NJX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize and Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;