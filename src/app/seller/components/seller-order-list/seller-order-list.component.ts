import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderItem, OrderStatus } from '../../../shared/models/order.model';
import { AuthService } from '../../../core/services/auth.service'; // AuthService (sellerId için)

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

  constructor(
    private orderService: OrderService,
    private authService: AuthService // Inject AuthService
    // private productService: ProductService // Ürün detayları için gerekirse
    ) { }

  ngOnInit(): void {
     // Mevcut satıcı ID'sini alalım (template'de filtreleme için)
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
    this.orders$ = this.orderService.getOrdersForCurrentSeller();

    this.orders$.subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        console.error("Error loading seller orders:", err);
        this.error = "Siparişler yüklenirken bir hata oluştu.";
        this.isLoading = false;
      }
    });
  }

  // Sipariş durumuna göre CSS sınıfı (Admin/Buyer ile aynı)
  getStatusClass(status: OrderStatus | string | undefined): string {
      if (!status) return '';
      // ... (getStatusClass içeriği önceki componentlerden kopyalanabilir) ...
       switch (status) {
          case 'DELIVERED': return 'status-delivered';
          case 'SHIPPED': return 'status-shipped';
          case 'PROCESSING': return 'status-processing';
          case 'CANCELLED': return 'status-cancelled';
          case 'PENDING_PAYMENT': return 'status-pending';
          default: return '';
      }
  }

  // Sipariş Kalemini Kargolandı İşaretle (Placeholder)
  markOrderItemAsShipped(orderId: number | string, itemId: number): void {
      alert(`Sipariş ${orderId}, Ürün ${itemId} kargolandı olarak işaretlenecek (henüz uygulanmadı).`);
      // Burada OrderService'e sipariş kaleminin durumunu güncelleyecek
      // veya kargo bilgisi ekleyecek bir metot çağrılabilir.
      // Bu, OrderItem modeline de status veya shipment alanı eklemeyi gerektirebilir.
  }

}
