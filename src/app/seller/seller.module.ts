import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SellerRoutingModule } from './seller-routing.module';
import { SellerLayoutComponent } from './components/seller-layout/seller-layout.component';
import { SellerProductListComponent } from './components/seller-product-list/seller-product-list.component';
import { SellerOrderListComponent } from './components/seller-order-list/seller-order-list.component';
import { SellerSettingsComponent } from './components/seller-settings/seller-settings.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    SellerLayoutComponent,
    SellerProductListComponent,
    SellerOrderListComponent,
    SellerSettingsComponent
  ],
  imports: [
    CommonModule,
    SellerRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class SellerModule { }
