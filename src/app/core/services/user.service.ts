// src/app/core/services/user.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'; // isPlatformBrowser importu
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // HttpClient ve HttpErrorResponse importları
import { Observable, of, throwError } from 'rxjs'; // throwError importu
import { delay, tap, catchError, map } from 'rxjs/operators'; // Gerekli RxJS operatörleri
import { Address, UserSummary } from '../../shared/models/user.model'; // Frontend Modelleri
import { AuthService } from './auth.service'; // AuthService importu

// --------------------------------------------------
// --- Backend DTO Arayüzleri (API Yanıtları İçin) ---
// --------------------------------------------------
interface BackendDtoAddress {
    addressId: number;
    street: string;
    city: string;
    state?: string;
    postalCode: string; // Backend DTO'sunda var
    country: string;
    phoneNumber?: string;
    isDefault: boolean;
    isBilling: boolean;
    isShipping: boolean;
    // Not: Backend DTO'sunda ad/soyad olmadığı varsayılıyor.
}

interface BackendDtoUserSummary { // Admin user listesi için
    id: number;
    username?: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string; // 'CUSTOMER' | 'SELLER' | 'ADMIN'
    status?: string; // 'Active' | 'Banned'
}

// --------------------------------------------------
// --- Servis Başlangıcı ---
// --------------------------------------------------
@Injectable({
  providedIn: 'root'
})
export class UserService {

  // Mock Admin Kullanıcı Listesi (backend bağlanana kadar)
   private mockUsers: UserSummary[] = [
      { id: 3, username: 'customeruser', firstName: 'Customer', lastName: 'User', email: 'customer@example.com', role: 'CUSTOMER', status: 'Active' },
      { id: 2, username: 'selleruser', firstName: 'Seller', lastName: 'User', email: 'seller@example.com', role: 'SELLER', status: 'Active' },
      { id: 1, username: 'adminuser', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'ADMIN', status: 'Active' },
      { id: 4, username: 'banneduser', firstName: 'Banned', lastName: 'Person', email: 'banned@example.com', role: 'CUSTOMER', status: 'Banned' },
      { id: 5, username: 'testuser', firstName: 'Test', lastName: 'Testoğlu', email: 'test@test.com', role: 'CUSTOMER', status: 'Active' },
   ];

