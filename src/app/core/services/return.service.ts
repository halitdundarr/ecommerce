import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // HttpClient import
import { Observable, of, throwError, delay } from 'rxjs'; // of, throwError, delay import
import { catchError, map, tap } from 'rxjs/operators'; // catchError, tap import
import { ReturnStatus } from '../../shared/models/order.model'; // ReturnStatus tipini import

// Backend API adresi (Varsayılan)
const API_BASE_URL = 'http://localhost:8080/api'; // Kendi backend adresinizle değiştirin

// Backend'e gönderilecek iade talebi verisi için arayüz
export interface ReturnRequestPayload {
  orderId: number | string;
  orderItemId: number; // Hangi ürün kaleminin iade edildiği
  quantity: number; // Kaç adet iade edildiği (şimdilik tam iade varsayalım)
  reason: string; // İade nedeni
  comment?: string; // Ek yorumlar
}

// Backend'den dönecek cevap için arayüz (basit)
export interface ReturnResponse {
  success: boolean;
  message?: string;
  returnId?: number | string; // Oluşturulan iade talebinin ID'si
  newStatus?: ReturnStatus; // Ürünün yeni iade durumu
}

// Kullanıcının iade geçmişi için model (basit)
export interface ReturnRequestSummary {
    returnId: number | string;
    orderId: number | string;
    orderItemId: number;
    productName: string; // Kolaylık için eklendi
    requestDate: string | Date;
    status: ReturnStatus;
    reason: string;
    userId?: number; // <-- userId alanını buraya ekleyin (opsiyonel ?)
    // userEmail?: string; // İleride gerekirse e-posta da eklenebilir
}


@Injectable({
  providedIn: 'root'
})
export class ReturnService {

  // Mock iade talepleri (test için daha fazla ekleyelim)
  private mockReturnRequests: ReturnRequestSummary[] = [
    { returnId: 'MOCK-RET-1', orderId: 17001, orderItemId: 201, userId: 3, productName: 'Örnek Laptop', requestDate: new Date(Date.now() - 86400000 * 2), status: 'REQUESTED', reason: 'Ürün hasarlı geldi' },
    { returnId: 'MOCK-RET-2', orderId: 17005, orderItemId: 205, userId: 3, productName: 'Koşu Ayakkabısı', requestDate: new Date(Date.now() - 86400000), status: 'APPROVED', reason: 'Yanlış beden' },
    { returnId: 'MOCK-RET-3', orderId: 17001, orderItemId: 202, userId: 4, productName: 'Kablosuz Kulaklık', requestDate: new Date(), status: 'REQUESTED', reason: 'Fikrimi değiştirdim' },
];

  constructor(private http: HttpClient) { }

  /**
   * Yeni bir iade talebi oluşturur.
   * @param payload İade talebi detayları
   */
  requestReturn(payload: ReturnRequestPayload): Observable<ReturnResponse> {
    /*
    // === Backend Entegrasyonu: Sunucuya İade Talebi Gönderme ===
    const url = `${API_BASE_URL}/returns`; // Veya /orders/{orderId}/items/{itemId}/return

    console.log("Sending return request to server:", payload);
    return this.http.post<ReturnResponse>(url, payload).pipe(
        tap(response => console.log("Return request response from server:", response)),
        catchError(error => {
            console.error("Error requesting return on server:", error);
            // Kullanıcıya özel hata mesajı döndürmek daha iyi olabilir
            return throwError(() => new Error('İade talebi gönderilirken sunucu hatası oluştu.'));
        })
    );
    // ==========================================================
    */

    // === Mock Implementasyon ===
    console.warn("ReturnService: Using MOCK return request!", payload);
    return of(null).pipe( // Önce null döndürüp delay ile bekleyelim
        delay(800), // 0.8 saniye ağ gecikmesi simülasyonu
        map(() => {
            // Başarı durumunu simüle et
            const mockReturnId = `MOCK-RET-${Date.now()}`;
            const newStatus: ReturnStatus = 'REQUESTED';

            // Mock listeye ekleme (test için, normalde yapılmaz)
             const summary: ReturnRequestSummary = {
                 returnId: mockReturnId,
                 orderId: payload.orderId,
                 orderItemId: payload.orderItemId,
                 productName: `Ürün ID: ${payload.orderItemId}`, // Gerçek isim OrderService'ten alınmalı
                 requestDate: new Date(),
                 status: newStatus,
                 reason: payload.reason
             };
             this.mockReturnRequests.push(summary);
             console.log("Updated mock return requests:", this.mockReturnRequests);
            // ----------------------------------------------------

            const response: ReturnResponse = {
                success: true,
                message: 'İade talebiniz başarıyla alındı (Mock).',
                returnId: mockReturnId,
                newStatus: newStatus
            };
            // İsteğe bağlı: Hata durumunu simüle etmek için false döndürün
            // if (Math.random() < 0.2) { // %20 ihtimalle hata
            //     console.error("Mock return request failed simulation.");
            //     throw new Error('Mock iade talebi gönderilemedi.');
            // }
            return response;
        }),
         catchError(error => { // map içindeki throw'u yakala
              return throwError(() => new Error(error.message || 'Mock iade talebi hatası.'));
         })
    );
    // ==========================
  }

