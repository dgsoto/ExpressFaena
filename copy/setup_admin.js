
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
    measurementId: "G-KH92E5K2TS"
};

// --- INITIALIZE APP & AUTH ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- DOM ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageDiv = document.getElementById('message');
const signupButton = document.getElementById('signup-button');

// --- SIGNUP FORM SUBMISSION ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;
    messageDiv.textContent = '';

    signupButton.disabled = true;
    signupButton.textContent = "Creando...";

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Usuario creado:", userCredential.user.email);

        messageDiv.className = "mt-4 text-center text-green-400 text-sm font-semibold";
        messageDiv.textContent = "¡Usuario creado con éxito! Redirigiendo al login...";

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error("Error creating user:", error);

        let friendlyErrorMessage = 'Ocurrió un error.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                friendlyErrorMessage = 'Este correo ya está registrado.';
                break;
            case 'auth/invalid-email':
                friendlyErrorMessage = 'El correo no es válido.';
                break;
            case 'auth/weak-password':
                friendlyErrorMessage = 'La contraseña debe tener al menos 6 caracteres.';
                break;
        }

        messageDiv.className = "mt-4 text-center text-red-400 text-sm font-semibold";
        messageDiv.textContent = friendlyErrorMessage;

        signupButton.disabled = false;
        signupButton.textContent = "Crear Usuario";
    }
});