  // API URL Sabitleri
  private readonly USER_API_URL = 'http://localhost:8080/api/users'; // Kullanıcı endpoint base
  private readonly ADMIN_USER_API_URL = 'http://localhost:8080/api/admin/users'; // Admin kullanıcı endpoint base

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService // AuthService inject edildi
  ) { }

  // --- Adres Yönetimi Metotları (Backend Bağlantılı) ---

  /**
   * Giriş yapmış kullanıcının adreslerini getirir.
   */
  getUserAddresses(): Observable<Address[]> {
    const userId = this.authService.currentUserValue?.id;
    if (!userId) {
        console.warn('Cannot get addresses: User not logged in.');
        return of([]); // Kullanıcı yoksa veya ID alınamadıysa boş dön
    }
    const url = `${this.USER_API_URL}/${userId}/addresses`;
    console.log(`Workspaceing addresses for user ${userId} from ${url}`);

    // Backend'den BackendDtoAddress dizisi bekle
    return this.http.get<BackendDtoAddress[]>(url).pipe(
      map(dtoAddresses => dtoAddresses.map(dto => this.mapDtoAddressToAddress(dto))), // DTO -> Model
      catchError(this.handleError) // Hata yönetimi
    );
  }

  /**
   * Giriş yapmış kullanıcı için yeni bir adres ekler.
   * @param address Eklemek için frontend Address modeli (id hariç)
   * @returns Eklenen adresin frontend modeli
   */
  addAddress(address: Omit<Address, 'id'>): Observable<Address> {
     const userId = this.authService.currentUserValue?.id;
     if (!userId) {
         return throwError(() => new Error('Adres eklemek için giriş yapmalısınız.'));
     }

     console.log('Adding address for user', userId);
     // Frontend modelini backend DTO'suna çevir (kaydetme için)
     const dtoPayload: Partial<BackendDtoAddress> = this.mapAddressToDtoAddressForSave(address);
     const url = `${this.USER_API_URL}/${userId}/addresses`;

     // Backend'den BackendDtoAddress bekle
     return this.http.post<BackendDtoAddress>(url, dtoPayload).pipe(
         map(savedDto => this.mapDtoAddressToAddress(savedDto)), // DTO -> Model
         catchError(this.handleError)
     );
  }

    // --- Kullanıcı Yönetimi Metotları (Admin - Backend Bağlantılı) ---

    /**
     * Tüm kullanıcıların özet bilgisini getirir (Admin için).
     */
    getAllUsers(): Observable<UserSummary[]> {
      // TODO: Backend endpoint'ini doğrula (örn: /api/admin/users)
      console.log('Fetching all users for admin...');
      return this.http.get<BackendDtoUserSummary[]>(this.ADMIN_USER_API_URL).pipe(
          map(dtoSummaries => dtoSummaries.map(dto => this.mapDtoUserSummaryToUserSummary(dto))), // DTO -> Model
          catchError(this.handleError)
      );
      // Mock Data (Backend hazır olana kadar):
      // console.warn("UserService: Using MOCK user list for admin!");
      // return of(this.mockUsers).pipe(delay(400));
    }

    /**
     * Bir kullanıcıyı yasaklar (Admin için).
     * @param userId Yasaklanacak kullanıcının ID'si
     */
    banUser(userId: number): Observable<{ success: boolean }> {
        // TODO: Backend endpoint'ini doğrula (örn: /api/admin/users/{userId}/ban)
        console.log(`Banning user ${userId} (Admin)`);
        const url = `${this.ADMIN_USER_API_URL}/${userId}/ban`;
        // Backend genellikle güncellenmiş kullanıcı veya sadece başarı durumu döner
        return this.http.post<{ success?: boolean, message?: string } | BackendDtoUserSummary>(url, {}).pipe(
             // Yanıtın yapısına göre map'leme yap
             map(response => ({ success: true })), // Sadece 2xx yanıt geldiyse başarılı sayalım
             catchError(err => {
                 this.handleError(err); // Hata loglama
                 return of({ success: false }); // Başarısızlık durumu
             })
         );
        // Mock Data (Backend hazır olana kadar):
        /*
        console.warn(`UserService: Mock BAN for user ID: ${userId}`);
        const userIndex = this.mockUsers.findIndex(u => u.id === userId);
        if (userIndex > -1) {
          if (this.mockUsers[userIndex].role === 'ADMIN') {
              console.error("Admin user cannot be banned.");
              return of({ success: false }).pipe(delay(100));
          }
          this.mockUsers[userIndex].status = 'Banned';
          console.log('Mock user list updated:', this.mockUsers);
          return of({ success: true }).pipe(delay(300));
        }
        console.error(`User with ID ${userId} not found for banning.`);
        return of({ success: false }).pipe(delay(100));
        */
    }

    /**
     * Bir kullanıcının yasağını kaldırır (Admin için).
     * @param userId Yasağı kaldırılacak kullanıcının ID'si
     */
    unbanUser(userId: number): Observable<{ success: boolean }> {
        // TODO: Backend endpoint'ini doğrula (örn: /api/admin/users/{userId}/unban)
        console.log(`Unbanning user ${userId} (Admin)`);
        const url = `${this.ADMIN_USER_API_URL}/${userId}/unban`;
        return this.http.post<{ success?: boolean, message?: string } | BackendDtoUserSummary>(url, {}).pipe(
             map(response => ({ success: true })),
             catchError(err => {
                 this.handleError(err);
                 return of({ success: false });
             })
         );
        // Mock Data (Backend hazır olana kadar):
        /*
        console.warn(`UserService: Mock UNBAN for user ID: ${userId}`);
        const userIndex = this.mockUsers.findIndex(u => u.id === userId);
        if (userIndex > -1) {
          this.mockUsers[userIndex].status = 'Active';
          console.log('Mock user list updated:', this.mockUsers);
          return of({ success: true }).pipe(delay(300));
        }
         console.error(`User with ID ${userId} not found for unbanning.`);
        return of({ success: false }).pipe(delay(100));
        */
    }


  // --- DTO <-> Model Dönüşüm Yardımcıları ---

  /**
   * Backend Adres DTO'sunu Frontend Adres Modeline çevirir.
   * NOT: Ad/Soyad bilgisi DTO'da yoksa, bu bilgiler eksik kalacaktır.
   * Component'in bu bilgiyi ayrıca (örn: user bilgisinden) alması gerekebilir.
   */
  private mapDtoAddressToAddress(dto: BackendDtoAddress): Address {
      return {
          id: dto.addressId,
          street: dto.street,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode, // Frontend Address modelinde bu alanın var olduğundan emin ol!
          country: dto.country,
          phoneNumber: dto.phoneNumber ?? '',
          isDefault: dto.isDefault,
          isBilling: dto.isBilling,
          isShipping: dto.isShipping,
          // Bu alanlar frontend modeline özgü, backend DTO'da yok
          addressTitle: 'Adres', // Varsayılan veya hesaplanmalı
          firstName: '...', // Kullanıcıdan alınmalı
          lastName: '...'   // Kullanıcıdan alınmalı
      };
  }

  /**
   * Frontend Adres Modelini Backend Adres DTO'suna (kaydetme/güncelleme için) çevirir.
   */
   private mapAddressToDtoAddressForSave(address: Omit<Address, 'id'>): Partial<BackendDtoAddress> {
      // Backend'in beklediği alanları frontend modelinden map et
      // addressId, createdAt, updatedAt gibi alanlar gönderilmez
      return {
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode, // Frontend modelinde olmalı
          country: address.country,
          phoneNumber: address.phoneNumber,
          isDefault: address.isDefault,
          isBilling: address.isBilling,
          isShipping: address.isShipping
          // addressTitle backend DTO'da yok
          // firstName, lastName backend DTO'da yok
      };
  }

  /**
   * Backend Kullanıcı Özeti DTO'sunu Frontend Kullanıcı Özeti Modeline çevirir.
   */
  private mapDtoUserSummaryToUserSummary(dto: BackendDtoUserSummary): UserSummary {
        return {
            id: dto.id,
            username: dto.username,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email, // Backend DTO'sunda email var mı? Ekledim.
            role: dto.role as any, // 'CUSTOMER' | 'SELLER' | 'ADMIN' | string; type casting
            status: dto.status as any // 'Active' | 'Banned' | string; type casting
        };
  }


  // --- Genel Hata Yönetimi ---
