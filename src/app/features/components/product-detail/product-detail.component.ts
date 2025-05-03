import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, switchMap, catchError, EMPTY, tap, first } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { Product } from '../../../shared/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service'; // <-- WishlistService import
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone:false
})
export class ProductDetailComponent implements OnInit {

  // --- Özellik Tanımları ---
  product$!: Observable<Product | null | undefined>;
  isLoading: boolean = true;
  error: string | null = null;
  mainImageUrl: string | undefined;
  isInWishlist$: Observable<boolean> = of(false); // <-- Wishlist durumu için observable
  private currentProduct: Product | null | undefined = null; // Mevcut ürünü tutmak için

  // --- Constructor Güncellemesi ---
  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private wishlistService: WishlistService, // <-- WishlistService inject et
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadProduct();
  }

  loadProduct(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const productId = params.get('id');
        if (productId) {
          this.isLoading = true;
          this.error = null;
          this.mainImageUrl = undefined;
          // --- Wishlist durumunu productId'ye göre ayarla ---
          this.isInWishlist$ = this.wishlistService.isInWishlist(productId);
          // --------------------------------------------------
          return this.productService.getProductById(productId).pipe(
            tap(product => {
              this.mainImageUrl = product?.images?.[0]?.imageUrl;
              this.isLoading = false;
              if (!product) {
                this.error = "Ürün bulunamadı.";
                this.isInWishlist$ = of(false); // Ürün yoksa wishlist'te olamaz
              }
            }),
            catchError(err => {
              console.error('Error fetching product:', err);
              this.error = 'Ürün bilgileri yüklenirken bir hata oluştu.';
              this.isLoading = false;
              this.mainImageUrl = undefined;
              this.isInWishlist$ = of(false); // Hata durumunda wishlist'te olamaz
              return of(null);
            })
          );
        } else {
          this.error = 'Geçersiz ürün ID.';
          this.isLoading = false;
          this.mainImageUrl = undefined;
          this.isInWishlist$ = of(false); // ID yoksa wishlist'te olamaz
          return of(null);
        }
      })
    );
  }

    // --- Wishlist Toggle Metodu ---
    toggleWishlist(product?: Product | null | undefined): void {
      // Parametre olarak gelen product yerine component'te tuttuğumuz
      // currentProduct'ı kullanmak daha güvenli olabilir.
      const productToToggle = product || this.currentProduct;

      if (!productToToggle) {
          console.error("Cannot toggle wishlist, product data is not available.");
          return;
      }
      const productId = productToToggle.id;

      // === DÜZELTME: wishlist$ observable'ını first() ile kullan ===
      this.wishlistService.wishlist$.pipe(
          first() // Observable'dan sadece ilk (güncel) değeri al ve tamamlan
      ).subscribe(currentWishlist => {
          // Mevcut wishlist state'ini kontrol et
          const isInList = currentWishlist?.items.some(i => i.productId === productId) ?? false;

          if (isInList) { // Eğer listedeyse kaldır
              this.wishlistService.removeFromWishlist(productId);
              this.notificationService.showInfo(`${productToToggle.name} istek listesinden çıkarıldı.`); // <-- Bildirim
          } else { // Değilse ekle
              // addToWishlist'e Product veya ProductSummary gönderilebilir
              this.wishlistService.addToWishlist(productToToggle);
              this.notificationService.showSuccess(`${productToToggle.name} istek listesine eklendi!`); // <-- Bildirim
          }

          // Butonun durumu isInWishlist$ observable'ı güncellendiğinde zaten değişmeli,
          // ama anlık görsel geri bildirim için manuel tetikleme yapılabilir:
          this.isInWishlist$ = this.wishlistService.isInWishlist(productId);

      });
      // === DÜZELTME SONU ===
  }

  // --- Sepete Ekleme Metodu (Mevcut) ---
  addToCart(product: Product): void {
    if (!product) return;
    console.log('Adding to cart from Detail:', product.name);
    this.cartService.addToCart(product);
    this.notificationService.showSuccess(`${product.name} sepete eklendi!`); // <-- Yeni bildirim
  }

  // --- YENİ Wishlist Ekleme Metodu ---
  addToWishlist(product: Product): void {
      if (!product) return;
      console.log('Adding to wishlist from Detail:', product.name);
      this.wishlistService.addToWishlist(product);
      // Gerekirse, buton durumunun hemen güncellenmesi için isInWishlist$'ı manuel tetikle
      // Veya servisteki BehaviorSubject değişikliği zaten yansıtacaktır.
      this.isInWishlist$ = this.wishlistService.isInWishlist(product.id); // Durumu tekrar kontrol et
  }
  // ------------------------------------

  changeMainImage(imageUrl: string | undefined): void {
    if (imageUrl) {
        this.mainImageUrl = imageUrl;
    }
  }

}
