// src/app/core/services/auth.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { LoginRequest, LoginResponse, Profile, RegisterRequest, RegisterResponse, UserSummary } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

// Gerekirse Buffer importu (SSR için)
// Node.js ortamında Buffer'ı kullanmak için 'buffer' paketini yüklemeniz gerekebilir: npm install buffer
// import { Buffer } from 'buffer'; // Eğer 'buffer' paketi yüklüyse veya Node.js ortamıysa
declare var Buffer: any; // Buffer tipini global olarak tanıtıyoruz (tarayıcıda olmayabilir)

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly AUTH_API_URL = `${environment.apiUrl}/rest/api/registration`; // Environment'tan API URL'si

  private currentUserSubject = new BehaviorSubject<UserSummary | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  // mockUsers propertysi kaldırıldı.

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuthState();
  }

  // --- Servis Başlatıldığında Yetkilendirme Durumunu Yükle ---
  private initializeAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getToken();
      if (token) {
        const user = this.decodeToken(token);
        this.setAuthState(token, user); // Token varsa state'i başlat
      } else {
         this.setAuthState(null, null); // Token yoksa null ata
      }
      console.log('AuthService initialized on Browser. Initial loggedIn state:', this.loggedInSubject.value);
    } else {
       console.log('AuthService initialized on Server. State remains default.');
       this.setAuthState(null, null); // Sunucuda da başlangıç state'i null olsun
    }
  }

  // --- JWT Token'ı Çözümle ve Kullanıcı Bilgisini Çıkar (Rol Kontrollü) ---
  private decodeToken(token: string): UserSummary | null {
    if (!token) {
        console.error("decodeToken called with null or empty token.");
        return null;
    }
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) {
            console.error('Invalid token structure: Missing payload.');
            return null;
        }

        let payloadJson: string;
        // Base64 decode: Tarayıcıda atob, sunucuda Buffer kullan
        if (isPlatformBrowser(this.platformId)) {
            payloadJson = atob(payloadBase64);
        } else {
             if (typeof Buffer === 'undefined') {
                 console.error('Buffer is not defined on the server. Cannot decode token.');
                 return null;
             }
            payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
        }

        const payload = JSON.parse(payloadJson);
        console.log("Decoded JWT Payload:", payload);

        // Rolü Çıkarma Mantığı
        let determinedRole: string | null = null;

        // 1. 'authorities' claim'ini kontrol et
        if (payload.authorities && Array.isArray(payload.authorities) && payload.authorities.length > 0) {
            if (payload.authorities.includes('ROLE_ADMIN')) { determinedRole = 'ADMIN'; }
            else if (payload.authorities.includes('ROLE_SELLER')) { determinedRole = 'SELLER'; }
            else if (payload.authorities.includes('ROLE_CUSTOMER')) { determinedRole = 'CUSTOMER'; }
        }
        // 2. 'authorities' yoksa 'role' claim'ini kontrol et
        else if (payload.role && typeof payload.role === 'string') {
             const roleFromClaim = payload.role.replace('ROLE_', '').toUpperCase();
             const knownRoles = ['ADMIN', 'SELLER', 'CUSTOMER'];
             if (knownRoles.includes(roleFromClaim)) { determinedRole = roleFromClaim; }
             else { console.warn(`Unknown role value found in 'role' claim: ${payload.role}`); }
        }

        // 3. Rol belirlenemezse null dön
        if (!determinedRole) {
             console.error("Could not determine user role from JWT payload claims.");
             return null;
        }

        const user: UserSummary = {
            id: payload.userId || payload.sub,
            username: payload.username || payload.sub || payload.email,
            firstName: payload.firstName || '',
            lastName: payload.lastName || '',
            email: payload.email || '',
            role: determinedRole as any,
            status: payload.status || 'Active'
        };

        if (!user.id) {
            console.error('Decoded token is missing required claim: userId or sub.');
            return null;
        }

        console.log("Decoded User Summary:", user);
        return user;

    } catch (e) {
        console.error('Error decoding token:', e);
         if (!isPlatformBrowser(this.platformId) && typeof Buffer === 'undefined') {
           console.warn('Buffer is not defined. Base64 decoding might fail on the server.');
        }
        return null;
    }
  }


  // --- Kullanıcı Giriş İşlemi (Sadece Gerçek API Çağrısı) ---
  login(loginRequest: LoginRequest): Observable<LoginResponse> {
    const loginUrl = `${this.AUTH_API_URL}/login`; // Backend login endpoint'i
    console.log(`Attempting login to: ${loginUrl} for user: ${loginRequest.username}`);

    // Doğrudan API çağrısı yap
    return this.http.post(loginUrl, loginRequest, { responseType: 'text' }) // Token'ı text olarak al
      .pipe(
        map(tokenString => {
           console.log("Raw token string received:", tokenString);
          if (!tokenString) {
              throw new Error('Login failed: No token received from backend.');
          }
          const response: LoginResponse = { token: tokenString };
          return response;
        }),
        tap(response => {
          if (response?.token) { // Null veya undefined kontrolü
              const user = this.decodeToken(response.token);
               if (!user) {
                   console.error("Failed to decode token or extract required user information (ID or Role).");
                   this.setAuthState(null, null);
                   throw new Error('Login failed: Could not process token properly.');
               }
              this.setAuthState(response.token, user); // Auth state'i güncelle
              console.log('Login successful, auth state updated.');
          } else {
              this.setAuthState(null, null);
              console.error('Login response missing token.');
              throw new Error('Login response did not contain a token.');
          }
        }),
        catchError(this.handleError) // Merkezi hata işleyici
      );
  }

  // --- Kullanıcı Kayıt İşlemi ---
  register(payload: RegisterRequest, role: string): Observable<RegisterResponse> {
      let registerUrl: string;
      let backendPayload: any = {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          username: payload.username,
          password: payload.password,
          role: role.toUpperCase()
      };

      switch (role.toUpperCase()) {
          case 'SELLER': registerUrl = `${this.AUTH_API_URL}/seller`; break;
          case 'ADMIN': registerUrl = `${this.AUTH_API_URL}/admin`; break;
          case 'LOGISTICSPROVIDER': registerUrl = `${this.AUTH_API_URL}/logisticsProvider`; break;
          case 'CUSTOMER': default: registerUrl = `${this.AUTH_API_URL}/customer`; break;
      }

      console.log(`Sending ${role} registration request to: ${registerUrl}`);
      return this.http.post<any>(registerUrl, backendPayload).pipe(
          map(backendResponse => {
              console.log("Registration response from server:", backendResponse);
              return {
                  success: true,
                  message: 'Kayıt başarılı! Lütfen giriş yapın.',
                  userId: backendResponse?.userId || backendResponse?.id
              };
          }),
          catchError(this.handleError)
      );
  }

  // --- Çıkış İşlemi ---
  logout(): void {
      this.setAuthState(null, null);
      console.log('Logged out.');
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/auth/login']);
      }
   }

  // --- Yardımcı Metotlar ---

  // Anlık kullanıcı bilgisi
  public get currentUserValue(): UserSummary | null {
    return this.currentUserSubject.value;
  }

  // Local Storage'dan token al
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  // Yetkilendirme durumunu ayarla ve storage'ı güncelle
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
    // BehaviorSubject'leri sadece değişiklik varsa güncelle
    if (this.currentUserSubject.value !== user) {
      this.currentUserSubject.next(user);
    }
    if (this.loggedInSubject.value !== !!token) {
      this.loggedInSubject.next(!!token);
    }
    console.log("Auth State Updated - Current User:", this.currentUserSubject.value);
    console.log("Auth State Updated - Logged In:", this.loggedInSubject.value);
  }

  // Profil güncellendiğinde state'i yenile
  refreshCurrentUserState(updatedUserData: Partial<UserSummary | Profile>): void {
    const currentUser = this.currentUserValue;
    const currentToken = this.getToken();

    if (currentUser && updatedUserData && currentToken) {
        const updatedSummary: UserSummary = {
            ...currentUser,
            firstName: updatedUserData.firstName ?? currentUser.firstName,
            lastName: updatedUserData.lastName ?? currentUser.lastName,
        };
        this.setAuthState(currentToken, updatedSummary);
        console.log("AuthService state refreshed with updated user info.");
    } else {
        console.warn("Could not refresh user state: Missing data.");
    }
  }

  // --- Merkezi Hata İşleyici ---
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'Bilinmeyen bir kimlik doğrulama hatası oluştu!';

    if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (AuthService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
    } else {
        console.error(`Backend Hatası ${error.status} (AuthService), Gövde:`, error.error);
        const backendError = error.error;
        const backendErrorMessage = backendError?.message || (typeof backendError === 'string' ? backendError : null);

        if (backendErrorMessage) {
            userMessage = backendErrorMessage;
            if (userMessage.toLowerCase().includes('bad credentials')) {
                 userMessage = 'E-posta veya şifre hatalı.';
            } else if (userMessage.toLowerCase().includes('user not found')) {
                 userMessage = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.';
            } else if (userMessage.toLowerCase().includes('already exists') || error.status === 409) {
                 userMessage = 'Bu e-posta adresi veya kullanıcı adı zaten kayıtlı.';
            }
        } else {
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz istek.'; break;
                 case 401: userMessage = 'E-posta veya şifre hatalı.'; break;
                 case 403: userMessage = 'Yetkiniz yok.'; break;
                 case 404: userMessage = 'API bulunamadı.'; break;
                 case 409: userMessage = 'Kullanıcı adı/e-posta zaten mevcut.'; break;
                 case 500: userMessage = 'Sunucu hatası.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}).`;
             }
        }
    }
    return throwError(() => new Error(userMessage));
  }

} // AuthService sınıfının sonu
