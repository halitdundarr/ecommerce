import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // map operatörünü import et
import { AuthService } from '../../services/auth.service';
import { UserSummary } from '../../../shared/models/user.model';
import { CartService } from '../../services/cart.service'; // CartService'i import et
import { WishlistService } from '../../services/wishlist.service'; // WishlistService import
import { ComparisonService } from '../../services/comparison.service'; // <-- Comp
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone:false,
})
export class HeaderComponent implements OnInit {

  isLoggedIn$: Observable<boolean>;
  currentUser$: Observable<UserSummary | null>;
  cartItemCount$: Observable<number>; // Sepet ürün sayısı için observable
  wishlistItemCount$: Observable<number>; // Wishlist sayısı için observable
  comparisonItemCount$: Observable<number>; // <-- Comparison sayısı için observable

  constructor(
    private authService: AuthService,
    private cartService: CartService, // CartService'i inject et
    private wishlistService: WishlistService, // WishlistService inject
    private comparisonService: ComparisonService, // <-- ComparisonServ
    private router: Router, // Router inject et

  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.currentUser$ = this.authService.currentUser$;

    // CartService'teki cart$ observable'ına abone ol ve totalItems'ı map et
    this.cartItemCount$ = this.cartService.cart$.pipe(
      map(cart => cart?.totalItems ?? 0) // Eğer cart null ise 0 döndür
    );

    this.wishlistItemCount$ = this.wishlistService.wishlistItemCount$;
    this.comparisonItemCount$ = this.comparisonService.comparisonItemCount$; // <-- Comparison sayısını al
  }

    // Arama Formu Gönderildiğinde Çalışacak Metot
    onSearchSubmit(searchTerm: string): void {
      const term = searchTerm?.trim(); // Başındaki/sonundaki boşlukları temizle
      if (term) { // Eğer arama terimi boş değilse
          console.log('Searching for:', term);
          // Arama sonuçları sayfasına query parametresi ile yönlendir
          this.router.navigate(['/search'], { queryParams: { q: term } });
      }
      // Formu sıfırlamak için (eğer ngForm kullandıysak):
      // searchForm.reset(); // searchForm'u component'e ViewChild ile almak gerekir
  }

  ngOnInit(): void { }

  logout(): void {
    this.authService.logout();
  }
}
