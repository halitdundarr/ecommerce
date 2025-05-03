// src/app/core/services/cart.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, EMPTY } from 'rxjs';
import { catchError, map, tap, finalize, switchMap, first } from 'rxjs/operators'; // first eklendi (getCurrentCartValue alternatifi için)
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Product, ProductSummary } from '../../shared/models/product.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment'; // <-- environment import et

// --- Backend DTO Arayüzleri (Mevcut olanlar iyi görünüyor) ---
interface BackendDtoProductSummary { productId: number | string; name: string; price: any; primaryImageUrl?: string; averageRating?: number; brand?: string; model?: string; }
interface BackendDtoCartItem { cartItemId: number; quantity: number; product: BackendDtoProductSummary; }
interface BackendDtoCart { cartId: number; items: BackendDtoCartItem[]; calculatedTotal: any; }
// -----------------------------------------------------------

@Injectable({
  providedIn: 'root'
})
export class CartService {

  // --- API URL'si environment'dan alınacak ---
  private readonly CART_API_URL = `${environment.apiUrl}/api/v1/customer/cart`; // <-- environment kullan

  private cartSubject = new BehaviorSubject<Cart | null>(null);
  public cart$: Observable<Cart | null> = this.cartSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoading.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
      // Kullanıcı durumu değiştikçe sepeti yükle/temizle (Bu kısım aynı kalabilir)
      this.authService.isLoggedIn$.pipe(
          switchMap(isLoggedIn => {
              if (isLoggedIn && isPlatformBrowser(this.platformId)) {
                  return this.fetchCartFromServer();
              } else {
                  this._updateCartState(null);
                  return of(null);
              }
          })
      ).subscribe();
  }

  // Sepeti backend'den çekme
  private fetchCartFromServer(): Observable<Cart | null> {
    if (!this.isLoggedInAndBrowser()) { // Helper metot zaten platform ve token kontrolü yapıyor
        return of(null);
    }
    this.isLoading.next(true);
    console.log(`Workspaceing cart from server: ${this.CART_API_URL}`);
    // API URL'si CART_API_URL değişkeninden alındı
    return this.http.get<BackendDtoCart>(this.CART_API_URL).pipe(
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        tap(cart => {
            console.log('Cart fetched:', cart);
            this._updateCartState(cart);
        }),
        catchError(err => {
            console.error('Error fetching cart:', err);
            this._updateCartState(null);
            // Hata mesajını merkezi handleError ile yönetelim
            return this.handleError(err); // this.handleError çağır
            // return throwError(() => new Error('Sepet yüklenirken bir hata oluştu.')); // Veya eski hali
        }),
        finalize(() => this.isLoading.next(false))
    );
  }

  // Sepete ürün ekleme
  addToCart(product: Product | ProductSummary, quantity: number = 1): void {
    if (!this.isLoggedInAndBrowser()) return;
    if (!product || quantity <= 0) return;

    this.isLoading.next(true);
    const payload = { productId: product.id, quantity: quantity };
    const url = `${this.CART_API_URL}/items`; // items endpoint'i
    console.log(`Adding item to cart at ${url}:`, payload);

    // API URL'si CART_API_URL değişkeninden alındı
    this.http.post<BackendDtoCart>(url, payload).pipe(
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        catchError(this.handleError), // Merkezi hata yönetimi
        finalize(() => this.isLoading.next(false))
    ).subscribe(cart => {
        if (cart) {
            this._updateCartState(cart);
            // Bildirim NotificationService ile yapılabilir (isteğe bağlı)
            // this.notificationService.showSuccess(`${product.name} sepete eklendi!`);
            alert(`${product.name} sepete eklendi!`); // Şimdilik alert kalsın
        }
    });
  }

  // Ürün miktarını güncelleme
  updateQuantity(cartItemId: number | undefined, newQuantity: number): void {
    if (!this.isLoggedInAndBrowser() || cartItemId === undefined) return; // item.id kontrolü düzeltildi

    if (newQuantity <= 0) {
        this.removeFromCart(cartItemId); // Miktar 0 veya altı ise sil
        return;
    }

    this.isLoading.next(true);
    let params = new HttpParams().set('quantity', newQuantity.toString());
    const url = `${this.CART_API_URL}/items/${cartItemId}`; // cartItemId ile endpoint
    console.log(`Updating quantity for item ${cartItemId} to ${newQuantity} at ${url}`);

    // API URL'si CART_API_URL değişkeninden alındı
    this.http.put<BackendDtoCart>(url, null, { params }).pipe( // Body null
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        catchError(this.handleError), // Merkezi hata yönetimi
        finalize(() => this.isLoading.next(false))
    ).subscribe(cart => {
        if (cart) this._updateCartState(cart);
    });
  }

  // Sepetten ürün çıkarma
  removeFromCart(cartItemId: number | undefined): void {
    if (!this.isLoggedInAndBrowser() || cartItemId === undefined) return;

    this.isLoading.next(true);
    const url = `${this.CART_API_URL}/items/${cartItemId}`; // cartItemId ile endpoint
    console.log(`Removing item ${cartItemId} from cart at ${url}`);

    // API URL'si CART_API_URL değişkeninden alındı
    this.http.delete<BackendDtoCart>(url).pipe(
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        catchError(this.handleError), // Merkezi hata yönetimi
        finalize(() => this.isLoading.next(false))
    ).subscribe(cart => {
         if (cart) this._updateCartState(cart);
    });
  }

  // Sepeti tamamen boşaltma
  clearCart(): void {
     if (!this.isLoggedInAndBrowser()) return;

     this.isLoading.next(true);
     const url = this.CART_API_URL; // Ana cart endpoint'i
     console.log(`Clearing cart at ${url}`);

     // API URL'si CART_API_URL değişkeninden alındı
     this.http.delete<BackendDtoCart>(url).pipe(
         map(dtoCart => this.mapDtoCartToCart(dtoCart)),
         catchError(this.handleError), // Merkezi hata yönetimi
         finalize(() => this.isLoading.next(false))
     ).subscribe(cart => {
        // Boş sepet DTO'su veya null dönebilir, ona göre state güncellenir
        this._updateCartState(cart ?? this._createEmptyCart());
     });
  }

  // Sepeti Observable olarak döndüren metot (Aynı kalabilir)
  getCart(): Observable<Cart | null> {
    return this.cart$;
  }

  // Mevcut sepet değerini senkron olarak almak için (OrderService kullanıyor)
  getCurrentCartValue(): Cart | null {
    return this.cartSubject.value;
  }

  // Alternatif: Asenkron olarak anlık değeri almak (daha güvenli)
  // getCurrentCartOnce(): Observable<Cart | null> {
  //    return this.cart$.pipe(first());
  // }


  // --- Private Yardımcı Metotlar (Aynı kalabilir) ---

  private isLoggedInAndBrowser(): boolean {
      const isLoggedIn = !!this.authService.getToken();
      if (!isLoggedIn && isPlatformBrowser(this.platformId)) {
          console.warn('User not logged in. Cart operation cancelled.');
      }
      return isLoggedIn && isPlatformBrowser(this.platformId);
  }

  private _updateCartState(cart: Cart | null): void {
      if (cart) {
          this._calculateTotals(cart); // Toplamları frontend'de de hesapla
      }
      this.cartSubject.next(cart);
      console.log('Cart state updated:', cart);
  }

  private _calculateTotals(cart: Cart): void {
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    // Backend'den gelen totalPrice (calculatedTotal) varsa onu kullanmak daha doğru olabilir,
    // ancak frontend'de de hesaplamak yedeklilik sağlar.
    cart.totalPrice = cart.items.reduce((sum, item) => {
        const price = item.unitPrice ?? 0; // unitPrice null ise 0 al
        return sum + (price * item.quantity);
    }, 0);
  }

   private _createEmptyCart(): Cart {
     return { items: [], totalItems: 0, totalPrice: 0 };
   }

   // --- DTO -> Model Dönüşümü (Aynı kalabilir) ---
   private mapDtoCartToCart(dto: BackendDtoCart | null): Cart | null {
       if (!dto) return null;
       const cart: Cart = {
           id: dto.cartId,
           items: dto.items?.map(itemDto => this.mapDtoCartItemToCartItem(itemDto)) ?? [], // items null ise boş dizi
           totalPrice: this.parsePrice(dto.calculatedTotal), // Backend totalini kullan
           totalItems: 0 // _calculateTotals hesaplayacak
       };
       this._calculateTotals(cart); // totalItems'ı hesapla
       return cart;
   }

   private mapDtoCartItemToCartItem(dto: BackendDtoCartItem): CartItem {
       const item: CartItem = {
           id: dto.cartItemId,
           productId: dto.product.productId,
           quantity: dto.quantity,
           unitPrice: this.parsePrice(dto.product.price),
           totalPrice: 0, // _calculateTotals hesaplayacak
           product: this.mapDtoSummaryToProductSummary(dto.product)
       };
       item.totalPrice = (item.unitPrice ?? 0) * item.quantity; // totalPrice'ı burada da hesaplayabiliriz
       return item;
   }

    private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
      return {
          id: dto.productId,
          name: dto.name ?? 'İsimsiz Ürün', // Null check
          price: this.parsePrice(dto.price),
          imageUrl: dto.primaryImageUrl,
          averageRating: dto.averageRating,
          brand: dto.brand, // brand/model ekleyebiliriz ProductSummary modeline
          model: dto.model
      };
    }

    private parsePrice(price: any): number {
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
             const normalizedPrice = price.replace(',', '.');
            const parsed = parseFloat(normalizedPrice);
            return isNaN(parsed) ? 0 : parsed;
        }
         if (price && typeof price.toNumber === 'function') return price.toNumber();
        return 0;
    }

    // --- Genel Hata Yönetimi ---
    private handleError(error: HttpErrorResponse): Observable<never> {
      let userMessage = 'Bilinmeyen bir sepet işlemi hatası oluştu!';
      // ... (Diğer servislerdeki handleError mantığı buraya kopyalanabilir) ...
      if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (CartService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
      } else {
        console.error(`Backend Hatası ${error.status} (CartService), Gövde:`, error.error);
        const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);

        if (backendErrorMessage) {
            userMessage = backendErrorMessage;
        } else {
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz sepet isteği (örn: stok yetersiz).'; break; // InsufficientStockException buraya map olabilir
                 case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
                 case 403: userMessage = 'Bu işlem için yetkiniz yok.'; break;
                 case 404: userMessage = 'Sepet veya ürün bulunamadı.'; break;
                 case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}).`;
             }
        }
      }
      // Kullanıcıya yönelik hatayı içeren bir observable fırlat.
      return throwError(() => new Error(userMessage));
    }

} // CartService sınıfının sonu
