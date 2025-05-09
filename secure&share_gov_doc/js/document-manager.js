// Document Manager Module
class DocumentManager {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.storage = window.storage;
        this.setupUIElements();
        this.setupEventListeners();
    }

    setupUIElements() {
        // Document section elements
        this.uploadDocBtn = document.getElementById('uploadDocBtn');
        this.docCategory = document.getElementById('docCategory');
        this.documentsList = document.getElementById('documentsList');
        this.uploadModal = document.getElementById('uploadModal');
        this.uploadForm = document.getElementById('uploadForm');
        this.closeModal = document.querySelector('.close');
    }

    setupEventListeners() {
        // Upload document button
        this.uploadDocBtn.addEventListener('click', () => {
            this.uploadModal.classList.remove('hidden');
        });

        // Close modal
        this.closeModal.addEventListener('click', () => {
            this.uploadModal.classList.add('hidden');
        });

        // Upload form submission
        this.uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDocumentUpload();
        });

        // Category filter
        this.docCategory.addEventListener('change', () => {
            this.loadDocuments();
        });
    }

    async handleDocumentUpload() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const title = document.getElementById('docTitle').value;
            const category = document.getElementById('uploadCategory').value;
            const file = document.getElementById('docFile').files[0];

            if (!file) throw new Error('Please select a file');

            // Log upload attempt
            Logger.log('Document upload attempt', { title, category, fileName: file.name });

            // Upload file to Firebase Storage
            const storageRef = this.storage.ref();
            const fileRef = storageRef.child(`documents/${user.uid}/${Date.now()}_${file.name}`);
            const uploadTask = await fileRef.put(file);
            const downloadURL = await uploadTask.ref.getDownloadURL();

            // Save document metadata to Firestore
            const docRef = await this.db.collection('documents').add({
                userId: user.uid,
                title,
                category,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                downloadURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                sharedWith: []
            });

            // Log successful upload
            Logger.log('Document upload successful', { 
                docId: docRef.id,
                title,
                category
            });

            // Clear form and close modal
            this.uploadForm.reset();
            this.uploadModal.classList.add('hidden');

            // Reload documents
            this.loadDocuments();
        } catch (error) {
            // Log error
            Logger.log('Document upload error', { error: error.message });
            alert(error.message);
        }
    }

    async loadDocuments() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Log document load attempt
            Logger.log('Loading documents', { category: this.docCategory.value });

            // Get documents from Firestore
            let query = this.db.collection('documents')
                .where('userId', '==', user.uid);

            // Apply category filter if selected
            if (this.docCategory.value !== 'all') {
                query = query.where('category', '==', this.docCategory.value);
            }

            const snapshot = await query.orderBy('createdAt', 'desc').get();

            // Clear current documents
            this.documentsList.innerHTML = '';

            // Add documents to UI
            snapshot.forEach(doc => {
                const data = doc.data();
                this.addDocumentToUI(doc.id, data);
            });

            // Log successful load
            Logger.log('Documents loaded successfully', { 
                count: snapshot.size,
                category: this.docCategory.value
            });
        } catch (error) {
            // Log error
            Logger.log('Document load error', { error: error.message });
            alert(error.message);
        }
    }

    addDocumentToUI(docId, data) {
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.innerHTML = `
            <h3>${data.title}</h3>
            <p>Category: ${data.category}</p>
            <p>Uploaded: ${new Date(data.createdAt.toDate()).toLocaleDateString()}</p>
            <div class="actions">
                <button onclick="documentManager.downloadDocument('${docId}')">Download</button>
                <button onclick="documentManager.shareDocument('${docId}')">Share</button>
                <button onclick="documentManager.editDocument('${docId}')">Edit</button>
                <button class="delete" onclick="documentManager.deleteDocument('${docId}')">Delete</button>
            </div>
        `;
        this.documentsList.appendChild(docCard);
    }

    async downloadDocument(docId) {
        try {
            // Log download attempt
            Logger.log('Document download attempt', { docId });

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
            Logger.log('Document download successful', { docId });
        } catch (error) {
            // Log error
            Logger.log('Document download error', { docId, error: error.message });
            alert(error.message);
        }
    }

    async shareDocument(docId) {
        try {
            const email = prompt('Enter email address to share with:');
            if (!email) return;

            // Log share attempt
            Logger.log('Document share attempt', { docId, shareWith: email });

            // Add to sharedWith array
            await this.db.collection('documents').doc(docId).update({
                sharedWith: firebase.firestore.FieldValue.arrayUnion(email)
            });

            // Log successful share
            Logger.log('Document shared successfully', { docId, shareWith: email });
            alert('Document shared successfully!');
        } catch (error) {
            // Log error
            Logger.log('Document share error', { docId, error: error.message });
            alert(error.message);
        }
    }

    async deleteDocument(docId) {
        try {
            if (!confirm('Are you sure you want to delete this document?')) return;

            // Log delete attempt
            Logger.log('Document delete attempt', { docId });

            const doc = await this.db.collection('documents').doc(docId).get();
            const data = doc.data();

            // Delete from Storage
            const fileRef = this.storage.refFromURL(data.downloadURL);
            await fileRef.delete();

            // Delete from Firestore
            await this.db.collection('documents').doc(docId).delete();

            // Log successful delete
            Logger.log('Document deleted successfully', { docId });

            // Reload documents
            this.loadDocuments();
        } catch (error) {
            // Log error
            Logger.log('Document delete error', { docId, error: error.message });
            alert(error.message);
        }
    }

    async editDocument(docId) {
        try {
            // Log edit attempt
            Logger.log('Document edit attempt', { docId });

            const doc = await this.db.collection('documents').doc(docId).get();
            const data = doc.data();

            // Create edit modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Edit Document</h2>
                    <form id="editForm">
                        <input type="text" id="editTitle" value="${data.title}" required>
                        <select id="editCategory" required>
                            <option value="education" ${data.category === 'education' ? 'selected' : ''}>Education</option>
                            <option value="healthcare" ${data.category === 'healthcare' ? 'selected' : ''}>Healthcare</option>
                            <option value="railways" ${data.category === 'railways' ? 'selected' : ''}>Railways</option>
                            <option value="other" ${data.category === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                        <input type="file" id="editFile">
                        <button type="submit">Update</button>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);
            modal.classList.remove('hidden');

            // Handle form submission
            const form = document.getElementById('editForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleDocumentUpdate(docId, form);
                modal.remove();
            });

            // Handle close button
            const closeBtn = modal.querySelector('.close');
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        } catch (error) {
            // Log error
            Logger.log('Document edit error', { docId, error: error.message });
            alert(error.message);
        }
    }

    async handleDocumentUpdate(docId, form) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const title = document.getElementById('editTitle').value;
            const category = document.getElementById('editCategory').value;
            const file = document.getElementById('editFile').files[0];

            // Log update attempt
            Logger.log('Document update attempt', { docId, title, category });

            const updateData = {
                title,
                category,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // If new file is uploaded
            if (file) {
                // Delete old file
                const oldDoc = await this.db.collection('documents').doc(docId).get();
                const oldData = oldDoc.data();
                const oldFileRef = this.storage.refFromURL(oldData.downloadURL);
                await oldFileRef.delete();

                // Upload new file
                const storageRef = this.storage.ref();
                const fileRef = storageRef.child(`documents/${user.uid}/${Date.now()}_${file.name}`);
                const uploadTask = await fileRef.put(file);
                const downloadURL = await uploadTask.ref.getDownloadURL();

                updateData.fileName = file.name;
                updateData.fileType = file.type;
                updateData.fileSize = file.size;
                updateData.downloadURL = downloadURL;
            }

            // Update document in Firestore
            await this.db.collection('documents').doc(docId).update(updateData);

            // Log successful update
            Logger.log('Document update successful', { docId, title, category });

            // Reload documents
            this.loadDocuments();
        } catch (error) {
            // Log error
            Logger.log('Document update error', { docId, error: error.message });
            alert(error.message);
        }
    }
}

// Initialize document manager
const documentManager = new DocumentManager(); 