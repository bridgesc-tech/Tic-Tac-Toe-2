// Firebase Configuration for TicTacToe
// Using the same Firebase project as TV Time Manager
// You can use the same credentials or create a separate Firebase project

const firebaseConfig = {
    apiKey: "AIzaSyDK15y-JQrDozJ3aXxFC1XSVuniRjcUL1E",
    authDomain: "tv-time-management.firebaseapp.com",
    projectId: "tv-time-management",
    storageBucket: "tv-time-management.firebasestorage.app",
    messagingSenderId: "836553253045",
    appId: "1:836553253045:web:e93f536adf7afbbced5efc"
};

// Initialize Firebase (only if Firebase scripts are loaded)
let db = null;

function initializeFirebaseIfReady() {
    if (typeof firebase !== 'undefined' && window.location.protocol !== 'file:') {
        try {
            console.log('Initializing Firebase for TicTacToe...');
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            console.log('Firebase initialized successfully, db:', db);
            window.dispatchEvent(new CustomEvent('firebaseReady'));
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    } else {
        if (window.location.protocol === 'file:') {
            console.log('Running from file:// - Firebase disabled');
        } else {
            if (typeof firebase === 'undefined') {
                setTimeout(initializeFirebaseIfReady, 100);
            }
        }
    }
}

// Try to initialize immediately, or wait for scripts
if (typeof firebase !== 'undefined' && window.location.protocol !== 'file:') {
    initializeFirebaseIfReady();
} else if (window.location.protocol !== 'file:') {
    setTimeout(initializeFirebaseIfReady, 200);
} else {
    console.log('Running from file:// - Firebase disabled');
}

