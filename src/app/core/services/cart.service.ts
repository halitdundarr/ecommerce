// src/app/core/services/cart.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // HttpClient eklendi
import { BehaviorSubject, Observable, of, throwError, EMPTY } from 'rxjs'; // EMPTY eklendi
import { catchError, map, tap, finalize, switchMap } from 'rxjs/operators';
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Product, ProductSummary } from '../../shared/models/product.model';
import { AuthService } from './auth.service'; // AuthService eklendi

// --- Backend DTO Arayüzleri ---
// (ProductService'teki gibi backend'den gelen yanıtlara uygun)
interface BackendDtoProductSummary { /* ... */ productId: number | string; name: string; price: any; primaryImageUrl?: string; averageRating?: number; brand?: string; model?: string; }
interface BackendDtoCartItem {
    cartItemId: number;
    quantity: number;
    product: BackendDtoProductSummary; // Gömülü ürün özeti
}
interface BackendDtoCart {
    cartId: number;
    items: BackendDtoCartItem[];
    calculatedTotal: any; // BigDecimal için 'any'
}
// ----------------------------

const CART_API_URL = 'http://localhost:8080/api/v1/customer/cart'; // <<<--- API URL

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private cartSubject = new BehaviorSubject<Cart | null>(null);
  public cart$: Observable<Cart | null> = this.cartSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false); // Yüklenme durumu için
  public isLoading$ = this.isLoading.asObservable();

  constructor(
    private http: HttpClient, // HttpClient inject edildi
    private authService: AuthService, // AuthService inject edildi
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
      // Kullanıcı durumu değiştikçe sepeti yükle/temizle
      this.authService.isLoggedIn$.pipe(
          switchMap(isLoggedIn => {
              if (isLoggedIn && isPlatformBrowser(this.platformId)) {
                  // Giriş yapıldıysa backend'den sepeti çek
                  return this.fetchCartFromServer();
              } else {
                  // Giriş yapılmadıysa veya sunucu tarafıysa sepeti temizle
                  this._updateCartState(null); // Subject'i null yap
                  return of(null); // Observable döndür
              }
          })
      ).subscribe(); // Abone ol ve yönet
  }

  // Sepeti backend'den çekme
  private fetchCartFromServer(): Observable<Cart | null> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getToken()) {
        return of(null); // Tarayıcı değilse veya token yoksa işlem yapma
    }
    this.isLoading.next(true);
    console.log('Fetching cart from server...');
    return this.http.get<BackendDtoCart>(CART_API_URL).pipe(
        map(dtoCart => this.mapDtoCartToCart(dtoCart)), // DTO -> Model
        tap(cart => {
            console.log('Cart fetched:', cart);
            this._updateCartState(cart); // Subject'i güncelle
        }),
        catchError(err => {
            console.error('Error fetching cart:', err);
            this._updateCartState(null); // Hata durumunda sepeti temizle
            // Hata mesajını component'e iletmek için throwError kullanılabilir
            return throwError(() => new Error('Sepet yüklenirken bir hata oluştu.'));
            // Veya sadece null döndür: return of(null);
        }),
        finalize(() => this.isLoading.next(false))
    );
  }

  // Sepete ürün ekleme
  addToCart(product: Product | ProductSummary, quantity: number = 1): void {
    if (!this.isLoggedInAndBrowser()) return; // Giriş yapılmadıysa veya SSR ise çık
    if (!product || quantity <= 0) return;

    this.isLoading.next(true);
    const payload = { productId: product.id, quantity: quantity };
    console.log('Adding item to cart:', payload);

    this.http.post<BackendDtoCart>(`${CART_API_URL}/items`, payload).pipe(
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        catchError(this.handleError),
        finalize(() => this.isLoading.next(false))
    ).subscribe(cart => {
        if (cart) {
            this._updateCartState(cart); // Başarılı olursa state'i güncelle
            alert(`${product.name} sepete eklendi!`); // Bildirim
        }
    });
  }

  // Ürün miktarını güncelleme
  updateQuantity(cartItemId: number | undefined, newQuantity: number): void {
    if (!this.isLoggedInAndBrowser() || !cartItemId) return;

    if (newQuantity <= 0) {
        // Miktar 0 veya altı ise ürünü sil
        this.removeFromCart(cartItemId);
        return;
    }

    this.isLoading.next(true);
    // PUT isteği için quantity query param olarak gönderiliyor
    let params = new HttpParams().set('quantity', newQuantity.toString());
    console.log(`Updating quantity for item ${cartItemId} to ${newQuantity}`);

    this.http.put<BackendDtoCart>(`${CART_API_URL}/items/${cartItemId}`, null, { params }).pipe( // Body null
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        catchError(this.handleError),
        finalize(() => this.isLoading.next(false))
    ).subscribe(cart => {
        if (cart) this._updateCartState(cart); // Başarılı olursa state'i güncelle
    });
  }

  // Sepetten ürün çıkarma
  removeFromCart(cartItemId: number | undefined): void {
    if (!this.isLoggedInAndBrowser() || !cartItemId) return;

    this.isLoading.next(true);
    console.log(`Removing item ${cartItemId} from cart`);

    this.http.delete<BackendDtoCart>(`${CART_API_URL}/items/${cartItemId}`).pipe(
        map(dtoCart => this.mapDtoCartToCart(dtoCart)),
        catchError(this.handleError),
        finalize(() => this.isLoading.next(false))
    ).subscribe(cart => {
         if (cart) this._updateCartState(cart); // Başarılı olursa state'i güncelle
    });
  }

  // Sepeti tamamen boşaltma
  clearCart(): void {
     if (!this.isLoggedInAndBrowser()) return;

     this.isLoading.next(true);
     console.log('Clearing cart');

     this.http.delete<BackendDtoCart>(CART_API_URL).pipe(
         map(dtoCart => this.mapDtoCartToCart(dtoCart)), // Boş sepet DTO'su dönecek
         catchError(this.handleError),
         finalize(() => this.isLoading.next(false))
     ).subscribe(cart => {
        // Normalde boş sepet döner, state'i ona göre güncelle
        this._updateCartState(cart ?? this._createEmptyCart());
     });
  }

  // Sepeti Observable olarak döndüren metot
  getCart(): Observable<Cart | null> {
    // Direkt subject'i döndür, yükleme logic'i constructor'da ve diğer metotlarda
    return this.cart$;
  }

  // Mevcut sepet değerini senkron olarak almak için (dikkatli kullanılmalı)
  getCurrentCartValue(): Cart | null {
    return this.cartSubject.value;
  }

  // --- Private Yardımcı Metotlar ---

  // Tarayıcıda ve login olunmuş mu kontrolü
  private isLoggedInAndBrowser(): boolean {
      const isLoggedIn = !!this.authService.getToken(); // Anlık token kontrolü
      if (!isLoggedIn) {
          console.warn('User not logged in. Cart operation cancelled.');
          // İsteğe bağlı: Kullanıcıyı login'e yönlendir
          // this.router.navigate(['/auth/login']);
      }
      return isLoggedIn && isPlatformBrowser(this.platformId);
  }

  // Sepet state'ini güncelleyen ana metot
  private _updateCartState(cart: Cart | null): void {
      if (cart) {
          // Toplamları frontend'de de hesaplayalım (backend'den gelen total kullanılabilir ama emin olmak için)
          this._calculateTotals(cart);
      }
      this.cartSubject.next(cart); // Değişikliği yayınla
      console.log('Cart state updated:', cart);
  }

  // Toplamları hesaplar (Frontend Modeline göre)
  private _calculateTotals(cart: Cart): void {
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    // Backend'den gelen totalPrice varsa onu kullanabiliriz, yoksa hesaplayalım
    cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }

   // Boş bir sepet nesnesi oluşturur (Frontend Modeline göre)
   private _createEmptyCart(): Cart {
     return { items: [], totalItems: 0, totalPrice: 0 };
   }

   // --- DTO -> Model Dönüşümü ---
   private mapDtoCartToCart(dto: BackendDtoCart | null): Cart | null {
       if (!dto) return null;
       const cart: Cart = {
           id: dto.cartId,
           items: dto.items.map(itemDto => this.mapDtoCartItemToCartItem(itemDto)),
           // Backend totali varsa onu al, yoksa 0 ata (sonra _calculateTotals hesaplar)
           totalPrice: this.parsePrice(dto.calculatedTotal),
           totalItems: 0 // _calculateTotals hesaplayacak
           // userId backend DTO'da yok, cartSubject'e eklemeye gerek yok
       };
       // Dönüşüm sonrası toplamları hesapla
       this._calculateTotals(cart);
       return cart;
   }

   private mapDtoCartItemToCartItem(dto: BackendDtoCartItem): CartItem {
       return {
           id: dto.cartItemId,
           productId: dto.product.productId,
           quantity: dto.quantity,
           unitPrice: this.parsePrice(dto.product.price), // DtoProductSummary'den fiyatı al
           totalPrice: 0, // _calculateTotals hesaplayacak
           product: this.mapDtoSummaryToProductSummary(dto.product) // Gömülü DTO'yu map et
       };
   }

    // ProductService'teki map fonksiyonlarının benzerleri (veya ortak bir mapper servisi kullanılabilir)
    private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
      return {
          id: dto.productId,
          name: dto.name,
          price: this.parsePrice(dto.price),
          imageUrl: dto.primaryImageUrl,
          averageRating: dto.averageRating,
          // categoryId: dto.categoryId // Varsa
      };
    }

    private parsePrice(price: any): number {
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            const parsed = parseFloat(price);
            return isNaN(parsed) ? 0 : parsed;
        }
         if (price && typeof price.toNumber === 'function') return price.toNumber();
        return 0;
    }

    // Genel hata yönetimi (ProductService'teki ile aynı olabilir)
 // Bu fonksiyonu ilgili tüm servis dosyalarındaki mevcut handleError ile değiştirin
