import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
// Gerekli servis ve modeli import et (Yolları kendi projenize göre ayarlayın)
// import { OrderService } from '../../../core/services/order.service'; // veya PaymentService
// import { PaymentIssue } from '../../../shared/models/payment.model'; // veya common.model
import { NotificationService } from '../../../core/services/notification.service'; // Bildirim için

// --- Geçici Arayüz (Model dosyasına taşınacak) ---
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PENDING_ACTION' | 'DISPUTED' | string;
export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'PAYPAL' | string;
export interface PaymentIssue {
  id: number; orderId?: number; userId?: number; paymentMethod?: PaymentMethod; amount?: number; currency?: string;
  status: PaymentStatus | string; errorMessage?: string; createdAt: string | Date; resolvedAt?: string | Date; resolutionNotes?: string;
}
// --- ---

@Component({
  selector: 'app-admin-payment-issues',
  standalone: false, // AdminModule'de declare edildiği için false
  templateUrl: './admin-payment-issues.component.html',
  styleUrls: ['./admin-payment-issues.component.scss'] // SCSS dosyası adı düzeltildi
})
export class AdminPaymentIssuesComponent implements OnInit {

  paymentIssues$: Observable<PaymentIssue[]> = of([]);
  isLoading = false;
  error: string | null = null;
  actionLoading: { [key: number]: boolean } = {}; // ID bazlı yüklenme durumu

  // Gerçek OrderService veya PaymentService inject edilecek
  constructor(
    // private orderService: OrderService, // Veya PaymentService
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadPaymentIssues();
  }

  loadPaymentIssues(): void {
    this.isLoading = true;
    this.error = null;

    // --- Mock Veri (Backend entegrasyonu yapılana kadar) ---
    const mockIssues: PaymentIssue[] = [
      { id: 101, orderId: 501, userId: 12, paymentMethod: 'CREDIT_CARD', amount: 150.75, currency: 'TRY', status: 'FAILED', errorMessage: 'Insufficient funds', createdAt: new Date(Date.now() - 86400000), resolvedAt: undefined },
      { id: 102, orderId: 503, userId: 15, paymentMethod: 'PAYPAL', amount: 88.00, currency: 'TRY', status: 'PENDING_ACTION', errorMessage: 'User action required', createdAt: new Date(Date.now() - 3600000), resolvedAt: undefined },
      { id: 103, orderId: 504, userId: 12, paymentMethod: 'CREDIT_CARD', amount: 210.50, currency: 'TRY', status: 'DISPUTED', errorMessage: 'Chargeback initiated', createdAt: new Date(Date.now() - 172800000), resolvedAt: undefined }
    ];
    this.paymentIssues$ = of(mockIssues).pipe(
      tap(() => console.log("Mock payment issues loaded")),
      finalize(() => this.isLoading = false)
    );
    // --- Mock Veri Sonu ---

    /* // --- Gerçek Servis Çağrısı (Backend hazır olduğunda) ---
    this.paymentIssues$ = this.orderService.getPaymentIssues().pipe( // veya paymentService.getPaymentIssues()
      catchError(err => {
        console.error("Error loading payment issues:", err);
        this.error = "Ödeme sorunları yüklenirken bir hata oluştu.";
        return of([]);
      }),
      finalize(() => this.isLoading = false)
    );
    */
  }

  // Sorunu Çözüldü Olarak İşaretle (Örnek Aksiyon)
  resolveIssue(issueId: number): void {
    if (this.actionLoading[issueId]) return;

    if (confirm(`Sorun #${issueId}'i çözüldü olarak işaretlemek istediğinizden emin misiniz?`)) {
      this.actionLoading[issueId] = true;
      this.error = null; // Eski genel hatayı temizle

      console.log(`Marking issue ${issueId} as resolved (Mock Action)`);
      // --- Mock Aksiyon ---
      setTimeout(() => {
        this.notificationService.showSuccess(`Sorun #${issueId} çözüldü olarak işaretlendi (Mock).`);
        // Mock veride durumu güncellemek zor, listeyi yeniden yükle
        this.loadPaymentIssues();
        delete this.actionLoading[issueId];
      }, 800);
      // --- Mock Aksiyon Sonu ---

      /* // --- Gerçek Servis Çağrısı ---
      const notes = prompt("Çözüm notu (opsiyonel):");
      this.orderService.resolvePaymentIssue(issueId, notes ?? undefined).subscribe({ // veya paymentService...
          next: () => {
              this.notificationService.showSuccess(`Sorun #${issueId} çözüldü olarak işaretlendi.`);
              this.loadPaymentIssues(); // Listeyi yenile
              delete this.actionLoading[issueId];
          },
          error: (err) => {
              this.notificationService.showError(`Sorun #${issueId} çözülürken hata: ${err.message}`);
              console.error(`Error resolving issue ${issueId}:`, err);
              delete this.actionLoading[issueId];
          }
      });
      */
    }
  }

  // Diğer Aksiyonlar (Örnek Placeholder)
  retryPayment(issueId: number): void {
     if (this.actionLoading[issueId]) return;
     console.log(`Retrying payment for issue ${issueId} (Placeholder)`);
     alert(`Ödeme #${issueId} için tekrar deneme işlemi başlatılacak (Backend Gerekli).`);
     // this.orderService.retryPayment(issueId).subscribe(...);
  }

  refundPayment(issueId: number, orderId?: number): void {
     if (this.actionLoading[issueId]) return;
     console.log(`Refunding payment for issue ${issueId} / order ${orderId} (Placeholder)`);
     alert(`Ödeme #${issueId} için iade işlemi başlatılacak (Backend Gerekli).`);
     // this.orderService.refundPayment(issueId).subscribe(...);
  }

  // Duruma göre CSS sınıfı (Opsiyonel)
  getStatusClass(status: PaymentStatus | string): string {
    switch (status) {
      case 'FAILED': return 'status-failed';
      case 'PENDING_ACTION': return 'status-pending';
      case 'DISPUTED': return 'status-disputed';
      // ... diğer durumlar
      default: return '';
    }
  }
}
