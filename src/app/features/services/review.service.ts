// src/app/features/services/review.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators'; // map eklendi
import { environment } from '../../../environments/environment'; // <-- environment import et
import { Review } from '../../shared/models/product.model';

// --- Backend DTO Arayüzleri ---
// Backend'deki DtoUserSummary'ye karşılık gelir (gerekirse UserService'ten kopyalanabilir)
interface BackendDtoUserSummary {
    userId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
}
// Backend'deki DtoReview'a karşılık gelir
interface BackendDtoReview {
    reviewId: number;
    rating: number;
    comment: string;
    createdAt: string | Date; // Backend Date veya ISO String döndürebilir
    customer: BackendDtoUserSummary; // Gömülü kullanıcı özeti
    productId: number | string;
}
// -----------------------------

@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  // --- API URL'si environment'dan alınacak ---
  private readonly API_BASE_URL = environment.apiUrl; // <-- environment kullan

  constructor(private http: HttpClient) { }

  // Belirli bir ürün ID'sine göre yorumları getir
  getReviewsByProductId(productId: number | string): Observable<Review[]> {
    const url = `${this.API_BASE_URL}/api/v1/products/${productId}/reviews`; // Dinamik URL
    console.log(`Workspaceing reviews from: ${url}`);

    // Backend'den BackendDtoReview[] bekle
    return this.http.get<BackendDtoReview[]>(url).pipe(
      map(dtoReviews => dtoReviews.map(dto => this.mapDtoReviewToReview(dto))), // Map et
      tap(reviews => console.log(`Workspaceed ${reviews?.length ?? 0} reviews for product ${productId}`)), // reviews null olabilir kontrolü
      catchError(this.handleError)
    );
  }

  // Yeni yorum ekleme metodu
  addReview(productId: number | string, reviewData: { rating: number; comment?: string }): Observable<Review> {
    const url = `${this.API_BASE_URL}/api/v1/products/${productId}/reviews`; // Dinamik URL
    console.log(`Adding review to: ${url}`);

    // Backend sadece rating ve comment bekliyor
    const payload = {
      rating: reviewData.rating,
      comment: reviewData.comment
    };

    // Backend'den kaydedilen BackendDtoReview nesnesini bekle
    return this.http.post<BackendDtoReview>(url, payload).pipe(
      map(savedDto => this.mapDtoReviewToReview(savedDto)), // Yanıtı map et
      tap(savedReview => console.log('Review saved:', savedReview)),
      catchError(this.handleError)
    );
  }

  // --- DTO -> Model Dönüşüm Yardımcısı ---
  private mapDtoReviewToReview(dto: BackendDtoReview): Review {
    if (!dto) {
        // Hata durumunu veya boş bir Review nesnesini nasıl ele alacağınıza karar verin
        // Örneğin, null dönebilir veya boş bir nesne:
        console.warn("Received null DTO in mapDtoReviewToReview");
        // Veya varsayılan değerlerle boş bir Review döndür:
        return { id: 0, rating: 0, userName: 'Bilinmiyor', userId: 0, productId: 0, createdAt: new Date(), comment: '' };
    }

    // userName'i oluştur
    const userName = dto.customer ? `${dto.customer.firstName || ''} ${dto.customer.lastName || ''}`.trim() || dto.customer.username || 'Gizli Kullanıcı' : 'Bilinmiyor';

    return {
      id: dto.reviewId,
      rating: dto.rating,
      comment: dto.comment,
      // Backend'den gelen tarih string ise Date nesnesine çevir
      createdAt: typeof dto.createdAt === 'string' ? new Date(dto.createdAt) : dto.createdAt,
      userName: userName,
      userId: dto.customer?.userId ?? 0, // Customer null ise ID 0 ata
      productId: dto.productId
    };
  }

  // --- Genel Hata Yönetimi Metodu ---
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir yorum işlemi hatası oluştu!';
    // ... (Diğer servislerdeki handleError mantığı buraya kopyalanabilir) ...
     if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (ReviewService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
      } else {
        console.error(`Backend Hatası ${error.status} (ReviewService), Gövde:`, error.error);
        const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);
        if (backendErrorMessage) {
            // Backend'den gelen "Customer 1 has already reviewed product 1." gibi mesajları kullan
            userMessage = backendErrorMessage;
        } else {
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz yorum isteği (örn: eksik puan).'; break;
                 case 401: userMessage = 'Yorum yapmak/görmek için giriş yapmalısınız.'; break;
                 case 403: userMessage = 'Bu işlem için yetkiniz yok (Müşteri olmalısınız).'; break;
                 case 404: userMessage = 'Ürün veya yorum bulunamadı.'; break;
                 case 409: userMessage = 'Bu ürüne zaten yorum yapmışsınız.'; break; // Duplicate review
                 case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}).`;
             }
        }
      }
    return throwError(() => new Error(userMessage));
  }
}
