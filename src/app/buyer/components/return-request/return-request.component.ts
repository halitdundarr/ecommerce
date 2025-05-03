import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap, catchError, of, finalize } from 'rxjs';
import { ReturnService, ReturnRequestPayload } from '../../../core/services/return.service'; // ReturnService ve Payload'ı import et
import { OrderService } from '../../../core/services/order.service'; // OrderService'i import et
import { Order, OrderItem } from '../../../shared/models/order.model'; // Order ve OrderItem modellerini import et

@Component({
  selector: 'app-return-request',
  templateUrl: './return-request.component.html',
  styleUrls: ['./return-request.component.scss'],
  standalone:false
})
export class ReturnRequestComponent implements OnInit {

  returnForm!: FormGroup;
  orderId: string | null = null;
  itemId: number | null = null; // OrderItem ID'si number varsayıyoruz
  order: Order | null = null;
  itemToReturn: OrderItem | null = null;

  // Durum değişkenleri
  isLoadingDetails = false; // Sipariş/ürün detayı yükleniyor
  isSubmitting = false; // Form gönderiliyor
  error: string | null = null; // Genel hata mesajı
  successMessage: string | null = null; // Başarı mesajı

  // Örnek iade nedenleri
  returnReasons: string[] = [
    'Ürün hasarlı geldi',
    'Yanlış ürün gönderildi',
    'Ürünü beğenmedim / Fikrimi değiştirdim',
    'Açıklamayla uyuşmuyor',
    'Diğer'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private returnService: ReturnService,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.initializeForm();

    this.isLoadingDetails = true;
    this.route.queryParamMap.pipe(
        tap(params => {
            this.orderId = params.get('orderId');
            const itemIdParam = params.get('itemId');
            this.itemId = itemIdParam ? parseInt(itemIdParam, 10) : null;
            this.error = null; // Parametreler değiştiğinde eski hatayı temizle
            this.successMessage = null;
        }),
        // switchMap kullanarak orderId varsa siparişi çek
        switchMap(params => {
            if (this.orderId) {
                return this.orderService.getOrderById(this.orderId).pipe(
                    catchError(err => {
                        console.error("Error loading order details:", err);
                        this.error = `Sipariş detayı yüklenemedi (ID: ${this.orderId}).`;
                        return of(null); // Hata durumunda null döndür
                    })
                );
            } else {
                this.error = "Sipariş ID bulunamadı.";
                return of(null); // orderId yoksa null döndür
            }
        }),
        finalize(() => this.isLoadingDetails = false) // Yükleme bitti
    ).subscribe(order => {
        if (order && this.itemId !== null) {
            this.order = order;
            // İlgili ürünü siparişin item'ları arasından bul
            this.itemToReturn = order.items.find(item => item.id === this.itemId) ?? null;
            if (!this.itemToReturn) {
                this.error = `Siparişte ${this.itemId} ID'li ürün bulunamadı.`;
            } else if (this.itemToReturn.returnStatus) {
                this.error = `Bu ürün için zaten bir iade süreci (${this.itemToReturn.returnStatus}) başlatılmış.`;
                this.returnForm.disable(); // Formu disable et
            }
        } else if (this.orderId && !order && !this.error) {
             this.error = `Sipariş bulunamadı (ID: ${this.orderId}).`;
        }
    });
  }

  initializeForm(): void {
    this.returnForm = this.fb.group({
      // quantity: [1, [Validators.required, Validators.min(1)]], // Şimdilik tam iade, sonra eklenebilir
      reason: ['', Validators.required],
      comment: [''] // Opsiyonel yorum alanı
    });
  }

  // Form kontrollerine kolay erişim
  get reason() { return this.returnForm.get('reason'); }
  get comment() { return this.returnForm.get('comment'); }

  onSubmit(): void {
    this.returnForm.markAllAsTouched(); // Validasyonları göstermek için
    if (this.returnForm.invalid || !this.orderId || !this.itemToReturn || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.error = null;
    this.successMessage = null;

    const payload: ReturnRequestPayload = {
      orderId: this.orderId,
      orderItemId: this.itemToReturn.id,
      quantity: this.itemToReturn.quantity, // Şimdilik tüm adedi iade ediyoruz
      reason: this.returnForm.value.reason,
      comment: this.returnForm.value.comment || undefined // Boşsa undefined gönder
    };

    this.returnService.requestReturn(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = response.message || 'İade talebiniz başarıyla oluşturuldu.';
          this.returnForm.disable(); // Başarılı olunca formu disable et
          // Kullanıcıyı birkaç saniye sonra sipariş detayına geri yönlendir
          setTimeout(() => {
            this.goBackToOrder();
          }, 3000); // 3 saniye bekle
        } else {
          this.error = response.message || 'İade talebi oluşturulamadı.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = err.message || 'İade talebi sırasında bir hata oluştu. Lütfen tekrar deneyin.';
        console.error("Return request submission error:", err);
      }
    });
  }

  // Sipariş detayına geri dönme metodu
  goBackToOrder(): void {
    if (this.orderId) {
      this.router.navigate(['/buyer/orders', this.orderId]);
    } else {
      this.router.navigate(['/buyer/orders']); // ID yoksa sipariş listesine git
    }
  }

}
