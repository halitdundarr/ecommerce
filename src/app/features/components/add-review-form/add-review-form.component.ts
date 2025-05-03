import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { ReviewService } from '../../services/review.service'; // Entegrasyon sırasında eklenecek
// import { AuthService } from '../../../core/services/auth.service'; // Gerekirse kullanıcı bilgisi için

@Component({
  selector: 'app-add-review-form',
  templateUrl: './add-review-form.component.html',
  styleUrls: ['./add-review-form.component.scss'],
  standalone: false // Modüle eklendiği için false kalmalı
})
export class AddReviewFormComponent implements OnInit {
  @Input() productId!: number | string; // Ürün ID'si dışarıdan alınacak
  @Output() reviewSubmitted = new EventEmitter<void>(); // Yorum gönderildiğinde event fırlatmak için (opsiyonel)

  reviewForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  ratingOptions: number[] = [1, 2, 3, 4, 5]; // Puan seçenekleri

  constructor(
    private fb: FormBuilder,
    // private reviewService: ReviewService, // Entegrasyon sırasında eklenecek
    // private authService: AuthService // Gerekirse
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.reviewForm = this.fb.group({
      rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10)]] // Yorumu zorunlu ve min 10 karakter yapalım
    });
  }

  // Puan seçimi için yardımcı metot (template'te kullanılacak)
  selectRating(rating: number): void {
    this.reviewForm.patchValue({ rating: rating });
    // Seçili puanı görsel olarak belirtmek için CSS sınıfı ekleyebilirsiniz.
  }

  onSubmit(): void {
    if (this.reviewForm.invalid || this.isLoading) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const reviewData = {
      productId: this.productId,
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment,
      // userId: this.authService.currentUserValue?.id // Gerekirse kullanıcı ID'si eklenecek
    };

    console.log('Gönderilecek Yorum Verisi (Placeholder):', reviewData);

    // --- GERÇEK API ÇAĞRISI (Entegrasyon sırasında eklenecek) ---
    /*
    this.reviewService.addReview(this.productId, reviewData).subscribe({
      next: (savedReview) => {
        this.isLoading = false;
        alert('Yorumunuz başarıyla gönderildi!');
        this.reviewForm.reset();
        this.reviewSubmitted.emit(); // Yorum listesini yenilemek için event fırlat
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Yorum gönderilirken bir hata oluştu.';
        console.error('Error submitting review:', err);
      }
    });
    */

    // --- Mock İşlem (Şimdilik) ---
    setTimeout(() => {
      this.isLoading = false;
      alert('Yorumunuz başarıyla gönderildi! (Mock)');
      this.reviewForm.reset();
      this.reviewSubmitted.emit(); // Yorum listesini yenilemek için event fırlat
    }, 1000); // 1 saniye bekleme simülasyonu
    // ---------------------------
  }

  // Kolay erişim için getter'lar
  get rating() { return this.reviewForm.get('rating'); }
  get comment() { return this.reviewForm.get('comment'); }
}
