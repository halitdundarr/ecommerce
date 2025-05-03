import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BuyerRoutingModule } from './buyer-routing.module';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { ReturnRequestComponent } from './components/return-request/return-request.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ReturnHistoryComponent } from './components/return-history/return-history.component';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    OrderHistoryComponent,
    OrderDetailComponent,
    ReturnRequestComponent,
    UserProfileComponent,
    ReturnHistoryComponent
  ],
  imports: [
    CommonModule,
    BuyerRoutingModule,
    ReactiveFormsModule,
    SharedModule,
  ]
})
export class BuyerModule { }
