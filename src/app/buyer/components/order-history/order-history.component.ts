import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OrderService } from '../../../core/services/order.service'; // OrderService'i import et
import { Order, OrderStatus } from '../../../shared/models/order.model'; // Order modelini import et

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
  standalone:false
})
export class OrderHistoryComponent implements OnInit {

  orders$: Observable<Order[]> = of([]);
  isLoading = false;
  error: string | null = null;

  constructor(private orderService: OrderService) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = null;
    this.orders$ = this.orderService.getOrders();

    // Yükleme ve hata durumunu yönetmek için subscribe olabiliriz
    this.orders$.subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        console.error("Error loading orders:", err);
        this.error = "Siparişler yüklenirken bir hata oluştu.";
        this.isLoading = false;
      }
    });
  }

  // Sipariş durumuna göre CSS sınıfı döndüren yardımcı metot (opsiyonel)
  getStatusClass(status: OrderStatus | string): string {
      switch (status) {
          case 'DELIVERED': return 'status-delivered';
          case 'SHIPPED': return 'status-shipped';
          case 'PROCESSING': return 'status-processing';
          case 'CANCELLED': return 'status-cancelled';
          case 'PENDING_PAYMENT': return 'status-pending';
          default: return '';
      }
  }
}
