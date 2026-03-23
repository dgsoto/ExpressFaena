import "./auth_guard.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const providerForm = document.getElementById('provider-form');
const providerIdInput = document.getElementById('provider-id');
const providerNameInput = document.getElementById('provider-name');
const providerPhoneInput = document.getElementById('provider-phone');
const providerCategoryInput = document.getElementById('provider-category');
const providerDaysInput = document.getElementById('provider-days');
const providerNotesTextarea = document.getElementById('provider-notes');
const providersList = document.getElementById('providers-list');
const cancelEditBtn = document.getElementById('cancel-edit');
const formTitle = document.getElementById('form-title');

// --- LOAD AND DISPLAY PROVIDERS (REAL-TIME) ---
const q = query(collection(db, "proveedores"), orderBy("nombre"));
onSnapshot(q, (querySnapshot) => {
    providersList.innerHTML = "";
    if (querySnapshot.empty) {
        providersList.innerHTML = `<p class="text-center text-gray-500 py-4">Aún no hay proveedores registrados.</p>`;
        return;
    }

    querySnapshot.forEach((doc) => {
        const p = doc.data();
        const pid = doc.id;

        let phoneHtml = '';
        if (p.telefono && p.telefono.trim() !== '') {
            // Limpiar teléfono para url de WhatsApp
            let cleanPhone = p.telefono.replace(/[^\d+]/g, '');
            if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
            if (cleanPhone.length >= 9) { // asumiendo que es valido
                phoneHtml = `<a href="https://wa.me/${cleanPhone}" target="_blank" class="text-green-600 hover:text-green-800" title="Contactar por WhatsApp">
                             <i class="fab fa-whatsapp"></i> ${p.telefono}
                             </a>`;
            } else {
                phoneHtml = `<i class="fas fa-phone text-gray-400"></i> ${p.telefono}`;
            }
        } else {
            phoneHtml = `<span class="text-gray-400 text-sm">Sin contacto</span>`;
        }

        providersList.innerHTML += `
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div class="mb-3 md:mb-0 w-full md:w-3/4">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fas fa-truck text-orange-500"></i>
                        <h3 class="font-bold text-gray-800 text-lg">${p.nombre}</h3>
                        <span class="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase">${p.categoria}</span>
                    </div>
                    
                    <div class="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        ${phoneHtml}
                        <span><i class="far fa-calendar-alt text-gray-400"></i> Días: ${p.dias_entrega || 'No especificado'}</span>
                    </div>
                    
                    ${p.notas ? `<p class="text-sm text-gray-500 italic"><i class="fas fa-info-circle"></i> ${p.notas}</p>` : ''}
                </div>
                
                <div class="flex gap-2 w-full md:w-auto justify-end">
                    <button onclick="window.editProvider('${pid}')" class="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"><i class="fas fa-pencil-alt"></i> Editar</button>
                    <button onclick="window.deleteProvider('${pid}')" class="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-red-600 transition-colors shadow-sm"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
});

// --- FORM SUBMISSION (CREATE/UPDATE) ---
providerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = providerIdInput.value;
    const providerData = {
        nombre: providerNameInput.value.trim(),
        telefono: providerPhoneInput.value.trim(),
        categoria: providerCategoryInput.value.trim(),
        dias_entrega: providerDaysInput.value.trim(),
        notas: providerNotesTextarea.value.trim(),
    };

    if (!providerData.nombre || !providerData.categoria) {
        alert("El nombre y la categoría son obligatorios.");
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "proveedores", id), providerData);
        } else {
            await addDoc(collection(db, "proveedores"), providerData);
        }
        resetForm();
    } catch (error) {
        console.error("Error guardando el proveedor: ", error);
        alert("Hubo un error al guardar en la base de datos.");
    }
});

// --- EDIT FUNCTION ---
window.editProvider = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "proveedores", id));
        if (docSnap.exists()) {
            const p = docSnap.data();
            providerIdInput.value = id;
            providerNameInput.value = p.nombre || '';
            providerPhoneInput.value = p.telefono || '';
            providerCategoryInput.value = p.categoria || '';
            providerDaysInput.value = p.dias_entrega || '';
            providerNotesTextarea.value = p.notas || '';

            formTitle.innerText = "Editando Proveedor";
            providerForm.querySelector('button[type="submit"]').innerText = "Actualizar Proveedor";
            cancelEditBtn.classList.remove('hidden');

            // Scroll to top mobile UX
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error("Error al cargar proveedor: ", error);
    }
}

// --- DELETE FUNCTION ---
window.deleteProvider = async (id) => {
    if (confirm("¿Seguro que quieres eliminar este proveedor permanentemente?")) {
        try {
            await deleteDoc(doc(db, "proveedores", id));
            resetForm();
        } catch (error) {
            console.error("Error eliminando: ", error);
        }
    }
}

// --- RESET FORM FUNCTION ---
window.resetForm = () => {
    providerForm.reset();
    providerIdInput.value = '';
    formTitle.innerText = "Agregar Proveedor";
    providerForm.querySelector('button[type="submit"]').innerText = "Guardar Proveedor";
    cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', window.resetForm);
