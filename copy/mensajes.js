
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- INITIALIZE APP ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DOM ELEMENTS ---
const messageForm = document.getElementById('message-form');
const messageIdInput = document.getElementById('message-id');
const messageTextInput = document.getElementById('message-text');
const messageActiveToggle = document.getElementById('message-active');
const messagesList = document.getElementById('messages-list');
const cancelEditBtn = document.getElementById('cancel-edit');
const formTitle = document.getElementById('form-title');

// --- LOAD AND DISPLAY MESSAGES (REAL-TIME) ---
onSnapshot(collection(db, "mensajes"), (querySnapshot) => {
    messagesList.innerHTML = "";
    if (querySnapshot.empty) {
        messagesList.innerHTML = `<p class="text-center text-gray-500">No hay mensajes guardados.</p>`;
        return;
    }
    querySnapshot.forEach((doc) => {
        const message = doc.data();
        const messageId = doc.id;
        const activeClass = message.active ? 'bg-green-100' : 'bg-gray-100';
        const activeText = message.active ? '<span class="font-bold text-green-600">Activo</span>' : '<span class="font-bold text-gray-500">Inactivo</span>';

        messagesList.innerHTML += `
            <div class="flex items-center justify-between ${activeClass} p-3 rounded-lg">
                <p class="font-medium">${message.text}</p>
                <div class="flex items-center gap-4">
                    ${activeText}
                    <div class="flex gap-2">
                        <button onclick="window.editMessage('${messageId}', '${message.text}', ${message.active})" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold"><i class="fas fa-pencil-alt"></i></button>
                        <button onclick="window.deleteMessage('${messageId}')" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
});

// --- FORM SUBMISSION (CREATE/UPDATE) ---
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = messageIdInput.value;
    const text = messageTextInput.value.trim();
    const active = messageActiveToggle.checked;

    if (!text) {
        alert("El texto del mensaje no puede estar vacío.");
        return;
    }

    const messageData = { text, active, createdAt: serverTimestamp() };

    try {
        if (id) {
            // Update
            await updateDoc(doc(db, "mensajes", id), { text, active });
            alert("¡Mensaje actualizado!");
        } else {
            // Create
            await addDoc(collection(db, "mensajes"), messageData);
            alert("¡Mensaje guardado!");
        }
        resetForm();
    } catch (error) {
        console.error("Error guardando el mensaje: ", error);
        alert("Error al guardar el mensaje.");
    }
});

// --- EDIT FUNCTION ---
window.editMessage = (id, text, active) => {
    messageIdInput.value = id;
    messageTextInput.value = text;
    messageActiveToggle.checked = active;
    
    formTitle.innerText = "Editar Mensaje";
    cancelEditBtn.classList.remove('hidden');
    messageForm.querySelector('button[type="submit"]').innerText = "Actualizar Mensaje";
    window.scrollTo(0, 0);
};

// --- DELETE FUNCTION ---
window.deleteMessage = async (id) => {
    if (confirm("¿Seguro que quieres eliminar este mensaje?")) {
        try {
            await deleteDoc(doc(db, "mensajes", id));
            alert("Mensaje eliminado.");
        } catch (error) {
            console.error("Error eliminando el mensaje: ", error);
            alert("No se pudo eliminar el mensaje.");
        }
    }
};

// --- RESET FORM ---
window.resetForm = () => {
    messageForm.reset();
    messageIdInput.value = '';
    formTitle.innerText = "Agregar Nuevo Mensaje";
    messageForm.querySelector('button[type="submit"]').innerText = "Guardar Mensaje";
    cancelEditBtn.classList.add('hidden');
}
