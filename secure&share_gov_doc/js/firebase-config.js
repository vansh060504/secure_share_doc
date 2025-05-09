// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtle0uWfAdCj_zqAYHxSEbnupaQGZW09U",
    authDomain: "share-web-634e9.firebaseapp.com",
    projectId: "share-web-634e9",
    storageBucket: "share-web-634e9.firebasestorage.app",
    messagingSenderId: "764658063536",
    appId: "1:764658063536:web:26e391a178d55562a4c375",
    measurementId: "G-DHW8FQNCFC"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Failed to initialize Firebase. Please check the configuration.');
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Test Firebase Configuration
async function testFirebaseConfig() {
    try {
        console.log('Testing Firebase Configuration...');
        
        // Test Firestore
        console.log('Testing Firestore...');
        await db.collection('test').doc('test').set({ test: true });
        await db.collection('test').doc('test').delete();
        console.log('Firestore test passed');
        
        // Test Storage
        console.log('Testing Storage...');
        const testRef = storage.ref('test/test.txt');
        await testRef.putString('test');
        await testRef.delete();
        console.log('Storage test passed');
        
        // Test Auth
        console.log('Testing Auth...');
        const currentUser = auth.currentUser;
        console.log('Auth test passed');
        
        console.log('All Firebase services are working correctly!');
        return true;
    } catch (error) {
        console.error('Firebase configuration test failed:', error);
        alert('Firebase configuration test failed. Please check the console for details.');
        return false;
    }
}

// Run configuration test
testFirebaseConfig().then(success => {
    if (!success) {
        console.error('Firebase configuration test failed. Please check your Firebase configuration values.');
    }
});

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Export Firebase services
window.auth = auth;
window.db = db;
window.storage = storage;

// Set up Firestore security rules
const securityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Documents
    match /documents/{documentId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.email in resource.data.sharedWith);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Logs
    match /logs/{logId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.email == 'admin@example.com');
      allow create: if request.auth != null;
    }
  }
}
`;

// Set up Storage security rules
const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{documentId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         exists(/databases/$(database)/documents/documents/$(documentId)) && 
         get(/databases/$(database)/documents/documents/$(documentId)).data.sharedWith.hasAny([request.auth.token.email]));
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
`; 