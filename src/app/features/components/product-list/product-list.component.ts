import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router'; // Router import
import { ProductService, ProductFilters } from '../../services/product.service'; // ProductFilters import
import { ProductSummary } from '../../../shared/models/product.model';
import { Category } from '../../../shared/models/category.model';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ComparisonService } from '../../../core/services/comparison.service';
import { finalize, tap, catchError, map, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone:false
})
export class ProductListComponent implements OnInit, OnDestroy {

  products$: Observable<ProductSummary[]> = of([]);
  categories$: Observable<Category[]> = of([]);
  categories: Category[] = [];
  isLoadingProducts = false;
  isLoadingCategories = false;
  error: string | null = null;

  // --- Filtre Durumları ---
  selectedCategoryId: number | null = null;
  selectedCategoryName: string | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  // --- Filtre Durumları Sonu ---

  wishlistProductIds: Set<number | string> = new Set();
  comparisonProductIds: Set<number | string> = new Set();
  comparisonItemCount: number = 0;
  readonly MAX_COMPARE_ITEMS = 4; // Servisteki ile aynı olmalı

  private routeSubscription: Subscription | null = null; // queryParamMap için
  private wishlistSubscription: Subscription | null = null;
  private comparisonSubscription: Subscription | null = null;

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router, // Router inject edildi
    private cartService: CartService,
    private wishlistService: WishlistService,
    private comparisonService: ComparisonService
  ) { }

  ngOnInit(): void {
    this.loadCategories();

    // Route parametrelerini dinle
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      console.log('Query Params Changed:', params);
      const categoryIdParam = params.get('categoryId');
      const minPriceParam = params.get('minPrice');
      const maxPriceParam = params.get('maxPrice');

      this.selectedCategoryId = categoryIdParam ? +categoryIdParam : null;
      // Fiyatları number veya null yap
      this.minPrice = minPriceParam ? parseFloat(minPriceParam) : null;
      this.maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : null;
      // Negatif değerleri veya geçersiz sayıları null yap
      if (this.minPrice !== null && (isNaN(this.minPrice) || this.minPrice < 0)) this.minPrice = null;
      if (this.maxPrice !== null && (isNaN(this.maxPrice) || this.maxPrice < 0)) this.maxPrice = null;
      // min > max durumunu kontrol et (opsiyonel)
      if (this.minPrice !== null && this.maxPrice !== null && this.minPrice > this.maxPrice) {
          this.maxPrice = null; // Max'ı temizle
      }

      this.updateSelectedCategoryName(); // Kategori ismini güncelle (varsa)
      this.loadProducts(); // Filtrelere göre ürünleri yükle
    });

    // Wishlist ve Comparison abonelikleri
    this.wishlistSubscription = this.wishlistService.wishlist$.subscribe(wishlist => {
        this.wishlistProductIds = new Set(wishlist?.items.map(item => item.productId) ?? []);
    });
    this.comparisonSubscription = this.comparisonService.comparisonList$.subscribe(list => {
        this.comparisonProductIds = new Set(list.map(item => item.id));
        this.comparisonItemCount = list.length;
    });
  }

  ngOnDestroy(): void {
      // Aboneliklerden çık
      if (this.routeSubscription) this.routeSubscription.unsubscribe();
      if (this.wishlistSubscription) this.wishlistSubscription.unsubscribe();
      if (this.comparisonSubscription) this.comparisonSubscription.unsubscribe();
  }

    // --- Wishlist Metotları ---

    toggleWishlist(product: ProductSummary): void {
      if (!product) return;
      const productId = product.id;
      if (this.isProductInWishlist(productId)) {
        console.log(`Removing product ${productId} from wishlist via toggle.`);
        this.wishlistService.removeFromWishlist(productId);
      } else {
        console.log(`Adding product ${productId} to wishlist via toggle.`);
        this.wishlistService.addToWishlist(product);
      }
      // Not: wishlistProductIds seti, wishlist$ observable'ı güncellendiğinde
      // otomatik olarak güncellenecektir.
    }

  // Ürünleri filtrelerle yükle
  loadProducts(): void {
    this.isLoadingProducts = true;
    this.error = null;

    // Filtre objesini oluştur
    const currentFilters: ProductFilters = {
        categoryId: this.selectedCategoryId,
        minPrice: this.minPrice,
        maxPrice: this.maxPrice
        // ileride diğer filtreler eklenebilir
    };

    this.products$ = this.productService.getProducts(
        20, 0, currentFilters // Servise filtre objesini gönder
    ).pipe(
        catchError(err => {
           console.error("Error loading products:", err);
           this.error = "Ürünler yüklenirken bir hata oluştu.";
           return of([]);
        }),
        finalize(() => {
            // Yüklenme durumunu asenkron olarak güncellemek (ExpressionChangedAfterItHasBeenCheckedError önlemek için)
            setTimeout(() => { this.isLoadingProducts = false; }, 0);
        })
    );
  }

  // Kategori seçildiğinde URL'yi güncelle
  selectCategory(categoryId: number | null): void {
    this._updateUrlWithFilters({ categoryId: categoryId });
  }

  // Fiyat filtrelerini uygula (butonla tetiklenecek)
  applyPriceFilter(minPriceValue: string, maxPriceValue: string): void {
     const min = minPriceValue ? parseFloat(minPriceValue) : null;
     const max = maxPriceValue ? parseFloat(maxPriceValue) : null;

     const finalMin = (min !== null && !isNaN(min) && min >= 0) ? min : null;
     const finalMax = (max !== null && !isNaN(max) && max >= 0) ? max : null;

     if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
         this._updateUrlWithFilters({ minPrice: finalMin, maxPrice: null });
         return;
     }

     this._updateUrlWithFilters({ minPrice: finalMin, maxPrice: finalMax });
  }

  // Filtreleri temizle
  clearFilters(): void {
      this._updateUrlWithFilters({ categoryId: null, minPrice: null, maxPrice: null }, true); // Hepsini temizle
  }


  // URL Query Parametrelerini güncelleyen özel metot
  private _updateUrlWithFilters(newFilters: Partial<ProductFilters>, replaceAll: boolean = false): void {
     const currentParams = this.route.snapshot.queryParams;
     let updatedParams: any = replaceAll ? {} : { ...currentParams };
     Object.assign(updatedParams, newFilters);

     Object.keys(updatedParams).forEach(key => {
       if (updatedParams[key] === null || updatedParams[key] === undefined || updatedParams[key] === '') {
         delete updatedParams[key];
       }
     });

     this.router.navigate(
       [],
       {
         relativeTo: this.route,
         queryParams: updatedParams,
         queryParamsHandling: '',
         replaceUrl: true
       }
     );
  }


  // Kategorileri yükle
  loadCategories(): void {
    this.isLoadingCategories = true;
    this.error = null; // Kategori yüklerken genel hatayı sıfırla
    this.categories$ = this.productService.getCategories().pipe(
        tap(cats => {
            this.categories = cats;
            // URL'den gelen kategori ID'si varsa ismini şimdi güncelleyebiliriz
            this.updateSelectedCategoryName();
        }),
        catchError(err => {
            console.error("Error loading categories:", err);
            this.error = "Kategoriler yüklenemedi.";
            this.categories = [];
            this.updateSelectedCategoryName();
            return of([]);
        }),
        finalize(() => {
            setTimeout(() => { this.isLoadingCategories = false; }, 0);
        })
    );
  }

  // Seçili kategori adını güncelle
  updateSelectedCategoryName(): void {
      if (this.selectedCategoryId === null) {
          this.selectedCategoryName = null;
      } else {
          // Kategoriler yüklendiyse adı bul
          const foundCategory = this.categories.find(c => c.id === this.selectedCategoryId);
          this.selectedCategoryName = foundCategory ? foundCategory.name : null;
      }
  }

  // Sepete Ekle
  addToCart(product: ProductSummary): void {
    console.log('Adding to cart from List:', product.name);
    this.cartService.addToCart(product);
    alert(`${product.name} sepete eklendi!`); // Geri bildirim
  }

  // Wishlist Toggle (Servise taşınabilir)
  addToWishlist(product: ProductSummary): void { // Şimdilik sadece ekleme
      console.log('Adding to wishlist from List:', product.name);
      this.wishlistService.addToWishlist(product);
  }

  // Wishlist'te mi kontrolü
  isProductInWishlist(productId: number | string): boolean {
      return this.wishlistProductIds.has(productId);
  }

  // Comparison Toggle (Servise taşınabilir)
  toggleComparison(product: ProductSummary): void {
      if (this.isProductInComparison(product.id)) {
          this.comparisonService.removeFromComparison(product.id);
      } else {
          this.comparisonService.addToComparison(product); // Limit kontrolü serviste
      }
  }

  // Comparison'da mı kontrolü
  isProductInComparison(productId: number | string): boolean {
      return this.comparisonProductIds.has(productId);
  }

  // Comparison listesi dolu mu kontrolü
  canAddToComparison(): boolean {
    return this.comparisonItemCount < this.MAX_COMPARE_ITEMS;
  }
}
