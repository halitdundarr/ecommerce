import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { AdminGuard } from '../core/guards/admin.guard'; // AdminGuard import et
// İleride oluşturulacak componentleri import edeceğiz:
// import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { ProductManagementComponent } from './components/product-management/product-management.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { OrderManagementComponent } from './components/order-management/order-management.component';
import { AdminReturnManagementComponent } from './components/admin-return-management/admin-return-management.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminComplaintsComponent } from './components/admin-complaints/admin-complaints.component';
import { AdminPaymentIssuesComponent } from './components/admin-payment-issues/admin-payment-issues.component';
import { AdminUserTransactionsComponent } from './components/admin-user-transactions/admin-user-transactions.component';
// import { ProductManagementComponent } from './components/product-management/product-management.component';
// import { OrderManagementComponent } from './components/order-management/order-management.component';


const routes: Routes = [
  {
    path: '', // /admin path'inin temel yolu
    component: AdminLayoutComponent, // Ana layout component'i
    canActivate: [AdminGuard], // Sadece Admin rolü erişebilir
    children: [ // Layout içindeki alt rotalar
      // Henüz componentler olmadığı için geçici yönlendirme veya boş component
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UserManagementComponent }, // <<<--- Burayı güncelle
      { path: 'users/:userId/transactions', component: AdminUserTransactionsComponent }, // <-- Kullanıcıya özel işlemler rotası
      { path: 'products/new', component: ProductFormComponent },    // <<<--- Yeni ürün ekleme rotası
      { path: 'products/edit/:id', component: ProductFormComponent }, // <<<--- Düzenleme rotası (ileride)
      { path: 'products', component: ProductManagementComponent }, // <<<--- Burayı güncelle
      { path: 'orders', component: OrderManagementComponent }, // <<<--- Burayı güncelle
      { path: 'returns', component: AdminReturnManagementComponent }, // <-- YENİ İade Yönetimi Rotası
      { path: 'payment-issues', component: AdminPaymentIssuesComponent },
      { path: 'complaints', component: AdminComplaintsComponent },
      // Varsayılan olarak dashboard'a yönlendir (veya users'a)
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
