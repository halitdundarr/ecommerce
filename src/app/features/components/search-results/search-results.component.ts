import { Component, OnInit, OnDestroy } from '@angular/core'; // OnDestroy ekleyin
import { ActivatedRoute } from '@angular/router';
import { Observable, of, switchMap, tap, catchError, map, Subscription } from 'rxjs'; // Subscription ekleyin
import { ProductService } from '../../services/product.service';
import { ProductSummary } from '../../../shared/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service'; // <-- WishlistService import
import { ComparisonService } from '../../../core/services/comparison.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
  standalone:false
})
export class SearchResultsComponent implements OnInit, OnDestroy { // <-- OnDestroy implement et

  searchTerm$: Observable<string | null>;
  results$: Observable<ProductSummary[]> = of([]);
  isLoading = false;
  error: string | null = null;

  // --- Wishlist için eklenenler ---
  wishlistProductIds: Set<number | string> = new Set();
  private wishlistSubscription: Subscription | null = null;
  // -------------------------------

    // --- Comparison için eklenenler ---
    comparisonProductIds: Set<number | string> = new Set();
    private comparisonSubscription: Subscription | null = null;
    comparisonItemCount: number = 0;
    readonly MAX_COMPARE_ITEMS = 4; // Servisteki ile aynı olmalı
    // ---------------------------------


  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService, // CartService zaten vardı
    private wishlistService: WishlistService, // <-- WishlistService inject et
    private comparisonService: ComparisonService // <-- ComparisonService inject et
  ) {
      this.searchTerm$ = this.route.queryParamMap.pipe(
          map(params => params.get('q'))
      );
  }

  ngOnInit(): void {
    this.results$ = this.searchTerm$.pipe(
      tap(term => {
          console.log('Search term changed:', term);
          this.isLoading = true;
          this.error = null;
      }),
      switchMap(term => {
          if (term && term.trim().length > 0) {
              return this.productService.searchProducts(term).pipe(
                  catchError(err => {
                      console.error("Error searching products:", err);
                      this.error = "Arama sırasında bir hata oluştu.";
                      return of([]);
                  })
              );
          } else {
              return of([]);
          }
      }),
      tap(() => {
          this.isLoading = false;
          console.log('Search finalized.');
      })
    );

    // --- Wishlist ID'lerini dinle ---
    this.wishlistSubscription = this.wishlistService.wishlist$.subscribe(wishlist => {
        if (wishlist && wishlist.items) {
            this.wishlistProductIds = new Set(wishlist.items.map(item => item.productId));
        } else {
            this.wishlistProductIds.clear();
        }
    });
    // ----------------------------------

    this.comparisonSubscription = this.comparisonService.comparisonList$.subscribe(list => {
      this.comparisonProductIds = new Set(list.map(item => item.id));
      this.comparisonItemCount = list.length;
  });
  }

  // --- Component destroy olduğunda abonelikten çık ---
  ngOnDestroy(): void {
      if (this.wishlistSubscription) {
          this.wishlistSubscription.unsubscribe();
      }
      if (this.comparisonSubscription) {
        this.comparisonSubscription.unsubscribe();
    }
  }
  // -------------------------------------------------

  // Sepete ekleme metodu (zaten vardı, belki geri bildirim eklenir)
  addToCart(product: ProductSummary): void {
    if (!product) return;
    console.log('Adding search result to cart:', product.name);
    this.cartService.addToCart(product);
    alert(`${product.name} sepete eklendi!`); // İsteğe bağlı geri bildirim
  }

  // --- Wishlist Metotları ---
  addToWishlist(product: ProductSummary): void {
      console.log('Adding to wishlist from Search:', product.name);
      this.wishlistService.addToWishlist(product);
  }

  isProductInWishlist(productId: number | string): boolean {
      return this.wishlistProductIds.has(productId);
  }
  // -------------------------


    // --- Comparison Metotları ---
    toggleComparison(product: ProductSummary): void {
      if (this.isProductInComparison(product.id)) {
          this.comparisonService.removeFromComparison(product.id);
      } else {
          this.comparisonService.addToComparison(product);
      }
  }

  isProductInComparison(productId: number | string): boolean {
      return this.comparisonProductIds.has(productId);
  }

  canAddToComparison(): boolean {
      return this.comparisonItemCount < this.MAX_COMPARE_ITEMS;
  }
}
