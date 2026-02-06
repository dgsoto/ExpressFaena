
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const productPriceInput = document.getElementById('product-price');
const productImageInput = document.getElementById('product-image');
const productsList = document.getElementById('products-list');
const cancelEditBtn = document.getElementById('cancel-edit');

// --- PREVIEW ELEMENTS ---
const previewImage = document.getElementById('preview-image');
const previewName = document.getElementById('preview-name');
const previewPrice = document.getElementById('preview-price');

// --- LOAD AND DISPLAY PRODUCTS (REAL-TIME) ---
const q = query(collection(db, "productos"), orderBy("nombre"));
onSnapshot(q, (querySnapshot) => {
    productsList.innerHTML = "";
    if (querySnapshot.empty) {
        productsList.innerHTML = `<p class="text-center text-gray-500">No hay productos para mostrar.</p>`;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        productsList.innerHTML += `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center gap-4">
                    <img src="${product.img || 'https://via.placeholder.com/150'}" alt="${product.nombre}" class="w-12 h-12 object-cover rounded-md">
                    <div>
                        <p class="font-bold text-gray-800">${product.nombre}</p>
                        <p class="text-sm text-gray-600">$${product.precio.toLocaleString('es-CL')}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.editProduct('${productId}', '${product.nombre}', ${product.precio}, '${product.img || ''}')" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold"><i class="fas fa-pencil-alt"></i></button>
                    <button onclick="window.deleteProduct('${productId}')" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
});

// --- FORM SUBMISSION (CREATE/UPDATE) ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = productIdInput.value;
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const image = productImageInput.value.trim();

    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor, completa el nombre y el precio correctamente.");
        return;
    }

    const productData = { nombre: name, precio: price, img: image };

    try {
        if (id) {
            // Update existing product
            await updateDoc(doc(db, "productos", id), productData);
            alert("¡Producto actualizado con éxito!");
        } else {
            // Add new product
            await addDoc(collection(db, "productos"), productData);
            alert("¡Producto agregado con éxito!");
        }
        resetForm();
    } catch (error) {
        console.error("Error guardando el producto: ", error);
        alert("Hubo un error al guardar el producto.");
    }
});

// --- EDIT FUNCTION ---
window.editProduct = (id, name, price, image) => {
    productIdInput.value = id;
    productNameInput.value = name;
    productPriceInput.value = price;
    productImageInput.value = image;

    productForm.querySelector('button[type="submit"]').innerText = "Actualizar Producto";
    cancelEditBtn.classList.remove('hidden');
    window.scrollTo(0, 0);
}

// --- DELETE FUNCTION ---
window.deleteProduct = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
        try {
            await deleteDoc(doc(db, "productos", id));
            alert("Producto eliminado.");
        } catch (error) {
            console.error("Error eliminando el producto: ", error);
            alert("No se pudo eliminar el producto.");
        }
    }
}

// --- CANCEL EDIT ---
cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

// --- RESET FORM ---
function resetForm() {
    productForm.reset();
    productIdInput.value = '';
    productForm.querySelector('button[type="submit"]').innerText = "Guardar Producto";
    cancelEditBtn.classList.add('hidden');
    updatePreview(); // Reset preview to default
}

// --- LIVE PREVIEW ---
function updatePreview() {
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const image = productImageInput.value.trim();

    previewName.textContent = name || "Nombre Producto";
    previewPrice.textContent = isNaN(price) || price <= 0 ? "$0" : `$${price.toLocaleString('es-CL')}`;
    previewImage.src = image || 'https://via.placeholder.com/150?text=IMAGEN';
}

productNameInput.addEventListener('input', updatePreview);
productPriceInput.addEventListener('input', updatePreview);
productImageInput.addEventListener('input', updatePreview);

// Initial preview update
updatePreview();
