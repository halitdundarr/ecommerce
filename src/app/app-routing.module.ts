import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { SellerGuard } from './core/guards/seller.guard';

const routes: Routes = [
  {
    path: 'buyer',
    loadChildren: () => import('./buyer/buyer.module').then(m => m.BuyerModule),
    canActivate: [AuthGuard] // AuthGuard'ı buraya ekle
  },

  {
    path: 'auth', // <<<--- 'auth' path'i burada tanımlı mı?
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) // <<<--- Doğru modülü mü yüklüyor?
  },

  // Admin ve Seller için de AuthGuard gerekebilir (ve ek olarak rol guard'ları)
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard , AdminGuard ] // Önce giriş kontrolü, sonra admin rolü kontrolü
  },
  {
    path: 'seller',
    loadChildren: () => import('./seller/seller.module').then(m => m.SellerModule),
    canActivate: [AuthGuard , SellerGuard ] // Önce giriş kontrolü, sonra satıcı rolü kontrolü
  },

     // ...
   // Features Module - Örneğin /products path'i altında
   {
    path: 'products', // veya 'features'
    loadChildren: () => import('./features/features.module').then(m => m.FeaturesModule)
    // Belki buraya da AuthGuard eklemek istersiniz?
    // canActivate: [AuthGuard]
  },
  // Ana sayfayı buraya yönlendirebiliriz
  { path: '', redirectTo: '/products', pathMatch: 'full' }, // Default route
  // ...
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
