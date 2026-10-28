#!/usr/bin/env node
/* ==========================================================================
   ŞARK DOKUSU — SEO derleyici (bağımlılık yok, Node 18+)

   Kullanım:   node build-seo.js
   Çıktı:      dist/  klasörü  → sitenizin kökü olarak yayınlayın

   Üretilenler
   - Her dil için ayrı ana sayfa:  /  (tr)  /en/  /de/  /fr/  /ar/
     (çevrilmiş HTML, dile özel title/description, canonical, hreflang,
      Open Graph, Twitter, JSON-LD)
   - Her ürün için her dilde ayrı sayfa:  /p/<slug>/  /en/p/<slug>/ ...
     (Product + BreadcrumbList JSON-LD, hreflang)
   - sitemap.xml (hreflang alternatifleriyle) ve robots.txt

   Ürünler/ayarlar Supabase'den çekilir (yalnızca herkese açık anon anahtar).
   Ürün ekleyip/değiştirdikten sonra tekrar çalıştırıp yayınlayın.

   Ortam değişkenleri (opsiyonel):
     SITE_URL=https://sarkdokusu.com     SEO_DATA_FILE=veri.json (çevrimdışı test)
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const SITE = (process.env.SITE_URL || 'https://sarkdokusu.com').replace(/\/+$/, '');
const LANGS = ['tr', 'en', 'ar', 'de', 'fr'];
const LOCALE = { tr: 'tr_TR', en: 'en_US', ar: 'ar_AR', de: 'de_DE', fr: 'fr_FR' };
const LANG_NAME = { tr: 'Türkçe', en: 'English', ar: 'العربية', de: 'Deutsch', fr: 'Français' };
const SCHEMA_LANG = { tr: 'Turkish', en: 'English', ar: 'Arabic', de: 'German', fr: 'French' };

/* Google Search Console doğrulaması (DNS gerekmez):
   - HTML etiketi: kodu (yalnızca content="..." içindeki kısmı) gsc-token.txt dosyasına yazın
   - HTML dosyası: Google'ın verdiği google*.html dosyasını bu klasöre koyun, dist/ köküne kopyalanır */
let GSC_TOKEN = process.env.GSC_TOKEN || '';
try { if (!GSC_TOKEN) GSC_TOKEN = fs.readFileSync(path.join(__dirname, 'gsc-token.txt'), 'utf8').trim(); } catch (e) { /* dosya yok */ }
GSC_TOKEN = GSC_TOKEN.replace(/^google-site-verification=/, '').replace(/[^A-Za-z0-9_\-]/g, '');

const META_DESC = {
  tr: 'Şark Dokusu: özenle seçilmiş doğal ürünler, el emeği dokunuşlar ve sade bir koleksiyon. Üyelik gerekmez, WhatsApp üzerinden kolay sipariş.',
  en: 'Şark Dokusu: a curated collection of natural, handmade products made with traditional methods. No account needed — order easily via WhatsApp.',
  ar: 'شرق دوقوسو: مجموعة منتقاة من المنتجات الطبيعية المصنوعة يدويًا بأساليب تقليدية. لا حاجة لحساب، اطلب بسهولة عبر واتساب.',
  de: 'Şark Dokusu: eine ausgewählte Kollektion natürlicher, handgemachter Produkte nach traditionellen Methoden. Kein Konto nötig – einfach per WhatsApp bestellen.',
  fr: 'Şark Dokusu : une collection choisie de produits naturels faits main selon des méthodes traditionnelles. Sans compte, commandez facilement par WhatsApp.'
};
const BRAND_SUB = {
  tr: 'Doğal &amp; El Emeği', en: 'Natural &amp; Handmade', ar: 'طبيعي ويدوي',
  de: 'Natürlich &amp; Handgemacht', fr: 'Naturel &amp; Fait main'
};
const TRUST_ICONS = [
  '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9h7v3a9 9 0 0 1-9 9h-1"></path><path d="M4 21c1-4 3-6 6-8"></path>',
  '<path d="M20 6 9 17l-5-5"></path>',
  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>'
];

