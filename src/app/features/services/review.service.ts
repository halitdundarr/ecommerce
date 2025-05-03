import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Review } from '../../shared/models/product.model'; // Review modelini import et

const API_BASE_URL = 'http://localhost:8080/api'; // Backend adresiniz

@Injectable({
  providedIn: 'root' // Global olarak sağlayalım
})
export class ReviewService {

  constructor(private http: HttpClient) { }

  // Belirli bir ürün ID'sine göre yorumları getir
  getReviewsByProductId(productId: number | string): Observable<Review[]> {
    // GERÇEK API İSTEĞİ (Backend hazır olduğunda):
    // return this.http.get<Review[]>(`<span class="math-inline">\{API\_BASE\_URL\}/products/</span>{productId}/reviews`);
    // VEYA
    // return this.http.get<Review[]>(`<span class="math-inline">\{API\_BASE\_URL\}/reviews?productId\=</span>{productId}`);

    // ŞİMDİLİK MOCK DATA:
    console.warn(`ReviewService: Using MOCK reviews for product ID: ${productId}!`);
    const mockReviews: Review[] = [
      { id: 101, rating: 5, comment: 'Harika bir ürün, çok memnun kaldım!', userName: 'Ayşe K.', userId: 3, productId: productId, createdAt: new Date('2025-04-28T10:30:00Z') },
      { id: 102, rating: 4, comment: 'Fiyatına göre iyi ama biraz daha kaliteli olabilirdi.', userName: 'Mehmet B.', userId: 4, productId: productId, createdAt: new Date('2025-04-29T14:00:00Z') },
      { id: 103, rating: 3, comment: 'İdare eder, beklentimi tam karşılamadı.', userName: 'Fatma S.', userId: 5, productId: productId, createdAt: new Date('2025-04-30T09:15:00Z') },
      // productId'ye göre farklı yorumlar döndürebilirsiniz (test için)
      ...(productId === '2' ? [{ id: 104, rating: 5, comment: 'Telefon harika!', userName: 'Ali V.', userId: 6, productId: productId, createdAt: new Date() }] : [])
    ];
    // Sadece ilgili ürüne ait olanları (gerçekte backend yapar)
    const filteredReviews = mockReviews.filter(r => r.productId == productId); // String ve number karşılaştırması için ==
    return of(filteredReviews);
  }


  // Yeni yorum ekleme metodu (ileride eklenecek)
  // addReview(productId: number | string, reviewData: { rating: number; comment?: string }): Observable<Review> { ... }
}