  /**
   * Mevcut kullanıcının iade taleplerini getirir.
   */
  getReturnRequestsForUser(): Observable<ReturnRequestSummary[]> {
     /*
     // === Backend Entegrasyonu: Kullanıcının İade Taleplerini Çekme ===
     // Kullanıcı ID'si AuthInterceptor ile token'dan alınır veya URL'e eklenir.
     const url = `${API_BASE_URL}/returns/my-returns`; // Örnek endpoint

     console.log("Fetching user's return requests from server...");
     return this.http.get<ReturnRequestSummary[]>(url).pipe(
         tap(response => console.log("User return requests received:", response)),
         catchError(error => {
             console.error("Error fetching user return requests:", error);
             return of([]); // Hata durumunda boş liste döndür
         })
     );
     // =============================================================
     */

     // === Mock Implementasyon ===
     console.warn("ReturnService: Using MOCK user return requests!");
     return of(this.mockReturnRequests).pipe(delay(400)); // Hafif gecikme
     // ==========================
  }

    // --- YENİ: Admin için Tüm Talepleri Getirme ---
    getAllReturnRequests(filters?: any): Observable<ReturnRequestSummary[]> {
      /*
      // === Backend Entegrasyonu: Tüm İade Taleplerini Çekme ===
      let params = new HttpParams();
      if (filters?.status) { params = params.set('status', filters.status); }
      if (filters?.userId) { params = params.set('userId', filters.userId); }
      // Diğer filtreler...
      const url = `${API_BASE_URL}/admin/returns`; // Örnek endpoint

      console.log("Fetching all return requests from server for admin...");
      return this.http.get<ReturnRequestSummary[]>(url, { params }).pipe(
          tap(response => console.log("All return requests received:", response)),
          catchError(error => {
              console.error("Error fetching all return requests:", error);
              return of([]); // Hata durumunda boş liste döndür
          })
      );
      // ======================================================
      */

      // === Mock Implementasyon ===
      console.warn("ReturnService: Using MOCK data for all return requests!");
      // Filtreleme eklenebilir:
      let filteredRequests = this.mockReturnRequests;
      if (filters?.status) {
           filteredRequests = filteredRequests.filter(r => r.status === filters.status);
      }
      // ... diğer filtreler ...
      return of([...filteredRequests]).pipe(delay(500)); // Klonlanmış diziyi döndür
      // ==========================
  }
  // ---------------------------------------------------


  // --- YENİ: İade Talebini Onaylama (Admin) ---
  approveReturnRequest(returnId: number | string): Observable<ReturnResponse> {
       /*
       // === Backend Entegrasyonu: Talebi Onaylama ===
       const url = `${API_BASE_URL}/admin/returns/${returnId}/approve`; // Örnek endpoint

       console.log(`Sending approve request for return ID: ${returnId}`);
       return this.http.put<ReturnResponse>(url, {}).pipe( // Genellikle PUT veya POST kullanılır
           tap(response => console.log("Approve response from server:", response)),
           catchError(error => {
               console.error(`Error approving return ${returnId}:`, error);
               return throwError(() => new Error('İade talebi onaylanırken sunucu hatası oluştu.'));
           })
       );
       // ===========================================
       */

       // === Mock Implementasyon ===
       console.warn(`ReturnService: Using MOCK approve for return ID: ${returnId}`);
       const index = this.mockReturnRequests.findIndex(r => r.returnId === returnId);
       if (index > -1 && this.mockReturnRequests[index].status === 'REQUESTED') {
           this.mockReturnRequests[index].status = 'APPROVED';
            console.log("Updated mock return requests:", this.mockReturnRequests);
           const response: ReturnResponse = { success: true, message: 'İade talebi onaylandı (Mock).', returnId: returnId, newStatus: 'APPROVED' };
           return of(response).pipe(delay(600));
       } else {
            const errorMsg = index > -1 ? 'Talep zaten işlem görmüş.' : 'İade talebi bulunamadı.';
           return throwError(() => new Error(errorMsg + ' (Mock)')).pipe(delay(100));
       }
       // ==========================
  }
  // -----------------------------------------------


   // --- YENİ: İade Talebini Reddetme (Admin) ---
   rejectReturnRequest(returnId: number | string, reason?: string): Observable<ReturnResponse> { // Reddetme nedeni eklenebilir
       /*
       // === Backend Entegrasyonu: Talebi Reddetme ===
       const url = `${API_BASE_URL}/admin/returns/${returnId}/reject`; // Örnek endpoint
       const payload = { rejectionReason: reason }; // Backend neden bekliyorsa

       console.log(`Sending reject request for return ID: ${returnId}`);
       return this.http.put<ReturnResponse>(url, payload).pipe( // Genellikle PUT veya POST kullanılır
           tap(response => console.log("Reject response from server:", response)),
           catchError(error => {
               console.error(`Error rejecting return ${returnId}:`, error);
               return throwError(() => new Error('İade talebi reddedilirken sunucu hatası oluştu.'));
           })
       );
       // ===========================================
       */

       // === Mock Implementasyon ===
       console.warn(`ReturnService: Using MOCK reject for return ID: ${returnId}`);
       const index = this.mockReturnRequests.findIndex(r => r.returnId === returnId);
        if (index > -1 && this.mockReturnRequests[index].status === 'REQUESTED') {
           this.mockReturnRequests[index].status = 'REJECTED';
           // this.mockReturnRequests[index].rejectionReason = reason; // Neden saklanabilir
            console.log("Updated mock return requests:", this.mockReturnRequests);
           const response: ReturnResponse = { success: true, message: 'İade talebi reddedildi (Mock).', returnId: returnId, newStatus: 'REJECTED' };
           return of(response).pipe(delay(600));
       } else {
            const errorMsg = index > -1 ? 'Talep zaten işlem görmüş.' : 'İade talebi bulunamadı.';
           return throwError(() => new Error(errorMsg + ' (Mock)')).pipe(delay(100));
       }
       // ==========================
   }

  // İleride eklenebilir: Belirli bir iade talebinin detayını getirme
  // getReturnRequestById(returnId: number | string): Observable<ReturnRequestDetail> { ... }

}
