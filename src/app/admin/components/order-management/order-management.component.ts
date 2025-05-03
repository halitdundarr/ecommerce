import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OrderService } from '../../../core/services/order.service'; // OrderService import et
import { Order, OrderStatus } from '../../../shared/models/order.model'; // Order ve OrderStatus import et
import { Router } from '@angular/router'; // Detaylara gitmek için

@Component({
  selector: 'app-order-management',
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss'],
  standalone:false,
})
export class OrderManagementComponent implements OnInit {

  orders$: Observable<Order[]> = of([]);
  isLoading = false;
  error: string | null = null;
  actionLoading: { [key: string]: boolean } = {}; // Aksiyon yükleniyor durumu
  // İleride filtreleme için kullanılabilir:
  // filterStatus: OrderStatus | null = null;
  // filterUserId: number | null = null;

  constructor(
    private orderService: OrderService,
    private router: Router
    ) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = null;
    // Admin için tüm siparişleri getiren servisi çağır
    this.orders$ = this.orderService.getAllOrdersForAdmin(/*{ status: this.filterStatus, userId: this.filterUserId }*/);

    // Yükleme ve hata durumunu ele al
    this.orders$.subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        console.error("Error loading orders for admin:", err);
        this.error = "Siparişler yüklenirken bir hata oluştu.";
        this.isLoading = false;
      }
    });
  }

  // Sipariş durumuna göre CSS sınıfı (OrderHistory'deki ile aynı)
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

   // Sipariş detayına gitme (Admin için ayrı bir detay sayfası olabilir veya buyer'daki kullanılabilir)
   viewOrderDetails(orderId: number | string): void {
       // Şimdilik buyer tarafındaki detay sayfasına yönlendirelim
       this.router.navigate(['/buyer/orders', orderId]);
       // Veya admin için ayrı bir rota varsa:
       // this.router.navigate(['/admin/orders', orderId]);
       alert(`Sipariş ${orderId} detayları açılacak (yönlendirme ayarlanmalı).`);
   }

   markAsShipped(order: Order): void {
    const orderIdStr = order.id.toString(); // actionLoading key'i için
    if (this.actionLoading[orderIdStr] || order.status !== 'PROCESSING') return; // Zaten işlemde ise veya durumu uygun değilse çık

    this.actionLoading[orderIdStr] = true;
    this.error = null;

    this.orderService.updateOrderStatus(order.id, 'SHIPPED').subscribe({
        next: (updatedOrder) => {
            if (updatedOrder) {
                console.log(`Order ${order.id} marked as SHIPPED.`);
                // Listeyi yenilemeye gerek yok, observable stream güncellenirse tablo otomatik güncellenir.
                // Ancak mock data kullandığımız için servisteki array değişti, listeyi YENİDEN YÜKLEMEMİZ GEREKİR!
                this.loadOrders();
                 // Gerçek API ile subscribe anında listeyi güncellemek daha verimli olur.
                alert(`Sipariş ${order.id} kargolandı olarak işaretlendi.`);
            } else {
                this.error = `Sipariş ${order.id} durumu güncellenemedi.`;
            }
             delete this.actionLoading[orderIdStr];
        },
        error: (err) => {
            console.error(`Error updating status for order ${order.id}:`, err);
            this.error = `Sipariş ${order.id} durumu güncellenirken hata oluştu.`;
            delete this.actionLoading[orderIdStr];
        }
    });
}

// Genel updateStatus metodu (placeholder olarak kalabilir veya geliştirilebilir)
updateStatus(orderId: number | string, newStatus: OrderStatus): void {
    alert(`Sipariş ${orderId} durumu ${newStatus} olarak güncellenecek (detaylı implementasyon gerekiyor).`);
    // Örneğin bir modal açılıp farklı durumlar seçilebilir.
    // this.orderService.updateOrderStatus(orderId, newStatus).subscribe(...)
}
}