// Bu fonksiyonu ilgili tüm servis dosyalarındaki mevcut handleError ile değiştirin
private handleError(error: HttpErrorResponse): Observable<never> {
  let userMessage = 'Bilinmeyen bir hata oluştu!'; // Varsayılan mesaj

  // Hatanın istemci/ağ kaynaklı mı yoksa backend kaynaklı mı olduğunu kontrol et
  if (error.status === 0 || !error.error) {
      // status === 0 genellikle ağ hatası veya CORS sorunudur.
      // error.error'ın null olması da istemci tarafı bir sorun olabilir.
      console.error('Bir ağ/istemci hatası oluştu:', error.message || error);
      userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu. Lütfen bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';

  } else {
      // Backend başarısız bir yanıt kodu döndürdü (4xx veya 5xx).
      console.error(
          `Backend Hata Kodu ${error.status}, ` +
          `Gövde: ${JSON.stringify(error.error)}`); // Hata gövdesini logla

      // Kullanıcıya gösterilecek mesajı belirle
      // Backend'den gelen `message` alanını kullanmayı dene (ErrorResponse DTO'sundan)
      const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);

      if (backendErrorMessage) {
          userMessage = backendErrorMessage; // Backend'in mesajını kullan
      } else {
           // Genel durum kodlarına göre mesaj ata
           switch (error.status) {
               case 400:
                   userMessage = 'Geçersiz istek. Lütfen gönderdiğiniz bilgileri kontrol edin.';
                   break;
               case 401:
                   userMessage = 'Giriş yapmanız gerekiyor.';
                   break;
               case 403:
                   userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
                   break;
               case 404:
                   userMessage = 'İstenen kaynak bulunamadı.';
                   break;
               case 409:
                   userMessage = 'İşlem çakışması (örneğin, kayıt zaten var veya stok yetersiz).';
                   break;
               case 500:
                   userMessage = 'Sunucu tarafında beklenmedik bir hata oluştu.';
                   break;
               default:
                   userMessage = `Sunucu hatası (${error.status}). Lütfen daha sonra tekrar deneyin.`;
           }
      }
  }

  // Kullanıcıya yönelik hatayı içeren bir observable fırlat.
  return throwError(() => new Error(userMessage));
}

} // UserService sınıfının sonu
