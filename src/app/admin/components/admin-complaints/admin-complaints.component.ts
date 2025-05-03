import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
// Oluşturduğumuz servisi ve modeli import edelim
import { SupportService } from '../../../core/services/support.service';
import { SupportTicket, TicketStatus } from '../../../shared/models/support.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-complaints',
  standalone: false,
  templateUrl: './admin-complaints.component.html',
  styleUrls: ['./admin-complaints.component.scss']
})
export class AdminComplaintsComponent implements OnInit {

  supportTickets$: Observable<SupportTicket[]> = of([]);
  isLoading = false;
  error: string | null = null;
  actionLoading: { [key: number]: boolean } = {};

  constructor(
    private supportService: SupportService, // <<<--- Gerçek servisi inject et
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadComplaints();
  }

  loadComplaints(): void {
    this.isLoading = true;
    this.error = null;
    this.supportTickets$ = this.supportService.getSupportTickets().pipe( // <<<--- Servisi kullan
      catchError(err => {
        console.error("Error loading support tickets:", err);
        this.error = err.message || "Destek talepleri yüklenirken bir hata oluştu."; // Servisten gelen hatayı kullan
        return of([]);
      }),
      finalize(() => this.isLoading = false)
    );
  }

  viewTicketDetails(ticketId: number): void {
      if (this.actionLoading[ticketId]) return;
      console.log(`Viewing details for ticket ID: ${ticketId}`);
      alert(`Destek talebi #${ticketId} detayları görüntülenecek (Ayrı sayfa/modal gerekli).`);
      // this.router.navigate(['/admin/complaints', ticketId]); // Gerekirse detay sayfasına yönlendir
  }

  updateTicketStatus(ticketId: number, currentStatus: TicketStatus): void {
    if (this.actionLoading[ticketId]) return;

    const newStatus = prompt(`Yeni durumu girin (Mevcut: ${currentStatus}):\n(NEW, OPEN, PENDING_CUSTOMER, RESOLVED, CLOSED)`, currentStatus);

    if (newStatus && newStatus !== currentStatus) {
        this.actionLoading[ticketId] = true;
        this.error = null;

        this.supportService.updateTicketStatus(ticketId, newStatus as TicketStatus).subscribe({ // <<<--- Servisi kullan
            next: (updatedTicket) => {
                this.notificationService.showSuccess(`Talep #${ticketId} durumu ${newStatus} olarak güncellendi.`);
                this.loadComplaints(); // Listeyi yenile
                 delete this.actionLoading[ticketId];
            },
            error: (err) => {
                this.notificationService.showError(`Talep #${ticketId} durumu güncellenirken hata: ${err.message}`);
                console.error(`Error updating status for ticket ${ticketId}:`, err);
                delete this.actionLoading[ticketId];
            }
        });
    }
  }

  // Duruma göre CSS sınıfı (Aynı kalabilir)
  getStatusClass(status: TicketStatus | string): string {
    switch (status) {
      case 'NEW': return 'status-new';
      case 'OPEN': return 'status-open';
      case 'PENDING_CUSTOMER': return 'status-pending';
      case 'RESOLVED': return 'status-resolved';
      case 'CLOSED': return 'status-closed';
      default: return '';
    }
  }
}
