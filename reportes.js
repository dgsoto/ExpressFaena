import "./auth_guard.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE CONFIG (debe ser la misma que en tus otros archivos) ---
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
const totalRevenueEl = document.getElementById('total-revenue');
const totalItemsSoldEl = document.getElementById('total-items-sold');
const topProductEl = document.getElementById('top-product');
const productRankingListEl = document.getElementById('product-ranking-list');
const salesChartCanvas = document.getElementById('sales-chart');

let salesChart = null; // Variable to hold the chart instance

// --- LOAD AND PROCESS SALES DATA (REAL-TIME) ---
const ventasQuery = query(collection(db, "ventas"), orderBy("date", "desc"));

onSnapshot(ventasQuery, (snapshot) => {
    if (snapshot.empty) {
        console.log("No sales data found.");
        productRankingListEl.innerHTML = '<p class="text-center text-gray-500">Aún no hay datos de ventas.</p>';
        return;
    }

    const salesData = snapshot.docs.map(doc => doc.data());

    // 1. Calculate Summary Metrics
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.precioFinal || 0), 0);
    const totalItemsSold = salesData.reduce((sum, sale) => sum + (sale.quantity || 0), 0);

    // 2. Process Product Ranking
    const productStats = salesData.reduce((acc, sale) => {
        if (!acc[sale.nombre]) {
            acc[sale.nombre] = {
                quantity: 0,
                revenue: 0
            };
        }
        acc[sale.nombre].quantity += (sale.quantity || 0);
        acc[sale.nombre].revenue += (sale.precioFinal || 0);
        return acc;
    }, {});

    const rankedProducts = Object.entries(productStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity); // Sort by quantity sold

    const topProduct = rankedProducts.length > 0 ? rankedProducts[0].name : '-';

    // 3. Render Metrics and Ranking
    totalRevenueEl.textContent = `$${totalRevenue.toLocaleString('es-CL')}`;
    totalItemsSoldEl.textContent = totalItemsSold;
    topProductEl.textContent = topProduct;

    productRankingListEl.innerHTML = ""; // Clear previous list
    rankedProducts.forEach((product, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-lg';
        rankItem.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-lg text-gray-700 w-6">${index + 1}.</span>
                <div>
                    <p class="font-semibold text-gray-800">${product.name}</p>
                    <p class="text-sm text-gray-500">Total: $${product.revenue.toLocaleString('es-CL')}</p>
                </div>
            </div>
            <span class="font-bold text-lg text-blue-600">${product.quantity} <span class="text-sm font-normal">unidades</span></span>
        `;
        productRankingListEl.appendChild(rankItem);
    });

    // 4. Render Chart
    renderBarChart(rankedProducts);
});

function renderBarChart(rankedProducts) {
    const top5Products = rankedProducts.slice(0, 5).reverse(); // Get top 5 and reverse for better visual in chart
    const chartLabels = top5Products.map(p => p.name);
    const chartData = top5Products.map(p => p.quantity);

    const data = {
        labels: chartLabels,
        datasets: [{
            label: 'Unidades Vendidas',
            data: chartData,
            backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
        }]
    };

    if (salesChart) {
        salesChart.destroy(); // Destroy the old chart instance before creating a new one
    }

    salesChart = new Chart(salesChartCanvas, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y', // Horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1 // Ensure ticks are integers
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top 5 Productos Más Populares'
                }
            }
        }
    });
}
