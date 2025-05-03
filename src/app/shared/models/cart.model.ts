// src/app/shared/models/cart.model.ts
import { ProductSummary } from './product.model'; // ProductSummary'i import et

// Backend'deki DtoCartItem'a daha çok benzeyecek
export interface CartItem {
  id?: number; // Backend'den gelen cartItemId olabilir
  productId: number | string; // Ürünün ID'si (DtoProductSummary'de de var ama burada da tutalım)
  quantity: number; // Adet
  unitPrice: number; // Ürünün tekil fiyatı (sipariş anındaki değil, ürünün güncel fiyatı)
  totalPrice: number; // quantity * unitPrice (frontend'de hesaplanabilir)
  product: ProductSummary; // <<<--- Ürün özetini direkt ekleyelim
  // Eski alanlar kaldırıldı (productName, productImage)
}

// Backend'deki DtoCart'a daha çok benzeyecek
export interface Cart {
  id?: number; // Backend'den gelen cartId olabilir
  items: CartItem[]; // Sepetteki ürünler (güncellenmiş CartItem)
  totalItems: number; // Toplam ürün adedi (frontend'de hesaplanabilir)
  totalPrice: number; // Toplam tutar (frontend'de hesaplanabilir - backend'deki calculatedTotal'a karşılık gelir)
  userId?: number; // Hangi kullanıcıya ait olduğu
}

// İstek modelleri aynı kalabilir
export interface AddToCartRequest {
    productId: number | string;
    quantity: number;
}
