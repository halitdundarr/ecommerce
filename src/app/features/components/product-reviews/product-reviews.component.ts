import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators'; // Gerekirse import et
import { ReviewService } from '../../services/review.service';
import { Review } from '../../../shared/models/product.model';
import { AuthService } from '../../../core/services/auth.service'; // AuthService import et

@Component({
  selector: 'app-product-reviews',
  templateUrl: './product-reviews.component.html',
  styleUrls: ['./product-reviews.component.scss'],
  standalone: false // Modül içinde tanımlı olduğu için false kalmalı
})
export class ProductReviewsComponent implements OnInit, OnChanges {
  @Input() productId: number | string | null = null;

  reviews$: Observable<Review[]> = of([]);
  isLoading = false;
  errorMessage: string | null = null;

  showReviewForm = false; // Formun görünürlüğünü kontrol eder

  // AuthService'i inject et
  constructor(
    private reviewService: ReviewService,
    public authService: AuthService // public yaparsak template'ten direkt erişilebilir
  ) {}

  ngOnInit(): void {
    // İlk yüklemede productId varsa yorumları çek
    // OnChanges zaten çağrılacak, bu yüzden burada tekrar çağırmaya gerek yok.
  }

  // Input property'si (productId) değiştiğinde tetiklenir
  ngOnChanges(changes: SimpleChanges): void {
    // productId değiştiyse ve null/undefined değilse yorumları yükle
    if (changes['productId'] && this.productId !== null && this.productId !== undefined) {
      this.loadReviews();
      this.showReviewForm = false; // Ürün değiştiğinde formu kapat
    }
  }

  // Yorumları yükleyen metot
  loadReviews(): void {
    if (!this.productId) {
      this.reviews$ = of([]); // ID yoksa boş observable ata
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.reviews$ = this.reviewService.getReviewsByProductId(this.productId).pipe(
      tap(() => {
        // Veri başarıyla geldiğinde yapılacak işlemler (opsiyonel)
        // Yüklenme durumunu subscribe içinde yönetmek daha iyi olabilir
      }),
      catchError(err => {
        console.error('Error fetching reviews:', err);
        this.errorMessage = 'Yorumlar yüklenirken bir hata oluştu.';
        return of([]); // Hata durumunda boş liste döndür
      }),
      // finalize operatörü de kullanılabilir:
      // finalize(() => this.isLoading = false)
    );

    // Yüklenme durumunu ve hatayı subscribe içinde yönetmek daha güvenli
    this.reviews$.subscribe({
        // next: (data) => { console.log('Reviews loaded:', data); }, // Gerekirse veriyi logla
        error: (err) => { /* catchError zaten logluyor ve mesajı ayarlıyor */ },
        complete: () => { this.isLoading = false; } // Observable tamamlandığında yüklenmeyi bitir
    });
  }

  // Yorum ekleme formunu aç/kapat
  toggleReviewForm(): void {
    // Kullanıcı giriş yapmamışsa formu açma (ekstra kontrol)
    if (!this.authService.currentUserValue) {
      // İsteğe bağlı: Kullanıcıyı login sayfasına yönlendir
      // this.router.navigate(['/auth/login']);
      alert("Yorum yapmak için giriş yapmalısınız.");
      return;
    }
    this.showReviewForm = !this.showReviewForm;
  }

  // Alt component'ten (add-review-form) yorum gönderildi eventi geldiğinde
  onReviewSubmitted(): void {
    this.showReviewForm = false; // Formu kapat
    this.loadReviews(); // Yorum listesini yenile
  }
}
