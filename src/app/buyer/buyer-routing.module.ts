import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { WishlistComponent } from './components/wishlist/wishlist.component';
import { ReturnRequestComponent } from './components/return-request/return-request.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ReturnHistoryComponent } from './components/return-history/return-history.component';
// Varsa diğer buyer componentleri (örn: ProfileComponent)

const routes: Routes = [
  { path: 'orders', component: OrderHistoryComponent },
  // { path: 'profile', component: ProfileComponent },
  { path: 'wishlist', component: WishlistComponent }, // <-- YENİ ROUTE
  { path: 'returns/new', component: ReturnRequestComponent }, // <-- YENİ İade Talebi Rotası
  { path: 'orders/:orderId', component: OrderDetailComponent }, // İleride eklenecek
  { path: 'profile', component: UserProfileComponent }, // <-- YENİ Profil Rotası
  { path: 'returns', component: ReturnHistoryComponent },      // <-- YENİ İade Geçmişi Rotası
    // { path: 'profile', component: ProfileComponent }, // Varsa
  { path: '', redirectTo: 'orders', pathMatch: 'full' } // /buyer'a gelince direkt /buyer/orders'a yönlendir
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BuyerRoutingModule { }
