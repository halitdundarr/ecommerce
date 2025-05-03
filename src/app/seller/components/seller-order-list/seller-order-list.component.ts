import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators'; // finalize ve catchError import edildiğinden emin olun
import { Router } from '@angular/router'; // Router import et
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderItem, OrderStatus } from '../../../shared/models/order.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service'; // NotificationService import et

@Component({
  selector: 'app-seller-order-list',
  templateUrl: './seller-order-list.component.html',
  styleUrls: ['./seller-order-list.component.scss'],
  standalone: false,
})
export class SellerOrderListComponent implements OnInit {

  orders$: Observable<Order[]> = of([]);
  isLoading = false;
  error: string | null = null;
  currentSellerId: number | null = null;
  actionLoading: { [key: number]: boolean } = {}; // Sipariş kalemi ID'si bazında yüklenme durumu

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router, // Router inject et
    private notificationService: NotificationService // NotificationService inject et
  ) { }

  ngOnInit(): void {
     this.currentSellerId = this.authService.currentUserValue?.id ?? null;
     if (this.currentSellerId) {
         this.loadOrders();
     } else {
          this.error = "Satıcı bilgisi alınamadı.";
     }
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = null;
    this.orders$ = this.orderService.getOrdersForCurrentSeller().pipe(
        catchError(err => {
             console.error("Error loading seller orders:", err);
             this.error = err.message || "Siparişleriniz yüklenirken bir hata oluştu.";
             return of([]);
        }),
        finalize(() => {
            // Yüklenme durumunu asenkron güncelle
            setTimeout(() => { this.isLoading = false; }, 0);
        })
    );
  }

  // Sipariş durumuna göre CSS sınıfı (Aynı kalabilir)
  getStatusClass(status: OrderStatus | string | undefined): string {
      if (!status) return '';
       switch (status) {
          case 'DELIVERED': return 'status-delivered';
          case 'SHIPPED': return 'status-shipped';
          case 'PROCESSING': return 'status-processing';
          case 'CANCELLED': return 'status-cancelled';
          case 'PENDING_PAYMENT': return 'status-pending';
          default: return '';
      }
  }

  // --- YENİ: Sipariş Detaylarını Görüntüle ---
  viewOrderDetails(orderId: number | string): void {
      // Satıcının sipariş detayını görebileceği bir sayfaya yönlendir.
      // Buyer veya Admin'deki detay sayfası kullanılabilir veya satıcıya özel oluşturulabilir.
      // Şimdilik Buyer detay sayfasına yönlendirelim.
      console.log(`Navigating to details for order: ${orderId}`);
      this.router.navigate(['/buyer/orders', orderId]); // Veya '/seller/orders', orderId
  }
  // --- ---

  // --- GÜNCELLENDİ: Sipariş Kalemini Kargolandı İşaretle ---
  markOrderItemAsShipped(orderId: number | string, item: OrderItem): void {
      const itemId = item.id; // OrderItem'ın ID'si
      if (this.actionLoading[itemId] || item.returnStatus) return; // Zaten işlemdeyse veya iade sürecindeyse çık

      // Kullanıcıdan kargo bilgilerini al (Basit prompt ile, gerçekte modal daha iyi olur)
      const carrier = prompt(`Sipariş #${orderId}, Ürün "${item.product.name}" için Kargo Firması:`, "MNG Kargo");
      if (!carrier) return; // Kullanıcı iptal ederse

      const trackingNumber = prompt(`Sipariş #${orderId}, Ürün "${item.product.name}" için Takip Numarası:`, "");
      if (trackingNumber === null) return; // Takip no boş olabilir ama iptal edilmemeli

      this.actionLoading[itemId] = true;
      this.error = null; // Hataları temizle

      const shippingInfo = { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() };

      this.orderService.markOrderItemShippedBySeller(orderId, itemId, shippingInfo).subscribe({
          next: (response) => {
              console.log(`Order item ${itemId} marked as shipped:`, response);
              this.notificationService.showSuccess(`Ürün "${item.product.name}" kargolandı olarak işaretlendi.`);
              // Listeyi yenilemek yerine state management kullanmak daha iyi olur,
              // şimdilik listeyi yeniden yükleyelim.
              this.loadOrders();
              delete this.actionLoading[itemId];
          },
          error: (err) => {
              console.error(`Error marking item ${itemId} as shipped:`, err);
              this.notificationService.showError(err.message || `Ürün kargolandı olarak işaretlenirken hata oluştu.`);
              delete this.actionLoading[itemId];
          }
      });
  }
  // --- ---
}
