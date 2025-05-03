import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReviewService } from '../../services/review.service'; // ReviewService import et
// import { AuthService } from '../../../core/services/auth.service'; // Gerekirse
import { NotificationService } from '../../../core/services/notification.service'; // Bildirim için

@Component({
  selector: 'app-add-review-form',
  templateUrl: './add-review-form.component.html',
  styleUrls: ['./add-review-form.component.scss'],
  standalone: false // Modüle eklendiği için false kalmalı
})
export class AddReviewFormComponent implements OnInit {
  @Input() productId!: number | string; // Ürün ID'si dışarıdan alınacak
  @Output() reviewSubmitted = new EventEmitter<void>(); // Yorum gönderildiğinde event fırlatmak için

  reviewForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null; // Hata mesajını tutar (string veya null)
  ratingOptions: number[] = [1, 2, 3, 4, 5]; // Puan seçenekleri

  constructor(
    private fb: FormBuilder,
    private reviewService: ReviewService, // Inject et
    private notificationService: NotificationService // Inject et
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
  }

  onSubmit(): void {
    if (this.reviewForm.invalid || this.isLoading) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null; // Önceki hatayı temizle

    const reviewData = { // Sadece rating ve comment gönderiyoruz
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment,
    };

    console.log('Gönderilecek Yorum Verisi:', reviewData);

    // --- GERÇEK API ÇAĞRISI ---
    this.reviewService.addReview(this.productId, reviewData).subscribe({
      next: (savedReview) => {
        this.isLoading = false;
        this.notificationService.showSuccess('Yorumunuz başarıyla gönderildi!');
        this.reviewForm.reset();
        this.reviewSubmitted.emit(); // Parent component'e haber ver (listeyi yenilemek için)
      },
      error: (err) => {
        this.isLoading = false;
        const defaultErrorMsg = 'Yorum gönderilirken bilinmeyen bir hata oluştu.';

        // 1. Gösterilecek mesajı belirle (err.message null/undefined ise default mesajı kullan)
        const messageToShow: string = err.message || defaultErrorMsg;

        // 2. İstersen component'in errorMessage'ını da ayarla (template'te göstermek için)
        this.errorMessage = messageToShow;

        // 3. NotificationService'e null olma ihtimali olmayan messageToShow'u gönder
        this.notificationService.showError(messageToShow, "Yorum Gönderilemedi");

        console.error('Error submitting review:', err);
      }
    });
    // --- ---
  }

  // Kolay erişim için getter'lar
  get rating() { return this.reviewForm.get('rating'); }
  get comment() { return this.reviewForm.get('comment'); }
}
