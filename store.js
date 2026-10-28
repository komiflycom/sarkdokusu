document.addEventListener("DOMContentLoaded", () => {
    loadSettingsToSite();
    renderStoreCategories();
    renderStoreProducts('all');
});

// Admin Tarafından Girilen Ayarları Siteye Uygula
function loadSettingsToSite() {
    const settings = JSON.parse(localStorage.getItem('sark_dokusu_settings')) || {};
    
    // Banner Görseli
    if (settings.heroImage) {
        const heroImg = document.getElementById('hero-custom-img');
        heroImg.src = settings.heroImage;
        heroImg.style.display = 'block';
    }

    // İletişim / Final Alanı Arka Planı
    if (settings.contactBgImage) {
        const contactSec = document.getElementById('contact-section');
        contactSec.style.backgroundImage = `url('${settings.contactBgImage}')`;
        contactSec.style.backgroundSize = 'cover';
        contactSec.style.backgroundPosition = 'center';
    }

    // İletişim Metinleri
    if (settings.phone) document.getElementById('view-phone').textContent = settings.phone;
    if (settings.address) document.getElementById('view-address').textContent = settings.address;
    if (settings.whatsapp) {
        document.getElementById('view-whatsapp-link').href = `https://wa.me/${settings.whatsapp}`;
    }

    // Hakkımızda Metni
    const about = JSON.parse(localStorage.getItem('sark_dokusu_about'));
    if (about) {
        document.getElementById('about-title-view').textContent = about.title;
        document.getElementById('about-text-view').textContent = about.text;
    }
}

// Kategorileri Listele
function renderStoreCategories() {
    const cats = JSON.parse(localStorage.getItem('sark_dokusu_categories')) || [
        { id: 'hali', name: 'El Emeği Halı' },
        { id: 'giyim', name: 'Otantik Giyim' },
        { id: 'tarihi', name: 'Tarihi Ürünler' }
    ];
    
    const container = document.getElementById('category-filters-container');
    let html = `<button class="cat-pill active" onclick="filterCategory('all', this)">Tümü</button>`;
    cats.forEach(c => {
        html += `<button class="cat-pill" onclick="filterCategory('${c.id}', this)">${c.name}</button>`;
    });
    container.innerHTML = html;
}

// Ürünleri Listele ve Filtrele
function renderStoreProducts(filterCat) {
    const products = JSON.parse(localStorage.getItem('sark_dokusu_products')) || [
        { id: 1, title: 'El Dokuması Antika Halı', price: '4.500 TL', category: 'hali', image: 'logo.png' },
        { id: 2, title: 'Otantik Desenli Yelek', price: '1.200 TL', category: 'giyim', image: 'logo.png' },
        { id: 3, title: 'Bakır İşlemeli Tarihi Obje', price: '950 TL', category: 'tarihi', image: 'logo.png' }
    ];

    const grid = document.getElementById('product-grid');
    const filtered = filterCat === 'all' ? products : products.filter(p => p.category === filterCat);

    grid.innerHTML = filtered.map(p => `
        <div class="product-card">
            <div class="p-img-box">
                <img src="${p.image}" alt="${p.title}" onerror="this.src='logo.png'">
            </div>
            <div class="p-details">
                <h3>${p.title}</h3>
                <div class="p-price">${p.price}</div>
                <a href="https://wa.me/?text=${encodeURIComponent(p.title + ' ürünü hakkında bilgi almak istiyorum.')}" target="_blank" class="buy-whatsapp-btn">💬 WhatsApp ile Sipariş Ver</a>
            </div>
        </div>
    `).join('');
}

function filterCategory(catId, btnElement) {
    if(btnElement) {
        document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    renderStoreProducts(catId);
}

// Arama Kutusu Filtreleme
document.getElementById('search-input')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const products = JSON.parse(localStorage.getItem('sark_dokusu_products')) || [];
    const grid = document.getElementById('product-grid');
    
    const filtered = products.filter(p => p.title.toLowerCase().includes(query));
    grid.innerHTML = filtered.map(p => `
        <div class="product-card">
            <div class="p-img-box">
                <img src="${p.image}" alt="${p.title}" onerror="this.src='logo.png'">
            </div>
            <div class="p-details">
                <h3>${p.title}</h3>
                <div class="p-price">${p.price}</div>
                <a href="https://wa.me/?text=${encodeURIComponent(p.title + ' siparişi vermek istiyorum.')}" target="_blank" class="buy-whatsapp-btn">💬 WhatsApp ile Sipariş Ver</a>
            </div>
        </div>
    `).join('');
});
