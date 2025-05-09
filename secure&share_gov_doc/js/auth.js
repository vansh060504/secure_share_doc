// Authentication Module
class Auth {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.setupAuthListeners();
        this.setupUIElements();
        this.verificationId = null;
        console.log('Auth module initialized');
    }

    setupAuthListeners() {
        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
            if (user) {
                this.onUserSignedIn(user);
            } else {
                this.onUserSignedOut();
            }
        });
    }

    setupUIElements() {
        // Login form
        this.loginForm = document.getElementById('loginFormElement');
        this.loginEmail = document.getElementById('loginEmail');
        this.loginPassword = document.getElementById('loginPassword');
        this.showRegisterLink = document.getElementById('showRegister');

        // Register form
        this.registerForm = document.getElementById('registerFormElement');
        this.fullName = document.getElementById('fullName');
        this.registerEmail = document.getElementById('registerEmail');
        this.registerPassword = document.getElementById('registerPassword');
        this.aadhaarNumber = document.getElementById('aadhaarNumber');
        this.phoneNumber = document.getElementById('phoneNumber');
        this.showLoginLink = document.getElementById('showLogin');

        // OTP form
        this.otpForm = document.getElementById('otpForm');
        this.otpInput = document.getElementById('otpInput');
        this.verifyOtpButton = document.getElementById('verifyOtpButton');

        // Navigation
        this.logoutLink = document.getElementById('logoutLink');
        this.profileLink = document.getElementById('profileLink');
        this.homeLink = document.getElementById('homeLink');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form submission
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form submission
        this.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration();
        });

        // OTP form submission
        this.otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.verifyOTP();
        });

        // Show/hide forms
        this.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForms();
        });

        this.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForms();
        });

        // Logout
        this.logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Aadhaar validation
        this.aadhaarNumber.addEventListener('input', (e) => {
            this.validateAadhaar(e.target.value);
        });
    }

    validateAadhaar(aadhaarNumber) {
        // Remove any non-digit characters
        const cleanNumber = aadhaarNumber.replace(/\D/g, '');
        
        // Check if it's 12 digits
        if (cleanNumber.length !== 12) {
            this.aadhaarNumber.setCustomValidity('Aadhaar number must be 12 digits');
            return false;
        }

        // Verify checksum
        const digits = cleanNumber.split('').map(Number);
        const checksum = this.calculateAadhaarChecksum(digits);
        
        if (checksum !== digits[11]) {
            this.aadhaarNumber.setCustomValidity('Invalid Aadhaar number');
            return false;
        }

        this.aadhaarNumber.setCustomValidity('');
        return true;
    }

    calculateAadhaarChecksum(digits) {
        // Aadhaar checksum algorithm
        const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let sum = 0;
        
        for (let i = 0; i < 10; i++) {
            sum += digits[i] * weights[i];
        }
        
        return sum % 11;
    }

    async handleRegistration() {
        try {
            const email = this.registerEmail.value;
            const password = this.registerPassword.value;
            const fullName = this.fullName.value;
            const aadhaarNumber = this.aadhaarNumber.value;
            const phoneNumber = this.phoneNumber.value;

            // Validate Aadhaar
            if (!this.validateAadhaar(aadhaarNumber)) {
                throw new Error('Invalid Aadhaar number');
            }

            console.log('Starting registration process for:', email);

            // Log registration attempt
            Logger.log('Registration attempt', { email, fullName });

            // Create user
            console.log('Creating user in Firebase Auth...');
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('User created successfully:', user.uid);

            // Send email verification
            await user.sendEmailVerification();
            console.log('Verification email sent');

            // Store additional user data
            console.log('Storing user data in Firestore...');
            await this.db.collection('users').doc(user.uid).set({
                fullName,
                email,
                aadhaarNumber,
                phoneNumber,
                emailVerified: false,
                phoneVerified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User data stored successfully');

            // Send OTP
            await this.sendOTP(phoneNumber);

            // Show OTP form
            this.showOTPForm();

            // Log successful registration
            Logger.log('Registration successful', { uid: user.uid });

            // Clear form
            this.registerForm.reset();
            console.log('Registration process completed successfully');
        } catch (error) {
            console.error('Registration error:', error);
            // Log error
            Logger.log('Registration error', { error: error.message });
            alert(error.message);
        }
    }

    async sendOTP(phoneNumber) {
        try {
            const provider = new firebase.auth.PhoneAuthProvider();
            this.verificationId = await provider.verifyPhoneNumber(phoneNumber, window.recaptchaVerifier);
            console.log('OTP sent successfully');
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw error;
        }
    }

    async verifyOTP() {
        try {
            const otp = this.otpInput.value;
            const credential = firebase.auth.PhoneAuthProvider.credential(this.verificationId, otp);
            
            // Sign in with phone credential
            await this.auth.signInWithCredential(credential);
            
            // Update user profile
            const user = this.auth.currentUser;
            await this.db.collection('users').doc(user.uid).update({
                phoneVerified: true
            });

            // Hide OTP form
            this.hideOTPForm();
            
            // Show success message
            alert('Phone number verified successfully!');
            
            // Clear OTP input
            this.otpInput.value = '';
        } catch (error) {
            console.error('Error verifying OTP:', error);
            alert('Invalid OTP. Please try again.');
        }
    }

    showOTPForm() {
        document.getElementById('otpForm').classList.remove('hidden');
    }

    hideOTPForm() {
        document.getElementById('otpForm').classList.add('hidden');
    }

    async handleLogin() {
        try {
            const email = this.loginEmail.value;
            const password = this.loginPassword.value;

            console.log('Attempting login for:', email);

            // Log the login attempt
            Logger.log('Login attempt', { email });

            console.log('Signing in with Firebase Auth...');
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if email is verified
            if (!user.emailVerified) {
                await this.auth.signOut();
                throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
            }

            console.log('Login successful for user:', user.uid);

            // Log successful login
            Logger.log('Login successful', { uid: user.uid });

            // Clear form
            this.loginForm.reset();
        } catch (error) {
            console.error('Login error:', error);
            // Log error
            Logger.log('Login error', { error: error.message });
            alert(error.message);
        }
    }

    async handleLogout() {
        try {
            // Log logout attempt
            Logger.log('Logout attempt', { uid: this.auth.currentUser?.uid });

            await this.auth.signOut();

            // Log successful logout
            Logger.log('Logout successful');
        } catch (error) {
            // Log error
            Logger.log('Logout error', { error: error.message });
            alert(error.message);
        }
    }

    toggleAuthForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
    }

    onUserSignedIn(user) {
        // Show authenticated UI
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('documentSection').classList.remove('hidden');
        
        // Show navigation links
        this.logoutLink.classList.remove('hidden');
        this.profileLink.classList.remove('hidden');
        this.homeLink.classList.remove('hidden');

        // Log user signed in
        Logger.log('User signed in', { uid: user.uid });
    }

    onUserSignedOut() {
        // Show unauthenticated UI
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('documentSection').classList.add('hidden');
        document.getElementById('profileSection').classList.add('hidden');
        
        // Hide navigation links
        this.logoutLink.classList.add('hidden');
        this.profileLink.classList.add('hidden');
        this.homeLink.classList.add('hidden');

        // Log user signed out
        Logger.log('User signed out');
    }
}

// Initialize authentication
const auth = new Auth(); 