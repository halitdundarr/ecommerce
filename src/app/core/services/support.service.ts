import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // environment import
// Oluşturduğumuz modeli import edelim
import { SupportTicket, TicketStatus } from '../../shared/models/support.model';

@Injectable({
  providedIn: 'root' // Singleton servis olarak provide edildi
})
export class SupportService {

  private readonly API_BASE_URL = environment.apiUrl;
  // Admin API endpoint'lerini tanımlayalım (Backend ile uyumlu olmalı)
  private readonly ADMIN_SUPPORT_API_URL = `${this.API_BASE_URL}/api/v1/admin/support/tickets`;

  constructor(private http: HttpClient) { }

  /**
   * Tüm destek taleplerini getirir (Admin için).
   * Backend'den SupportTicket[] veya DTO listesi bekler.
   */
  getSupportTickets(filters?: any): Observable<SupportTicket[]> {
    const url = this.ADMIN_SUPPORT_API_URL;
    let params = new HttpParams();
    // if (filters?.status) params = params.set('status', filters.status);
    // ... diğer filtreler

    console.log(`Workspaceing support tickets from: ${url}`);
    // Backend'den gelen DTO listesini SupportTicket[] modeline map etmeliyiz.
    // Şimdilik direkt SupportTicket[] varsayıyoruz.
    return this.http.get<SupportTicket[]>(url, { params }).pipe(
      map(tickets => tickets.map(ticket => ({
          ...ticket,
          createdAt: new Date(ticket.createdAt), // Tarihleri Date nesnesine çevir
          lastUpdatedAt: ticket.lastUpdatedAt ? new Date(ticket.lastUpdatedAt) : undefined
      }))),
      tap(tickets => console.log(`Workspaceed ${tickets.length} support tickets.`)),
      catchError(this.handleError)
    );
  }

  /**
   * Belirli bir destek talebinin detayını getirir.
   */
  getSupportTicketById(ticketId: number): Observable<SupportTicket | undefined> {
      const url = `<span class="math-inline">\{this\.ADMIN\_SUPPORT\_API\_URL\}/</span>{ticketId}`;
      console.log(`Workspaceing support ticket details from: ${url}`);
      return this.http.get<SupportTicket>(url).pipe(
          map(ticket => ({ // Tarih dönüşümlerini yap
              ...ticket,
              createdAt: new Date(ticket.createdAt),
              lastUpdatedAt: ticket.lastUpdatedAt ? new Date(ticket.lastUpdatedAt) : undefined
          })),
          catchError(err => {
              if (err.status === 404) return of(undefined); // Bulunamadıysa undefined dön
              return this.handleError(err);
          })
      );
  }

  /**
   * Bir destek talebinin durumunu günceller.
   */
  updateTicketStatus(ticketId: number, newStatus: TicketStatus, adminNotes?: string): Observable<SupportTicket> {
      const url = `<span class="math-inline">\{this\.ADMIN\_SUPPORT\_API\_URL\}/</span>{ticketId}/status`;
      const payload = { status: newStatus, notes: adminNotes };
      console.log(`Updating status for ticket ${ticketId} to ${newStatus}`);
      // Backend güncellenmiş SupportTicket veya DTO döndürebilir
      return this.http.put<SupportTicket>(url, payload).pipe(
          map(ticket => ({ /* ...tarih dönüşümü... */ ...ticket })), // Dönen ticketi map et
          catchError(this.handleError)
      );
  }

  /**
   * Bir destek talebine admin yanıtı ekler.
   */
  addTicketReply(ticketId: number, replyMessage: string): Observable<any> { // Geri dönüş tipi backend'e göre (örn: TicketReply veya void)
       const url = `<span class="math-inline">\{this\.ADMIN\_SUPPORT\_API\_URL\}/</span>{ticketId}/replies`;
       const payload = { message: replyMessage, isAdminReply: true };
       console.log(`Adding admin reply to ticket ${ticketId}`);
       return this.http.post(url, payload).pipe(
           catchError(this.handleError)
       );
  }

  // --- Genel Hata Yönetimi Metodu ---
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir destek talebi işlemi hatası oluştu!';
    if (error.status === 0 || !error.error) {
      console.error('Ağ/İstemci hatası (SupportService):', error.message || error);
      userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
    } else {
      console.error(`Backend Hatası ${error.status} (SupportService), Gövde:`, error.error);
      const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);
      if (backendErrorMessage) {
          userMessage = backendErrorMessage;
      } else {
           switch (error.status) {
               case 400: userMessage = 'Geçersiz destek talebi isteği.'; break;
               case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
               case 403: userMessage = 'Bu işlem için yetkiniz yok (Admin olmalısınız).'; break;
               case 404: userMessage = 'Destek talebi bulunamadı.'; break;
               case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
               default: userMessage = `Sunucu hatası (${error.status}).`;
           }
      }
    }
    return throwError(() => new Error(userMessage));
  }
}
