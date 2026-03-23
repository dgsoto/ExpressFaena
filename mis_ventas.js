
import "./auth_guard.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, runTransaction, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const searchInput = document.getElementById('search-orders');

let allOrders = []; // Almacenar todos los pedidos para acceder a sus datos

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allOrders.filter(o =>
            (o.customerName || '').toLowerCase().includes(term) ||
            (o.customerPhone || '').toLowerCase().includes(term) ||
            (o.orden_id || o.id || '').toLowerCase().includes(term)
        );
        renderCustomerList(filtered);
    });
}

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

window.deleteOrder = async (orderId) => {
    if (!orderId) return;
    if (confirm("🛑 ¿ESTÁS ABSOLUTAMENTE SEGURO de querer ELIMINAR esta orden para siempre?\n\nNota: Si no la has cancelado antes, el stock no se repondrá automáticamente.")) {
        try {
            await deleteDoc(doc(db, "pedidos_completos", orderId));
            showToast('Orden eliminada exitosamente.', 'bg-red-500');
        } catch (error) {
            console.error(error);
            alert("No se pudo eliminar la orden.");
        }
    }
};


// --- ESCUCHA Y RENDERIZADO DE DATOS (Adaptado) ---
onSnapshot(query(collection(db, "pedidos_completos"), orderBy("createdAt", "desc")), (snapshot) => {
    allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (allOrders.length === 0) {
        customerListContainer.innerHTML = '<p class="text-center text-gray-500">Aún no hay ventas registradas.</p>';
        return;
    }

    // Actualizar Estadísticas y Gráficos Globales Independiente de la Búsqueda
    renderAnalytics(allOrders);

    // Check if there is an active search to prevent removing results on live updates
    if (searchInput && searchInput.value.trim() !== '') {
        searchInput.dispatchEvent(new Event('input'));
    } else {
        renderCustomerList(allOrders);
    }
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

            let cleanPhone = (customer.phone || '').replace(/[^\d+]/g, '');
            if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);

            const whatsappMsg = `https://wa.me/${cleanPhone || ''}?text=Hola%20${encodeURIComponent(customer.name)},%20te%20habló%20de%20Express%20Faena%20por%20tu%20orden%20%23${order.orden_id || order.id}`;

            ordersHTML += `
                <div class="p-4 bg-gray-50 rounded-xl mt-3 border border-gray-100 hover:shadow-md transition-shadow">
                    <div class="flex flex-col md:flex-row justify-between items-start mb-2">
                       <div>
                           <a href="${whatsappMsg}" target="_blank" class="text-sm font-black text-green-600 hover:text-green-800 border-b-2 border-green-300 pb-0.5 inline-flex items-center gap-1" title="Hablar por WhatsApp">
                               <i class="fab fa-whatsapp"></i> ORDEN #${order.orden_id || order.id.substring(0, 8)}
                           </a>
                           <p class="text-xs text-gray-400 mt-1">Ref T: ${order.id}</p>
                       </div>
                       <div class="flex items-center gap-3 mt-2 md:mt-0">
                           <span class="${statusInfo.color} shadow-sm text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">${statusInfo.text}</span>
                           <button onclick="window.deleteOrder('${order.id}')" class="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors" title="Eliminar Orden"><i class="fas fa-trash"></i></button>
                       </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1"><i class="far fa-clock"></i> ${orderDate.toLocaleString('es-CL')}</p>
                    <p class="font-bold text-xl text-gray-800 mt-2">$${order.total.toLocaleString('es-CL')}</p>
                    <div class="bg-white p-2 rounded-lg border border-gray-100 mt-2">
                        <p class="text-sm font-semibold text-gray-700 mb-1">Items:</p>
                        <p class="text-sm text-gray-600">${order.items.map(i => `<span class="inline-block bg-gray-100 px-2 py-0.5 rounded-md mr-1 mb-1">${i.quantity}x ${i.nombre}</span>`).join('')}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-200">
                        <label class="text-xs font-semibold text-gray-600 uppercase tracking-widest">Cambiar Estado:</label>
                        <select onchange="updateOrderStatus('${order.id}', this.value)" class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                            ${selectOptions}
                        </select>
                    </div>
                     ${order.stockRepuesto ? '<p class="text-xs text-blue-500 mt-3 font-bold bg-blue-50 p-2 rounded-lg border border-blue-100"><i class="fas fa-info-circle"></i> Stock de repuesto devuelto.</p>' : ''}
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
    toast.className = `fixed top-24 right-8 z-[100] ${bgColor} text-white text-sm font-bold px-4 py-3 rounded-lg shadow-xl border border-white/20`;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}

function renderAnalytics(orders) {
    let totalRevenue = 0;
    let completedOrdersCount = 0;
    let activeOrdersCount = 0;
    const uniquePhones = new Set();
    const productCounts = {};
    const hourCounts = {};

    orders.forEach(order => {
        // Ignorar cancelados para analíticas "positivas"
        if (order.status !== 'Cancelado') {
            activeOrdersCount++;

            const phone = (order.customerPhone || order.id).replace(/[^\d]/g, '');
            if (phone) uniquePhones.add(phone);

            // Peak Hours (Solo pedidos válidos)
            if (order.createdAt && order.createdAt.seconds) {
                const date = new Date(order.createdAt.seconds * 1000);
                const hour = date.getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }

            // Top Products (Solo pedidos válidos)
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (!productCounts[item.nombre]) productCounts[item.nombre] = 0;
                    productCounts[item.nombre] += item.quantity;
                });
            }
        }

        // Ingresos se calculan SOLO de los completados para ser realistas,
        // o puedes querer ver todo el potencial de lo "No Cancelado".
        // Vamos a usar 'Completado' para Ingresos Netos reales.
        if (order.status === 'Completado') {
            totalRevenue += (order.total || 0);
            completedOrdersCount++;
        }
    });

    const avgTicket = completedOrdersCount > 0 ? (totalRevenue / completedOrdersCount) : 0;

    // Actualizar Tarjetas DOM
    const elRevenue = document.getElementById('stats-total-revenue');
    if (elRevenue) elRevenue.innerText = `$${totalRevenue.toLocaleString('es-CL')}`;

    const elOrders = document.getElementById('stats-total-orders');
    if (elOrders) elOrders.innerText = activeOrdersCount;

    const elCustomers = document.getElementById('stats-unique-customers');
    if (elCustomers) elCustomers.innerText = uniquePhones.size;

    const elAvgTicket = document.getElementById('stats-avg-ticket');
    if (elAvgTicket) elAvgTicket.innerText = `$${Math.round(avgTicket).toLocaleString('es-CL')}`;

    // Renderizar Productos Top 5
    const topProductsHtml = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1]) // De mayor a menor cantidad
        .slice(0, 5) // Top 5
        .map(([name, qty]) => `
            <div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 hover:bg-yellow-50 transition-colors">
                <span class="text-sm font-bold text-gray-700 truncate w-3/4" title="${name}">${name}</span>
                <span class="text-xs font-black bg-yellow-400 text-black px-2 py-1 rounded-md shadow-sm">${qty} und.</span>
            </div>
        `).join('');

    const elTopProducts = document.getElementById('top-products-list');
    if (elTopProducts) elTopProducts.innerHTML = topProductsHtml || '<p class="text-sm text-gray-500 italic">No hay productos vendidos aún.</p>';

    // Renderizar Horas Pico Top 5
    const formatHour = (h) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:00 ${ampm}`;
    };

    const maxCount = Math.max(0, ...Object.values(hourCounts));
    const peakHoursHtml = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour, count]) => {
            const widthPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            return `
            <div class="flex flex-col mb-3">
                <div class="flex justify-between text-xs mb-1">
                    <span class="font-bold text-gray-600"><i class="far fa-clock text-blue-500"></i> ${formatHour(parseInt(hour))}</span>
                    <span class="text-gray-500 font-semibold">${count} pedido(s)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 shadow-inner overflow-hidden">
                    <div class="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out" style="width: ${widthPct}%"></div>
                </div>
            </div>
            `;
        }).join('');

    const elPeakHours = document.getElementById('peak-hours-chart');
    if (elPeakHours) elPeakHours.innerHTML = peakHoursHtml || '<p class="text-sm text-gray-500 italic">No hay horas pico registradas.</p>';
}
