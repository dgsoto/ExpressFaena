
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
const productPriceInput = document.getElementById('product-price');
const productVideoInput = document.getElementById('product-video');
const productImagesTextarea = document.getElementById('product-images');
const productsList = document.getElementById('products-list');
const cancelEditBtn = document.getElementById('cancel-edit');

// --- LOAD AND DISPLAY PRODUCTS (REAL-TIME) ---
// We query the products and order them by name for consistent display.
const q = query(collection(db, "productos"), orderBy("nombre"));
onSnapshot(q, (querySnapshot) => {
    productsList.innerHTML = "";
    if (querySnapshot.empty) {
        productsList.innerHTML = `<p class="text-center text-gray-500">No hay productos para mostrar.</p>`;
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;

        // Use the first image from the 'images' array for the thumbnail.
        // If there are no images, show a placeholder.
        const thumbnailUrl = (product.images && product.images.length > 0)
            ? product.images[0]
            : 'https://via.placeholder.com/150?text=No+Image';

        productsList.innerHTML += `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center gap-4">
                    <img src="${thumbnailUrl}" alt="${product.nombre}" class="w-12 h-12 object-cover rounded-md">
                    <div>
                        <p class="font-bold text-gray-800">${product.nombre}</p>
                        <p class="text-sm text-gray-600">$${product.precio.toLocaleString('es-CL')}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.editProduct('${productId}')" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold"><i class="fas fa-pencil-alt"></i></button>
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
    const video = productVideoInput.value.trim();

    // Process the textarea for image URLs:
    // 1. Split the string into an array by newlines.
    // 2. Trim whitespace from each URL.
    // 3. Filter out any empty lines.
    const images = productImagesTextarea.value.split('\n').map(line => line.trim()).filter(line => line);

    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor, completa el nombre y el precio correctamente.");
        return;
    }
    if (images.length > 15) {
        alert("Puedes agregar un máximo de 15 imágenes.");
        return;
    }

    // This is the new data structure for our product document.
    const productData = { 
        nombre: name, 
        precio: price, 
        video: video, // Can be an empty string if no video is provided.
        images: images  // An array of image URLs.
    };

    try {
        if (id) {
            // If an ID exists, we are updating an existing product.
            await updateDoc(doc(db, "productos", id), productData);
            alert("¡Producto actualizado con éxito!");
        } else {
            // Otherwise, we are adding a new product.
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
// When the edit button is clicked, we fetch the latest product data from Firestore.
window.editProduct = async (id) => {
    try {
        const docRef = doc(db, "productos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            
            // Populate the form with the product's data.
            productIdInput.value = id;
            productNameInput.value = product.nombre;
            productPriceInput.value = product.precio;
            productVideoInput.value = product.video || '';
            // Join the array of image URLs into a newline-separated string for the textarea.
            productImagesTextarea.value = (product.images || []).join('\n');

            // Update UI to show that we are in edit mode.
            productForm.querySelector('button[type="submit"]').innerText = "Actualizar Producto";
            cancelEditBtn.classList.remove('hidden');
            window.scrollTo(0, 0); // Scroll to the top to see the form.
        } else {
            alert("El producto que intentas editar no fue encontrado.");
        }
    } catch (error) {
        console.error("Error al cargar datos para editar: ", error);
        alert("Error al cargar los datos del producto.");
    }
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

// --- RESET FORM FUNCTION ---
window.resetForm = () => {
    productForm.reset(); // This clears all inputs within the form.
    productIdInput.value = ''; // Explicitly clear the hidden ID input.

    // Reset UI to be in "add new" mode.
    productForm.querySelector('button[type="submit"]').innerText = "Guardar Producto";
    cancelEditBtn.classList.add('hidden');
}

// Add a listener to the cancel button.
cancelEditBtn.addEventListener('click', window.resetForm);
