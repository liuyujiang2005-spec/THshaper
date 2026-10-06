// ================================
// THshaper - E-commerce App
// ================================

// State
let currentFilter = 'all';
let currentSearchTerm = '';

// Format price in Thai Baht
function formatPrice(price) {
    return '฿' + price.toLocaleString('th-TH');
}

// Show page
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageName).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Navigation helpers (deep-link + browser history) ----

// Build a shareable URL for a product
function productUrl(id) {
    return '?product=' + id;
}

// Open a product detail page (called by clicks on product cards)
function openProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return false;
    showProductDetail(id);
    pushState(productUrl(id), { product: id });
    return false;
}

// Navigate to a static page (home / about / contact)
function openPage(name) {
    showPage(name);
    pushState(name === 'home' ? location.pathname : '?page=' + name, { page: name });
    return false;
}

// Push a history entry without reloading
function pushState(url, state) {
    if (window.history && window.history.pushState) {
        window.history.pushState(state, '', url);
    }
}

// Resolve the current URL into a view
function routeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const pid = parseInt(params.get('product'), 10);
    const pg = params.get('page');
    if (pid && products.some(p => p.id === pid)) {
        showProductDetail(pid);
    } else if (pg && ['home', 'about', 'contact'].includes(pg)) {
        showPage(pg);
    } else {
        showPage('home');
    }
}

// Category presentation order + labels (single source of truth for the UI)
const CATEGORY_ORDER = ['beauty', 'home', 'cleaning'];
const CATEGORY_META = {
    beauty:   { name: 'สุขภาพและความงาม',     icon: 'fa-spa' },
    home:     { name: 'เครื่องใช้ไฟฟ้าในบ้าน',  icon: 'fa-plug' },
    cleaning: { name: 'อุปกรณ์ทำความสะอาด',    icon: 'fa-broom' }
};

