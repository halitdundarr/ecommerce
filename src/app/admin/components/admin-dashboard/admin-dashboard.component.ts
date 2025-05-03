import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {

  // Placeholder veri (Backend bağlandığında servislerden gelecek)
  summaryStats = {
    totalUsers: 125,
    totalProducts: 580,
    pendingOrders: 15,
    totalRevenue: 45850.75
  };

  constructor() { }

  ngOnInit(): void {
    // İleride: Servislerden dashboard verisini çek
  }
}
