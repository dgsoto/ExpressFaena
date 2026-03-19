
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
    measurementId: "G-KH92E5K2TS"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Obtener elementos del DOM
const createSellerForm = document.getElementById('create-seller-form');
const sellerEmailInput = document.getElementById('seller-email');
const sellerPasswordInput = document.getElementById('seller-password');
const errorMessage = document.getElementById('error-message');
const sellersList = document.getElementById('sellers-list');
const adminOnlyBlocker = document.getElementById('admin-only-blocker');
const createSellerBtn = document.getElementById('create-seller-btn');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');

// Función para aplicar permisos basada en el rol del usuario
window.applyPermissions = (role) => {
    if (role !== 'admin') {
        adminOnlyBlocker.classList.remove('hidden');
        adminOnlyBlocker.classList.add('flex');
    } else {
        loadSellers(); // Cargar vendedores si es admin
        document.body.classList.remove('hidden');
    }
};

// Función para cargar y mostrar la lista de vendedores
async function loadSellers() {
    const q = query(collection(db, "usuarios"), where("rol", "==", "vendedor"));
    onSnapshot(q, (querySnapshot) => {
        sellersList.innerHTML = "";
        if(querySnapshot.empty){
            sellersList.innerHTML = `<p class="text-center text-gray-500">Aún no has creado vendedores.</p>`;
            return;
        }
        querySnapshot.forEach((doc) => {
            const seller = doc.data();
            sellersList.innerHTML += `
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-user-circle text-2xl text-gray-400"></i>
                        <p class="font-medium text-gray-700">${seller.email}</p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Vendedor</span>
                </div>
            `;
        });
    }, (error) => {
        console.error("Error cargando vendedores: ", error);
        sellersList.innerHTML = `<p class="text-center text-red-500">Error al cargar la lista.</p>`;
    });
}

// Event listener para el formulario de creación de vendedor
createSellerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';
    const email = sellerEmailInput.value;
    const password = sellerPasswordInput.value;

    if (!email || !password || password.length < 6) {
        errorMessage.textContent = 'Proporciona un email y una contraseña de al menos 6 caracteres.';
        return;
    }

    // Mostrar estado de carga en el botón
    buttonText.textContent = 'Creando...';
    buttonSpinner.classList.remove('hidden');
    createSellerBtn.disabled = true;

    try {
        // 1. Crear el usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Crear el documento del usuario en Firestore para asignar el rol
        await setDoc(doc(db, "usuarios", user.uid), {
            email: user.email,
            rol: "vendedor"
        });

        alert('¡Vendedor creado con éxito!');
        createSellerForm.reset();

    } catch (error) {
        // Manejar errores comunes
        console.error('Error al crear vendedor:', error);
        if (error.code === 'auth/email-already-in-use') {
            errorMessage.textContent = 'El correo electrónico ya está en uso.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage.textContent = 'La contraseña es demasiado débil.';
        } else {
            errorMessage.textContent = `Error: ${error.message}`;
        }
    } finally {
        // Restaurar el estado del botón
        buttonText.textContent = 'Crear Vendedor';
        buttonSpinner.classList.add('hidden');
        createSellerBtn.disabled = false;
    }
});
