// ============================================================
//  1. DONNÉES PRODUITS
// ============================================================
const PRODUCTS = [
    { id: 1, name: 'Ordinateur Portable', price: 899, category: 'Électronique', emoji: '💻' },
    { id: 2, name: 'Smartphone', price: 699, category: 'Électronique', emoji: '📱' },
    { id: 3, name: 'Casque Audio', price: 149, category: 'Électronique', emoji: '🎧' },
    { id: 4, name: 'Montre Connectée', price: 249, category: 'Électronique', emoji: '⌚' },
    { id: 5, name: 'T-Shirt', price: 29, category: 'Vêtements', emoji: '👕' },
    { id: 6, name: 'Jeans', price: 59, category: 'Vêtements', emoji: '👖' },
    { id: 7, name: 'Veste', price: 89, category: 'Vêtements', emoji: '🧥' },
    { id: 8, name: 'Baskets', price: 79, category: 'Vêtements', emoji: '👟' },
    { id: 9, name: 'Roman', price: 19, category: 'Livres', emoji: '📚' },
    { id: 10, name: 'Livre de Cuisine', price: 25, category: 'Livres', emoji: '🍳' },
    { id: 11, name: 'Manuel Scolaire', price: 35, category: 'Livres', emoji: '📖' },
    { id: 12, name: 'Lampe', price: 45, category: 'Maison', emoji: '💡' },
    { id: 13, name: 'Chaise', price: 120, category: 'Maison', emoji: '🪑' },
    { id: 14, name: 'Table', price: 250, category: 'Maison', emoji: '🪵' },
    { id: 15, name: 'Vase', price: 30, category: 'Maison', emoji: '🏺' },
];

// ============================================================
//  2. ÉTAT
// ============================================================
let cart = []; // { productId, quantity }
let filteredProducts = [...PRODUCTS];
let isCartOpen = false;
let isDark = false;

// ============================================================
//  3. RÉFÉRENCES DOM
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const grid = $('#productsGrid');
const searchInput = $('#searchInput');
const categoryFilter = $('#categoryFilter');
const cartSidebar = $('#cartSidebar');
const cartOverlay = $('#cartOverlay');
const cartBody = $('#cartBody');
const cartTotal = $('#cartTotal');
const cartBadge = $('#cartBadge');
const cartItemCount = $('#cartItemCount');
const checkoutBtn = $('#checkoutBtn');
const themeToggle = $('#themeToggle');
const cartToggle = $('#cartToggle');
const closeCartBtn = $('#closeCartBtn');
const loadingOverlay = $('#loading-overlay');
const toastContainer = $('#toastContainer');
const productsCount = $('#productsCount');

// ============================================================
//  4. TOAST
// ============================================================
function showToast(message, type = 'success', duration = 3000) {
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-triangle-exclamation',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.success}"></i>
        <span class="toast-msg">${message}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    toastContainer.appendChild(toast);

    const close = () => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 350);
    };
    toast.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, duration);
}

// ============================================================
//  5. RENDU PRODUITS
// ============================================================
function renderProducts(products) {
    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>Aucun produit trouvé</h3>
                <p>Essayez de modifier votre recherche ou filtres.</p>
            </div>
        `;
        productsCount.textContent = '0 produit';
        return;
    }

    const cartIds = cart.map(item => item.productId);

    grid.innerHTML = products.map(p => {
        const inCart = cartIds.includes(p.id);
        const cartItem = cart.find(item => item.productId === p.id);
        const qty = cartItem ? cartItem.quantity : 0;
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="product-emoji">${p.emoji}</div>
                <div class="product-name">${p.name}</div>
                <span class="product-category">${p.category}</span>
                <div class="product-price">${p.price.toFixed(2)} <span>€</span></div>
                <button class="btn-add ${inCart ? 'in-cart' : ''}" data-id="${p.id}">
                    ${inCart ? `<i class="fas fa-check"></i> Dans le panier (${qty})` : `<i class="fas fa-plus"></i> Ajouter`}
                </button>
            </div>
        `;
    }).join('');

    productsCount.textContent = `${products.length} produit${products.length > 1 ? 's' : ''}`;

    // Événements sur les boutons "Ajouter"
    grid.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            handleAddToCart(id);
        });
    });
}

