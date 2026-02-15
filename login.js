
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessageDiv = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');

// --- REDIRECT IF ALREADY LOGGED IN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Si ya hay una sesión activa, redirigir directamente al panel de control.
        window.location.href = 'control_total.html';
    }
});

// --- LOGIN FORM SUBMISSION ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessageDiv.textContent = ''; // Limpiar errores previos

    // Mostrar spinner y deshabilitar botón
    buttonText.textContent = 'Ingresando...';
    buttonSpinner.classList.remove('hidden');
    loginButton.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // El onAuthStateChanged se encargará de la redirección.
        // No es necesario hacer nada más aquí.
        console.log("Inicio de sesión exitoso para:", userCredential.user.email);

    } catch (error) {
        let friendlyErrorMessage = 'Ocurrió un error. Inténtalo de nuevo.';
        // Mapeo de errores de Firebase a mensajes amigables
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                friendlyErrorMessage = 'Correo o contraseña incorrectos.';
                break;
            case 'auth/invalid-email':
                friendlyErrorMessage = 'El formato del correo electrónico no es válido.';
                break;
            case 'auth/too-many-requests':
                friendlyErrorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
                break;
        }
        errorMessageDiv.textContent = friendlyErrorMessage;

        // Restaurar el botón
        buttonText.textContent = 'Ingresar';
        buttonSpinner.classList.add('hidden');
        loginButton.disabled = false;
    }
});