/* ---------- yardımcılar ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (obj) => '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
const trunc = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const homePath = (l) => (l === 'tr' ? '/' : '/' + l + '/');
const url = (p) => SITE + p;

function slugify(s) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u' };
  return String(s || '').replace(/[çğıöşüÇĞİIÖŞÜ]/g, (c) => map[c])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
const cleanId = (id) => String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'x';

function loadDict() {
  const src = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
  const el = () => ({ setAttribute() {}, classList: { toggle() {} }, appendChild() {}, addEventListener() {} });
  const sandbox = {
    window: {}, localStorage: { getItem() { return null; }, setItem() {} },
    document: { readyState: 'loading', title: '', documentElement: el(), body: el(),
      addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, getElementById() { return null; } }
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const dict = sandbox.window.__sarkI18n && sandbox.window.__sarkI18n.DICT;
  if (!dict) throw new Error('i18n.js içinden sözlük okunamadı.');
  return dict;
}

function readConfig() {
  const src = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
  const g = (k) => (src.match(new RegExp(k + "\\s*:\\s*'([^']*)'")) || [])[1] || '';
  return { supabaseUrl: g('supabaseUrl'), supabaseKey: g('supabaseKey'), storeName: g('storeName'), whatsappNumber: g('whatsappNumber') };
}

async function loadData(cfg) {
  if (process.env.SEO_DATA_FILE) return JSON.parse(fs.readFileSync(process.env.SEO_DATA_FILE, 'utf8'));
  const headers = { apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey };
  const get = async (q) => {
    const r = await fetch(cfg.supabaseUrl + '/rest/v1/' + q, { headers });
    if (!r.ok) throw new Error(q + ' → HTTP ' + r.status);
    return r.json();
  };
  const out = { products: [], categories: [], settings: {} };
  try { out.products = await get('products?select=*&active=eq.true&order=created_at.desc'); } catch (e) { console.warn('! Ürünler alınamadı:', e.message); }
  try { out.categories = await get('categories?select=*'); } catch (e) { console.warn('! Kategoriler alınamadı:', e.message); }
  try { out.settings = (await get('site_settings?select=*&id=eq.1'))[0] || {}; } catch (e) { console.warn('! Site ayarları alınamadı:', e.message); }
  return out;
}

/* ---------- şablon çevirisi (data-i18n) ---------- */
function translateAttrs(html, dict) {
  return html.replace(/<([a-zA-Z0-9]+)\b([^>]*?)>/g, (m, tag, attrs) => {
    const km = attrs.match(/\sdata-i18n="([^"]+)"/);
    const prop = (attrs.match(/data-i18n-prop="([^"]+)"/) || [])[1];
    if (!km || !prop || prop === 'innerHTML' || prop === 'textContent') return m;
    const val = dict[km[1]];
    if (val == null) return m;
    const re = new RegExp('(\\s' + prop + '=")[^"]*(")');
    return re.test(attrs) ? '<' + tag + attrs.replace(re, (_, a, b) => a + esc(val) + b) + '>' : m;
  });
}
function translateText(html, dict) {
  const re = /<([a-zA-Z0-9]+)\b([^>]*\sdata-i18n="([^"]+)"[^>]*)>/g;
  let out = '', last = 0, m;
  while ((m = re.exec(html))) {
    const [full, tag, attrs, key] = m;
    const prop = (attrs.match(/data-i18n-prop="([^"]+)"/) || [])[1];
    if ((prop && prop !== 'innerHTML' && prop !== 'textContent') || ['input', 'img', 'meta', 'link'].includes(tag)) continue;
    const val = dict[key];
    if (val == null) continue;
    const start = m.index + full.length;
    const tok = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'); tok.lastIndex = start;
    let depth = 1, end = -1, t;
    while ((t = tok.exec(html))) { if (t[0][1] === '/') { if (--depth === 0) { end = t.index; break; } } else depth++; }
    if (end < 0) continue;
    out += html.slice(last, start) + (prop === 'innerHTML' ? val : esc(val));
    last = end; re.lastIndex = end;
  }
  return out + html.slice(last);
}
const translate = (html, dict) => translateText(translateAttrs(html, dict), dict);

