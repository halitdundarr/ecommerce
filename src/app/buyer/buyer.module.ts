import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // CommonModule ekleyin
import { RouterModule } from '@angular/router'; // RouterModule ekleyin
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';

import { BuyerRoutingModule } from './buyer-routing.module';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { WishlistComponent } from './components/wishlist/wishlist.component'; // WishlistComponent burada declare edilmiyor, FeaturesModule'de. Bu satırı kontrol edin. Belki WishlistComponent FeaturesModule'e aittir?
import { ReturnRequestComponent } from './components/return-request/return-request.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ReturnHistoryComponent } from './components/return-history/return-history.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';


@NgModule({
  declarations: [
    OrderHistoryComponent,
    OrderDetailComponent,
    // WishlistComponent, // Eğer WishlistComponent FeaturesModule'deyse buradan kaldırın
    ReturnRequestComponent,
    UserProfileComponent,
    ReturnHistoryComponent,
    ChangePasswordComponent
  ],
  imports: [
    CommonModule, // <-- Eklendi
    RouterModule, // <-- Eklendi
    BuyerRoutingModule,
    ReactiveFormsModule,
    SharedModule,
  ]
})
export class BuyerModule { }