// ============================================================
//  6. RENDU PANIER
// ============================================================
function renderCart() {
    const items = cart.map(item => {
        const product = PRODUCTS.find(p => p.id === item.productId);
        return { ...item, product };
    }).filter(item => item.product);

    if (items.length === 0) {
        cartBody.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Votre panier est vide.</p>
                <small style="color:var(--text-muted)">Ajoutez des produits depuis la boutique !</small>
            </div>
        `;
        cartTotal.textContent = '0,00 €';
        cartBadge.textContent = '0';
        cartItemCount.textContent = '0';
        checkoutBtn.disabled = true;
        return;
    }

    let total = 0;
    let totalItems = 0;

    cartBody.innerHTML = items.map(({ productId, quantity, product }) => {
        const subtotal = product.price * quantity;
        total += subtotal;
        totalItems += quantity;
        return `
            <div class="cart-item" data-id="${productId}">
                <div class="cart-item-emoji">${product.emoji}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">${product.price.toFixed(2)} € / unité</div>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-minus" data-id="${productId}" title="Diminuer"><i class="fas fa-minus"></i></button>
                    <span class="cart-item-qty">${quantity}</span>
                    <button class="qty-plus" data-id="${productId}" title="Augmenter"><i class="fas fa-plus"></i></button>
                    <button class="danger" data-id="${productId}" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
                <div class="cart-item-total">${subtotal.toFixed(2)} €</div>
            </div>
        `;
    }).join('');

    cartTotal.textContent = `${total.toFixed(2)} €`;
    cartBadge.textContent = totalItems;
    cartItemCount.textContent = totalItems;
    checkoutBtn.disabled = false;

    // Événements sur les actions du panier
    cartBody.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            handleChangeQty(id, 1);
        });
    });
    cartBody.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            handleChangeQty(id, -1);
        });
    });
    cartBody.querySelectorAll('.danger').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            handleRemoveFromCart(id);
        });
    });
}

// ============================================================
//  7. FONCTIONS MÉTIER
// ============================================================

// a. Ajouter un produit au panier
function handleAddToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity += 1;
        showToast(`+1 « ${product.name} » ajouté au panier`, 'success');
    } else {
        cart.push({ productId, quantity: 1 });
        showToast(`« ${product.name} » ajouté au panier`, 'success');
    }

    renderCart();
    renderProducts(filteredProducts);
    updateCartBadge();
}

// b. Supprimer un produit du panier
function handleRemoveFromCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    cart = cart.filter(item => item.productId !== productId);
    if (product) {
        showToast(`« ${product.name} » retiré du panier`, 'error');
    }
    renderCart();
    renderProducts(filteredProducts);
    updateCartBadge();
}

// c. Modifier la quantité (augmenter/diminuer)
function handleChangeQty(productId, delta) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    const product = PRODUCTS.find(p => p.id === productId);
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
        handleRemoveFromCart(productId);
        return;
    }

    item.quantity = newQty;
    if (product) {
        showToast(`Quantité de « ${product.name} » : ${newQty}`, 'warning');
    }
    renderCart();
    renderProducts(filteredProducts);
    updateCartBadge();
}

// Mise à jour du badge
function updateCartBadge() {
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = total;
}

// ============================================================
//  8. RECHERCHE & FILTRE
// ============================================================
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;

    filteredProducts = PRODUCTS.filter(p => {
        const matchName = p.name.toLowerCase().includes(query);
        const matchCategory = category === 'all' || p.category === category;
        return matchName && matchCategory;
    });

    renderProducts(filteredProducts);
}

// ============================================================
//  9. OUVERTURE / FERMETURE DU PANIER
// ============================================================
function openCart() {
    isCartOpen = true;
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
}

function closeCart() {
    isCartOpen = false;
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

function toggleCart() {
    isCartOpen ? closeCart() : openCart();
}

// ============================================================
//  10. MODE JOUR / NUIT
// ============================================================
function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    showToast(isDark ? '🌙 Mode nuit activé' : '☀️ Mode jour activé', 'warning');
}

function loadTheme() {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
        isDark = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        isDark = false;
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// ============================================================
//  11. INITIALISATION DES CATÉGORIES
// ============================================================
function initCategories() {
    const cats = [...new Set(PRODUCTS.map(p => p.category))];
    cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
    });
}

// ============================================================
//  12. SIMULATION DE CHARGEMENT
// ============================================================
function simulateLoading() {
    return new Promise((resolve) => {
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            resolve();
        }, 1200);
    });
}

// ============================================================
//  13. ÉVÉNEMENTS
// ============================================================

// Recherche
searchInput.addEventListener('input', applyFilters);

// Filtre catégorie
categoryFilter.addEventListener('change', applyFilters);

// Ouverture / fermeture panier
cartToggle.addEventListener('click', toggleCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// Touche Échap pour fermer le panier
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isCartOpen) closeCart();
});

// Mode Jour/Nuit
themeToggle.addEventListener('click', toggleTheme);

// Checkout
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => {
        const p = PRODUCTS.find(pr => pr.id === item.productId);
        return sum + (p ? p.price * item.quantity : 0);
    }, 0);
    showToast(`✅ Commande validée ! Total : ${total.toFixed(2)} €. Merci !`, 'success', 4000);
    cart = [];
    renderCart();
    renderProducts(filteredProducts);
    updateCartBadge();
    closeCart();
});

// ============================================================
//  14. DÉMARRAGE
// ============================================================
async function init() {
    loadTheme();
    initCategories();
    renderProducts(PRODUCTS);
    renderCart();
    updateCartBadge();
    await simulateLoading();
    showToast('🛍️ Bienvenue sur MyShop !', 'success', 2500);
}

init();