import "./auth_guard.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DOM ELEMENTS ---
const form = document.getElementById('fiado-form');
const fiadoIdInput = document.getElementById('fiado-id');
const tipoInput = document.getElementById('fiado-tipo');
const nameInput = document.getElementById('fiado-name');
const phoneInput = document.getElementById('fiado-phone');
const detailsInput = document.getElementById('fiado-details');
const amountInput = document.getElementById('fiado-amount');
const submitBtn = document.getElementById('fiado-submit-btn');
const cancelBtn = document.getElementById('fiado-cancel-btn');
const fiadosList = document.getElementById('fiados-list');
const totalStreetMoneyDoc = document.getElementById('total-street-money');
const searchInput = document.getElementById('search-fiados');
const tabPendientes = document.getElementById('tab-pendientes');
const tabPagados = document.getElementById('tab-pagados');
const btnExportContacts = document.getElementById('btn-export-contacts');

let allFiados = [];
let currentView = 'Pendiente'; // 'Pendiente' o 'Pagado'

// --- TOAST NOTIFICATIONS ---
window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-yellow-500' };
    const icons = { success: 'fa-check', error: 'fa-times', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    
    toast.className = `flex items-center gap-2 ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl shadow-2xl font-bold toast-enter`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-100%)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- DATA FETCHING & GROUPING ---
const q = query(collection(db, "fiados"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    allFiados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderGroups();
});

function groupFiadosByClient(fiadosArray) {
    const groups = {};
    let globalTotal = 0;

    fiadosArray.forEach(f => {
        // En vista "Pendiente", ocultar los Pagados. En vista "Pagado", ocultar los Pendientes
        if (f.estado !== currentView) return; 

        // Normalize Phone to use as primary key. Fallback to lowercase name if no phone.
        let key = f.phone ? String(f.phone).replace(/\D/g, '') : f.name.toLowerCase().trim();
        
        if (!groups[key]) {
            groups[key] = {
                name: f.name,
                phone: key,
                totalDebt: 0,
                records: []
            };
        }
        
        const amount = Number(f.amount) || 0;
        
        if (f.esAbono) {
            groups[key].totalDebt -= amount;
            globalTotal -= amount;
        } else {
            groups[key].totalDebt += amount;
            globalTotal += amount;
        }
        
        groups[key].records.push(f);
    });

    return { groups: Object.values(groups), globalTotal };
}

