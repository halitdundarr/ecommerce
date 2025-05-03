// src/app/features/services/product.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, delay, catchError, tap } from 'rxjs/operators';
import { Product, ProductSummary, ProductImage, ProductAttribute, Review } from '../../shared/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { Category } from '../../shared/models/category.model';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export interface ProductFilters {
  categoryId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}

// Backend DTO arayüzleri (öncekiyle aynı)
interface BackendPageResponse<T> { /* ... */ content: T[]; totalElements: number; totalPages: number; number: number; size: number;}
interface BackendDtoProductSummary { /* ... */ productId: number | string; name: string; price: any; primaryImageUrl?: string; averageRating?: number; brand?: string; model?: string; }
interface BackendDtoProduct { /* ... */ productId: number | string; name: string; description: string; price: any; stockQuantity: number; brand?: string; model?: string; dimensions?: string; weight?: string; color?: string; warranty?: string; keyFeatures?: string[]; specifications?: { [key: string]: string }; averageRating?: number; reviewCount?: number; categories?: BackendDtoCategory[]; images?: BackendDtoProductImage[]; variants?: BackendDtoVariant[]; attributes?: BackendDtoAttribute[]; seller?: BackendDtoUserSummary; }
interface BackendDtoCategory { /* ... */ categoryId: number; name: string; description?: string; }
interface BackendDtoProductImage { /* ... */ imageId: number; imageUrl: string; isPrimary: boolean; altText?: string; }
interface BackendDtoVariant { /* ... */ variantId: number; sku?: string; priceAdjustment?: any; stockQuantity: number; attributes?: BackendDtoAttribute[]; }
interface BackendDtoAttribute { /* ... */ attributeId: number; name: string; value: string; unit?: string; attributeGroup?: string; }
interface BackendDtoUserSummary { /* ... */ userId: number; username?: string; firstName?: string; lastName?: string; }


