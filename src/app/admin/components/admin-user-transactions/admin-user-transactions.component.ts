import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; // Router eklendi
import { Observable, of, forkJoin } from 'rxjs'; // forkJoin eklendi
import { switchMap, map, catchError, tap, finalize } from 'rxjs/operators';
// Gerekli servisleri ve modelleri import et
import { OrderService } from '../../../core/services/order.service';
import { UserService } from '../../../core/services/user.service'; // UserService import edildi
import { Order, OrderStatus } from '../../../shared/models/order.model'; // Order ve Status import edildi
import { UserSummary } from '../../../shared/models/user.model'; // UserSummary import edildi

@Component({
  selector: 'app-admin-user-transactions',
  templateUrl: './admin-user-transactions.component.html',
  styleUrls: ['./admin-user-transactions.component.scss'],
  standalone: false
})
export class AdminUserTransactionsComponent implements OnInit {

  userId: string | null = null;
  user: UserSummary | null = null; // Kullanıcı bilgisini tutmak için
  orders$: Observable<Order[]> = of([]); // Siparişler için observable
  isLoading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService, // OrderService inject edildi
    private userService: UserService, // UserService inject edildi
    private router: Router // Detaylara gitmek için
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('userId');
      if (this.userId) {
        console.log('Viewing transactions for User ID:', this.userId);
        this.loadUserDataAndOrders(this.userId); // Kullanıcı ve sipariş verilerini yükle
      } else {
        this.error = "Kullanıcı ID bulunamadı.";
        this.isLoading = false; // Yükleniyor durumunu bitir
      }
    });
  }

  loadUserDataAndOrders(id: string | number): void {
    this.isLoading = true;
    this.error = null;
    this.user = null; // Önceki kullanıcı bilgisini temizle

    // Kullanıcı bilgisini ve siparişleri aynı anda çekmek için forkJoin kullanabiliriz
    forkJoin({
      // Kullanıcı bilgisini çek (getUserById serviste olmalı)
      userData: this.userService.getUserById(id).pipe(catchError(err => {
         console.error("Error loading user data:", err);
         // Kullanıcı bulunamazsa hata vermeden devam et, user null kalır
         return of(undefined);
      })),
      // Siparişleri çek (getOrdersByUserIdForAdmin serviste olmalı)
      ordersData: this.orderService.getOrdersByUserIdForAdmin(id).pipe(catchError(err => {
         console.error("Error loading user orders:", err);
         this.error = err.message || "Kullanıcının siparişleri yüklenirken bir hata oluştu.";
         return of([]); // Hata durumunda boş sipariş listesi dön
      }))
    })
    .pipe(
        finalize(() => this.isLoading = false) // Her durumda yüklenmeyi bitir
    )
    .subscribe(({ userData, ordersData }) => {
        if (userData) {
            this.user = userData;
        } else {
            // Kullanıcı bulunamadıysa veya yüklenemediyse, ID'yi göster
            this.user = { id: +id, firstName: 'Kullanıcı', lastName: `#${id}`, email: '', role: '' };
            if (!this.error) { // Sipariş hatası yoksa, kullanıcı hatası göster
                this.error = `Kullanıcı #${id} bilgileri yüklenemedi.`;
            }
        }
        // Sipariş observable'ını ayarla
        this.orders$ = of(ordersData);
    });
  }

  // Sipariş durumuna göre CSS sınıfı (OrderManagement'teki ile aynı)
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

  // Sipariş detayına gitme (OrderManagement'teki gibi)
  viewOrderDetails(orderId: number | string): void {
    // Admin'in sipariş detayını görebileceği bir sayfaya yönlendir
    // Örneğin buyer tarafındaki detay sayfası kullanılabilir (AuthGuard izin veriyorsa)
    // veya admin'e özel bir detay sayfası oluşturulabilir.
    this.router.navigate(['/buyer/orders', orderId]); // Şimdilik buyer'a yönlendiriyoruz
    // Veya yeni sekmede açmak için:
    // const url = this.router.serializeUrl(this.router.createUrlTree(['/buyer/orders', orderId]));
    // window.open(url, '_blank');
  }
}
