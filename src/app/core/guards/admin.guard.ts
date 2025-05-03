import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // AuthService'i import et

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // Önce kullanıcının login olup olmadığını kontrol etmek iyi bir pratik olabilir,
    // ancak bunu zaten AuthGuard yapacaksa, burada direkt role odaklanabiliriz.
    // Veya AuthGuard'ı burada tekrar çağırmak yerine direkt role bakalım:

    const currentUser = this.authService.currentUserValue; // Anlık kullanıcı değerini al

    if (currentUser && currentUser.role === 'ADMIN') {
      // Kullanıcı var ve rolü ADMIN ise izin ver
      return true;
    } else {
      // Kullanıcı yoksa veya rolü ADMIN değilse, ana sayfaya yönlendir
      console.log('AdminGuard: User is not an ADMIN, redirecting to home.');
      return this.router.createUrlTree(['/']); // Ana sayfaya yönlendir
      // Veya özel bir 'yetkisiz erişim' sayfasına yönlendirebilirsiniz:
      // return this.router.createUrlTree(['/unauthorized']);
    }

    // Alternatif: Observable kullanarak (eğer AuthGuard ile birleştirilmeyecekse)
    /*
    return this.authService.currentUser$.pipe(
        take(1),
        map(user => {
            if (user && user.role === 'ADMIN') {
                return true;
            } else {
                console.log('AdminGuard: User is not an ADMIN, redirecting to home.');
                return this.router.createUrlTree(['/']);
            }
        })
    );
    */
  }
}
