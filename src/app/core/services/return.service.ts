// src/app/core/services/return.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // HttpParams ekle (filtreleme için)
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, delay } from 'rxjs/operators'; // map ve delay'i (gerekirse) import et
import { ReturnStatus } from '../../shared/models/order.model';
import { environment } from '../../../environments/environment'; // <-- environment import et
// AuthService gerekebilir (kullanıcı ID'si için, ancak endpointler principal'dan alabilir)
// import { AuthService } from './auth.service';

// API URL Sabitleri (environment'dan alınacak)
const API_BASE_URL = environment.apiUrl; // <-- environment kullan
const CUSTOMER_RETURNS_API_URL = `${API_BASE_URL}/api/v1/returns`; // Müşteri iade endpoint'i (varsayım)
const ADMIN_RETURNS_API_URL = `${API_BASE_URL}/api/v1/admin/returns`; // Admin iade endpoint'i (varsayım)

// --- Arayüzler (Mevcutlar iyi görünüyor) ---
export interface ReturnRequestPayload {
  orderId: number | string;
  orderItemId: number;
  quantity: number;
  reason: string;
  comment?: string;
}

export interface ReturnResponse {
  success: boolean;
  message?: string;
  returnId?: number | string;
  newStatus?: ReturnStatus;
}

export interface ReturnRequestSummary {
    returnId: number | string;
    orderId: number | string;
    orderItemId: number;
    productName: string; // Backend bu bilgiyi doldurmalı
    requestDate: string | Date;
    status: ReturnStatus;
    reason: string;
    userId?: number; // Backend bu bilgiyi doldurmalı
    userEmail?: string; // Backend bu bilgiyi doldurabilir
}
// -----------------------------------------


@Injectable({
  providedIn: 'root'
})
export class ReturnService {

  // Mock veriyi kaldırıyoruz.
  // private mockReturnRequests: ReturnRequestSummary[] = [ ... ];

  constructor(
      private http: HttpClient
      // private authService: AuthService // Gerekirse inject et
    ) { }

  /**
   * Yeni bir iade talebi oluşturur.
   * Backend'e POST isteği gönderir.
   */
  requestReturn(payload: ReturnRequestPayload): Observable<ReturnResponse> {
    const url = CUSTOMER_RETURNS_API_URL; // Varsayılan POST endpoint'i
    console.log(`Sending return request to server: ${url}`, payload);

    // Backend'den ReturnResponse bekle
    return this.http.post<ReturnResponse>(url, payload).pipe(
        tap(response => console.log("Return request response from server:", response)),
        catchError(this.handleError) // Hata yönetimi
    );
  }

  /**
   * Mevcut kullanıcının iade taleplerini getirir.
   * Backend'e GET isteği gönderir.
   */
  getReturnRequestsForUser(): Observable<ReturnRequestSummary[]> {
     const url = `${CUSTOMER_RETURNS_API_URL}/my-returns`; // Kullanıcıya özel endpoint (varsayım)
     console.log(`Workspaceing user's return requests from server: ${url}`);

     // Backend'den ReturnRequestSummary[] bekle
     return this.http.get<ReturnRequestSummary[]>(url).pipe(
         // Tarih alanlarını Date nesnesine çevirme (opsiyonel)
         map(requests => requests.map(req => ({
             ...req,
             requestDate: new Date(req.requestDate) // String ise Date'e çevir
         }))),
         tap(response => console.log("User return requests received:", response?.length)),
         catchError(this.handleError) // Hata yönetimi
     );
  }

    /**
     * Tüm iade taleplerini getirir (Admin için).
     * Backend'e GET isteği gönderir.
     */
    getAllReturnRequests(filters?: any): Observable<ReturnRequestSummary[]> {
      const url = ADMIN_RETURNS_API_URL; // Admin endpoint'i (varsayım)
      let params = new HttpParams();
      // Filtreleri ekle (backend destekliyorsa)
      if (filters?.status) { params = params.set('status', filters.status); }
      if (filters?.userId) { params = params.set('userId', filters.userId); }
      // ... diğer filtreler

      console.log(`Workspaceing all return requests from server for admin: ${url}`);
      // Backend'den ReturnRequestSummary[] bekle
      return this.http.get<ReturnRequestSummary[]>(url, { params }).pipe(
          map(requests => requests.map(req => ({
               ...req,
               requestDate: new Date(req.requestDate)
           }))),
          tap(response => console.log("All return requests received:", response?.length)),
          catchError(this.handleError)
      );
  }

  /**
   * İade talebini onaylar (Admin).
   * Backend'e PUT isteği gönderir.
   */
  approveReturnRequest(returnId: number | string): Observable<ReturnResponse> {
       const url = `${ADMIN_RETURNS_API_URL}/${returnId}/approve`; // Onaylama endpoint'i (varsayım)
       console.log(`Sending approve request for return ID: ${returnId} to ${url}`);

       // Backend'den ReturnResponse bekle
       return this.http.put<ReturnResponse>(url, {}).pipe( // Body boş
           tap(response => console.log("Approve response from server:", response)),
           catchError(this.handleError)
       );
  }

   /**
    * İade talebini reddeder (Admin).
    * Backend'e PUT isteği gönderir.
    */
   rejectReturnRequest(returnId: number | string, reason?: string): Observable<ReturnResponse> {
       const url = `${ADMIN_RETURNS_API_URL}/${returnId}/reject`; // Reddetme endpoint'i (varsayım)
       // Backend neden bekliyorsa payload'a ekle
       const payload = reason ? { rejectionReason: reason } : {};

       console.log(`Sending reject request for return ID: ${returnId} to ${url}`);
       // Backend'den ReturnResponse bekle
       return this.http.put<ReturnResponse>(url, payload).pipe(
           tap(response => console.log("Reject response from server:", response)),
           catchError(this.handleError)
       );
   }

  // --- Genel Hata Yönetimi Metodu ---
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir iade işlemi hatası oluştu!';
     // ... (Diğer servislerdeki handleError mantığı buraya kopyalanabilir) ...
     if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (ReturnService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
      } else {
        console.error(`Backend Hatası ${error.status} (ReturnService), Gövde:`, error.error);
        const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);
        if (backendErrorMessage) {
            userMessage = backendErrorMessage;
        } else {
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz iade isteği (örn: eksik bilgi).'; break;
                 case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
                 case 403: userMessage = 'Bu iade işlemi için yetkiniz yok.'; break;
                 case 404: userMessage = 'İade talebi, sipariş veya ürün bulunamadı.'; break;
                 case 409: userMessage = 'İade durumu geçersiz veya işlem çakışması.'; break;
                 case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}).`;
             }
        }
      }
    return throwError(() => new Error(userMessage));
  }

}
