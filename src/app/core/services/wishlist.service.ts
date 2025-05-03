// src/app/core/services/wishlist.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // HttpParams eklendi (kullanılmasa da)
import { BehaviorSubject, Observable, of, throwError, EMPTY } from 'rxjs';
import { map, catchError, tap, switchMap, finalize } from 'rxjs/operators';
import { Product, ProductSummary } from '../../shared/models/product.model';
import { Wishlist, WishlistItem } from '../../shared/models/wishlist.model'; // Frontend modelleri
import { AuthService } from './auth.service';

// --- Backend DTO Arayüzleri ---
interface BackendDtoProductSummary {
    productId: number | string;
    name: string;
    price: any;
    primaryImageUrl?: string;
    averageRating?: number;
    brand?: string;
    model?: string;
}
interface BackendDtoWishlistItem {
    product: BackendDtoProductSummary;
    // dateAdded?: string | Date;
}
interface BackendDtoWishlist {
    wishlistId?: number;
    items: BackendDtoWishlistItem[];
}
// ----------------------------

const WISHLIST_API_URL = 'http://localhost:8080/api/wishlist'; // API URL

@Injectable({
  providedIn: 'root'
})
export class WishlistService {

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
    this.authService.isLoggedIn$.pipe(
        switchMap(isLoggedIn => {
            if (isLoggedIn && isPlatformBrowser(this.platformId)) {
                return this.fetchWishlistFromServer();
            } else {
                this._updateWishlistState(null);
                return of(null);
            }
        })
    ).subscribe();
  }

  private fetchWishlistFromServer(): Observable<Wishlist | null> {
    if (!this.isLoggedInAndBrowser()) { return of(null); }

    this.isLoading.next(true);
    console.log('Fetching wishlist from server...');
    return this.http.get<BackendDtoWishlist>(WISHLIST_API_URL).pipe(
        map(dtoWishlist => this.mapDtoWishlistToWishlist(dtoWishlist)),
        tap(wishlist => console.log('Wishlist fetched:', wishlist)),
        catchError(err => {
            console.error('Error fetching wishlist:', err);
            this._updateWishlistState(null);
            return throwError(() => new Error('İstek listesi yüklenirken bir hata oluştu.'));
        }),
        finalize(() => this.isLoading.next(false))
    ).pipe(
        tap(wishlist => this._updateWishlistState(wishlist))
    );
  }

  addToWishlist(product: Product | ProductSummary): void {
    if (!this.isLoggedInAndBrowser() || !product) return;

    this.isLoading.next(true);
    const productId = product.id;
    console.log(`Adding product ${productId} to wishlist`);

    this.http.post<BackendDtoWishlist>(`<span class="math-inline">\{WISHLIST\_API\_URL\}/products/</span>{productId}`, {}).pipe(
        map(dtoWishlist => this.mapDtoWishlistToWishlist(dtoWishlist)),
        catchError(this.handleError),
        finalize(() => this.isLoading.next(false))
    ).subscribe(wishlist => {
        if (wishlist) {
            this._updateWishlistState(wishlist);
            alert(`${product.name} istek listenize eklendi!`);
        }
    });
  }

  removeFromWishlist(productId: number | string): void {
    if (!this.isLoggedInAndBrowser()) return;

    this.isLoading.next(true);
    console.log(`Removing product ${productId} from wishlist`);

    // *** DÜZELTME: <void> generic tipini kullan ***
    this.http.delete<void>(`<span class="math-inline">\{WISHLIST\_API\_URL\}/products/</span>{productId}`,
     //  { responseType: 'void' }
      ).pipe(
      catchError(this.handleError),
      finalize(() => this.isLoading.next(false))
  ).subscribe(() => {
      console.log(`Product ${productId} removed successfully.`);
      this.fetchWishlistFromServer().subscribe({
          error: (err) => console.error("Error refetching wishlist after remove:", err)
      });
  });
  }

  isInWishlist(productId: number | string): Observable<boolean> {
    return this.wishlist$.pipe(
        map(wishlist => wishlist?.items.some(item => item.productId === productId) ?? false)
    );
  }

  getWishlist(): Observable<Wishlist | null> {
    return this.wishlist$;
  }

  // --- Private Yardımcı Metotlar ---

  private isLoggedInAndBrowser(): boolean {
      const isLoggedIn = !!this.authService.getToken();
      if (!isLoggedIn && isPlatformBrowser(this.platformId)) {
          console.warn('User not logged in. Wishlist operation cancelled.');
      }
      return isLoggedIn && isPlatformBrowser(this.platformId);
  }

  private _updateWishlistState(wishlist: Wishlist | null): void {
      if (wishlist && wishlist.userId === undefined) {
          wishlist.userId = this.authService.currentUserValue?.id ?? 0;
      }
      this.wishlistSubject.next(wishlist);
      console.log('Wishlist state updated:', wishlist);
  }

  // --- DTO -> Model Dönüşümü ---
  private mapDtoWishlistToWishlist(dto: BackendDtoWishlist): Wishlist {
      const currentUserId = this.authService.currentUserValue?.id ?? 0;
      return {
          id: dto.wishlistId,
          userId: currentUserId,
          items: dto.items?.map(itemDto => this.mapDtoWishlistItemToWishlistItem(itemDto)) || []
      };
  }

  private mapDtoWishlistItemToWishlistItem(dto: BackendDtoWishlistItem): WishlistItem {
      return {
          productId: dto.product.productId,
          product: this.mapDtoSummaryToProductSummary(dto.product),
      };
  }

  private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
    return {
        id: dto.productId,
        name: dto.name,
        price: this.parsePrice(dto.price),
        imageUrl: dto.primaryImageUrl,
        averageRating: dto.averageRating,
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

 // Genel hata yönetimi
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
} // WishlistService sınıfının sonu
