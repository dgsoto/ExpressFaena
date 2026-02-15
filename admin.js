
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
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productCategoryInput = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productStockInput = document.getElementById('product-stock');
const productDiscountInput = document.getElementById('product-discount');
const productTagsInput = document.getElementById('product-tags');
const productStarsInput = document.getElementById('product-stars');
const productVideoInput = document.getElementById('product-video');
const productImagesTextarea = document.getElementById('product-images');
const productsList = document.getElementById('products-list');
const cancelEditBtn = document.getElementById('cancel-edit');
const formTitle = document.getElementById('form-title');

// --- LOAD AND DISPLAY PRODUCTS (REAL-TIME) ---
const q = query(collection(db, "productos"), orderBy("nombre"));
onSnapshot(q, (querySnapshot) => {
    productsList.innerHTML = "";
    if (querySnapshot.empty) {
        productsList.innerHTML = `<p class="text-center text-gray-500">No hay productos.</p>`;
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const thumbnailUrl = (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/150';

        // --- Lógica de Color de Stock ---
        const stock = product.stock !== undefined ? product.stock : -1; // Default to -1 if undefined
        let stockStatus;
        if (stock > 10) {
            stockStatus = { text: `${stock} Unidades`, color: 'text-green-600', bg: 'bg-green-100' };
        } else if (stock > 0 && stock <= 10) {
            stockStatus = { text: `${stock} Unidades`, color: 'text-orange-600', bg: 'bg-orange-100' };
        } else {
            stockStatus = { text: 'Agotado', color: 'text-red-600', bg: 'bg-red-100' };
        }

        productsList.innerHTML += `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-4">
                    <img src="${thumbnailUrl}" alt="${product.nombre}" class="w-12 h-12 object-cover rounded-md">
                    <div>
                        <p class="font-bold text-gray-800">${product.nombre}</p>
                        <p class="text-sm text-gray-600">$${(product.precio || 0).toLocaleString('es-CL')} - ${product.categoria || 'Sin Cat.'}</p>
                        <p class="text-xs font-bold ${stockStatus.color} ${stockStatus.bg} px-2 py-0.5 rounded-full inline-block mt-1">Stock: ${stockStatus.text}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.editProduct('${productId}')" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-blue-600 transition-colors"><i class="fas fa-pencil-alt"></i> Editar</button>
                    <button onclick="window.deleteProduct('${productId}')" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-red-600 transition-colors"><i class="fas fa-trash"></i> Eliminar</button>
                </div>
            </div>
        `;
    });
});

// --- FORM SUBMISSION (CREATE/UPDATE) ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = productIdInput.value;
    const images = productImagesTextarea.value.split('\n').map(line => line.trim()).filter(line => line);
    const tags = productTagsInput.value.split(',').map(tag => tag.trim().toUpperCase()).filter(tag => tag);

    const productData = {
        nombre: productNameInput.value.trim(),
        categoria: productCategoryInput.value.trim(),
        precio: parseFloat(productPriceInput.value),
        stock: parseInt(productStockInput.value),
        descuento: parseInt(productDiscountInput.value) || 0,
        tags: tags, 
        estrellas: parseInt(productStarsInput.value) || 5,
        video: productVideoInput.value.trim(),
        images: images,
    };

    // Validación
    if (!productData.nombre || !productData.categoria || isNaN(productData.precio) || isNaN(productData.stock) || productData.stock < 0) {
        alert("Por favor, completa Nombre, Categoría, Precio y un Stock válido (0 o más).");
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "productos", id), productData);
            alert("¡Producto actualizado con éxito!");
        } else {
            await addDoc(collection(db, "productos"), productData);
            alert("¡Producto agregado con éxito!");
        }
        resetForm();
    } catch (error) {
        console.error("Error guardando el producto: ", error);
        alert("Hubo un error al guardar.");
    }
});

// --- EDIT FUNCTION ---
window.editProduct = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "productos", id));
        if (docSnap.exists()) {
            const p = docSnap.data();
            productIdInput.value = id;
            productNameInput.value = p.nombre;
            productCategoryInput.value = p.categoria;
            productPriceInput.value = p.precio;
            productStockInput.value = p.stock;
            productDiscountInput.value = p.descuento || '';
            productTagsInput.value = (p.tags || []).join(', ');
            productStarsInput.value = p.estrellas || '';
            productVideoInput.value = p.video || '';
            productImagesTextarea.value = (p.images || []).join('\n');

            formTitle.innerText = "Editando Producto";
            productForm.querySelector('button[type="submit"]').innerText = "Actualizar Producto";
            cancelEditBtn.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Producto no encontrado.");
        }
    } catch (error) {
        console.error("Error al cargar producto: ", error);
    }
}

// --- DELETE FUNCTION ---
window.deleteProduct = async (id) => {
    if (confirm("¿Seguro que quieres eliminar este producto? Esto no repondrá el stock en ventas pasadas.")) {
        try {
            await deleteDoc(doc(db, "productos", id));
            alert("Producto eliminado.");
            resetForm();
        } catch (error) {
            console.error("Error eliminando: ", error);
        }
    }
}

// --- RESET FORM FUNCTION ---
window.resetForm = () => {
    productForm.reset();
    productIdInput.value = '';
    formTitle.innerText = "Agregar Nuevo Producto";
    productForm.querySelector('button[type="submit"]').innerText = "Guardar Producto";
    cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', window.resetForm);

// Check for suggestion-to-product on page load
document.addEventListener('DOMContentLoaded', () => {
    const newProductName = localStorage.getItem('newProductNameFromSuggestion');
    if (newProductName) {
        productNameInput.value = newProductName.replace(/&quot;/g, '"');
        localStorage.removeItem('newProductNameFromSuggestion');
        productNameInput.focus();
    }
});