import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { ProductManagementComponent } from './components/product-management/product-management.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { OrderManagementComponent } from './components/order-management/order-management.component';
import { AdminReturnManagementComponent } from './components/admin-return-management/admin-return-management.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminPaymentIssuesComponent } from './components/admin-payment-issues/admin-payment-issues.component';
import { AdminComplaintsComponent } from './components/admin-complaints/admin-complaints.component';
import { SharedModule } from '../shared/shared.module';
import { AdminUserTransactionsComponent } from './components/admin-user-transactions/admin-user-transactions.component';


@NgModule({
  declarations: [
    AdminLayoutComponent,
    UserManagementComponent,
    ProductManagementComponent,
    ProductFormComponent,
    OrderManagementComponent,
    AdminReturnManagementComponent,
    AdminDashboardComponent,
    AdminPaymentIssuesComponent,
    AdminComplaintsComponent,
    AdminUserTransactionsComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class AdminModule { }
