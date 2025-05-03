// src/app/core/services/user.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // HttpParams ekle (gerekirse)
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Address, UserSummary, Profile } from '../../shared/models/user.model'; // Profile ekle
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment'; // <-- environment import et

// --- Backend DTO Arayüzleri (Mevcut olanlar iyi görünüyor, backend DTO'larına karşılık geliyor) ---
interface BackendDtoAddress {
    addressId: number;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
    isDefault: boolean;
    isBilling: boolean;
    isShipping: boolean;
    // addressTitle, firstName, lastName frontend modelinde var, DTO'da yok. Map fonksiyonu bunu yönetiyor.
}

interface BackendDtoUserSummary { // Admin user listesi için
    userId: number; // Backend'de DtoUserSummary userId içeriyor
    username?: string;
    firstName: string;
    lastName: string;
    email?: string; // Backend'de DtoUserSummary'de email yok, eklenmeli veya frontend modeli güncellenmeli
    role?: string; // Backend'de DtoUserSummary'de role yok, eklenebilir veya admin listesi için ayrı DTO kullanılabilir
    status?: string; // Backend'de DtoUserSummary'de status yok
}

// Backend DtoProfile (ban/unban yanıtı için)
interface BackendDtoProfile {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    sex?: string; // Enum string olarak gelebilir
    phoneNumber?: string;
    dateOfBirth?: string | Date;
    // addresses?: BackendDtoAddress[]; // Adresler ayrı yönetiliyor
    status?: string; // Yasaklama durumu için önemli
}


@Injectable({
  providedIn: 'root'
})
export class UserService {

