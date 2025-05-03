// src/app/core/services/auth.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // HttpClient ve HttpErrorResponse import edildi
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, delay, map } from 'rxjs/operators';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, UserSummary } from '../../shared/models/user.model'; // Modeller import edildi

// Backend API URL'si (backendSpring.txt'deki controller path'ine göre)
const AUTH_API_URL = 'http://localhost:8080/rest/api/registration'; // <<<--- API URL'si tanımlandı

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private currentUserSubject = new BehaviorSubject<UserSummary | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private http: HttpClient, // HttpClient inject edildi
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuthState();
  }

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

  /**
   * Login isteği yapar ve başarılı olursa state'i günceller.
   */
  login(loginRequest: LoginRequest): Observable<LoginResponse> {
    // Backend String döndüğü için responseType: 'text' olarak belirtiyoruz.
    return this.http.post(`${AUTH_API_URL}/login`, loginRequest, { responseType: 'text' })
      .pipe(
        map(tokenString => {
          // Gelen string token'ı LoginResponse formatına çeviriyoruz
          const response: LoginResponse = { token: tokenString };
          return response;
        }),
        tap(response => {
          if (response && response.token) {
              // Token'ı decode edip kullanıcı bilgilerini alıyoruz (decodeToken varsayılan JWT yapısını bekliyor)
              const user = this.decodeToken(response.token);
              this.setAuthState(response.token, user); // State'i ve localStorage'ı güncelle
              if(isPlatformBrowser(this.platformId)) {
                 console.log('Login successful, token stored.');
              } else {
                 console.log('Login successful on server, state updated in memory.');
              }
          } else {
              this.setAuthState(null, null); // Token yoksa state'i temizle
              console.error('Login response missing token.');
              // Hata fırlatmak daha iyi olabilir
              throw new Error('Login response did not contain a token.');
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Login API call failed:', error);
          this.setAuthState(null, null); // Hata durumunda state'i temizle
          // Hata mesajını daha anlamlı hale getirebiliriz
          let errorMessage = 'Giriş sırasında bir sunucu hatası oluştu.';
          if (error.status === 401 || error.status === 400) { // Unauthorized veya Bad Request (Backend'e göre değişebilir)
            errorMessage = 'Kullanıcı adı veya şifre hatalı.';
          } else if (error.error && typeof error.error === 'string') {
             // Backend direkt hata mesajı string olarak dönüyorsa
             errorMessage = error.error;
          }
          // Hata objesini fırlatıyoruz ki component yakalayabilsin
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  logout(): void {
     this.setAuthState(null, null);
     if (isPlatformBrowser(this.platformId)) {
       console.log('Logged out.');
       this.router.navigate(['/auth/login']);
     } else {
        console.log('Logout processed on server, state cleared in memory.');
     }
  }

  /**
   * Register isteği yapar.
   */
  register(payload: RegisterRequest): Observable<RegisterResponse> { // RegisterResponse veya any kullanabilirsiniz
      // Backend Customer entity'si beklediği için ona uygun bir yapı gönderiyoruz
      // Not: Bu ideal değil, backend'in DTO beklemesi daha iyi olurdu.
      const backendPayload = {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          username: payload.username, // username alanını gönderiyoruz
          password: payload.password,
          role: 'CUSTOMER' // Rolü frontend'den belirliyoruz (veya backend atamalı)
          // Diğer User/Customer alanları backend'de default değer alabilir
      };

      console.log("Sending registration request to server:", backendPayload);
      // Backend Customer entity'si döndüğü için <any> kullanabilir veya <DtoProfile> gibi bir DTO tanımlayabiliriz.
      return this.http.post<any>(`${AUTH_API_URL}/customer`, backendPayload).pipe(
          map(backendResponse => {
              // Başarılı yanıt geldiğini varsayıyoruz (2xx).
              // Backend'den gelen yanıtı şu an için kullanmıyoruz, sadece başarı durumu önemli.
              console.log("Registration response from server:", backendResponse);
              const response: RegisterResponse = {
                  success: true,
                  message: 'Kayıt başarılı! Lütfen giriş yapın.',
                  userId: backendResponse?.userId // Backend yanıtta userId dönüyorsa alabiliriz
              };
              return response;
          }),
          catchError((error: HttpErrorResponse) => {
              console.error("Error during registration on server:", error);
              let errorMessage = 'Kayıt sırasında bir sunucu hatası oluştu.';
              // Backend'den gelen hata mesajını kullanmaya çalışalım
              if (error.error && typeof error.error.message === 'string') {
                  errorMessage = error.error.message;
              } else if (error.status === 409 || error.status === 400) { // Conflict or Bad Request (Örn: email already exists)
                  errorMessage = 'Bu e-posta adresi zaten kullanılıyor veya bilgiler geçersiz.';
              } else if (error.error && typeof error.error === 'string') {
                  errorMessage = error.error; // Backend direkt mesaj dönüyorsa
              }
              return throwError(() => new Error(errorMessage));
          })
      );
  }

  // --- Mock Login Metotları (Test için kalabilir) ---
  loginAsAdmin(): void {
    const mockAdminUser: UserSummary = { id: 1, username: 'adminuser', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'ADMIN' };
    const fakeToken = 'fake-admin-jwt-token';
    this.setAuthState(fakeToken, mockAdminUser);
    console.log('--- MOCK LOGIN: Logged in as ADMIN ---');
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(['/admin']);
    }
  }
  loginAsSeller(): void {
    const mockSellerUser: UserSummary = { id: 2, username: 'selleruser', firstName: 'Seller', lastName: 'User', email: 'seller@example.com', role: 'SELLER' };
    const fakeToken = 'fake-seller-jwt-token';
    this.setAuthState(fakeToken, mockSellerUser);
    console.log('--- MOCK LOGIN: Logged in as SELLER ---');
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(['/seller']);
    }
  }
  loginAsCustomer(): void {
    const mockCustomerUser: UserSummary = { id: 3, username: 'customeruser', firstName: 'Customer', lastName: 'User', email: 'customer@example.com', role: 'CUSTOMER' };
    const fakeToken = 'fake-customer-jwt-token';
    this.setAuthState(fakeToken, mockCustomerUser);
    console.log('--- MOCK LOGIN: Logged in as CUSTOMER ---');
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(['/']);
    }
  }
  // --- Mock Login Metotları Sonu ---


  private decodeToken(token: string): UserSummary | null {
      try {
          // Token'ın payload kısmını (ortadaki) alıp base64'ten decode ediyoruz
          const payloadBase64 = token.split('.')[1];
          const payloadJson = atob(payloadBase64); // Base64 decode
          const payload = JSON.parse(payloadJson); // JSON parse

          // Payload içindeki beklenen alanları UserSummary modeline map ediyoruz
          // Backend JWT servisinde bu alanların payload'a eklendiğinden emin olmalısın!
          // Örneğin: userId, username, firstName, lastName, email, role
          return {
              id: payload.userId || payload.sub, // userId veya sub (subject) olabilir
              username: payload.username,
              firstName: payload.firstName,
              lastName: payload.lastName,
              email: payload.email,
              role: payload.role || 'CUSTOMER' // Rol bilgisi token'da olmalı
          };
      } catch (e) {
          console.error('Error decoding token', e);
          if (!isPlatformBrowser(this.platformId)) {
             console.warn('atob function might not be available on the server.');
          }
          return null; // Decode veya parse hatası olursa null dön
      }
  }

  public get currentUserValue(): UserSummary | null {
    return this.currentUserSubject.value;
  }

} // AuthService sınıfının sonu