/* ---------- ortak parçalar ---------- */
function absolutize(html) {
  return html
    .replace(/(href|src)="(style\.css|config\.js|i18n\.js|store\.js|logo\.png)(\?[^"]*)?"/g, (m, a, f, q) => a + '="/' + f + (q || '') + '"')
    .replace(/href="admin\.html"/g, 'href="/admin.html"')
    .replace(/<link rel="icon" href="logo.png"/, '<link rel="icon" href="/logo.png"');
}

function hreflangLinks(altUrls) {
  return LANGS.map((l) => '<link rel="alternate" hreflang="' + l + '" href="' + esc(altUrls[l]) + '">').join('\n  ') +
    '\n  <link rel="alternate" hreflang="x-default" href="' + esc(altUrls.tr) + '">';
}

function headBlock(o) {
  const lines = [
    '<title>' + esc(o.title) + '</title>',
    '<meta name="description" content="' + esc(o.description) + '">',
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">',
    '<meta name="theme-color" content="#f5efe6">',
    GSC_TOKEN ? '<meta name="google-site-verification" content="' + GSC_TOKEN + '">' : '',
    '<link rel="canonical" href="' + esc(o.canonical) + '">',
    hreflangLinks(o.alt),
    '<meta property="og:type" content="' + (o.ogType || 'website') + '">',
    '<meta property="og:site_name" content="' + esc(o.brand) + '">',
    '<meta property="og:title" content="' + esc(o.title) + '">',
    '<meta property="og:description" content="' + esc(o.description) + '">',
    '<meta property="og:url" content="' + esc(o.canonical) + '">',
    '<meta property="og:locale" content="' + LOCALE[o.lang] + '">',
    LANGS.filter((l) => l !== o.lang).map((l) => '<meta property="og:locale:alternate" content="' + LOCALE[l] + '">').join('\n  '),
    '<meta property="og:image" content="' + esc(o.image) + '">',
    '<meta property="og:image:alt" content="' + esc(o.imageAlt) + '">',
    '<meta name="twitter:card" content="' + (o.twCard || 'summary') + '">',
    '<meta name="twitter:title" content="' + esc(o.title) + '">',
    '<meta name="twitter:description" content="' + esc(o.description) + '">',
    '<meta name="twitter:image" content="' + esc(o.image) + '">',
    '<link rel="apple-touch-icon" href="/logo.png">'
  ];
  return lines.filter(Boolean).join('\n  ') + '\n  ' + (o.ld || []).map(jsonLd).join('\n  ');
}

function langNav(lang, altPaths) {
  return '<nav class="seo-langs" aria-label="Languages">' + LANGS.map((l) =>
    '<a href="' + esc(altPaths[l]) + '" hreflang="' + l + '" lang="' + l + '"' + (l === lang ? ' aria-current="true"' : '') + '>' + LANG_NAME[l] + '</a>').join('') + '</nav>';
}

function formatPrice(v, lang) {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !isFinite(n)) return '';
  try { return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: lang === 'tr' ? 'TRY' : 'USD', minimumFractionDigits: 2 }).format(n); }
  catch (e) { return n.toFixed(2); }
}
const currencyOf = (lang) => (lang === 'tr' ? 'TRY' : 'USD');

function imageUrl(cfg, p) {
  const v = p.image_url;
  if (!v || typeof v !== 'string' || /^data:/i.test(v)) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return cfg.supabaseUrl + '/storage/v1/object/public/product-images/' + v.replace(/^\/+/, '');
}
const pName = (p, l, dict) => p['name_' + l] || p.name || p.name_tr || dict[l]['product.unnamed'];
const pDesc = (p, l) => p['desc_' + l] || p.description || p.desc_tr || '';

