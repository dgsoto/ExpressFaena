
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// --- AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
        console.log("Usuario autenticado:", user.email);

        // Update UI if elements exist
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email;
        }

        // Show admin content if hidden
        document.body.classList.remove('hidden');

    } else {
        // No user is signed in. Redirect to login.
        console.log("No hay usuario autenticado. Redirigiendo a login...");
        window.location.href = 'login.html';
    }
});

// --- LOGOUT HANDLER ---
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            // Sign-out successful.
            window.location.href = 'login.html';
        }).catch((error) => {
            // An error happened.
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión.");
        });
    });
}