private handleError(error: HttpErrorResponse): Observable<never> {
  let userMessage = 'Bilinmeyen bir hata oluştu!'; // Varsayılan mesaj

  // Hatanın istemci/ağ kaynaklı mı yoksa backend kaynaklı mı olduğunu kontrol et
  if (error.status === 0 || !error.error) {
      // status === 0 genellikle ağ hatası veya CORS sorunudur.
      // error.error'ın null olması da istemci tarafı bir sorun olabilir.
      console.error('Bir ağ/istemci hatası oluştu:', error.message || error);
      userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu. Lütfen bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';

  } else {
      // Backend başarısız bir yanıt kodu döndürdü (4xx veya 5xx).
      console.error(
          `Backend Hata Kodu ${error.status}, ` +
          `Gövde: ${JSON.stringify(error.error)}`); // Hata gövdesini logla

      // Kullanıcıya gösterilecek mesajı belirle
      // Backend'den gelen `message` alanını kullanmayı dene (ErrorResponse DTO'sundan)
      const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);

      if (backendErrorMessage) {
          userMessage = backendErrorMessage; // Backend'in mesajını kullan
      } else {
           // Genel durum kodlarına göre mesaj ata
           switch (error.status) {
               case 400:
                   userMessage = 'Geçersiz istek. Lütfen gönderdiğiniz bilgileri kontrol edin.';
                   break;
               case 401:
                   userMessage = 'Giriş yapmanız gerekiyor.';
                   break;
               case 403:
                   userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
                   break;
               case 404:
                   userMessage = 'İstenen kaynak bulunamadı.';
                   break;
               case 409:
                   userMessage = 'İşlem çakışması (örneğin, kayıt zaten var veya stok yetersiz).';
                   break;
               case 500:
                   userMessage = 'Sunucu tarafında beklenmedik bir hata oluştu.';
                   break;
               default:
                   userMessage = `Sunucu hatası (${error.status}). Lütfen daha sonra tekrar deneyin.`;
           }
      }
  }

  // Kullanıcıya yönelik hatayı içeren bir observable fırlat.
  return throwError(() => new Error(userMessage));
}
}
