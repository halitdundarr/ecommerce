import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service'; // AuthService import et

@Component({
  selector: 'app-seller-layout',
  templateUrl: './seller-layout.component.html',
  standalone:false,
  styleUrls: ['./seller-layout.component.scss'] // SCSS dosyası oluşturulacak
})
export class SellerLayoutComponent implements OnInit {

  constructor(private authService: AuthService) { }

  ngOnInit(): void { }

  logout(): void {
    this.authService.logout();
  }
}
