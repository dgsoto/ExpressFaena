
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// --- FIREBASE CONFIG (debe ser la misma que en otros archivos) ---
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
const db = getFirestore(app);

// --- ELEMENTOS DEL DOM COMUNES ---
const userEmailDisplay = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');

// --- EL GUARDIÁN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- Usuario AUTENTICADO ---
        // 1. Obtener el rol del usuario desde Firestore
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userRole = null;
        if (userDocSnap.exists()) {
            userRole = userDocSnap.data().rol;
        }

        // 2. Guardar la información en sessionStorage para acceso rápido en otras páginas
        sessionStorage.setItem('userRole', userRole);
        sessionStorage.setItem('userEmail', user.email);

        // 3. Mostrar el email del usuario si el elemento existe en la página
        if (userEmailDisplay) {
            userEmailDisplay.textContent = user.email;
        }

        // 4. Aplicar lógica de permisos específica de la página (si es necesario)
        if (window.applyPermissions) {
            window.applyPermissions(userRole);
        }

    } else {
        // --- Usuario NO AUTENTICADO ---
        // Limpiar cualquier dato de sesión y redirigir al login
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userEmail');
        window.location.href = 'login.html';
    }
});

// --- LÓGICA DE CIERRE DE SESIÓN ---
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged se encargará de la redirección al detectar la salida.
            console.log('Cierre de sesión exitoso.');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('No se pudo cerrar la sesión. Por favor, intenta de nuevo.');
        }
    });
}
