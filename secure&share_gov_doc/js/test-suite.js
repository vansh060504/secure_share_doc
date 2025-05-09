// Test Suite
class TestSuite {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.storage = window.storage;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    async runAllTests() {
        console.log('Starting test suite...');
        
        // Test Authentication
        await this.testRegistration();
        await this.testEmailVerification();
        await this.testLogin();
        
        // Test Document Management
        await this.testDocumentUpload();
        await this.testDocumentUpdate();
        await this.testDocumentShare();
        await this.testDocumentDelete();
        
        // Test Profile Management
        await this.testProfileUpdate();
        await this.testSharedDocuments();
        
        // Print results
        this.printResults();
    }

    async testRegistration() {
        try {
            console.log('Testing user registration...');
            const email = `test${Date.now()}@example.com`;
            const password = 'Test@123';
            const fullName = 'Test User';
            const aadhaarNumber = '123456789012';

            // Create test user
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Store user data
            await this.db.collection('users').doc(user.uid).set({
                fullName,
                email,
                aadhaarNumber,
                emailVerified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Send verification email
            await user.sendEmailVerification();

            this.recordTestResult(true, 'Registration');
            console.log('Registration test passed');
        } catch (error) {
            this.recordTestResult(false, 'Registration', error);
            console.error('Registration test failed:', error);
        }
    }

    async testEmailVerification() {
        try {
            console.log('Testing email verification...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Check if email is verified
            await user.reload();
            if (!user.emailVerified) {
                throw new Error('Email not verified');
            }

            this.recordTestResult(true, 'Email Verification');
            console.log('Email verification test passed');
        } catch (error) {
            this.recordTestResult(false, 'Email Verification', error);
            console.error('Email verification test failed:', error);
        }
    }

    async testLogin() {
        try {
            console.log('Testing login...');
            const email = `test${Date.now()}@example.com`;
            const password = 'Test@123';

            // Create test user
            await this.auth.createUserWithEmailAndPassword(email, password);
            await this.auth.signOut();

            // Test login
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            if (!userCredential.user) {
                throw new Error('Login failed');
            }

            this.recordTestResult(true, 'Login');
            console.log('Login test passed');
        } catch (error) {
            this.recordTestResult(false, 'Login', error);
            console.error('Login test failed:', error);
        }
    }

    async testDocumentUpload() {
        try {
            console.log('Testing document upload...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Create test file
            const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

            // Upload file
            const storageRef = this.storage.ref();
            const fileRef = storageRef.child(`documents/${user.uid}/${Date.now()}_test.txt`);
            const uploadTask = await fileRef.put(testFile);
            const downloadURL = await uploadTask.ref.getDownloadURL();

            // Save metadata
            const docRef = await this.db.collection('documents').add({
                userId: user.uid,
                title: 'Test Document',
                category: 'test',
                fileName: 'test.txt',
                fileType: 'text/plain',
                fileSize: testFile.size,
                downloadURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                sharedWith: []
            });

            this.recordTestResult(true, 'Document Upload');
            console.log('Document upload test passed');
        } catch (error) {
            this.recordTestResult(false, 'Document Upload', error);
            console.error('Document upload test failed:', error);
        }
    }

    async testDocumentUpdate() {
        try {
            console.log('Testing document update...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Get test document
            const snapshot = await this.db.collection('documents')
                .where('userId', '==', user.uid)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error('No test document found');
            }

            const doc = snapshot.docs[0];
            const docId = doc.id;

            // Update document
            await this.db.collection('documents').doc(docId).update({
                title: 'Updated Test Document',
                category: 'updated',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.recordTestResult(true, 'Document Update');
            console.log('Document update test passed');
        } catch (error) {
            this.recordTestResult(false, 'Document Update', error);
            console.error('Document update test failed:', error);
        }
    }

    async testDocumentShare() {
        try {
            console.log('Testing document sharing...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Get test document
            const snapshot = await this.db.collection('documents')
                .where('userId', '==', user.uid)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error('No test document found');
            }

            const doc = snapshot.docs[0];
            const docId = doc.id;

            // Share document
            await this.db.collection('documents').doc(docId).update({
                sharedWith: firebase.firestore.FieldValue.arrayUnion('test@example.com')
            });

            this.recordTestResult(true, 'Document Share');
            console.log('Document share test passed');
        } catch (error) {
            this.recordTestResult(false, 'Document Share', error);
            console.error('Document share test failed:', error);
        }
    }

    async testDocumentDelete() {
        try {
            console.log('Testing document deletion...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Get test document
            const snapshot = await this.db.collection('documents')
                .where('userId', '==', user.uid)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error('No test document found');
            }

            const doc = snapshot.docs[0];
            const docId = doc.id;
            const data = doc.data();

            // Delete from Storage
            const fileRef = this.storage.refFromURL(data.downloadURL);
            await fileRef.delete();

            // Delete from Firestore
            await this.db.collection('documents').doc(docId).delete();

            this.recordTestResult(true, 'Document Delete');
            console.log('Document delete test passed');
        } catch (error) {
            this.recordTestResult(false, 'Document Delete', error);
            console.error('Document delete test failed:', error);
        }
    }

    async testProfileUpdate() {
        try {
            console.log('Testing profile update...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Update profile
            await this.db.collection('users').doc(user.uid).update({
                fullName: 'Updated Test User',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.recordTestResult(true, 'Profile Update');
            console.log('Profile update test passed');
        } catch (error) {
            this.recordTestResult(false, 'Profile Update', error);
            console.error('Profile update test failed:', error);
        }
    }

    async testSharedDocuments() {
        try {
            console.log('Testing shared documents...');
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Get shared documents
            const snapshot = await this.db.collection('documents')
                .where('sharedWith', 'array-contains', user.email)
                .get();

            this.recordTestResult(true, 'Shared Documents');
            console.log('Shared documents test passed');
        } catch (error) {
            this.recordTestResult(false, 'Shared Documents', error);
            console.error('Shared documents test failed:', error);
        }
    }

    recordTestResult(passed, testName, error = null) {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            console.error(`Test failed: ${testName}`, error);
        }
    }

    printResults() {
        console.log('\nTest Results:');
        console.log('-------------');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    }
}

// Run test suite
const testSuite = new TestSuite();
testSuite.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
}); 