function renderGroups() {
    const searchTerm = (searchInput.value || '').toLowerCase();
    
    // Filter before grouping to allow searching
    const filteredFiados = allFiados.filter(f => 
        (f.name || '').toLowerCase().includes(searchTerm) || 
        (f.phone || '').includes(searchTerm)
    );

    const { groups, globalTotal } = groupFiadosByClient(filteredFiados);

    // Update Top Counter
    totalStreetMoneyDoc.innerText = `$${globalTotal.toLocaleString('es-CL')}`;

    fiadosList.innerHTML = '';
    if (groups.length === 0) {
        if(currentView === 'Pendiente') {
            fiadosList.innerHTML = `<div class="bg-white p-8 rounded-2xl border text-center"><i class="fas fa-check-circle text-5xl text-green-400 mb-3"></i><p class="text-gray-500 font-bold text-lg">No hay cuentas pendientes.</p></div>`;
        } else {
            fiadosList.innerHTML = `<div class="bg-white p-8 rounded-2xl border text-center"><i class="fas fa-box-open text-5xl text-gray-300 mb-3"></i><p class="text-gray-500 font-bold text-lg">Aún no hay historiales de pago.</p></div>`;
        }
        return;
    }

    // Sort heavily indebted first
    groups.sort((a, b) => b.totalDebt - a.totalDebt);

    groups.forEach(group => {
        const firstRecordDate = group.records[group.records.length - 1].createdAt; // Oldest
        const dateObj = firstRecordDate && firstRecordDate.seconds ? new Date(firstRecordDate.seconds * 1000) : new Date();

        let recordsHTML = group.records.map(r => {
            const rDate = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('es-CL', {day:'2-digit', month:'short'}) : 'N/A';
            const isAbono = r.esAbono === true;
            
            return `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 rounded-md group ${isAbono ? 'bg-green-50/30' : ''}">
                    <div class="w-full md:w-3/4 mb-2 md:mb-0">
                        <p class="text-sm font-bold ${isAbono ? 'text-green-700' : 'text-gray-700'}">${rDate} <span class="text-gray-400 font-normal">|</span> ${r.details}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <p class="text-sm font-black ${currentView === 'Pagado' ? 'text-gray-400' : (isAbono ? 'text-green-600' : 'text-pink-600')}">
                            ${isAbono ? '-' : ''}$${Number(r.amount).toLocaleString('es-CL')}
                        </p>
                        <div class="flex gap-2">
                           <button onclick="window.populateFiadoForm('${r.id}')" class="text-blue-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Editar este ticket"><i class="fas fa-edit"></i></button>
                           <button onclick="window.deleteFiado('${r.id}')" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar permanentemente"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const positiveDebtRecords = group.records.filter(r => !r.esAbono).map(r=>r.details).join(' / ');
        const totalAbonosGenerados = group.records.filter(r => r.esAbono).reduce((sum, r) => sum + Number(r.amount), 0);
        const detailMsg = totalAbonosGenerados > 0 ? `(Compras: ${positiveDebtRecords}. Abonos a favor: $${totalAbonosGenerados.toLocaleString('es-CL')})` : `(Detalle: ${positiveDebtRecords})`;

        const whatsappMsg = currentView === 'Pendiente' ? 
            `https://wa.me/${group.phone}?text=${encodeURIComponent(`Hola ${group.name}, te saludo de Express Faena. 🎒\n\nTe escribo para enviarte el detalle de tu cuenta actual:\n\n*Total Pendiente: $${group.totalDebt.toLocaleString('es-CL')}*\n\n*${detailMsg}*\n\n¿Por favor me avisas cuando tengas disponibilidad para liquidarlo? ¡Muchas gracias! 🚀`)}` :
            `https://wa.me/${group.phone}?text=${encodeURIComponent(`Hola ${group.name}, te escribo de Express Faena solo para darte las gracias por el pago de tu cuenta. ¡Muchas gracias por tu responsabilidad! Seguimos a tu disposición. 🎒`)}`;

        const actionButtons = currentView === 'Pendiente' ? `
            <button onclick="window.prepareAbono('${group.phone}', '${group.name}')" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm">
                <i class="fas fa-hand-holding-usd text-lg"></i> Registrar Abono
            </button>
            <a href="${whatsappMsg}" target="_blank" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm">
                <i class="fab fa-whatsapp text-lg"></i> Enviar Recordatorio
            </a>
            <button onclick="window.markAllAsPaid('${group.phone}', '${group.name}')" class="w-full md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm">
                <i class="fas fa-check-double"></i> Saldar Cuenta Completa ($${group.totalDebt.toLocaleString('es-CL')})
            </button>
        ` : `
            <a href="${whatsappMsg}" target="_blank" class="w-full md:col-span-2 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm">
                <i class="fab fa-whatsapp text-lg text-green-400"></i> Mandar Agradecimiento
            </a>
        `;

        fiadosList.innerHTML += `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 class="text-xl font-black text-gray-800"><i class="fas fa-user-circle text-gray-400 mr-1"></i> ${group.name}</h3>
                        <p class="text-sm text-gray-500 font-bold mt-1"><i class="fab fa-whatsapp text-green-500"></i> ${group.phone}</p>
                    </div>
                    <div class="text-right flex items-center gap-4">
                        <div>
                           <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">${currentView === 'Pagado' ? 'Total Histórico Pagado' : 'Deuda Total'}</p>
                           <p class="text-2xl font-black ${currentView === 'Pagado' ? 'text-green-500' : 'text-red-500'}">$${group.totalDebt.toLocaleString('es-CL')}</p>
                        </div>
                    </div>
                </div>
                <div class="p-4">
                    <p class="text-xs font-bold text-gray-400 uppercase mb-2">Historial de Tickets ${currentView === 'Pagado' ? 'Limpiados' : 'Sin Pagar'}:</p>
                    <div class="bg-white border rounded-xl p-2 mb-4">
                        ${recordsHTML}
                    </div>
                    
                    <div class="flex grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    });
}

// --- TABS Y EVENTOS ---
searchInput.addEventListener('input', renderGroups);

// Auto-cambiar placeholder según el "Tipo" de registro seleccionado
tipoInput.addEventListener('change', (e) => {
    if(e.target.value === 'abono') {
        detailsInput.value = "Pago/Abono de Deuda";
        submitBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Registrar Abono';
        submitBtn.classList.replace('bg-pink-600', 'bg-indigo-600');
        submitBtn.classList.replace('hover:bg-pink-700', 'hover:bg-indigo-700');
    } else {
        detailsInput.value = "";
        detailsInput.placeholder = "Ej: 2 Redbull, 1 Galleta";
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Registrar Deuda';
        submitBtn.classList.replace('bg-indigo-600', 'bg-pink-600');
        submitBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-pink-700');
    }
});

tabPendientes.addEventListener('click', () => {
    currentView = 'Pendiente';
    tabPendientes.className = 'bg-white text-pink-600 shadow-sm px-4 py-2 rounded-lg font-bold text-sm transition-all';
    tabPagados.className = 'text-gray-600 hover:bg-gray-300 px-4 py-2 rounded-lg font-bold text-sm transition-all';
    renderGroups();
});

tabPagados.addEventListener('click', () => {
    currentView = 'Pagado';
    tabPagados.className = 'bg-white text-gray-800 shadow-sm px-4 py-2 rounded-lg font-bold text-sm transition-all';
    tabPendientes.className = 'text-gray-600 hover:bg-gray-300 px-4 py-2 rounded-lg font-bold text-sm transition-all';
    renderGroups();
});

// --- POPULATE FORM FOR EDITING ---
window.populateFiadoForm = (id) => {
    const record = allFiados.find(f => f.id === id);
    if(!record) return;

    fiadoIdInput.value = record.id;
    nameInput.value = record.name;
    phoneInput.value = record.phone;
    detailsInput.value = record.details;
    amountInput.value = record.amount;

    submitBtn.innerHTML = '<i class="fas fa-edit"></i> Actualizar Registro';
    submitBtn.classList.replace('bg-pink-600', 'bg-blue-600');
    submitBtn.classList.replace('hover:bg-pink-700', 'hover:bg-blue-700');
    cancelBtn.classList.remove('hidden');
    cancelBtn.classList.add('block');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- RESET FORM ---
const resetFiadoForm = () => {
    form.reset();
    fiadoIdInput.value = '';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Registrar Deuda';
    submitBtn.classList.replace('bg-blue-600', 'bg-pink-600');
    submitBtn.classList.replace('hover:bg-blue-700', 'hover:bg-pink-700');
    cancelBtn.classList.remove('block');
    cancelBtn.classList.add('hidden');
};

cancelBtn.addEventListener('click', resetFiadoForm);

// --- PREPARE ABONO FROM CARD SHORTCUT ---
window.prepareAbono = (phone, name) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetFiadoForm();
    nameInput.value = name;
    phoneInput.value = phone;
    tipoInput.value = 'abono';
    
    // Trigger dispatch so the colors change dynamically
    const event = new Event('change');
    tipoInput.dispatchEvent(event);
    amountInput.focus();
};

// --- CREATE OR UPDATE DEBT ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Normalize phone (only numbers)
    let phoneNum = phoneInput.value.replace(/\D/g, '');
    if (!phoneNum.startsWith('569') && phoneNum.length === 8) phoneNum = '569' + phoneNum;
    
    const isAbono = tipoInput.value === 'abono';

    const data = {
        name: nameInput.value.trim(),
        phone: phoneNum,
        details: detailsInput.value.trim(),
        amount: Number(amountInput.value),
        estado: 'Pendiente',
        esAbono: isAbono,
        createdAt: serverTimestamp()
    };

    const isEditing = fiadoIdInput.value !== '';

    try {
        if (isEditing) {
            // Update Existing Fiado
            await updateDoc(doc(db, "fiados", fiadoIdInput.value), {
                name: data.name,
                phone: data.phone,
                details: data.details,
                amount: data.amount,
                esAbono: data.esAbono
            });
            showToast(`Registro de ${data.name} actualizado.`, 'success');
        } else {
            // Add New Fiado
            await addDoc(collection(db, "fiados"), data);
            showToast(`Registro de $${data.amount} agregado a la cuenta de ${data.name}.`, 'success');
        }
        resetFiadoForm();
        nameInput.focus();
    } catch (error) {
        console.error("Error adding fiado:", error);
        showToast("Error al guardar el registro en Firebase.", "error");
    }
});

// --- SETTLE DEBT (Mark Paid) ---
window.markAllAsPaid = async (phoneKey, name) => {
    if(!confirm(`¿Estás seguro de MARCAR COMO PAGADA la deuda completa de ${name}?`)) return;

    try {
        const recordsToUpdate = allFiados.filter(f => f.estado !== 'Pagado' && ((f.phone && String(f.phone).replace(/\D/g, '') === phoneKey) || f.name.toLowerCase().trim() === phoneKey));
        
        // Update all specific documents to "Pagado"
        const promises = recordsToUpdate.map(f => updateDoc(doc(db, "fiados", f.id), { estado: 'Pagado' }));
        await Promise.all(promises);
        
        showToast(`¡Excelente! Cuenta de ${name} liquidada al 100%.`, 'success');
    } catch (error) {
        console.error("Error setting paid status:", error);
        showToast("Hubo un error al actualizar los datos.", "error");
    }
}

// --- DELETE FIADO INDEPENDENTLY ---
window.deleteFiado = async (id) => {
    if(!confirm("¿Eliminar este ticket del registro permanentemente?")) return;
    try {
        await deleteDoc(doc(db, "fiados", id));
        showToast("Ticket eliminado.", "info");
    } catch (error) {
        showToast("Error al eliminar.", "error");
    }
}

// --- EXPORTAR CONTACTOS (WHATSAPP/EXCEL) ---
btnExportContacts.addEventListener('click', () => {
    // Collect all unique name/phone pairs
    const uniqueContacts = {};
    allFiados.forEach(f => {
        if (!f.phone || String(f.phone).trim() === '') return;
        const normalizedPhone = '+' + String(f.phone).replace(/[^\d]/g, '');
        uniqueContacts[f.phone] = { name: f.name, phone: normalizedPhone };
    });

    const contactsArray = Object.values(uniqueContacts);
    
    if (contactsArray.length === 0) {
        showToast("No hay contactos con número de teléfono registrado para exportar.", "warning");
        return;
    }

    // Build CSV Content
    let csvContent = "\uFEFFNombre,Telefono\n"; // \uFEFF for Excel UTF-8 BOM
    contactsArray.forEach(contact => {
        csvContent += `"${contact.name}","${contact.phone}"\n`;
    });

    // Create a Blob and Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Clientes_Fiados_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Se han exportado ${contactsArray.length} contactos.`, 'success');
});
