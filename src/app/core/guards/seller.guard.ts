import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
// map, take importları gerekirse eklenebilir
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SellerGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const currentUser = this.authService.currentUserValue;

    if (currentUser && currentUser.role === 'SELLER') {
      // Kullanıcı var ve rolü SELLER ise izin ver
      return true;
    } else {
      // Kullanıcı yoksa veya rolü SELLER değilse, ana sayfaya yönlendir
      console.log('SellerGuard: User is not a SELLER, redirecting to home.');
      return this.router.createUrlTree(['/']);
    }
  }
}
