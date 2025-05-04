// src/app/core/services/user.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // HttpParams ekle (gerekirse)
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Address, UserSummary, Profile, ChangePasswordRequest } from '../../shared/models/user.model'; // Profile ve ChangePasswordRequest eklendi
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment'; // <-- environment import et

// --- Backend DTO Arayüzleri (Backend DTO'larına karşılık geliyor) ---
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
}

interface BackendDtoUserSummary {
    userId: number;
    username?: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: string;
    status?: string;
}

// Backend DtoProfile
interface DtoProfile {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    sex?: string; // Enum string olarak gelebilir
    phoneNumber?: string;
    dateOfBirth?: string | Date;
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
    // DİKKAT: Backend UserController /api/users/{userId}/addresses bekliyor.
    // Frontend'in bu path'i kullandığından emin olalım.
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
     // DİKKAT: Backend UserController /api/users/{userId}/addresses bekliyor.
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
      // DİKKAT: Backend UserController /api/users/{userId}/addresses/{addressId} bekliyor.
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
       // DİKKAT: Backend UserController /api/users/{userId}/addresses/{addressId} bekliyor.
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
      // DİKKAT: Backend UserController /api/users/{userId}/addresses/{addressId}/default bekliyor.
      const url = `${this.USER_API_URL}/${userId}/addresses/${addressId}/default`;
      console.log(`Setting address ${addressId} as default for user ${userId}`);

