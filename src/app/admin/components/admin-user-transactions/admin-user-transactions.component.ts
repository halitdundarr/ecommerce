import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
// import { OrderService } from 'src/app/core/services/order.service'; // Entegrasyonda lazım olacak
// import { Order } from 'src/app/shared/models/order.model'; // Entegrasyonda lazım olacak
// import { UserService } from 'src/app/core/services/user.service'; // Kullanıcı adını almak için
// import { UserSummary } from 'src/app/shared/models/user.model';

@Component({
  selector: 'app-admin-user-transactions',
  templateUrl: './admin-user-transactions.component.html',
  styleUrls: ['./admin-user-transactions.component.scss'],
  standalone: false
})
export class AdminUserTransactionsComponent implements OnInit {

  userId: string | null = null;
  userName: string = ''; // Kullanıcı adını tutmak için
  // orders$: Observable<Order[]> = of([]); // Entegrasyonda kullanılacak
  isLoading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    // private orderService: OrderService, // Entegrasyonda inject edilecek
    // private userService: UserService // Entegrasyonda inject edilecek
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('userId');
      if (this.userId) {
        console.log('Viewing transactions for User ID:', this.userId);
        // TODO (Entegrasyon): Kullanıcı adını ve siparişlerini çek
        // Örnek: this.loadUserData(this.userId);
        // Örnek: this.loadUserOrders(this.userId);
        this.userName = `Kullanıcı ${this.userId}`; // Placeholder
        this.isLoading = false; // Şimdilik hemen bitir
      } else {
        this.error = "Kullanıcı ID bulunamadı.";
        this.isLoading = false;
      }
    });
  }

  // Örnek veri yükleme metodları (Entegrasyonda doldurulacak)
  /*
  loadUserData(id: string): void {
    this.userService.getUserById(id).subscribe(user => { // getUserById serviste olmalı
       this.userName = user ? `${user.firstName} ${user.lastName}` : `Kullanıcı ${id}`;
    });
  }

  loadUserOrders(id: string): void {
    this.isLoading = true;
    this.error = null;
    // Backend'de admin'in belirli bir kullanıcının siparişlerini alabileceği
    // bir endpoint olmalı veya mevcut endpoint filtrelenebilmeli.
    this.orders$ = this.orderService.getOrdersByCustomerIdForAdmin(+id).pipe( // Serviste metot olmalı
       catchError(err => {
         this.error = "Kullanıcının siparişleri yüklenirken hata oluştu.";
         return of([]);
       }),
       finalize(() => this.isLoading = false)
    );
  }
  */
}
