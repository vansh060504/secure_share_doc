// Logging Module
class Logger {
    static async log(action, data = {}) {
        try {
            const timestamp = new Date();
            const logEntry = {
                action,
                data,
                timestamp,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            // Add user ID if available
            const auth = window.auth;
            if (auth.currentUser) {
                logEntry.userId = auth.currentUser.uid;
            }

            // Log to console in development
            if (process.env.NODE_ENV === 'development') {
                console.log('Log Entry:', logEntry);
            }

            // Store log in Firestore
            const db = window.db;
            await db.collection('logs').add({
                ...logEntry,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Logging error:', error);
        }
    }

    static async getLogs(filters = {}, limit = 100) {
        try {
            const db = window.db;
            let query = db.collection('logs')
                .orderBy('timestamp', 'desc')
                .limit(limit);

            // Apply filters
            if (filters.action) {
                query = query.where('action', '==', filters.action);
            }
            if (filters.userId) {
                query = query.where('userId', '==', filters.userId);
            }
            if (filters.startDate) {
                query = query.where('timestamp', '>=', filters.startDate);
            }
            if (filters.endDate) {
                query = query.where('timestamp', '<=', filters.endDate);
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
    }

    static async getRecentActivity(userId, limit = 10) {
        try {
            const db = window.db;
            const snapshot = await db.collection('logs')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            return [];
        }
    }

    static async getDocumentActivity(docId, limit = 10) {
        try {
            const db = window.db;
            const snapshot = await db.collection('logs')
                .where('data.docId', '==', docId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching document activity:', error);
            return [];
        }
    }

    static async getSystemStats() {
        try {
            const db = window.db;
            const stats = {
                totalUsers: 0,
                totalDocuments: 0,
                totalShares: 0,
                recentActivity: []
            };

            // Get total users
            const usersSnapshot = await db.collection('users').count().get();
            stats.totalUsers = usersSnapshot.data().count;

            // Get total documents
            const docsSnapshot = await db.collection('documents').count().get();
            stats.totalDocuments = docsSnapshot.data().count;

            // Get total shares
            const sharedDocsSnapshot = await db.collection('documents')
                .where('sharedWith', '!=', [])
                .count()
                .get();
            stats.totalShares = sharedDocsSnapshot.data().count;

            // Get recent activity
            const recentLogsSnapshot = await db.collection('logs')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            stats.recentActivity = recentLogsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return stats;
        } catch (error) {
            console.error('Error fetching system stats:', error);
            return null;
        }
    }
}

// Export Logger
window.Logger = Logger; 