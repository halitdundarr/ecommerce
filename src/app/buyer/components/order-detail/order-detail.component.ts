import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, switchMap, catchError, EMPTY, tap } from 'rxjs';
import { OrderService } from '../../../core/services/order.service'; // OrderService import et
import { Order, OrderItem, OrderStatus } from '../../../shared/models/order.model'; // Order modelini import et

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  standalone:false
})
export class OrderDetailComponent implements OnInit {

  order$: Observable<Order | undefined | null> | undefined; // undefined veya null da olabilir
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute, // Aktif route'u inject et
    private orderService: OrderService,
    private router: Router // Hata durumunda yönlendirme için
  ) { }

  ngOnInit(): void {
    this.order$ = this.route.paramMap.pipe(
      switchMap(params => {
        const orderId = params.get('orderId'); // Rotadaki :orderId parametresini al
        if (orderId) {
          this.isLoading = true;
          this.error = null;
          return this.orderService.getOrderById(orderId).pipe(
            catchError(err => {
              console.error("Error loading order details:", err);
              this.error = "Sipariş detayları yüklenirken bir hata oluştu veya sipariş bulunamadı.";
              this.isLoading = false;
              // Kullanıcıyı sipariş listesine geri yönlendirebiliriz
              // this.router.navigate(['/buyer/orders']);
              return of(null); // Hata durumunda null döndür
            })
          );
        } else {
          // orderId yoksa hata ver veya yönlendir
          this.error = "Geçersiz sipariş ID.";
          this.isLoading = false;
          // this.router.navigate(['/buyer/orders']);
          return of(null); // ID yoksa null döndür
        }
      }),
      // Observable tamamlandığında veya veri geldiğinde yüklemeyi bitir
      tap(() => this.isLoading = false)
    );
  }

   // Sipariş durumuna göre CSS sınıfı (OrderHistory'deki ile aynı olabilir)
  getStatusClass(status: OrderStatus | string | undefined): string {
      if (!status) return '';
      switch (status) {
          case 'DELIVERED': return 'status-delivered';
          case 'SHIPPED': return 'status-shipped';
          case 'PROCESSING': return 'status-processing';
          case 'CANCELLED': return 'status-cancelled';
       // case 'PENDING_PAYMENT': return 'status-pending'; // Eğer PENDING varsa
          case 'PENDING_PAYMENT': return 'status-pending';
          default: return '';
      }
  }
  requestReturn(item: OrderItem, orderId: number | string): void {
    console.log(`Navigating to return request form for item ${item.id} in order ${orderId}`);
    // İade talep formuna yönlendir, orderId ve itemId'yi query params olarak gönder
    this.router.navigate(['/buyer/returns/new'], {
        queryParams: {
            orderId: orderId,
            itemId: item.id // OrderItem'ın ID'si
        }
    });
}

  // --- YENİ: Bir ürünün iade edilebilir olup olmadığını kontrol etme ---
  // Bu kontrol daha karmaşık olabilir (tarih, ürün tipi vs.)
  // Şimdilik sadece siparişin 'DELIVERED' olmasına ve item'ın iade sürecinde olmamasına bakalım.
  isReturnEligible(orderStatus: OrderStatus | undefined, item: OrderItem): boolean {
      // Backend'den item.returnEligible geliyorsa onu kullanmak daha doğru olur.
      // Mock senaryo: Sadece teslim edilmişse ve daha önce iade talep edilmemişse uygun diyelim.
      return orderStatus === 'DELIVERED' && !item.returnStatus;
  }
  // ------------------------------------------------------------------
}