// HTML for a single product card
function productCardHTML(product) {
    const stars = renderStars(product.rating);
    const href = productUrl(product.id);
    return `
        <div class="product-card" onclick="openProduct(${product.id})">
            <div class="product-image">
                <span class="product-badge">${product.badge}</span>
                <img src="${product.image}" alt="${product.name}" 
                     onerror="this.src='https://via.placeholder.com/400x400/23B5C1/ffffff?text=THshaper';" />
                <span class="product-image-hint"><i class="fas fa-search-plus"></i> ดูรายละเอียด</span>
            </div>
            <div class="product-info">
                <h3 class="product-name">
                    <a href="${href}" onclick="event.stopPropagation(); openProduct(${product.id}); return false;">${product.name}</a>
                </h3>
                <div class="product-price">
                    <span class="price-current">${formatPrice(product.price)}</span>
                    <span class="price-original">${formatPrice(product.originalPrice)}</span>
                </div>
                <div class="product-rating">
                    <span class="stars">${stars}</span>
                    <span>(${product.reviewCount})</span>
                    ${product.soldCount > 0 ? `<span>· ขายแล้ว ${product.soldCount}</span>` : ''}
                </div>
                <div class="product-actions">
                    <a class="btn-lazada" href="${product.lazadaUrl}" target="_blank" rel="noopener"
                       onclick="event.stopPropagation();">
                        <i class="fas fa-shopping-bag"></i> ดูบน Lazada
                    </a>
                    <a class="btn-quick-view" href="${href}" title="ดูรายละเอียดสินค้า"
                       onclick="event.stopPropagation(); openProduct(${product.id}); return false;">
                        <i class="fas fa-eye"></i> ดู
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Render products.
//   grouped = false -> all products in ONE combined grid
//                      (the "สินค้าทั้งหมด" view and search results)
//   grouped = true  -> one labelled section per category
//                      (when a single category has been selected)
function renderProducts(productsToRender = null, grouped = false) {
    const box = document.getElementById('productsGrid');
    const list = productsToRender || products;

    if (list.length === 0) {
        box.innerHTML = '<p class="products-empty">ไม่พบสินค้าที่ค้นหา</p>';
        return;
    }

    // combined view: every product together in a single grid
    if (!grouped) {
        box.innerHTML = `<div class="products-grid">${list.map(productCardHTML).join('')}</div>`;
        return;
    }

    // known categories first (fixed order), then any unexpected ones
    const known = CATEGORY_ORDER.filter(c => list.some(p => p.category === c));
    const extra = [...new Set(list.map(p => p.category))].filter(c => !CATEGORY_ORDER.includes(c));
    const order = known.concat(extra);

    box.innerHTML = order.map(cat => {
        const items = list.filter(p => p.category === cat);
        if (items.length === 0) return '';
        const meta = CATEGORY_META[cat] || { name: items[0].categoryName, icon: 'fa-tag' };
        return `
            <section class="category-block" data-category="${cat}">
                <div class="category-head">
                    <span class="category-icon"><i class="fas ${meta.icon}"></i></span>
                    <h3>${meta.name}</h3>
                    <span class="category-count">${items.length} สินค้า</span>
                </div>
                <div class="products-grid">
                    ${items.map(productCardHTML).join('')}
                </div>
            </section>
        `;
    }).join('');
}

// Render star rating
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Show product detail
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('breadcrumbProduct').textContent = product.name.substring(0, 50) + '...';
    
    const detailContainer = document.getElementById('productDetail');
    const stars = renderStars(product.rating);
    
    detailContainer.innerHTML = `
        <div class="product-detail-image">
            <img src="${product.image}" alt="${product.name}" 
                 onerror="this.src='https://via.placeholder.com/600x600/23B5C1/ffffff?text=THshaper';" />
        </div>
        <div class="product-detail-info">
            <h1>${product.name}</h1>
            <div class="product-rating" style="margin-bottom: 15px;">
                <span class="stars" style="font-size: 18px;">${stars}</span>
                <span>${product.rating} จาก 5 ดาว (${product.reviewCount} รีวิว)</span>
                ${product.soldCount > 0 ? `<span>· ขายแล้ว ${product.soldCount} ชิ้น</span>` : ''}
            </div>
            <div class="product-detail-price">
                <span class="price-current">${formatPrice(product.price)}</span>
                <span class="price-original">${formatPrice(product.originalPrice)}</span>
                <span class="product-badge">${product.discount}% OFF</span>
            </div>
            <p style="margin-bottom: 20px; color: #555; line-height: 1.8;">${product.description}</p>
            
            <div class="product-detail-meta">
                <div class="meta-row"><i class="fas fa-truck"></i> <strong>จัดส่ง:</strong> ส่งทั่วประเทศไทย 1-3 วัน</div>
                <div class="meta-row"><i class="fas fa-shield-halved"></i> <strong>รับประกัน:</strong> ${product.warranty}</div>
                <div class="meta-row"><i class="fas fa-tag"></i> <strong>หมวดหมู่:</strong> ${product.categoryName}</div>
                <div class="meta-row"><i class="fas fa-check-circle"></i> <strong>สต๊อก:</strong> มีสินค้าพร้อมส่ง</div>
            </div>
            
            <div class="product-detail-features">
                <h3><i class="fas fa-list-check"></i> คุณสมบัติเด่น</h3>
                <ul>
                    ${product.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
            
            <div class="product-detail-actions">
                <a href="${product.lazadaUrl}" target="_blank" rel="noopener" class="btn btn-lazada btn-lg">
                    <i class="fas fa-shopping-bag"></i> ดูบน Lazada
                </a>
            </div>
        </div>
    `;
    
    // Related products: same category first, then fill up to 4 items
    const sameCat = products.filter(p => p.category === product.category && p.id !== product.id);
    const others = products.filter(p => p.category !== product.category && p.id !== product.id);
    const related = sameCat.concat(others).slice(0, 4);
    
    const relatedBox = document.getElementById('relatedProducts');
    if (related.length) {
        relatedBox.innerHTML = `
            <h2 class="related-title"><i class="fas fa-layer-group"></i> สินค้าที่เกี่ยวข้อง</h2>
            <div class="products-grid">
                ${related.map(r => {
                    const rs = renderStars(r.rating);
                    const rhref = productUrl(r.id);
                    return `
                        <div class="product-card" onclick="openProduct(${r.id})">
                            <div class="product-image">
                                <span class="product-badge">${r.badge}</span>
                                <img src="${r.image}" alt="${r.name}"
                                     onerror="this.src='https://via.placeholder.com/400x400/23B5C1/ffffff?text=THshaper';" />
                                <span class="product-image-hint"><i class="fas fa-search-plus"></i> ดูรายละเอียด</span>
                            </div>
                            <div class="product-info">
                                <h3 class="product-name">
                                    <a href="${rhref}" onclick="event.stopPropagation(); openProduct(${r.id}); return false;">${r.name}</a>
                                </h3>
                                <div class="product-price">
                                    <span class="price-current">${formatPrice(r.price)}</span>
                                    <span class="price-original">${formatPrice(r.originalPrice)}</span>
                                </div>
                                <div class="product-rating">
                                    <span class="stars">${rs}</span>
                                    <span>(${r.reviewCount})</span>
                                </div>
                                <div class="product-actions">
                                    <a class="btn-lazada" href="${r.lazadaUrl}" target="_blank" rel="noopener"
                                       onclick="event.stopPropagation();">
                                        <i class="fas fa-shopping-bag"></i> ดูบน Lazada
                                    </a>
                                    <a class="btn-quick-view" href="${rhref}" title="ดูรายละเอียดสินค้า"
                                       onclick="event.stopPropagation(); openProduct(${r.id}); return false;">
                                        <i class="fas fa-eye"></i> ดู
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        relatedBox.innerHTML = '';
    }
    
    showPage('product');
}

// Filter products by category
function filterCategory(category) {
    currentFilter = category;
    currentSearchTerm = '';
    document.getElementById('searchInput').value = '';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    if (category === 'all') {
        // "สินค้าทั้งหมด" -> all products combined in one grid
        renderProducts(products, false);
    } else {
        // a specific category -> shown as its own labelled section
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered, true);
    }
    
    showPage('home');
    
    setTimeout(() => {
        document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Search products
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase().trim();
    currentSearchTerm = term;
    
    if (term === '') {
        // clearing the box restores whatever category view was active
        const grouped = currentFilter !== 'all';
        renderProducts(grouped ? products.filter(p => p.category === currentFilter) : products, grouped);
        return;
    }
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term)
    );
    
    renderProducts(filtered);
    
    if (document.getElementById('page-home').classList.contains('active')) {
        setTimeout(() => {
            document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        showPage('home');
    }
}

// Subscribe newsletter
function subscribeNewsletter() {
    const email = document.getElementById('newsletterEmail').value;
    if (!email || !email.includes('@')) {
        showToast('กรุณากรอกอีเมลให้ถูกต้อง', 'exclamation-circle');
        return;
    }
    document.getElementById('newsletterEmail').value = '';
    showToast('สมัครรับข่าวสารสำเร็จ! ขอบคุณคะ', 'check-circle');
}

// Submit contact form
function submitContact(event) {
    event.preventDefault();
    showToast('ส่งข้อความเรียบร้อยแล้ว! เราจะติดต่อกลับโดยเร็บ', 'check-circle');
    event.target.reset();
}

// Show toast notification
function showToast(message, icon = 'check-circle') {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    renderProducts();
    
    // Search on Enter key
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    // Deep-link support: ?product=1 opens product detail, ?page=about|contact opens page
    routeFromUrl();
    
    // Browser back / forward button support
    window.addEventListener('popstate', routeFromUrl);
});
