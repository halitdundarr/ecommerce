// src/app/core/services/auth.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, UserSummary } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment'; // <-- environment import edin

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // --- Backend API URL'si ---
  private readonly AUTH_API_URL = `${environment.apiUrl}/rest/api/registration`; // <-- environment kullanın

  private currentUserSubject = new BehaviorSubject<UserSummary | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuthState();
  }

  // --- initializeAuthState, setAuthState, getUserFromStorage, hasToken, getToken metotları aynı kalabilir ---
  private initializeAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.currentUserSubject.next(this.getUserFromStorage());
      this.loggedInSubject.next(this.hasToken());
      console.log('AuthService initialized on Browser. Initial loggedIn state:', this.loggedInSubject.value);
    } else {
       console.log('AuthService initialized on Server. State remains default.');
    }
  }

  private setAuthState(token: string | null, user: UserSummary | null): void {
    if (isPlatformBrowser(this.platformId)) {
      if (user && token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
    }
    this.currentUserSubject.next(user);
    this.loggedInSubject.next(!!token);
    // Kullanıcı değiştiğinde loglama (debugging için)
    console.log("Current User State Updated:", this.currentUserSubject.value);
    console.log("Logged In State Updated:", this.loggedInSubject.value);
  }

  private getUserFromStorage(): UserSummary | null {
    if (isPlatformBrowser(this.platformId)) {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        try {
          return JSON.parse(userJson);
        } catch (e) {
          console.error('Error parsing user from storage', e);
          localStorage.removeItem('currentUser');
          return null;
        }
      }
      return null;
    } else {
      return null;
    }
  }

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('authToken');
    } else {
      return false;
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('authToken');
    } else {
      return null;
    }
  }
  // -----------------------------------------------------------------------------------------------

  /**
   * Login isteği yapar ve başarılı olursa state'i günceller.
   */
  login(loginRequest: LoginRequest): Observable<LoginResponse> {
    const loginUrl = `${this.AUTH_API_URL}/login`; // login endpoint'i
    console.log(`Attempting login to: ${loginUrl} for user: ${loginRequest.username}`);

    // Backend String döndüğü için responseType: 'text' olarak belirtiyoruz.
    return this.http.post(loginUrl, loginRequest, { responseType: 'text' })
      .pipe(
        map(tokenString => {
          // Gelen string token'ı LoginResponse formatına çeviriyoruz
           console.log("Raw token string received:", tokenString); // Token'ı logla
          if (!tokenString) {
              throw new Error('Login failed: No token received from backend.');
          }
          const response: LoginResponse = { token: tokenString };
          return response;
        }),
        tap(response => {
          if (response && response.token) {
              // Token'ı decode edip kullanıcı bilgilerini alıyoruz
              const user = this.decodeToken(response.token);
               if (!user) {
                   console.error("Failed to decode token or extract user information.");
                   // Hata fırlatmak veya state'i temizlemek gerekebilir
                   this.setAuthState(null, null);
                   throw new Error('Login failed: Could not decode token or extract user info.');
               }
               console.log("Decoded user from token:", user);
              this.setAuthState(response.token, user); // State'i ve localStorage'ı güncelle
              console.log('Login successful, auth state updated.');
          } else {
              this.setAuthState(null, null); // Token yoksa state'i temizle
              console.error('Login response missing token.');
              throw new Error('Login response did not contain a token.');
          }
        }),
        catchError(this.handleError) // Merkezi hata yönetimi
      );
  }

  /**
   * Logout işlemi yapar ve state'i temizler.
   */
  logout(): void {
     this.setAuthState(null, null);
     console.log('Logged out.');
     if (isPlatformBrowser(this.platformId)) {
       this.router.navigate(['/auth/login']); // Login sayfasına yönlendir
     }
  }

  /**
   * Register isteği yapar.
   */
  register(payload: RegisterRequest): Observable<RegisterResponse> {
      const registerUrl = `${this.AUTH_API_URL}/customer`; // customer register endpoint'i
      // Backend Customer entity'si beklediği için ona uygun bir yapı gönderiyoruz
      const backendPayload = {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          username: payload.username,
          password: payload.password,
          role: 'CUSTOMER' // Rolü frontend'den belirliyoruz
      };

      console.log(`Sending registration request to: ${registerUrl}`);
      // Backend Customer entity'si döndüğü için <any> kullanabiliriz
      return this.http.post<any>(registerUrl, backendPayload).pipe(
          map(backendResponse => {
              console.log("Registration response from server:", backendResponse);
              // Yanıtı RegisterResponse modeline map et
              const response: RegisterResponse = {
                  success: true, // 2xx yanıt geldiyse başarılı varsayalım
                  message: 'Kayıt başarılı! Lütfen giriş yapın.',
                  userId: backendResponse?.userId // Yanıtta userId varsa al
              };
              return response;
          }),
          catchError(this.handleError) // Merkezi hata yönetimi
      );
  }

  /**
   * JWT'yi decode edip UserSummary nesnesine dönüştürür.
   * DİKKAT: Backend'in JWT içine gerekli bilgileri (id, firstName, lastName, email, role) eklediğinden emin olun!
   */
   private decodeToken(token: string): UserSummary | null {
       if (!token) {
           return null;
       }
       try {
           const payloadBase64 = token.split('.')[1];
           if (!payloadBase64) {
               console.error('Invalid token structure: Missing payload.');
               return null;
           }
           const payloadJson = atob(payloadBase64);
           const payload = JSON.parse(payloadJson);

            // === ÖNEMLİ: Backend JWT Payload Kontrolü ===
            // Backend JWTService'inizin bu alanları token'a eklediğinden emin olun.
            // Payload'ı loglayarak kontrol edebilirsiniz:
            console.log("Decoded JWT Payload:", payload);

            // UserSummary'yi oluştur
           const user: UserSummary = {
               id: payload.userId || payload.sub, // 'sub' (subject) genellikle kullanıcı ID'sidir
               username: payload.username || payload.sub, // 'username' claim'i varsa kullan
               firstName: payload.firstName || '', // 'firstName' claim'i varsa kullan
               lastName: payload.lastName || '', // 'lastName' claim'i varsa kullan
               email: payload.email || '', // 'email' claim'i varsa kullan
               // 'role' claim'ini alırken 'ROLE_' prefix'ini kaldırın (varsa)
               role: (payload.role || 'CUSTOMER').replace('ROLE_', ''),
               status: payload.status || 'Active' // Varsayılan status
           };

           // Gerekli alanlar var mı kontrolü (en azından ID ve rol)
           if (!user.id || !user.role) {
               console.error('Decoded token is missing required claims (userId/sub or role).');
               return null;
           }

           return user;
       } catch (e) {
           console.error('Error decoding token:', e);
           if (!isPlatformBrowser(this.platformId)) {
              console.warn('atob function might not be available on the server.');
           }
           return null;
       }
   }

  /**
   * Anlık kullanıcı bilgisini döndürür.
   */
  public get currentUserValue(): UserSummary | null {
    return this.currentUserSubject.value;
  }


  /**
   * Merkezi Hata Yönetimi Metodu
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir hata oluştu!'; // Varsayılan mesaj

    if (error.status === 0 || !error.error) {
        // Ağ hatası veya istemci tarafı hata
        console.error('Ağ/İstemci hatası:', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu. Lütfen bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';
    } else {
        // Backend hatası (4xx veya 5xx)
        console.error(`Backend Hata Kodu ${error.status}, Gövde:`, error.error);

        // Backend'den gelen `message` alanını kullanmayı dene (varsa)
        const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);

        if (backendErrorMessage) {
            userMessage = backendErrorMessage;
        } else {
             // Genel durum kodlarına göre mesaj ata
             switch (error.status) {
                 case 400: // Bad Request (Geçersiz istek, validasyon hatası vs.)
                     // Eğer validationErrors varsa daha detaylı mesaj verilebilir
                     if (error.error?.validationErrors) {
                         userMessage = 'Lütfen formdaki hataları düzeltin.'; // Genel validasyon mesajı
                         // İsterseniz ilk hatayı gösterebilirsiniz:
                         // const firstErrorField = Object.keys(error.error.validationErrors)[0];
                         // userMessage = error.error.validationErrors[firstErrorField];
                     } else {
                          userMessage = 'Geçersiz istek. Lütfen bilgilerinizi kontrol edin.';
                     }
                     break;
                 case 401: // Unauthorized (JWT geçersiz, süresi dolmuş veya yok)
                     userMessage = 'Oturumunuz zaman aşımına uğradı veya geçersiz. Lütfen tekrar giriş yapın.';
                     // Otomatik logout ve login'e yönlendirme yapılabilir
                     // this.logout();
                     break;
                 case 403: // Forbidden (Yetki yok)
                     userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
                     break;
                 case 404: // Not Found (Endpoint bulunamadı)
                     userMessage = 'İstenen kaynak sunucuda bulunamadı.';
                     break;
                 case 409: // Conflict (Kullanıcı adı/email zaten var vb.)
                     userMessage = 'İşlem çakışması (Örn: E-posta zaten kayıtlı).';
                     break;
                 case 500: // Internal Server Error
                     userMessage = 'Sunucu tarafında beklenmedik bir hata oluştu.';
                     break;
                 default:
                     userMessage = `Sunucu hatası (${error.status}). Lütfen daha sonra tekrar deneyin.`;
             }
        }
    }

    // Kullanıcıya yönelik hatayı içeren bir observable fırlat.
    // Component'ler bu hatayı yakalayıp kendi errorMessage'larına atayabilir.
    return throwError(() => new Error(userMessage));
  }

} // AuthService sınıfının sonu
