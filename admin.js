// Admin Paneli Açma / Kapatma ve Tab Kontrolleri
document.getElementById('admin-panel-btn').addEventListener('click', () => {
    document.getElementById('admin-modal').style.display = 'flex';
    loadAdminDataToInputs();
    renderAdminCategories();
    renderAdminProducts();
});

function closeAdminModal() {
    document.getElementById('admin-modal').style.display = 'none';
    location.reload(); // Değişikliklerin anında yansıması için yenile
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// Kayıtlı Verileri Form Inputlarına Yükleme
function loadAdminDataToInputs() {
    const settings = JSON.parse(localStorage.getItem('sark_dokusu_settings')) || {};
    document.getElementById('admin-hero-img').value = settings.heroImage || '';
    document.getElementById('admin-contact-bg').value = settings.contactBgImage || '';
    document.getElementById('admin-phone').value = settings.phone || '+90 (555) 000 00 00';
    document.getElementById('admin-whatsapp').value = settings.whatsapp || '905550000000';
    document.getElementById('admin-address').value = settings.address || 'Kapalıçarşı / İstanbul';

    const about = JSON.parse(localStorage.getItem('sark_dokusu_about')) || {
        title: "Şark Dokusu Hakkında",
        text: "Şark Dokusu; usta ellerden çıkan halılar, el işi giysiler ve geçmişten gelen özel parçaları tek koleksiyonda buluşturur. Anadolu'nun kaybolmaya yüz tutmuş motiflerini günümüze taşıyoruz."
    };
    document.getElementById('admin-about-title').value = about.title;
    document.getElementById('admin-about-text').value = about.text;
}

// Genel Ayarları Kaydet
function saveGeneralSettings() {
    const settings = {
        heroImage: document.getElementById('admin-hero-img').value,
        contactBgImage: document.getElementById('admin-contact-bg').value,
        phone: document.getElementById('admin-phone').value,
        whatsapp: document.getElementById('admin-whatsapp').value,
        address: document.getElementById('admin-address').value
    };
    localStorage.setItem('sark_dokusu_settings', JSON.stringify(settings));
    alert('Görsel ve iletişim ayarları başarıyla kaydedildi!');
}

// Hakkımızda Kaydet
function saveAboutSettings() {
    const about = {
        title: document.getElementById('admin-about-title').value,
        text: document.getElementById('admin-about-text').value
    };
    localStorage.setItem('sark_dokusu_about', JSON.stringify(about));
    alert('Hakkımızda yazısı güncellendi!');
}

// Kategoriler Yönetimi
function getCategories() {
    return JSON.parse(localStorage.getItem('sark_dokusu_categories')) || [
        { id: 'hali', name: 'El Emeği Halı' },
        { id: 'giyim', name: 'Otantik Giyim' },
        { id: 'tarihi', name: 'Tarihi Ürünler' }
    ];
}

function renderAdminCategories() {
    const cats = getCategories();
    const list = document.getElementById('admin-category-list');
    list.innerHTML = cats.map((c, i) => `
        <div class="admin-row">
            <span>${c.name}</span>
            <button onclick="deleteCategory(${i})" class="danger-btn">Sil</button>
        </div>
    `).join('');
    
    // Ürün ekleme select alanını güncelle
    const select = document.getElementById('p-category');
    if(select) {
        select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

function addNewCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if(!name) return alert('Kategori adı boş olamaz!');
    const cats = getCategories();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    cats.push({ id, name });
    localStorage.setItem('sark_dokusu_categories', JSON.stringify(cats));
    document.getElementById('new-cat-name').value = '';
    renderAdminCategories();
}

function deleteCategory(index) {
    const cats = getCategories();
    cats.splice(index, 1);
    localStorage.setItem('sark_dokusu_categories', JSON.stringify(cats));
    renderAdminCategories();
}

// Ürün Yönetimi
function getProducts() {
    return JSON.parse(localStorage.getItem('sark_dokusu_products')) || [
        { id: 1, title: 'El Dokuması Antika Halı', price: '4.500 TL', category: 'hali', image: 'logo.png' },
        { id: 2, title: 'Otantik Desenli Yelek', price: '1.200 TL', category: 'giyim', image: 'logo.png' },
        { id: 3, title: 'Bakır İşlemeli Tarihi Obje', price: '950 TL', category: 'tarihi', image: 'logo.png' }
    ];
}

function renderAdminProducts() {
    const products = getProducts();
    const list = document.getElementById('admin-product-list');
    list.innerHTML = products.map((p, i) => `
        <div class="admin-row">
            <span><b>${p.title}</b> - ${p.price}</span>
            <button onclick="deleteProduct(${i})" class="danger-btn">Sil</button>
        </div>
    `).join('');
}

function addNewProduct() {
    const title = document.getElementById('p-title').value;
    const price = document.getElementById('p-price').value;
    const category = document.getElementById('p-category').value;
    const image = document.getElementById('p-image').value || 'logo.png';
    
    if(!title || !price) return alert('Ürün adı ve fiyatı zorunludur!');
    
    const products = getProducts();
    products.push({ id: Date.now(), title, price, category, image });
    localStorage.setItem('sark_dokusu_products', JSON.stringify(products));
    
    document.getElementById('p-title').value = '';
    document.getElementById('p-price').value = '';
    document.getElementById('p-image').value = '';
    renderAdminProducts();
}

function deleteProduct(index) {
    const products = getProducts();
    products.splice(index, 1);
    localStorage.setItem('sark_dokusu_products', JSON.stringify(products));
    renderAdminProducts();
}