      // Backend List<DtoAddress> döndürüyor
      return this.http.post<BackendDtoAddress[]>(url, {}).pipe(
          map(dtoAddresses => dtoAddresses.map(dto => this.mapDtoAddressToAddress(dto))),
          catchError(this.handleError)
      );
  }

  // --- Profil Güncelleme Metodu ---
  /**
   * Updates the profile information for the currently authenticated user.
   * Sends only the updatable fields defined in the Profile model (excluding id, email).
   */
  updateUserProfile(userId: number | string, profileData: Partial<Profile>): Observable<Profile> {
    // DİKKAT: Backend UserController /api/users/{userId}/profile bekliyor.
    const url = `${this.USER_API_URL}/${userId}/profile`;
    console.log(`Updating profile for user ${userId} at ${url}`);

    const payload: Partial<DtoProfile> = { // Backend DtoProfile bekliyor
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        dateOfBirth: profileData.dateOfBirth,
        sex: profileData.sex as string // Enum'ı string'e cast et (backend string bekliyorsa)
    };

    return this.http.put<DtoProfile>(url, payload).pipe(
      map(dto => this.mapDtoProfileToProfile(dto)), // Dönen DtoProfile'ı Profile'a map et
      catchError(this.handleError)
    );
  }
  // --- ---

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
    banUser(userId: number): Observable<{ success: boolean, profile?: Profile }> {
        const url = `${this.ADMIN_USER_API_URL}/${userId}/ban`;
        console.log(`Banning user ${userId} via ${url}`);
        return this.http.post<DtoProfile>(url, {}).pipe(
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
     * Bir kullanıcının yasağını kaldırır (Admin için).
     * Backend DtoProfile döndürüyor.
     */
    unbanUser(userId: number): Observable<{ success: boolean, profile?: Profile }> {
        const url = `${this.ADMIN_USER_API_URL}/${userId}/unban`;
        console.log(`Unbanning user ${userId} via ${url}`);
        return this.http.post<DtoProfile>(url, {}).pipe(
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
            map(() => ({ success: true })),
            catchError(err => {
                this.handleError(err);
                return of({ success: false });
            })
        );
    }

    /**
     * Kullanıcı ID'sine göre özet bilgi getirir (Admin için).
     */
    getUserById(userId: number | string): Observable<UserSummary | undefined> {
        // DİKKAT: Bu endpoint admin yetkisi gerektirir. Backend Controller'da var mı?
        // AdminUserController'da GET /{userId} yok. GET /api/admin/users tümünü listeliyor.
        // Belki GET /api/users/{userId}/profile kullanılabilir ama o DtoProfile döndürür.
        // Şimdilik GET /api/admin/users kullanıp filtrelemeyi deneyelim (çok verimsiz)
        // VEYA backend'e /api/admin/users/{userId} eklenmeli.
        // Geçici çözüm:
        // const url = `${this.ADMIN_USER_API_URL}/${userId}`; // Varsayılan endpoint
        // console.log(`Workspaceing user summary for ID: ${userId} via ${url}`);
        // return this.http.get<BackendDtoUserSummary>(url).pipe( // Backend DTO'dan map et
        //     map(dto => this.mapDtoUserSummaryToUserSummary(dto)),
        //     catchError(err => {
        //         if (err.status === 404) return of(undefined);
        //         return this.handleError(err);
        //     })
        // );
        // Daha iyi çözüm: Tüm kullanıcıları alıp filtrele (eğer backend'de tekil endpoint yoksa)
        return this.getAllUsers().pipe(
            map(users => users.find(user => user.id === +userId)), // ID'ye göre filtrele
             catchError(err => {
                 return this.handleError(err); // Hata yönetimi
             })
        );
    }


    /**
     * Giriş yapmış kullanıcının şifresini değiştirir.
     * Backend'de /api/users/change-password veya /api/users/{userId}/password olmalı.
     * Frontend ChangePasswordComponent /api/users/change-password çağırıyor.
     * Backend UserController /api/users/{userId}/password bekliyor.
     * Bu metodu frontend'in çağırdığı yola göre ayarlayalım.
     */
    changePassword(payload: ChangePasswordRequest): Observable<void> {
      // DİKKAT: Backend endpoint'i ile frontend çağrısı eşleşmeli.
      // Şimdilik frontend'in çağırdığı varsayılan yolu kullanalım.
      // Belki bir interceptor userId ekliyordur? Ya da backend'de principal'dan alınıyordur.
      // Eğer backend /api/users/{userId}/password bekliyorsa URL'yi ona göre düzeltmeliyiz.
      const url = `${this.API_BASE_URL}/api/users/change-password`; // Frontend'in çağırdığı yol
      console.log("Sending password change request to:", url);
      return this.http.post<void>(url, payload).pipe(
          catchError(this.handleError)
      );
    }

  // --- DTO <-> Model Dönüşüm Yardımcıları ---

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
      // Backend DTO'sunda olmayan alanları (addressTitle, firstName, lastName) gönderme
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
      };
  }

  /**
   * Backend Kullanıcı Özeti DTO'sunu Frontend Kullanıcı Özeti Modeline çevirir.
   */
  private mapDtoUserSummaryToUserSummary(dto: BackendDtoUserSummary): UserSummary {
        return {
            id: dto.userId,
            username: dto.username,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email ?? '',
            role: (dto.role as any) ?? 'CUSTOMER',
            status: (dto.status as any) ?? 'Active'
        };
  }

   /**
    * Backend DtoProfile'ı Frontend Profile modeline çevirir.
    */
   private mapDtoProfileToProfile(dto: DtoProfile): Profile {
       const currentUser = this.authService.currentUserValue; // Mevcut kullanıcı ID'si için
       return {
           id: currentUser?.id ?? 0, // ID DTO'dan gelmiyor, mevcut kullanıcıdan al
           email: dto.email ?? '',
           firstName: dto.firstName ?? '',
           lastName: dto.lastName ?? '',
           phoneNumber: dto.phoneNumber,
           // DTO'dan gelen diğer alanları ekle (dateOfBirth, sex)
           dateOfBirth: dto.dateOfBirth,
           sex: dto.sex as any, // String'i enum'a cast et (frontend enum bekliyorsa)
           // Adresler ayrı yönetiliyor
           addresses: []
       };
   }


  /**
   * Merkezi Hata Yönetimi Metodu
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
           // Özel hata mesajlarını burada yakalayabiliriz
           if (userMessage.toLowerCase().includes('incorrect old password')) {
                userMessage = 'Girdiğiniz mevcut şifre hatalı.';
            }
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
