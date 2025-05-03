import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ReturnService, ReturnRequestSummary } from '../../../core/services/return.service'; // Servis ve Modeli import et
import { ReturnStatus } from '../../../shared/models/order.model'; // ReturnStatus tipini import et

@Component({
  selector: 'app-admin-return-management',
  templateUrl: './admin-return-management.component.html',
  styleUrls: ['./admin-return-management.component.scss'],
  standalone:false
})
export class AdminReturnManagementComponent implements OnInit {

  returnRequests$: Observable<ReturnRequestSummary[]> = of([]);
  isLoading = false;
  error: string | null = null;

  // Aksiyonlar için yüklenme durumu (talep ID bazlı)
  actionLoading: { [key: string]: boolean } = {};
  actionError: string | null = null; // Aksiyon özelinde hata

  constructor(private returnService: ReturnService) { }

  ngOnInit(): void {
    this.loadAllReturnRequests();
  }

  loadAllReturnRequests(): void {
    this.isLoading = true;
    this.error = null;
    this.actionError = null; // Hataları temizle
    this.returnRequests$ = this.returnService.getAllReturnRequests().pipe(
      catchError(err => {
        console.error("Error loading all return requests for admin:", err);
        this.error = "İade talepleri yüklenirken bir hata oluştu.";
        return of([]); // Hata durumunda boş liste
      }),
      finalize(() => {
        this.isLoading = false;
      })
    );
  }

  // İade Talebini Onayla
  approveReturn(returnId: number | string): void {
    const returnIdStr = returnId.toString();
    if (this.actionLoading[returnIdStr]) return; // Zaten işlemdeyse çık

    this.actionLoading[returnIdStr] = true;
    this.actionError = null;

    this.returnService.approveReturnRequest(returnId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log(`Return request ${returnId} approved.`);
          alert(`Talep ${returnId} onaylandı.`);
          // Listeyi yenilemek yerine BehaviorSubject güncellenirse daha iyi olur,
          // ama mock serviste listeyi yeniden yüklemek daha kolay.
          this.loadAllReturnRequests();
        } else {
          this.actionError = response.message || `Talep ${returnId} onaylanamadı.`;
        }
        delete this.actionLoading[returnIdStr];
      },
      error: (err) => {
        console.error(`Error approving return ${returnId}:`, err);
        this.actionError = err.message || `Talep ${returnId} onaylanırken hata oluştu.`;
        delete this.actionLoading[returnIdStr];
      }
    });
  }

  // İade Talebini Reddet
  rejectReturn(returnId: number | string): void {
    const returnIdStr = returnId.toString();
    if (this.actionLoading[returnIdStr]) return;

    this.actionLoading[returnIdStr] = true;
    this.actionError = null;

    // Opsiyonel: Reddetme nedeni sorulabilir bir modal ile.
    const rejectionReason = prompt("Reddetme nedenini giriniz (opsiyonel):");

    this.returnService.rejectReturnRequest(returnId, rejectionReason ?? undefined).subscribe({
        next: (response) => {
        if (response.success) {
          console.log(`Return request ${returnId} rejected.`);
           alert(`Talep ${returnId} reddedildi.`);
          this.loadAllReturnRequests(); // Listeyi yenile
        } else {
          this.actionError = response.message || `Talep ${returnId} reddedilemedi.`;
        }
        delete this.actionLoading[returnIdStr];
      },
      error: (err) => {
        console.error(`Error rejecting return ${returnId}:`, err);
        this.actionError = err.message || `Talep ${returnId} reddedilirken hata oluştu.`;
        delete this.actionLoading[returnIdStr];
      }
    });
  }


  // İade durumuna göre CSS sınıfı (ReturnHistory'deki ile aynı)
  getStatusClass(status: ReturnStatus | string | undefined): string {
    if (!status) return '';
    switch (status) {
        case 'REQUESTED': return 'status-requested';
        case 'APPROVED': return 'status-approved';
        case 'REJECTED': return 'status-rejected';
        case 'PROCESSING': return 'status-processing';
        case 'COMPLETED': return 'status-completed';
        case 'CANCELLED': return 'status-cancelled';
        default: return '';
    }
  }

}
