import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // AuthService'i import et

@Injectable({
  providedIn: 'root' // Guard'ı global olarak provide et
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // AuthService'teki isLoggedIn$ observable'ını kullanarak kontrol edelim
    return this.authService.isLoggedIn$.pipe(
      take(1), // Observable'dan sadece ilk değeri alıp tamamlanmasını sağla
      map(isLoggedIn => {
        if (isLoggedIn) {
          // Eğer kullanıcı giriş yapmışsa, rotaya erişime izin ver
          return true;
        } else {
          // Eğer kullanıcı giriş yapmamışsa, login sayfasına yönlendir
          console.log('AuthGuard: User not logged in, redirecting to login.');
          // Yönlendirme işlemini UrlTree olarak döndürerek yapalım
          return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url }});
          // Veya direkt yönlendirme yapıp false döndürebiliriz:
          // this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url }});
          // return false;
        }
      })
    );

    // Alternatif: Senkron kontrol (Token varlığına göre) - Ama observable daha reaktif
    /*
    const hasToken = !!this.authService.getToken();
    if (hasToken) {
      return true;
    } else {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    */
  }
}
