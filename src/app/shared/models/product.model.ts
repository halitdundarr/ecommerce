// src/app/shared/models/product.model.ts
import { Category } from './category.model'; // Kategori modelini import et

// Backend'deki DtoProduct'a karşılık gelir.
export interface Product {
  id: number | string;
  name: string;
  sellerId?: number;
  description: string; // Bu alan zorunlu
  price: number;
  stockQuantity?: number;
  sku?: string;
  categoryId?: number; // Kategori ID'si (opsiyonel, category nesnesi de var)
  category?: Category;
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  averageRating?: number;
  reviews?: Review[]; // Yorumlar ayrı yüklenecekse opsiyonel olabilir
  imageUrl?: string;

  // --- EKLENEN ALANLAR ---
  brand?: string;
  model?: string;
  dimensions?: string;
  weight?: string;
  color?: string;
  warranty?: string;
  keyFeatures?: string[];
  specifications?: { [key: string]: string };
  reviewCount?: number;
  isApproved?: boolean; // Admin onayı için
  approvedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // -----------------------
}

// DtoProductImage
export interface ProductImage {
  id: number;
  imageUrl: string;
  altText?: string;
  isDefault?: boolean;
}

// DtoAttribute
export interface ProductAttribute {
  id: number;
  name: string;
  value: string;
  unit?: string;
  attributeGroup?: string;
  // displayOrder, isKeySpec, isFilterable frontend modelinde gerekli mi? Şimdilik eklenmedi.
}

// DtoReview
export interface Review {
  id: number; // reviewId backend DTO'sunda var
  rating: number;
  comment?: string;
  userName: string; // customer.firstName + lastName olabilir veya direkt username
  userId: number; // customer.userId
  productId: number | string;
  createdAt: string | Date;
}

// DtoVariant (Eğer kullanılıyorsa)
export interface Variant {
    id: number;
    sku?: string; // sku Product'ta da olabilir, DTO'ya bakın
    price: number; // Fiyat farkı değil, varyantın kendi fiyatı mı? DTO'ya bakın
    stockQuantity: number;
    attributes: ProductAttribute[];
    images?: ProductImage[];
}

// DtoProductSummary
export interface ProductSummary {
    id: number | string;
    name: string; // name zorunlu olmalı
    price: number;
    imageUrl?: string;
    averageRating?: number;
    categoryId?: number;
    brand?: string; // Summary'de de olabilir
    model?: string; // Summary'de de olabilir
}