function socials(settings) {
  const out = [];
  const add = (v, base) => { if (!v) return; v = String(v).trim(); if (/^https?:\/\//i.test(v)) out.push(v); else if (base) out.push(base + v.replace(/^@/, '')); };
  add(settings.instagram, 'https://www.instagram.com/');
  add(settings.facebook, null); add(settings.youtube, null);
  return out;
}

/* ---------- ana akış ---------- */
(async function main() {
  const cfg = readConfig();
  const DICT = loadDict();
  const data = await loadData(cfg);
  const settings = data.settings || {};
  const cats = {}; (data.categories || []).forEach((c) => { cats[c.id] = c; });
  const today = new Date().toISOString().slice(0, 10);
  const phone = '+' + String(settings.whatsapp || cfg.whatsappNumber || '').replace(/\D/g, '');

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  ['style.css', 'config.js', 'i18n.js', 'store.js', 'admin.html', 'admin.js', 'logo.png'].forEach((f) => fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f)));

  fs.readdirSync(ROOT).filter((f) => /^google[0-9a-f]+\.html$/i.test(f)).forEach((f) => fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f)));
  const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const headerHtml = (template.match(/<header class="site-header">[\s\S]*?<\/header>/) || [''])[0];
  const footerHtml = (template.match(/<footer class="site-footer">[\s\S]*?<\/footer>/) || [''])[0];
  const logo = url('/logo.png');

  /* Ürün adres tablosu: id → { lang → yol } */
  const products = (data.products || []).filter((p) => p && p.id != null);
  const ppath = {};
  products.forEach((p) => {
    ppath[p.id] = {};
    LANGS.forEach((l) => {
      const slug = (slugify(pName(p, l, DICT)) || 'urun') + '-' + cleanId(p.id);
      ppath[p.id][l] = (l === 'tr' ? '' : '/' + l) + '/p/' + slug + '/';
    });
  });
  const homeAlt = {}; LANGS.forEach((l) => { homeAlt[l] = homePath(l); });
  const abs = (obj) => { const o = {}; LANGS.forEach((l) => { o[l] = url(obj[l]); }); return o; };
  const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };

  const sitemap = [];
  const smEntry = (altPaths, lastmod, prio, freq) => LANGS.map((l) =>
    '  <url>\n    <loc>' + esc(url(altPaths[l])) + '</loc>\n    <lastmod>' + lastmod + '</lastmod>\n    <changefreq>' + freq + '</changefreq>\n    <priority>' + prio + '</priority>\n' +
    LANGS.map((k) => '    <xhtml:link rel="alternate" hreflang="' + k + '" href="' + esc(url(altPaths[k])) + '"/>').join('\n') +
    '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + esc(url(altPaths.tr)) + '"/>\n  </url>').join('\n');

  /* ===== Ana sayfalar ===== */
  LANGS.forEach((lang) => {
    const dict = DICT[lang];
    const nm = settings.store_name_i18n && typeof settings.store_name_i18n === 'object' ? settings.store_name_i18n : null;
    const brand = (nm && (nm[lang] || nm.tr)) || settings.store_name || cfg.storeName || 'Şark Dokusu';
    let html = absolutize(template);
    html = html.replace(/<html lang="[^"]*"[^>]*>/, '<html lang="' + lang + '" dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '">');
    html = html.replace(/\s*<title>[\s\S]*?<\/title>/, '')
      .replace(/\s*<meta name="description"[^>]*>/, '').replace(/\s*<meta name="theme-color"[^>]*>/, '')
      .replace(/\s*<meta property="og:[^>]*>/g, '').replace(/\s*<link rel="canonical"[^>]*>/, '');
    html = translate(html, dict);
    html = html.replace(/(<span class="brand-sub">)[^<]*(<\/span>)/g, '$1' + BRAND_SUB[lang] + '$2');
    if (lang === 'ar') html = html.replace('<body>', '<body class="is-rtl">');

    /* Güven şeridi: panelden girilen maddeleri statik HTML'e göm */
    let items = settings.about_items;
    try { if (typeof items === 'string') items = JSON.parse(items); } catch (e) { items = null; }
    if (Array.isArray(items) && items.length) {
      const cards = items.map((it, i) => {
        const t = it['title_' + lang] || it.title_tr || '', d = it['desc_' + lang] || it.desc_tr || '';
        if (!t && !d) return '';
        return '<div class="trust-item"><span class="ti-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          TRUST_ICONS[i % 3] + '</svg></span><div><h3>' + esc(t) + '</h3><p>' + esc(d) + '</p></div></div>';
      }).join('');
      html = html.replace(/(<div class="trust-grid">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/, '$1' + cards + '$2');
    }

    /* Taranabilir ürün bağlantıları + dil bağlantıları */
    const links = products.map((p) => '<li><a href="' + esc(ppath[p.id][lang]) + '">' + esc(pName(p, lang, DICT)) + '</a></li>').join('');
    const seoSection = '<section class="seo-products" aria-labelledby="seo-products-h"><div class="wrap">' +
      (links ? '<h2 id="seo-products-h">' + esc(dict['catalog.title']) + '</h2><ul class="seo-links">' + links + '</ul>' : '') +
      langNav(lang, homeAlt) + '</div></section>';
    html = html.replace('</main>', seoSection + '\n  </main>');

    const title = dict['page.title'].replace(/Şark Dokusu/g, brand);
    const ld = [
      { '@context': 'https://schema.org', '@type': 'Organization', '@id': SITE + '/#organization', name: brand, url: SITE + '/', logo: logo,
        sameAs: socials(settings),
        contactPoint: [{ '@type': 'ContactPoint', telephone: phone, contactType: 'customer service', availableLanguage: LANGS.map((l) => SCHEMA_LANG[l]) }] },
      { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: brand, inLanguage: lang, publisher: { '@id': SITE + '/#organization' } },
      { '@context': 'https://schema.org', '@type': 'WebPage', url: url(homePath(lang)), name: title, description: META_DESC[lang], inLanguage: lang, isPartOf: { '@id': SITE + '/#website' } }
    ];
    if (products.length) ld.push({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: products.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: url(ppath[p.id][lang]), name: pName(p, lang, DICT) })) });

    const head = headBlock({ lang, title, description: META_DESC[lang], canonical: url(homePath(lang)), alt: abs(homeAlt), brand, image: logo, imageAlt: brand, ld });
    html = html.replace('</head>', '  ' + head + '\n</head>');
    html = html.replace('<script src="/config.js', '<script>window.SARK_PAGE_LANG=' + JSON.stringify(lang) + ';window.SARK_LANG_URLS=' + JSON.stringify(homeAlt) + ';</script>\n  <script src="/config.js');
    write(lang === 'tr' ? 'index.html' : lang + '/index.html', html);
  });
  sitemap.push(smEntry(homeAlt, today, '1.0', 'weekly'));

  /* ===== Ürün sayfaları ===== */
  products.forEach((p) => {
    const altPaths = ppath[p.id];
    const lastmod = String(p.updated_at || p.created_at || today).slice(0, 10);
    LANGS.forEach((lang) => {
      const dict = DICT[lang];
      const nm = settings.store_name_i18n && typeof settings.store_name_i18n === 'object' ? settings.store_name_i18n : null;
      const brand = (nm && (nm[lang] || nm.tr)) || settings.store_name || cfg.storeName || 'Şark Dokusu';
      const name = pName(p, lang, DICT), desc = pDesc(p, lang);
      const img = imageUrl(cfg, p);
      const cat = cats[p.category_id] ? (cats[p.category_id]['name_' + lang] || cats[p.category_id].name_tr) : (p.category || '');
      const stock = Number(p.stock), hasStock = p.stock !== null && p.stock !== undefined && p.stock !== '' && isFinite(stock);
      const out = hasStock && stock <= 0;
      const price = formatPrice(p.price, lang);
      const pageUrl = url(altPaths[lang]);
      const title = trunc(name, 55) + ' | ' + brand;
      const description = trunc(desc || (name + ' — ' + META_DESC[lang]), 158);
      const msg = [dict['wa.greeting'].replace('{store}', brand), '', dict['wa.product'].replace('{name}', name), price ? dict['wa.price'].replace('{price}', price) : '', pageUrl].filter((x, i) => x || i === 1).join('\n');
      const wa = 'https://wa.me/' + String(settings.whatsapp || cfg.whatsappNumber).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);

      const ld = [
        { '@context': 'https://schema.org', '@type': 'Product', '@id': pageUrl + '#product', name, description: desc || description, sku: String(p.id),
          image: img ? [img] : undefined, brand: { '@type': 'Brand', name: brand }, category: cat || undefined, inLanguage: lang,
          offers: Number.isFinite(Number(p.price)) && p.price !== '' && p.price !== null ? {
            '@type': 'Offer', url: pageUrl, price: Number(p.price).toFixed(2), priceCurrency: currencyOf(lang),
            availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: brand } } : undefined },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: brand, item: url(homePath(lang)) },
          { '@type': 'ListItem', position: 2, name: dict['catalog.title'], item: url(homePath(lang)) + '#koleksiyon' },
          { '@type': 'ListItem', position: 3, name: name, item: pageUrl }] }
      ];
      const head = headBlock({ lang, title, description, canonical: pageUrl, alt: abs(altPaths), brand, image: img || logo, imageAlt: name, ogType: 'product', twCard: img ? 'summary_large_image' : 'summary', ld });

      const home = homePath(lang);
      let header = translate(absolutize(headerHtml), dict).replace(/(<span class="brand-sub">)[^<]*(<\/span>)/, '$1' + BRAND_SUB[lang] + '$2')
        .replace(/href="\.\/"/, 'href="' + home + '"').replace(/href="#koleksiyon"/g, 'href="' + home + '#koleksiyon"').replace(/href="#hakkimizda"/g, 'href="' + home + '#hakkimizda"');
      let footer = translate(absolutize(footerHtml), dict).replace(/(<span class="brand-sub">)[^<]*(<\/span>)/, '$1' + BRAND_SUB[lang] + '$2')
        .replace(/href="\.\/"/, 'href="' + home + '"').replace(/href="#koleksiyon"/g, 'href="' + home + '#koleksiyon"').replace(/href="#hakkimizda"/g, 'href="' + home + '#hakkimizda"')
        .replace(/<span id="year">[^<]*<\/span>/, new Date().getFullYear());
      const stockTxt = hasStock ? (out ? dict['stock.out'] : dict['stock.in']) : '';

      const page = '<!doctype html>\n<html lang="' + lang + '" dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  ' + head +
        '\n  <link rel="icon" href="/logo.png" type="image/png">\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n  <link rel="stylesheet" href="/style.css?v=fix4">\n</head>\n<body' + (lang === 'ar' ? ' class="is-rtl"' : '') + '>\n  ' + header +
        '\n  <main class="product-page"><div class="wrap">\n    <nav class="breadcrumb" aria-label="breadcrumb"><a href="' + home + '">' + esc(brand) + '</a> › <a href="' + home + '#koleksiyon">' + esc(dict['catalog.title']) + '</a> › <span>' + esc(name) + '</span></nav>\n    <article class="pp-grid">\n      ' +
        (img ? '<img class="pp-img" src="' + esc(img) + '" alt="' + esc(name) + '" width="800" height="800" decoding="async">' : '<div class="pp-img" role="img" aria-label="' + esc(name) + '" style="aspect-ratio:1/1"></div>') +
        '\n      <div class="pp-info">\n        ' + (cat ? '<p class="pp-cat">' + esc(cat) + '</p>' : '') + '<h1>' + esc(name) + '</h1>\n        ' + (price ? '<p class="pp-price">' + esc(price) + '</p>' : '') +
        (stockTxt ? '<p class="pp-stock">' + esc(stockTxt) + '</p>' : '') + (desc ? '<p class="pp-desc">' + esc(desc) + '</p>' : '') +
        '\n        <a class="btn" href="' + esc(wa) + '" rel="noopener" target="_blank">' + esc(dict['product.order_btn']) + '</a>\n      </div>\n    </article>\n    ' + langNav(lang, altPaths) + '\n  </div></main>\n  ' + footer + '\n</body>\n</html>\n';
      write(altPaths[lang].replace(/^\//, '') + 'index.html', page);
    });
    sitemap.push(smEntry(altPaths, lastmod, '0.8', 'weekly'));
  });

  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + sitemap.join('\n') + '\n</urlset>\n');
  write('robots.txt', 'User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin.js\n\nSitemap: ' + SITE + '/sitemap.xml\n');

  console.log('✓ dist/ hazır: ' + LANGS.length + ' ana sayfa + ' + products.length * LANGS.length + ' ürün sayfası, sitemap.xml, robots.txt');
  if (!products.length) console.log('  (Uyarı: ürün bulunamadı — yalnızca ana sayfalar üretildi.)');
})().catch((e) => { console.error('HATA:', e); process.exit(1); });
