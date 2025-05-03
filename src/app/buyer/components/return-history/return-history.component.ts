import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ReturnService, ReturnRequestSummary } from '../../../core/services/return.service'; // Service ve Modeli import et
import { ReturnStatus } from '../../../shared/models/order.model'; // ReturnStatus tipini import et

@Component({
  selector: 'app-return-history',
  templateUrl: './return-history.component.html',
  styleUrls: ['./return-history.component.scss'],
  standalone:false
})
export class ReturnHistoryComponent implements OnInit {

  returnRequests$: Observable<ReturnRequestSummary[]> = of([]);
  isLoading = false;
  error: string | null = null;

  constructor(private returnService: ReturnService) { }

  ngOnInit(): void {
    this.loadReturnRequests();
  }

  loadReturnRequests(): void {
    this.isLoading = true;
    this.error = null;
    this.returnRequests$ = this.returnService.getReturnRequestsForUser().pipe(
      catchError(err => {
        console.error("Error loading return requests:", err);
        this.error = "İade talepleri yüklenirken bir hata oluştu.";
        return of([]); // Hata durumunda boş liste döndür
      }),
      finalize(() => {
        this.isLoading = false;
      })
    );
  }

  // İade durumuna göre CSS sınıfı döndürme (Order status'e benzer)
  getStatusClass(status: ReturnStatus | string | undefined): string {
    if (!status) return '';
    switch (status) {
        case 'REQUESTED': return 'status-requested'; // Mavi gibi
        case 'APPROVED': return 'status-approved'; // Yeşil gibi
        case 'REJECTED': return 'status-rejected'; // Kırmızı
        case 'PROCESSING': return 'status-processing'; // Sarı
        case 'COMPLETED': return 'status-completed'; // Koyu Yeşil veya Gri
        case 'CANCELLED': return 'status-cancelled'; // Gri
        default: return '';
    }
  }
}
