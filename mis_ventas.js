
import "./auth_guard.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, runTransaction, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyAP2RBfMX8qB1FcBbjBZoTvAnxQxY5_IYM",
    authDomain: "express-faena-tienda.firebaseapp.com",
    projectId: "express-faena-tienda",
    storageBucket: "express-faena-tienda.firebasestorage.app",
    messagingSenderId: "1009353188382",
    appId: "1:1009353188382:web:10765ffed9fc9d26767a0f",
    measurementId: "G-KH92E5K2TS"
};

const ORDER_STATUSES = {
    'Pendiente': { text: 'Pendiente', color: 'bg-yellow-400 text-black' },
    'En Preparación': { text: 'En Preparación', color: 'bg-blue-500 text-white' },
    'Enviado': { text: 'Enviado', color: 'bg-indigo-500 text-white' },
    'Completado': { text: 'Completado', color: 'bg-green-500 text-white' },
    'Cancelado': { text: 'Cancelado', color: 'bg-red-600 text-white' },
};

// --- INICIALIZACIÓN Y DOM ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// ... (otros elementos del DOM)
const customerListContainer = document.getElementById('customer-list-container');

let allOrders = []; // Almacenar todos los pedidos para acceder a sus datos

// --- FUNCIÓN PRINCIPAL DE CAMBIO DE ESTADO ---
window.updateOrderStatus = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;

    try {
        await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, "pedidos_completos", orderId);
            const orderSnap = await transaction.get(orderRef);

            if (!orderSnap.exists()) {
                throw "El pedido no existe!";
            }

            const orderData = orderSnap.data();
            const oldStatus = orderData.status;

            // Si el estado no cambia, no hacer nada
            if (oldStatus === newStatus) return;

            // CASO 1: El pedido se está CANCELANDO
            if (newStatus === 'Cancelado' && oldStatus !== 'Cancelado' && !orderData.stockRepuesto) {
                // Devolver el stock de cada item
                for (const item of orderData.items) {
                    const productRef = doc(db, "productos", item.id);
                    const productSnap = await transaction.get(productRef);
                    if (productSnap.exists()) {
                        const newStock = (productSnap.data().stock || 0) + item.quantity;
                        transaction.update(productRef, { stock: newStock });
                    }
                }
                // Marcar el pedido para no reponer el stock de nuevo
                transaction.update(orderRef, { status: newStatus, stockRepuesto: true });

                // CASO 2: Un pedido CANCELADO se está reactivando
            } else if (oldStatus === 'Cancelado' && newStatus !== 'Cancelado' && orderData.stockRepuesto) {
                // Volver a descontar el stock de cada item
                for (const item of orderData.items) {
                    const productRef = doc(db, "productos", item.id);
                    const productSnap = await transaction.get(productRef);
                    if (productSnap.exists()) {
                        const currentStock = productSnap.data().stock || 0;
                        if (currentStock < item.quantity) {
                            throw `No hay suficiente stock para reactivar el pedido. Falta stock de "${item.nombre}".`;
                        }
                        const newStock = currentStock - item.quantity;
                        transaction.update(productRef, { stock: newStock });
                    }
                }
                // Quitar la marca para permitir futuras cancelaciones
                transaction.update(orderRef, { status: newStatus, stockRepuesto: false });

            } else {
                // Para cualquier otro cambio de estado, solo actualizar el estado
                transaction.update(orderRef, { status: newStatus });
            }
        });

        showToast('¡Estado actualizado con éxito!', 'bg-green-500');

    } catch (error) {
        console.error("Error en la transacción de cambio de estado: ", error);
        alert(`Error: ${error}`);
        // Opcional: Recargar los datos para asegurar consistencia visual
        // location.reload(); 
    }
};


// --- ESCUCHA Y RENDERIZADO DE DATOS (Adaptado) ---
onSnapshot(query(collection(db, "pedidos_completos"), orderBy("createdAt", "desc")), (snapshot) => {
    allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (allOrders.length === 0) {
        customerListContainer.innerHTML = '<p class="text-center text-gray-500">Aún no hay ventas registradas.</p>';
        return;
    }
    renderCustomerList(allOrders);
    // ... (llamadas a otras funciones de renderizado de estadísticas)
});

function renderCustomerList(orders) {
    const customers = {};
    orders.forEach(order => {
        const phone = order.customerPhone || order.id; // Usar ID como fallback único
        if (!customers[phone]) {
            customers[phone] = { name: order.customerName, phone: order.customerPhone, orders: [] };
        }
        customers[phone].orders.push(order);
    });

    customerListContainer.innerHTML = '';
    Object.values(customers).forEach(customer => {
        const customerDiv = document.createElement('div');
        customerDiv.className = 'border border-gray-200 rounded-lg p-4';

        let ordersHTML = '';
        customer.orders.forEach(order => {
            const orderDate = new Date(order.createdAt.seconds * 1000);
            const statusInfo = ORDER_STATUSES[order.status] || ORDER_STATUSES['Pendiente'];

            let selectOptions = '';
            for (const key in ORDER_STATUSES) {
                selectOptions += `<option value="${key}" ${key === order.status ? 'selected' : ''}>${ORDER_STATUSES[key].text}</option>`;
            }

            ordersHTML += `
                <div class="p-3 bg-gray-50 rounded-lg mt-3">
                    <div class="flex justify-between items-start">
                       <p class="text-xs text-gray-600">ID: ${order.id}</p>
                       <span class="${statusInfo.color} text-xs font-bold px-2 py-1 rounded-full">${statusInfo.text}</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">${orderDate.toLocaleString('es-CL')}</p>
                    <p class="font-bold text-lg mt-1">$${order.total.toLocaleString('es-CL')}</p>
                    <p class="text-xs mt-2"><b>Items:</b> ${order.items.map(i => `${i.quantity}x ${i.nombre}`).join(', ')}</p>
                    <div class="mt-3">
                        <label class="text-xs font-semibold">Cambiar Estado:</label>
                        <select onchange="updateOrderStatus('${order.id}', this.value)" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm">
                            ${selectOptions}
                        </select>
                    </div>
                     ${order.stockRepuesto ? '<p class="text-xs text-blue-500 mt-2 font-semibold"><i class="fas fa-info-circle"></i> Stock de este pedido fue repuesto.</p>' : ''}
                </div>
            `;
        });

        customerDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold">${customer.name} <span class="text-sm font-normal text-gray-500">(${customer.phone || 'N/A'})</span></p>
                </div>
                <p class="text-sm font-bold">${customer.orders.length} Pedido(s)</p>
            </div>
            <div class="mt-2 border-t pt-2">${ordersHTML}</div>
        `;
        customerListContainer.appendChild(customerDiv);
    });
}

function showToast(message, bgColor) {
    const toast = document.getElementById('toast-notification');
    toast.textContent = message;
    toast.className = `fixed top-24 right-8 ${bgColor} text-white text-sm font-bold px-4 py-3 rounded-lg shadow-lg`;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}
