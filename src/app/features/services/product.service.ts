// src/app/features/services/product.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, delay, catchError, tap, finalize } from 'rxjs/operators'; // finalize ekle
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment'; // <-- environment import et
import { Category } from '../../shared/models/category.model';
import { ProductSummary, Product } from '../../shared/models/product.model';

// Backend'den dönen Sayfa yapısı (varsa)
export interface BackendPageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // Current page number (0-based)
    size: number;
    // Diğer page metadata...
}

// Ürün filtreleri arayüzü
export interface ProductFilters {
  categoryId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  // ileride eklenebilir: brand, rating vb.
}

// --- Backend DTO Arayüzleri (Mevcutlar iyi görünüyor) ---
interface BackendDtoProductSummary { productId: number | string; name: string; price: any; primaryImageUrl?: string; averageRating?: number; brand?: string; model?: string; }
interface BackendDtoProduct { productId: number | string; name: string; description: string; price: any; stockQuantity: number; brand?: string; model?: string; dimensions?: string; weight?: string; color?: string; warranty?: string; keyFeatures?: string[]; specifications?: { [key: string]: string }; averageRating?: number; reviewCount?: number; categories?: BackendDtoCategory[]; images?: BackendDtoProductImage[]; variants?: BackendDtoVariant[]; attributes?: BackendDtoAttribute[]; seller?: BackendDtoUserSummary; isApproved?: boolean; approvedAt?: string | Date; createdAt?: string | Date; updatedAt?: string | Date; }
interface BackendDtoCategory { categoryId: number; name: string; description?: string; }
interface BackendDtoProductImage { imageId: number; imageUrl: string; isPrimary: boolean; altText?: string; }
interface BackendDtoVariant { variantId: number; sku?: string; priceAdjustment?: any; stockQuantity: number; attributes?: BackendDtoAttribute[]; }
interface BackendDtoAttribute { attributeId: number; name: string; value: string; unit?: string; attributeGroup?: string; }
interface BackendDtoUserSummary { userId: number; username?: string; firstName?: string; lastName?: string; }
// -----------------------------------------------------------

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly API_BASE_URL = environment.apiUrl;
  private readonly PRODUCT_API_URL = `${this.API_BASE_URL}/api/v1/products`;
  private readonly ADMIN_API_URL = `${this.API_BASE_URL}/api/v1/admin`;
  private readonly SELLER_API_URL = `${this.API_BASE_URL}/api/v1/seller`;
  private readonly CATEGORY_API_URL = `${this.API_BASE_URL}/api/v1/products/categories`;


  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }


  getCategories(): Observable<Category[]> {
    const url = this.CATEGORY_API_URL;
    console.log(`Workspaceing categories from: ${url}`);
    return this.http.get<BackendDtoCategory[]>(url).pipe(
        map(dtos => dtos.map(dto => this.mapDtoCategoryToCategory(dto))),
        catchError(err => {
            console.error("Error loading categories from backend:", err);
            // Hata mesajını içeren bir Error nesnesi fırlat
            return throwError(() => new Error('Kategoriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'));
        })
    );
}

  getProducts(limit: number = 20, offset: number = 0, filters: ProductFilters = {}): Observable<ProductSummary[]> {
    const page = Math.floor(offset / limit);
    const size = limit;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters.categoryId !== undefined && filters.categoryId !== null) {
         params = params.set('categoryId', filters.categoryId.toString());
    }
    if (filters.minPrice !== undefined && filters.minPrice !== null) {
        params = params.set('minPrice', filters.minPrice.toString());
    }
     if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
        params = params.set('maxPrice', filters.maxPrice.toString());
    }

    const url = this.PRODUCT_API_URL;
    console.log(`Workspaceing products from: ${url} with params:`, params.toString());

    return this.http.get<BackendPageResponse<BackendDtoProductSummary>>(url, { params }).pipe(
      map(pageResponse => pageResponse.content.map(dtoSummary => this.mapDtoSummaryToProductSummary(dtoSummary))),
      catchError(this.handleError)
    );
  }

  getProductById(productId: number | string): Observable<Product | undefined> {
    const url = `<span class="math-inline">\{this\.PRODUCT\_API\_URL\}/</span>{productId}`;
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

  searchProducts(searchTerm: string): Observable<ProductSummary[]> {
     const url = `${this.PRODUCT_API_URL}/search`;
     let params = new HttpParams().set('q', searchTerm);
     console.log(`Searching products from: ${url} with term: ${searchTerm}`);
     console.warn(`ProductService: searchProducts needs a working backend endpoint at ${url}`);
     return of([]); // Şimdilik boş
  }
  // --------------------------------------------------------------------------

  getAllProductsForAdmin(): Observable<Product[]> {
    const url = `${this.ADMIN_API_URL}/products`;
    console.log(`Workspaceing all products for admin from: ${url}`);
    return this.http.get<BackendPageResponse<BackendDtoProduct>>(url, { params: new HttpParams().set('size', '1000') })
        .pipe(
            map(page => page.content.map(dto => this.mapDtoProductToProduct(dto))),
            catchError(this.handleError)
        );
  }

  getProductsByCurrentSeller(): Observable<ProductSummary[]> {
      const currentUser = this.authService.currentUserValue;
      if (!currentUser?.id) {
          return throwError(() => new Error("Current user or user ID not found."));
      }
       if (currentUser.role !== 'SELLER') {
          return throwError(() => new Error("Current user is not a seller."));
      }
      const urlSummary = `${this.SELLER_API_URL}/products/my`;
      console.log(`Workspaceing product summaries for seller ${currentUser.id} from ${urlSummary}`);
      // Backend Page<DtoProductSummary> döndürdüğü için gelen veriyi ProductSummary[]'e map et
      return this.http.get<BackendPageResponse<BackendDtoProductSummary>>(urlSummary, { params: new HttpParams().set('size', '1000') }).pipe(
          map(page => page.content.map(dto => this.mapDtoSummaryToProductSummary(dto))), // <-- mapDtoSummaryToProductSummary KULLANILDI
          catchError(this.handleError)
      );
  }



  // --- addProduct, updateProduct, deleteProduct metotları (model güncellendiği için artık sorunsuz olmalı) ---
   addProduct(productData: Omit<Product, 'id' | 'category' | 'images' | 'attributes' | 'averageRating' | 'reviews' | 'sellerId' | 'imageUrl'> & { categoryId?: number }): Observable<Product> {
     const currentUser = this.authService.currentUserValue;
     if (!currentUser) return throwError(() => new Error("User not authenticated"));

     // Backend DTO'suna uygun payload oluştur
     let backendPayload: Partial<BackendDtoProduct> = {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        stockQuantity: productData.stockQuantity ?? 0,
        brand: productData.brand, // Artık hata vermemeli
        model: productData.model, // Artık hata vermemeli
        // Diğer alanlar... (dimensions, weight, color, warranty etc.)
         dimensions: productData.dimensions,
         weight: productData.weight,
         color: productData.color,
         warranty: productData.warranty,
         keyFeatures: productData.keyFeatures ? [...productData.keyFeatures] : undefined, // Set'i array'e çevir
         specifications: productData.specifications ? {...productData.specifications} : undefined, // Map'i kopyala
     };

     if (productData.categoryId !== undefined && productData.categoryId !== null) {
         backendPayload.categories = [{ categoryId: productData.categoryId, name: '' }];
     } else {
         backendPayload.categories = [];
     }

     let url: string;
     let params = new HttpParams();

     if (currentUser.role === 'ADMIN') {
        url = `${this.ADMIN_API_URL}/products`;
     } else if (currentUser.role === 'SELLER') {
        url = `${this.SELLER_API_URL}/products`;
     } else {
        return throwError(() => new Error("User does not have permission to add products."));
     }

     console.log(`Adding product to ${url}`);
     return this.http.post<BackendDtoProduct>(url, backendPayload, { params }).pipe(
        map(dto => this.mapDtoProductToProduct(dto)),
        catchError(this.handleError)
     );
  }

  updateProduct(productId: number | string, productData: Partial<Omit<Product, 'id' | 'category' | 'images' | 'attributes' | 'averageRating' | 'reviews' | 'sellerId' | 'imageUrl'>> & { categoryId?: number | null }): Observable<Product | undefined> {
      const currentUser = this.authService.currentUserValue;
      if (!currentUser) return throwError(() => new Error("User not authenticated"));

      // Backend DTO payload'ını hazırla
      let backendPayload: Partial<BackendDtoProduct> = { ...productData }; // Artık brand, model vb. içeriyor

      if (productData.categoryId !== undefined) {
         if (productData.categoryId === null) {
             backendPayload.categories = [];
         } else {
             backendPayload.categories = [{ categoryId: productData.categoryId, name: '' }];
         }
      }
      // categoryId alanını payload'dan silmeye gerek yok, Partial olduğu için sorun olmaz.

      let url: string;
      if (currentUser.role === 'ADMIN') {
         url = `<span class="math-inline">\{this\.ADMIN\_API\_URL\}/products/</span>{productId}`;
      } else if (currentUser.role === 'SELLER') {
         url = `<span class="math-inline">\{this\.SELLER\_API\_URL\}/products/</span>{productId}`;
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
        url = `<span class="math-inline">\{this\.ADMIN\_API\_URL\}/products/</span>{productId}`;
     } else if (currentUser.role === 'SELLER') {
        url = `<span class="math-inline">\{this\.SELLER\_API\_URL\}/products/</span>{productId}`;
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
// ------------------------------------------------------------------------------------------

// --- mapDtoSummaryToProductSummary, mapDtoProductToProduct, mapDtoCategoryToCategory, parsePrice, handleError metotları aynı ---
private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
    return {
        id: dto.productId,
        name: dto.name ?? 'İsimsiz Ürün', // name null ise varsayılan ata
        price: this.parsePrice(dto.price),
        imageUrl: dto.primaryImageUrl,
        averageRating: dto.averageRating,
        brand: dto.brand, // brand eklendi
        model: dto.model, // model eklendi
        // categoryId: dto.categoryId // DTO'da varsa ekle
    };
}

private mapDtoProductToProduct(dto: BackendDtoProduct): Product {
    const firstCategoryDto = dto.categories && dto.categories.length > 0 ? dto.categories[0] : undefined;
    const primaryImage = dto.images?.find(img => img.isPrimary) || dto.images?.[0];

    const product: Product = {
        id: dto.productId,
        name: dto.name ?? 'İsimsiz Ürün',
        description: dto.description ?? '', // description null ise boş string ata
        price: this.parsePrice(dto.price),
        stockQuantity: dto.stockQuantity ?? 0,
        brand: dto.brand,
        model: dto.model,
        dimensions: dto.dimensions,
        weight: dto.weight,
        color: dto.color,
        warranty: dto.warranty,
        keyFeatures: dto.keyFeatures ? [...dto.keyFeatures] : undefined,
        specifications: dto.specifications ? {...dto.specifications} : undefined,
        reviewCount: dto.reviewCount,
        isApproved: dto.isApproved,
        approvedAt: dto.approvedAt,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
        category: firstCategoryDto ? this.mapDtoCategoryToCategory(firstCategoryDto) : undefined,
        images: dto.images?.map(imgDto => ({
            id: imgDto.imageId,
            imageUrl: imgDto.imageUrl,
            altText: imgDto.altText,
            isDefault: imgDto.isPrimary
        })) ?? [],
        attributes: dto.attributes?.map(attrDto => ({
            id: attrDto.attributeId,
            name: attrDto.name,
            value: attrDto.value,
            unit: attrDto.unit, // unit ve attributeGroup eklendi (varsa)
            attributeGroup: attrDto.attributeGroup
        })) ?? [],
        averageRating: dto.averageRating,
        reviews: [],
        imageUrl: primaryImage?.imageUrl,
        sellerId: dto.seller?.userId // sellerId eklendi
        // variants map logic here if needed
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
      // Handle potential locale differences (e.g., comma as decimal separator)
      const normalizedPrice = price.replace(',', '.');
      const parsed = parseFloat(normalizedPrice);
      return isNaN(parsed) ? 0 : parsed;
  }
   if (price && typeof price.toNumber === 'function') {
     return price.toNumber();
   }
  console.warn("Could not parse price:", price);
  return 0;
}

private handleError(error: HttpErrorResponse): Observable<never> {
  let userMessage = 'Bilinmeyen bir ürün işlemi hatası oluştu!';
  // ... (handleError içeriği öncekiyle aynı kalabilir) ...
   if (error.status === 0 || !error.error) {
    console.error('Ağ/İstemci hatası (ProductService):', error.message || error);
    userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
  } else {
    console.error(`Backend Hatası ${error.status} (ProductService), Gövde:`, error.error);
    const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);
    if (backendErrorMessage) {
        userMessage = backendErrorMessage;
    } else {
         switch (error.status) {
             case 400: userMessage = 'Geçersiz ürün isteği.'; break;
             case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
             case 403: userMessage = 'Bu ürün işlemi için yetkiniz yok.'; break;
             case 404: userMessage = 'Ürün veya ilgili kaynak bulunamadı.'; break;
             case 409: userMessage = 'İşlem çakışması (örn: stok yetersiz).'; break;
             case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
             default: userMessage = `Sunucu hatası (${error.status}).`;
         }
    }
  }
  return throwError(() => new Error(userMessage));
}
}
