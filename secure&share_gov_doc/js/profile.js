// Profile Management Module
class ProfileManager {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.setupUIElements();
        this.setupEventListeners();
    }

    setupUIElements() {
        // Profile section elements
        this.profileSection = document.getElementById('profileSection');
        this.profileForm = document.getElementById('profileForm');
        this.profileName = document.getElementById('profileName');
        this.profileEmail = document.getElementById('profileEmail');
        this.profileAadhaar = document.getElementById('profileAadhaar');
        this.sharedDocsList = document.getElementById('sharedDocsList');
        this.profileLink = document.getElementById('profileLink');
    }

    setupEventListeners() {
        // Profile form submission
        this.profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Profile link click
        this.profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProfile();
        });
    }

    async showProfile() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Log profile view attempt
            Logger.log('Profile view attempt', { uid: user.uid });

            // Get user data
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();

            // Update profile form
            this.profileName.value = userData.fullName;
            this.profileEmail.value = userData.email;
            this.profileAadhaar.value = userData.aadhaarNumber;

            // Show profile section
            document.getElementById('documentSection').classList.add('hidden');
            this.profileSection.classList.remove('hidden');

            // Load shared documents
            this.loadSharedDocuments();

            // Log successful profile view
            Logger.log('Profile view successful', { uid: user.uid });
        } catch (error) {
            // Log error
            Logger.log('Profile view error', { error: error.message });
            alert(error.message);
        }
    }

    async updateProfile() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const fullName = this.profileName.value;

            // Log profile update attempt
            Logger.log('Profile update attempt', { uid: user.uid, fullName });

            // Update user data
            await this.db.collection('users').doc(user.uid).update({
                fullName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Log successful update
            Logger.log('Profile update successful', { uid: user.uid });
            alert('Profile updated successfully!');
        } catch (error) {
            // Log error
            Logger.log('Profile update error', { error: error.message });
            alert(error.message);
        }
    }

    async loadSharedDocuments() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Log shared documents load attempt
            Logger.log('Loading shared documents', { uid: user.uid });

            // Get documents shared with the user
            const snapshot = await this.db.collection('documents')
                .where('sharedWith', 'array-contains', user.email)
                .orderBy('createdAt', 'desc')
                .get();

            // Clear current shared documents
            this.sharedDocsList.innerHTML = '';

            // Add shared documents to UI
            snapshot.forEach(doc => {
                const data = doc.data();
                this.addSharedDocumentToUI(doc.id, data);
            });

            // Log successful load
            Logger.log('Shared documents loaded successfully', { 
                count: snapshot.size,
                uid: user.uid
            });
        } catch (error) {
            // Log error
            Logger.log('Shared documents load error', { error: error.message });
            alert(error.message);
        }
    }

    addSharedDocumentToUI(docId, data) {
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.innerHTML = `
            <h3>${data.title}</h3>
            <p>Category: ${data.category}</p>
            <p>Shared by: ${data.userId}</p>
            <p>Shared on: ${new Date(data.createdAt.toDate()).toLocaleDateString()}</p>
            <div class="actions">
                <button onclick="profileManager.downloadSharedDocument('${docId}')">Download</button>
            </div>
        `;
        this.sharedDocsList.appendChild(docCard);
    }

    async downloadSharedDocument(docId) {
        try {
            // Log download attempt
            Logger.log('Shared document download attempt', { docId });

            const doc = await this.db.collection('documents').doc(docId).get();
            const data = doc.data();

            // Create download link
            const link = document.createElement('a');
            link.href = data.downloadURL;
            link.download = data.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Log successful download
            Logger.log('Shared document download successful', { docId });
        } catch (error) {
            // Log error
            Logger.log('Shared document download error', { docId, error: error.message });
            alert(error.message);
        }
    }
}

// Initialize profile manager
const profileManager = new ProfileManager(); 