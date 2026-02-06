
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let carrito = JSON.parse(localStorage.getItem('cart')) || [];

// --- DOM ELEMENTS ---
const catalogoGrid = document.getElementById('catalogo');
const totalCarritoDisplay = document.getElementById('total-carrito');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const pedidoEspecialTextarea = document.getElementById('pedido-especial');
const sugerenciaInput = document.getElementById('input-sugerencia');
const sugerenciaNotification = document.getElementById('sugerencia-notification');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const headerMessagesContainer = document.getElementById('header-messages');

// --- HEADER MESSAGES ---
function manageHeaderMessages() {
    const q = query(collection(db, "mensajes"), where("active", "==", true));
    onSnapshot(q, (snapshot) => {
        const activeMessages = snapshot.docs.map(doc => doc.data().text);
        if (!headerMessagesContainer) return;

        headerMessagesContainer.innerHTML = ''; // Clear previous messages
        let currentMessageIndex = 0;

        if (activeMessages.length === 0) {
            headerMessagesContainer.innerHTML = `<p class="text-[10px] bg-black text-white px-2 py-0.5 rounded-full w-max mx-auto font-bold uppercase tracking-widest">Entrega Mañana 08:00 AM</p>`;
            return;
        }

        if (activeMessages.length === 1) {
            headerMessagesContainer.innerHTML = `<p class="text-[10px] bg-black text-white px-2 py-0.5 rounded-full w-max mx-auto font-bold uppercase tracking-widest">${activeMessages[0]}</p>`;
            return;
        }

        // Cycle through messages if more than one
        const displayMessage = () => {
            const messageP = document.createElement('p');
            messageP.className = 'text-[10px] bg-black text-white px-2 py-0.5 rounded-full w-max mx-auto font-bold uppercase tracking-widest';
            messageP.textContent = activeMessages[currentMessageIndex];
            
            headerMessagesContainer.innerHTML = '';
            headerMessagesContainer.appendChild(messageP);
            messageP.classList.add('fade-in');

            setTimeout(() => {
                messageP.classList.remove('fade-in');
                messageP.classList.add('fade-out');
            }, 4500); // Start fade out before next message

            currentMessageIndex = (currentMessageIndex + 1) % activeMessages.length;
        };

        displayMessage(); // Show first message immediately
        setInterval(displayMessage, 5000);
    });
}

// --- PRODUCT LOADING ---
async function loadProducts() {
    if (!catalogoGrid) return;
    try {
        const snap = await getDocs(collection(db, "productos"));
        catalogoGrid.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            catalogoGrid.innerHTML += `
                <div class="bg-white rounded-2xl shadow-md p-4 flex flex-col items-center text-center">
                    <img src="${p.img || 'https://via.placeholder.com/150'}" 
                         alt="${p.nombre}" 
                         onclick="showImageModal('${p.img || 'https://via.placeholder.com/150'}')" 
                         class="w-full h-28 object-cover rounded-lg mb-3 cursor-pointer shadow-sm">
                    <h4 class="text-sm font-bold text-gray-800 leading-tight">${p.nombre}</h4>
                    <p class="text-lg font-black text-gray-900 mt-1">$${p.precio.toLocaleString('es-CL')}</p>
                    <button onclick="addToCart('${p.nombre}', ${p.precio})" class="bg-[#facc15] w-full mt-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide active:scale-95 transition-transform shadow-sm">Agregar</button>
                </div>
            `;
        });
    } catch (e) {
        catalogoGrid.innerHTML = "<p class='col-span-2 text-center text-red-500'>Error de conexión al cargar productos.</p>";
        console.error(e);
    }
}

// --- IMAGE MODAL ---
window.showImageModal = (src) => {
    if (modalImage && imageModal) {
        modalImage.src = src;
        imageModal.classList.remove('hidden');
    }
}

window.hideImageModal = () => {
    if (imageModal) {
        imageModal.classList.add('hidden');
    }
}

