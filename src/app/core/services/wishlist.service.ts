// src/app/core/services/wishlist.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, EMPTY } from 'rxjs';
import { map, catchError, tap, switchMap, finalize } from 'rxjs/operators';
import { Product, ProductSummary } from '../../shared/models/product.model';
import { Wishlist, WishlistItem } from '../../shared/models/wishlist.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment'; // <-- environment import et

// --- Backend DTO Arayüzleri (Aynı kalabilir) ---
interface BackendDtoProductSummary { productId: number | string; name: string; price: any; primaryImageUrl?: string; averageRating?: number; brand?: string; model?: string; }
interface BackendDtoWishlistItem { product: BackendDtoProductSummary; /* dateAdded?: string | Date; */ }
interface BackendDtoWishlist { wishlistId?: number; items: BackendDtoWishlistItem[]; }
// -----------------------------------------------

@Injectable({
  providedIn: 'root'
})
export class WishlistService {

  // --- API URL'si environment'dan alınacak ---
  private readonly WISHLIST_API_URL = `${environment.apiUrl}/api/wishlist`; // <-- environment kullan

  private wishlistSubject = new BehaviorSubject<Wishlist | null>(null);
  public wishlist$: Observable<Wishlist | null> = this.wishlistSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoading.asObservable();

  public wishlistItemCount$: Observable<number> = this.wishlist$.pipe(
      map(wishlist => wishlist?.items?.length ?? 0)
  );

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Kullanıcı durumu değiştikçe wishlist'i yükle/temizle (Aynı kalabilir)
    this.authService.isLoggedIn$.pipe(
        switchMap(isLoggedIn => {
            if (isLoggedIn && isPlatformBrowser(this.platformId)) {
                // Giriş yapıldığında fetchWishlistFromServer zaten subject'i güncelliyor.
                return this.fetchWishlistFromServer();
            } else {
                this._updateWishlistState(null); // Login değilse temizle
                return of(null);
            }
        })
    ).subscribe(); // Abone ol ve yönet
  }

  // Wishlist'i backend'den çekme
  private fetchWishlistFromServer(): Observable<Wishlist | null> {
    if (!this.isLoggedInAndBrowser()) { return of(null); }

    this.isLoading.next(true);
    const url = this.WISHLIST_API_URL; // Environment'dan alınan URL
    console.log(`Workspaceing wishlist from server: ${url}`);
    return this.http.get<BackendDtoWishlist>(url).pipe(
        map(dtoWishlist => this.mapDtoWishlistToWishlist(dtoWishlist)),
        tap(wishlist => console.log('Wishlist fetched:', wishlist)),
        catchError(this.handleError), // Hata yönetimini kullan
        finalize(() => this.isLoading.next(false))
    ).pipe(
         // Başarılı fetch sonrası state'i güncelle (subscribe yerine pipe içinde tap ile de yapılabilir)
         tap(wishlist => this._updateWishlistState(wishlist))
    );
  }

  // Wishlist'e ürün ekleme
  addToWishlist(product: Product | ProductSummary): void {
    if (!this.isLoggedInAndBrowser() || !product) return;

    this.isLoading.next(true);
    const productId = product.id;
    const url = `${this.WISHLIST_API_URL}/products/${productId}`; // Product ID ile endpoint
    console.log(`Adding product ${productId} to wishlist at ${url}`);

    // API URL'si WISHLIST_API_URL değişkeninden alındı
    this.http.post<BackendDtoWishlist>(url, {}).pipe( // Body boş {}
        map(dtoWishlist => this.mapDtoWishlistToWishlist(dtoWishlist)),
        catchError(this.handleError),
        finalize(() => this.isLoading.next(false))
    ).subscribe(wishlist => {
        if (wishlist) {
            this._updateWishlistState(wishlist); // State'i güncelle
            // Bildirim eklenebilir: this.notificationService.showSuccess(...)
            alert(`${product.name} istek listenize eklendi!`);
        }
    });
  }

  // Wishlist'ten ürün çıkarma
  removeFromWishlist(productId: number | string): void {
    if (!this.isLoggedInAndBrowser()) return;

    this.isLoading.next(true);
    const url = `${this.WISHLIST_API_URL}/products/${productId}`; // Product ID ile endpoint
    console.log(`Removing product ${productId} from wishlist at ${url}`);

    // ***** DÜZELTME: Backend void (204) döndüğü için <void> kullan *****
    this.http.delete<void>(url).pipe(
      catchError(this.handleError),
      finalize(() => this.isLoading.next(false))
    ).subscribe({
        next: () => {
            // Başarılı silme sonrası state'i güncellemek için listeyi yeniden çek
            console.log(`Product ${productId} removed successfully trigger. Refetching wishlist.`);
            // Silme işlemi backend'de yapıldı, frontend state'ini güncellemek için
            // en güvenli yol listeyi tekrar çekmek veya subject'i manuel güncellemektir.
            // Manuel güncelleme daha performanslı olabilir ama hata riski taşır.
            this.fetchWishlistFromServer().subscribe({
                error: (err) => console.error("Error refetching wishlist after remove:", err)
            });
            // Bildirim eklenebilir: this.notificationService.showInfo(...)
        },
        error: (err) => {
            // handleError zaten loglama yapar ve Error fırlatır, burada ek loglama veya UI işlemi yapılabilir.
            console.error(`Failed to remove product ${productId} from wishlist:`, err);
            // Kullanıcıya hata mesajı gösterilebilir (NotificationService ile)
        }
    });
    // ***** BİTİŞ: DÜZELTME *****
  }

  // Bir ürün wishlist'te mi kontrolü (Aynı kalabilir)
  isInWishlist(productId: number | string): Observable<boolean> {
    return this.wishlist$.pipe(
        map(wishlist => wishlist?.items.some(item => item.productId === productId) ?? false)
    );
  }

  // Wishlist observable'ını döndür (Aynı kalabilir)
  getWishlist(): Observable<Wishlist | null> {
    return this.wishlist$;
  }

  // --- Private Yardımcı Metotlar (Aynı kalabilir) ---

  private isLoggedInAndBrowser(): boolean {
      const isLoggedIn = !!this.authService.getToken();
      if (!isLoggedIn && isPlatformBrowser(this.platformId)) {
          console.warn('User not logged in. Wishlist operation cancelled.');
      }
      return isLoggedIn && isPlatformBrowser(this.platformId);
  }

  private _updateWishlistState(wishlist: Wishlist | null): void {
      // Gelen wishlist null değilse ve userId eksikse, mevcut kullanıcıdan ata
      if (wishlist && wishlist.userId === undefined) {
          wishlist.userId = this.authService.currentUserValue?.id ?? 0;
      }
      this.wishlistSubject.next(wishlist);
      console.log('Wishlist state updated:', wishlist);
  }

  // --- DTO -> Model Dönüşümü (Aynı kalabilir) ---
  private mapDtoWishlistToWishlist(dto: BackendDtoWishlist): Wishlist | null { // null dönebilir
      if (!dto) return null; // Gelen DTO null ise null dön
      const currentUserId = this.authService.currentUserValue?.id ?? 0; // Mevcut kullanıcı ID'si
      return {
          id: dto.wishlistId,
          userId: currentUserId, // userId'yi AuthService'den al
          items: dto.items?.map(itemDto => this.mapDtoWishlistItemToWishlistItem(itemDto)) || [] // items null ise boş dizi
      };
  }

  private mapDtoWishlistItemToWishlistItem(dto: BackendDtoWishlistItem): WishlistItem {
      return {
          // WishlistItem'da ID yok, backend DTO'sunda da yok
          productId: dto.product.productId,
          product: this.mapDtoSummaryToProductSummary(dto.product),
          // addedAt alanı DTO'da yok, modelden kaldırılabilir veya undefined bırakılabilir
      };
  }

  private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
    return {
        id: dto.productId,
        name: dto.name ?? 'İsimsiz Ürün',
        price: this.parsePrice(dto.price),
        imageUrl: dto.primaryImageUrl,
        averageRating: dto.averageRating,
        brand: dto.brand,
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

 // --- Genel Hata Yönetimi (Diğer servislerdeki gibi) ---
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir istek listesi hatası oluştu!';
    // ... (handleError içeriği önceki servislerden kopyalanabilir) ...
     if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (WishlistService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
      } else {
        console.error(`Backend Hatası ${error.status} (WishlistService), Gövde:`, error.error);
        const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);
        if (backendErrorMessage) {
            userMessage = backendErrorMessage;
        } else {
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz istek listesi isteği.'; break;
                 case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
                 case 403: userMessage = 'Bu işlem için yetkiniz yok (Müşteri olmalısınız).'; break;
                 case 404: userMessage = 'Ürün veya istek listesi bulunamadı.'; break;
                 case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}).`;
             }
        }
      }
    return throwError(() => new Error(userMessage));
  }

} // WishlistService sınıfının sonu
