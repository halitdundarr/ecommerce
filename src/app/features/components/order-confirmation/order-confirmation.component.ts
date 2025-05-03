import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, switchMap, catchError, tap } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../shared/models/order.model';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss'],
  standalone: false
})
export class OrderConfirmationComponent implements OnInit {
  order$: Observable<Order | null | undefined>;
  isLoading = true;
  error: string | null = null;
  orderId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router
  ) {
    this.order$ = of(null); // Initialize with null observable
  }

  ngOnInit(): void {
    this.order$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.orderId = params.get('orderId');
        if (this.orderId) {
          this.isLoading = true;
          this.error = null;
          return this.orderService.getOrderById(this.orderId).pipe(
            catchError(err => {
              console.error("Error loading confirmed order:", err);
              this.error = "Sipariş detayları yüklenirken bir hata oluştu veya sipariş bulunamadı.";
              this.isLoading = false;
              return of(null); // Hata durumunda null döndür
            })
          );
        } else {
          this.error = "Geçersiz Sipariş ID.";
          this.isLoading = false;
          return of(null); // ID yoksa null döndür
        }
      }),
      tap(() => this.isLoading = false)
    );
  }
}
