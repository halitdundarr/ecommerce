import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service'; // AuthService'i import et

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // AuthService'ten anlık token'ı al
    const authToken = this.authService.getToken();

    // Eğer token varsa ve istek bizim backend API'mize gidiyorsa
    // (İsteğe bağlı: Sadece kendi API'mize giden isteklere token eklemek için URL kontrolü eklenebilir)
    // const isApiUrl = request.url.startsWith('http://localhost:8080/api/'); // Backend URL'nizle değiştirin

    if (authToken /*&& isApiUrl*/) {
      // İsteği klonla ve Authorization header'ını ekle
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}` // Bearer token standardı
        }
      });
      // Klonlanmış ve header eklenmiş isteği gönder
      return next.handle(authReq);
    }

    // Token yoksa veya istek farklı bir adrese gidiyorsa, orijinal isteği değiştirme den gönder
    return next.handle(request);
  }
}
