import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service'; // AuthService import et

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone:false
})
export class AdminLayoutComponent implements OnInit {

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
  }

  logout(): void {
    this.authService.logout();
  }

}