// --- CART LOGIC ---
window.addToCart = (nombre, precio) => {
    carrito.push({ nombre, precio });
    saveCartAndRefresh();
};

window.increaseQuantity = (nombre) => {
    const item = carrito.find(p => p.nombre === nombre);
    if (item) {
        carrito.push({ nombre: item.nombre, precio: item.precio });
    }
    saveCartAndRefresh();
};

window.decreaseQuantity = (nombre) => {
    const itemIndex = carrito.findIndex(p => p.nombre === nombre);
    if (itemIndex > -1) {
        carrito.splice(itemIndex, 1);
    }
    saveCartAndRefresh();
};

function saveCartAndRefresh() {
    localStorage.setItem('cart', JSON.stringify(carrito));
    updateTotal();
    renderCart();
}

function updateTotal() {
    const total = carrito.reduce((sum, item) => sum + item.precio, 0);
    totalCarritoDisplay.innerText = `$${total.toLocaleString('es-CL')}`;
}

function getGroupedCart() {
    return carrito.reduce((acc, item) => {
        if (!acc[item.nombre]) {
            acc[item.nombre] = {
                precio: item.precio,
                quantity: 0
            };
        }
        acc[item.nombre].quantity++;
        return acc;
    }, {});
}

// --- UI RENDERING & INTERACTIONS ---
function renderCart() {
    const groupedCart = getGroupedCart();
    cartItemsContainer.innerHTML = "";

    if (Object.keys(groupedCart).length === 0) {
        cartItemsContainer.innerHTML = "<p class='text-center text-gray-500'>Tu carrito está vacío.</p>";
        return;
    }

    for (const [nombre, data] of Object.entries(groupedCart)) {
        cartItemsContainer.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div>
                    <p class="font-bold">${nombre}</p>
                    <p class="text-sm text-gray-600">$${(data.precio * data.quantity).toLocaleString('es-CL')}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="decreaseQuantity('${nombre}')" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-lg">-</button>
                    <span class="font-bold text-lg">${data.quantity}</span>
                    <button onclick="increaseQuantity('${nombre}')" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-lg">+</button>
                </div>
            </div>
        `;
    }
}

window.showCart = () => {
    renderCart();
    cartModal.classList.remove('hidden');
};

window.hideCart = () => {
    cartModal.classList.add('hidden');
};

window.enviarSugerencia = async () => {
    const val = sugerenciaInput.value.trim();
    if (!val) return;
    try {
        await addDoc(collection(db, "sugerencias"), { item: val, date: serverTimestamp() });
        sugerenciaInput.value = "";
        sugerenciaNotification.classList.remove('hidden');
        setTimeout(() => {
            sugerenciaNotification.classList.add('hidden');
        }, 3000);
    } catch (e) {
        alert("No se pudo enviar la sugerencia. Intenta de nuevo.");
        console.error(e);
    }
};

window.enviarWhatsApp = () => {
    const groupedCart = getGroupedCart();
    const esp = pedidoEspecialTextarea.value.trim();

    if (Object.keys(groupedCart).length === 0 && !esp) {
        return alert("Tu carrito está vacío.");
    }

    let msg = "👷‍♂️ *NUEVO PEDIDO FAENA*\n\n";

    for (const [name, data] of Object.entries(groupedCart)) {
        msg += `• ${data.quantity}x ${name}\n`;
    }

    if (esp) {
        msg += `\n🎁 *ESPECIAL:* ${esp}\n`;
    }

    const total = carrito.reduce((s, i) => s + i.precio, 0);
    msg += `\n💰 *TOTAL: $${total.toLocaleString('es-CL')}*`;
    msg += `\n\n🏦 *PAGO: CUENTA RUT 28.805.519-K*`;

    // Open WhatsApp
    window.open(`https://wa.me/56966840210?text=${encodeURIComponent(msg)}`);
    
    // Clear cart and UI
    carrito = [];
    pedidoEspecialTextarea.value = "";
    saveCartAndRefresh();
    hideCart();
};


// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateTotal();
    manageHeaderMessages();
});
