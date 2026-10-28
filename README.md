# Şark Dokusu

## SEO derlemesi (yayından önce)

```
node build-seo.js
```

`dist/` klasörü oluşur (Node 18+ yeterli, paket kurulumu gerekmez). Bu klasörün
**içeriğini** sitenin köküne yayınlayın. Üretilenler:

- 5 dilde ana sayfa: `/`, `/en/`, `/ar/`, `/de/`, `/fr/`
- Her ürün için her dilde ayrı sayfa: `/p/...`, `/en/p/...` (Product şeması dahil)
- `sitemap.xml` (hreflang'li) ve `robots.txt`

Ürün ekledikten, silip fiyat/ad değiştirdikten ya da panelde Hakkımızda metnini
güncelledikten sonra komutu yeniden çalıştırıp `dist/` klasörünü tekrar yayınlayın.

Alan adı farklıysa: `SITE_URL=https://alanadiniz.com node build-seo.js`


## Ana sayfa Hero görseli
Yönetici panelinde **Site Ayarları → Hero Bölümü** sekmesini açın. 1920 × 800 px yatay JPG, PNG veya WebP görsel seçin; önizlemenin ardından **Arka planı kaydet** düğmesine basın. Görsel `site-assets` Supabase Storage alanına yüklenir ve `site_settings.about_items` içinde `type: hero_background` kaydı olarak saklanır. Supabase Storage bucket ve RLS/yükleme izinleri mevcut kurulumda yönetici yüklemelerine izin vermelidir.
