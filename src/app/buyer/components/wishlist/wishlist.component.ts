// src/app/buyer/components/wishlist/wishlist.component.ts
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Wishlist, WishlistItem } from '../../../shared/models/wishlist.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CartService } from '../../../core/services/cart.service'; // Sepete ekleme için
import { ProductSummary } from '../../../shared/models/product.model';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.scss'],
  standalone: false // Zaten vardı
})
export class WishlistComponent implements OnInit {

  wishlist$: Observable<Wishlist | null>;
  // isLoading$: Observable<boolean>; // Servisten alınabilir

  constructor(
      public wishlistService: WishlistService, // public yaparsak template'ten erişilebilir
      private cartService: CartService // Sepete ekleme için
  ) {
    this.wishlist$ = this.wishlistService.getWishlist();
    // this.isLoading$ = this.wishlistService.isLoading$;
  }

  ngOnInit(): void {
      // Component yüklendiğinde ek işlem gerekirse
  }

  // İstek listesinden ürün kaldırma
  removeFromWishlist(productId: number | string | undefined): void { // productId alır
    if (productId !== undefined) {
        console.log(`Removing product ${productId} from wishlist component.`);
        this.wishlistService.removeFromWishlist(productId); // Servis metodunu çağır
    } else {
        console.error("Cannot remove item, productId is undefined.");
    }
  }

  // Opsiyonel: Sepete ekleme fonksiyonu
  addToCart(product: ProductSummary | undefined): void {
      if(product) {
          this.cartService.addToCart(product);
      }
  }
}
