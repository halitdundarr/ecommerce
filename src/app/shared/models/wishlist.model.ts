 // Liste görünümü için ProductSummary yeterli olabilir

import { ProductSummary } from "./product.model";

// Backend'deki DtoWishlistItem'a karşılık gelir.
export interface WishlistItem {
  id?: number; // Listeye eklerken olmayabilir
  productId: number | string;
  // İstek listesinde genellikle ürünün temel bilgileri yeterlidir
  product?: ProductSummary; // Veya direkt alanlar: productName, price, image...
  addedAt?: string | Date; // Listeye eklenme tarihi
}

// Backend'deki DtoWishlist'e karşılık gelir.
export interface Wishlist {
  id?: number;
  userId: number;
  items: WishlistItem[];
}

// İstek listesine ekleme isteği için model
export interface AddToWishlistRequest {
    productId: number | string;
}