@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private mockCategories: Category[] = [
    { id: 1, name: 'Elektronik' }, { id: 2, name: 'Moda' }, { id: 3, name: 'Ev & Yaşam' }, { id: 4, name: 'Kitap & Hobi' }, { id: 5, name: 'Süpermarket' }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // --- Kategori Metodu (Şimdilik Mock) ---
  getCategories(): Observable<Category[]> {
    console.warn('ProductService: Using MOCK category data! Backend endpoint needed.');
    return of(this.mockCategories).pipe(delay(100));
    // TODO: Gerçek backend çağrısı
    // return this.http.get<BackendDtoCategory[]>(`${API_BASE_URL}/categories`).pipe(
    //      map(dtos => dtos.map(dto => this.mapDtoCategoryToCategory(dto))),
    //      catchError(this.handleError)
    // );
  }

  // --- Ürün Listesi (Backend Bağlantılı) ---
  getProducts(
    limit: number = 20,
    offset: number = 0,
    filters: ProductFilters = {}
  ): Observable<ProductSummary[]> {
    const page = Math.floor(offset / limit);
    const size = limit;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // TODO: Backend filtreleri desteklediğinde parametreleri ekle
    // if (filters.categoryId) params = params.set('categoryId', filters.categoryId.toString());
    // if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
    // ...

    const url = `${API_BASE_URL}/products`;
    console.log(`Workspaceing products from: ${url} with params:`, params.toString());

    return this.http.get<BackendPageResponse<BackendDtoProductSummary>>(url, { params }).pipe(
      map(pageResponse => pageResponse.content.map(dtoSummary => this.mapDtoSummaryToProductSummary(dtoSummary))),
      catchError(this.handleError)
    );
  }

  // --- Ürün Detayı (Backend Bağlantılı) ---
  getProductById(productId: number | string): Observable<Product | undefined> {
    const url = `${API_BASE_URL}/products/${productId}`;
    console.log(`Workspaceing product detail from: ${url}`);

    return this.http.get<BackendDtoProduct>(url).pipe(
      map(dtoProduct => this.mapDtoProductToProduct(dtoProduct)),
      catchError(err => {
          if (err.status === 404) {
              console.warn(`Product not found on backend: ${productId}`);
              return of(undefined);
          }
          return this.handleError(err);
      })
    );
  }

  // --- Arama Metodu (Backend Bağlantılı - Backend endpoint hazır olmalı) ---
   searchProducts(searchTerm: string): Observable<ProductSummary[]> {
     const url = `${API_BASE_URL}/products/search`;
     let params = new HttpParams().set('q', searchTerm);
     console.warn(`ProductService: searchProducts needs a working backend endpoint at ${url}`);
     // Gerçek implementasyon backend hazır olunca yapılacak
     return this.http.get<BackendPageResponse<BackendDtoProductSummary>>(url, { params }).pipe(
          map(pageResponse => pageResponse.content.map(dto => this.mapDtoSummaryToProductSummary(dto))),
          catchError(this.handleError)
     );
   }


  // --- Admin/Seller CRUD Metotları (Backend Bağlantılı) ---

  getAllProductsForAdmin(): Observable<Product[]> {
    const url = `${API_BASE_URL}/admin/products`;
    console.warn("ProductService: Assuming admin endpoint exists at " + url);
    return this.http.get<BackendPageResponse<BackendDtoProduct>>(url, { params: new HttpParams().set('size', '1000') })
        .pipe(
            map(page => page.content.map(dto => this.mapDtoProductToProduct(dto))),
            catchError(this.handleError)
        );
  }

  getProductsByCurrentSeller(): Observable<Product[]> {
      const currentUser = this.authService.currentUserValue;
      if (currentUser?.role !== 'SELLER') {
          return throwError(() => new Error("Current user is not a seller."));
      }
      const url = `${API_BASE_URL}/seller/products/my`;
      console.log(`Workspaceing products for seller ${currentUser.id} from ${url}`);
      return this.http.get<BackendPageResponse<BackendDtoProduct>>(url, { params: new HttpParams().set('size', '1000') }).pipe(
          map(page => page.content.map(dto => this.mapDtoProductToProduct(dto))),
          catchError(this.handleError)
      );
  }

  addProduct(productData: Omit<Product, 'id' | 'category' | 'images' | 'attributes' | 'averageRating' | 'reviews' | 'sellerId'> & { categoryId?: number }): Observable<Product> {
     const currentUser = this.authService.currentUserValue;
     if (!currentUser) return throwError(() => new Error("User not authenticated"));

     // Backend DTO'suna uygun payload oluştur
     let backendPayload: Partial<BackendDtoProduct> = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        stockQuantity: productData.stockQuantity,
        // BackendDtoProduct'ın diğer alanları (brand, model vb.) productData'dan alınabilir
     };

     // === DÜZELTME BAŞLANGICI (Hata 1) ===
     // categoryId varsa, categories dizisini oluştur
     if (productData.categoryId !== undefined && productData.categoryId !== null) {
         backendPayload.categories = [{ categoryId: productData.categoryId, name: '' }]; // name backend'de bulunabilir
     }
     // === DÜZELTME SONU ===

     let url: string;
     let params = new HttpParams();

     if (currentUser.role === 'ADMIN') {
        url = `${API_BASE_URL}/admin/products`;
        // TODO: Admin eklerken Seller ID belirtme mantığı
        // params = params.set('sellerId', '...');
     } else if (currentUser.role === 'SELLER') {
        url = `${API_BASE_URL}/seller/products`;
     } else {
        return throwError(() => new Error("User does not have permission to add products."));
     }

     console.log(`Adding product to ${url}`);
     return this.http.post<BackendDtoProduct>(url, backendPayload, { params }).pipe(
        map(dto => this.mapDtoProductToProduct(dto)),
        catchError(this.handleError)
     );
  }

  updateProduct(productId: number | string, productData: Partial<Omit<Product, 'id' | 'category' | 'images' | 'attributes' | 'averageRating' | 'reviews'>> & { categoryId?: number }): Observable<Product | undefined> {
      const currentUser = this.authService.currentUserValue;
      if (!currentUser) return throwError(() => new Error("User not authenticated"));

      let backendPayload: Partial<BackendDtoProduct> = { ...productData };

      // === DÜZELTME BAŞLANGICI (Hata 1) ===
      // categoryId varsa, categories dizisini güncelle veya ayarla
      if (productData.categoryId !== undefined) {
         if (productData.categoryId === null) {
             backendPayload.categories = []; // Kategori kaldırılıyorsa boş dizi
         } else {
             backendPayload.categories = [{ categoryId: productData.categoryId, name: '' }];
         }
      }
      // frontend productData'dan categoryId'yi siliyoruz, çünkü backend DTO'sunda yok
      //delete backendPayload.categoryId;
      // === DÜZELTME SONU ===


      let url: string;
      if (currentUser.role === 'ADMIN') {
         url = `${API_BASE_URL}/admin/products/${productId}`;
      } else if (currentUser.role === 'SELLER') {
         url = `${API_BASE_URL}/seller/products/${productId}`;
      } else {
         return throwError(() => new Error("User does not have permission to update products."));
      }

      console.log(`Updating product ${productId} at ${url}`);
      return this.http.put<BackendDtoProduct>(url, backendPayload).pipe(
         map(dto => this.mapDtoProductToProduct(dto)),
         catchError(this.handleError)
      );
  }

 deleteProduct(productId: number | string): Observable<{ success: boolean }> {
     const currentUser = this.authService.currentUserValue;
     if (!currentUser) return throwError(() => new Error("User not authenticated"));

     let url: string;
     if (currentUser.role === 'ADMIN') {
        url = `${API_BASE_URL}/admin/products/${productId}`;
     } else if (currentUser.role === 'SELLER') {
        url = `${API_BASE_URL}/seller/products/${productId}`;
     } else {
        return throwError(() => new Error("User does not have permission to delete products."));
     }

     console.log(`Deleting product ${productId} at ${url}`);
     return this.http.delete<void>(url).pipe(
        map(() => ({ success: true })),
        catchError(err => {
            this.handleError(err);
            return of({ success: false });
        })
     );
  }


  // --- DTO <-> Model Dönüşüm Metotları ---

  private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
      return {
          id: dto.productId,
          name: dto.name,
          price: this.parsePrice(dto.price),
          imageUrl: dto.primaryImageUrl,
          averageRating: dto.averageRating,
      };
  }

  private mapDtoProductToProduct(dto: BackendDtoProduct): Product {
      // === DÜZELTME BAŞLANGICI (Hata 2 & 3) ===
      // categories undefined olabilir, kontrol ekle
      const firstCategoryDto = dto.categories && dto.categories.length > 0 ? dto.categories[0] : undefined;
      // === DÜZELTME SONU ===

      const product: Product = {
          id: dto.productId,
          name: dto.name,
          description: dto.description,
          price: this.parsePrice(dto.price),
          stockQuantity: dto.stockQuantity,
          category: firstCategoryDto ? this.mapDtoCategoryToCategory(firstCategoryDto) : undefined, // undefined kontrolü eklendi
          images: dto.images?.map(imgDto => ({ // images undefined olabilir, ?. ile kontrol
              id: imgDto.imageId,
              imageUrl: imgDto.imageUrl,
              altText: imgDto.altText,
              isDefault: imgDto.isPrimary
          })) || [], // images undefined ise boş dizi ata
          attributes: dto.attributes?.map(attrDto => ({ // attributes undefined olabilir
              id: attrDto.attributeId,
              name: attrDto.name,
              value: attrDto.value
          })) || [], // attributes undefined ise boş dizi ata
          averageRating: dto.averageRating,
          imageUrl: dto.images?.find(img => img.isPrimary)?.imageUrl || dto.images?.[0]?.imageUrl
      };
      return product;
  }

  private mapDtoCategoryToCategory(dto: BackendDtoCategory): Category {
      return {
          id: dto.categoryId,
          name: dto.name,
          description: dto.description
      };
  }

  private parsePrice(price: any): number {
      if (typeof price === 'number') {
          return price;
      }
      if (typeof price === 'string') {
          const parsed = parseFloat(price);
          return isNaN(parsed) ? 0 : parsed;
      }
      if (price && typeof price === 'object' && price.constructor && price.constructor.name === 'BigDecimal') {
         // Eğer backend direkt BigDecimal nesnesi gönderiyorsa (JSON'da pek olası değil ama...)
         // .doubleValue() veya benzeri bir metot varsa kullanılabilir. Genellikle string veya number gelir.
         console.warn("Received potential BigDecimal object, attempting conversion. Check backend JSON serialization.", price);
         try { return parseFloat(price.toString()); } catch (e) { return 0; }
      }
       if (price && typeof price.toNumber === 'function') { // Bazı kütüphaneler number'a çevirme metodu ekleyebilir
         return price.toNumber();
      }
      return 0;
  }

  // --- Genel Hata Yönetimi ---
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

} // ProductService sınıfının sonu