  // API URL Sabitleri (environment'dan alınacak)
  private readonly API_BASE_URL = environment.apiUrl; // <-- environment kullan
  private readonly USER_API_URL = `${this.API_BASE_URL}/api/users`;
  private readonly ADMIN_USER_API_URL = `${this.API_BASE_URL}/api/admin/users`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService
  ) { }

  // --- Adres Yönetimi Metotları (Backend Bağlantılı) ---

  /**
   * Giriş yapmış kullanıcının adreslerini getirir.
   */
  getUserAddresses(): Observable<Address[]> {
    const userId = this.authService.currentUserValue?.id;
    if (!userId) {
        console.warn('Cannot get addresses: User not logged in.');
        return of([]);
    }
    const url = `${this.USER_API_URL}/${userId}/addresses`;
    console.log(`Workspaceing addresses for user ${userId} from ${url}`);

    return this.http.get<BackendDtoAddress[]>(url).pipe(
      map(dtoAddresses => dtoAddresses.map(dto => this.mapDtoAddressToAddress(dto))),
      catchError(this.handleError)
    );
  }

  /**
   * Giriş yapmış kullanıcı için yeni bir adres ekler.
   */
  addAddress(address: Omit<Address, 'id'>): Observable<Address> {
     const userId = this.authService.currentUserValue?.id;
     if (!userId) {
         return throwError(() => new Error('Adres eklemek için giriş yapmalısınız.'));
     }

     console.log('Adding address for user', userId);
     const dtoPayload: Partial<BackendDtoAddress> = this.mapAddressToDtoAddressForSave(address);
     const url = `${this.USER_API_URL}/${userId}/addresses`;

     return this.http.post<BackendDtoAddress>(url, dtoPayload).pipe(
         map(savedDto => this.mapDtoAddressToAddress(savedDto)),
         catchError(this.handleError)
     );
  }

  /**
   * Mevcut bir adresi günceller.
   */
  updateAddress(address: Address): Observable<Address> {
      const userId = this.authService.currentUserValue?.id;
      if (!userId || !address.id) {
          return throwError(() => new Error('Adres güncellemek için kullanıcı girişi ve adres ID gereklidir.'));
      }
      const url = `${this.USER_API_URL}/${userId}/addresses/${address.id}`;
      const dtoPayload: Partial<BackendDtoAddress> = this.mapAddressToDtoAddressForSave(address);
      console.log(`Updating address ${address.id} for user ${userId}`);

      return this.http.put<BackendDtoAddress>(url, dtoPayload).pipe(
          map(updatedDto => this.mapDtoAddressToAddress(updatedDto)),
          catchError(this.handleError)
      );
  }

  /**
   * Bir adresi siler.
   */
  deleteAddress(addressId: number): Observable<void> {
      const userId = this.authService.currentUserValue?.id;
      if (!userId) {
          return throwError(() => new Error('Adres silmek için kullanıcı girişi gereklidir.'));
      }
      const url = `${this.USER_API_URL}/${userId}/addresses/${addressId}`;
      console.log(`Deleting address ${addressId} for user ${userId}`);

      return this.http.delete<void>(url).pipe(
          catchError(this.handleError)
      );
  }

  /**
   * Bir adresi varsayılan olarak ayarlar.
   */
  setDefaultAddress(addressId: number): Observable<Address[]> {
      const userId = this.authService.currentUserValue?.id;
      if (!userId) {
          return throwError(() => new Error('Varsayılan adres ayarlamak için kullanıcı girişi gereklidir.'));
      }
      const url = `${this.USER_API_URL}/${userId}/addresses/${addressId}/default`;
      console.log(`Setting address ${addressId} as default for user ${userId}`);

      // Backend List<DtoAddress> döndürüyor
      return this.http.post<BackendDtoAddress[]>(url, {}).pipe(
          map(dtoAddresses => dtoAddresses.map(dto => this.mapDtoAddressToAddress(dto))),
          catchError(this.handleError)
      );
  }


    // --- Kullanıcı Yönetimi Metotları (Admin - Backend Bağlantılı) ---

    /**
     * Tüm kullanıcıların özet bilgisini getirir (Admin için).
     */
    getAllUsers(): Observable<UserSummary[]> {
      console.log(`Workspaceing all users from: ${this.ADMIN_USER_API_URL}`);
      // Backend List<DtoUserSummary> döndürüyor
      return this.http.get<BackendDtoUserSummary[]>(this.ADMIN_USER_API_URL).pipe(
          map(dtoSummaries => dtoSummaries.map(dto => this.mapDtoUserSummaryToUserSummary(dto))),
          catchError(this.handleError)
      );
    }

    /**
     * Bir kullanıcıyı yasaklar (Admin için).
     * Backend DtoProfile döndürüyor.
     */
    banUser(userId: number): Observable<{ success: boolean, profile?: Profile }> { // Profil bilgisi de dönebilir
        const url = `${this.ADMIN_USER_API_URL}/${userId}/ban`;
        console.log(`Banning user ${userId} via ${url}`);
        // Backend DtoProfile döndürüyor
        return this.http.post<BackendDtoProfile>(url, {}).pipe(
             map(profileDto => ({
                 success: true,
                 profile: this.mapDtoProfileToProfile(profileDto) // DtoProfile'i frontend modeline çevir
             })),
             catchError(err => {
                 this.handleError(err); // Hata loglama ve genel mesaj için
                 return of({ success: false }); // Component'e başarısızlık bilgisi dön
             })
         );
    }

    /**
     * Bir kullanıcının yasağını kaldırır (Admin için).
     * Backend DtoProfile döndürüyor.
     */
    unbanUser(userId: number): Observable<{ success: boolean, profile?: Profile }> {
        const url = `${this.ADMIN_USER_API_URL}/${userId}/unban`;
        console.log(`Unbanning user ${userId} via ${url}`);
        return this.http.post<BackendDtoProfile>(url, {}).pipe(
             map(profileDto => ({
                 success: true,
                 profile: this.mapDtoProfileToProfile(profileDto)
             })),
             catchError(err => {
                 this.handleError(err);
                 return of({ success: false });
             })
         );
    }

    /**
     * Bir kullanıcıyı siler (Admin için).
     * Backend 204 No Content veya hata döndürür.
     */
    deleteUserForAdmin(userId: number): Observable<{ success: boolean }> {
        const url = `${this.ADMIN_USER_API_URL}/${userId}`;
        console.log(`Deleting user ${userId} via ${url}`);
        return this.http.delete<void>(url).pipe(
            map(() => ({ success: true })), // Başarılı olursa true dön
            catchError(err => {
                this.handleError(err); // Hata loglama
                return of({ success: false }); // Başarısızlık durumu
            })
        );
    }

  // --- DTO <-> Model Dönüşüm Yardımcıları (Mevcutlar korunuyor ve Profile ekleniyor) ---

  /**
   * Backend Adres DTO'sunu Frontend Adres Modeline çevirir.
   */
  private mapDtoAddressToAddress(dto: BackendDtoAddress): Address {
      // Mevcut kullanıcı bilgisini alarak ad/soyad ekleyelim (varsa)
      const currentUser = this.authService.currentUserValue;
      return {
          id: dto.addressId,
          street: dto.street,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          phoneNumber: dto.phoneNumber ?? '',
          isDefault: dto.isDefault,
          isBilling: dto.isBilling,
          isShipping: dto.isShipping,
          // Bu alanlar DTO'da yok, varsayılan veya kullanıcıdan alınabilir
          addressTitle: `Adres ${dto.addressId}`, // Örnek başlık
          firstName: currentUser?.firstName ?? '...',
          lastName: currentUser?.lastName ?? '...'
      };
  }

  /**
   * Frontend Adres Modelini Backend Adres DTO'suna (kaydetme/güncelleme için) çevirir.
   */
   private mapAddressToDtoAddressForSave(address: Omit<Address, 'id'>): Partial<BackendDtoAddress> {
      return {
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          phoneNumber: address.phoneNumber,
          isDefault: address.isDefault,
          isBilling: address.isBilling,
          isShipping: address.isShipping
          // addressTitle, firstName, lastName backend DTO'da yok
      };
  }

  /**
   * Backend Kullanıcı Özeti DTO'sunu Frontend Kullanıcı Özeti Modeline çevirir.
   * Backend DTO'sunun `role` ve `status` içerdiğini varsayıyoruz (AdminUserController.java kontrol edilmeli).
   * Mevcut BackendDtoUserSummary'de bunlar yok, bu yüzden optional (?) bırakıldı.
   */
  private mapDtoUserSummaryToUserSummary(dto: BackendDtoUserSummary): UserSummary {
        return {
            id: dto.userId,
            username: dto.username,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email ?? '', // DTO'da email opsiyonel olabilir
            role: (dto.role as any) ?? 'CUSTOMER', // DTO'da rol yoksa varsayılan ata
            status: (dto.status as any) ?? 'Active' // DTO'da status yoksa varsayılan ata
        };
  }

   /**
    * Backend DtoProfile'ı Frontend Profile modeline çevirir (ban/unban yanıtı için).
    */
   private mapDtoProfileToProfile(dto: BackendDtoProfile): Profile {
       return {
           id: 0, // DtoProfile'da ID yok, backend User'dan alınmalıydı. Şimdilik 0.
           email: dto.email ?? '',
           firstName: dto.firstName ?? '',
           lastName: dto.lastName ?? '',
           phoneNumber: dto.phoneNumber,
           // addresses: dto.addresses?.map(a => this.mapDtoAddressToAddress(a)), // Adresler ayrı yönetiliyor
           // Diğer Profile alanları DtoProfile'dan map edilebilir (sex, dateOfBirth)
       };
   }


  /**
   * Merkezi Hata Yönetimi Metodu (AuthService'deki ile aynı yapıda)
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir kullanıcı işlemi hatası oluştu!';

    if (error.status === 0 || !error.error) {
      console.error('Ağ/İstemci hatası (UserService):', error.message || error);
      userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
    } else {
      console.error(`Backend Hatası ${error.status} (UserService), Gövde:`, error.error);
      const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);

      if (backendErrorMessage) {
          userMessage = backendErrorMessage;
      } else {
           switch (error.status) {
               case 400: userMessage = 'Geçersiz istek.'; break;
               case 401: userMessage = 'Giriş yapmanız gerekiyor.'; break;
               case 403: userMessage = 'Bu işlem için yetkiniz yok.'; break;
               case 404: userMessage = 'Kaynak bulunamadı (Örn: Kullanıcı veya adres).'; break;
               case 409: userMessage = 'İşlem çakışması.'; break;
               case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
               default: userMessage = `Sunucu hatası (${error.status}).`;
           }
      }
    }
    return throwError(() => new Error(userMessage));
  }

} // UserService sınıfının sonu
