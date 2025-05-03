// Bu dosyada ürün, ürün resmi, kategori, değerlendirme gibi arayüzler olabilir.
import { Category } from './category.model'; // Kategori modelini import et

// Backend'deki DtoProduct'a karşılık gelir.
export interface Product {
  id: number | string; // Backend ID tipine göre string veya number
  name: string;
  sellerId?: number; // <<<--- Satıcı ID'si (opsiyonel)
  description: string;
  price: number;
  stockQuantity?: number; // Stok miktarı, belki her zaman gelmez?
  sku?: string; // Ürün kodu (Stock Keeping Unit)
  // Kategori bilgisi: Ya sadece ID ya da tüm Category nesnesi olabilir backend'e göre.
  categoryId?: number;
  category?: Category; // Category interface'ini import ettik.
  images?: ProductImage[]; // Ürün resimleri dizisi
  attributes?: ProductAttribute[]; // Ürün özellikleri dizisi
  averageRating?: number; // Ortalama puanı
  reviews?: Review[]; // Değerlendirmeler dizisi
  // ... Diğer gerekli alanlar
  imageUrl?: string; // Genellikle ilk resmin URL'si
}

// DtoProductImage
export interface ProductImage {
  id: number;
  imageUrl: string; // Resmin URL'si
  altText?: string; // Resim için alternatif metin (erişilebilirlik)
  isDefault?: boolean; // Ana resim mi?
}

// DtoAttribute
export interface ProductAttribute {
  id: number;
  name: string; // Özellik adı (örn: Renk, Boyut)
  value: string; // Özellik değeri (örn: Kırmızı, XL)
}

// DtoReview
export interface Review {
  id: number;
  rating: number; // 1-5 arası puan
  comment?: string; // Yorum metni (opsiyonel olabilir)
  userName: string; // Yorumu yapan kullanıcının adı
  userId: number; // Yorumu yapan kullanıcının ID'si
  productId: number | string; // Hangi ürüne ait olduğu
  createdAt: string | Date; // Yorumun oluşturulma tarihi (string veya Date)
}

// DtoVariant (Eğer ürünlerin renk/beden gibi varyantları varsa)
export interface Variant {
    id: number;
    sku: string;
    price: number; // Varyanta özel fiyat olabilir
    stockQuantity: number;
    attributes: ProductAttribute[]; // Bu varyanta ait özellikler (örn: Renk=Mavi, Beden=L)
    images?: ProductImage[]; // Varyanta özel resimler olabilir
}

// DtoProductSummary (Liste görünümleri için daha az detaylı ürün bilgisi)
// Ayrı bir interface olabilir veya Product'tan bazı alanları seçerek (Pick<>) oluşturulabilir.
export interface ProductSummary {
    id: number | string;
    name?: string;
    price: number;
    imageUrl?: string; // Genellikle ilk resmin URL'si
    averageRating?: number;
    categoryId?: number; // Kategori ID'si (opsiyonel)
}
