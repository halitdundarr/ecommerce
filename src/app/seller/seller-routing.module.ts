import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SellerLayoutComponent } from './components/seller-layout/seller-layout.component';
import { SellerProductListComponent } from './components/seller-product-list/seller-product-list.component';
import { ProductFormComponent } from '../admin/components/product-form/product-form.component';
import { SellerOrderListComponent } from './components/seller-order-list/seller-order-list.component';
import { SellerSettingsComponent } from './components/seller-settings/seller-settings.component';


const routes: Routes = [
  {
    path: '', // /seller path'inin temel yolu
    component: SellerLayoutComponent, // Ana layout component'i
    // canActivate Guard'ı ana routing'de olduğu için burada tekrar gerekmez
    children: [ // Layout içindeki alt rotalar
      { path: 'dashboard', redirectTo: 'products', pathMatch: 'full' }, // Dashboard yerine products'a git
      { path: 'products', component: SellerProductListComponent }, // Bu rotanın component'i var
      { path: 'products/new', component: ProductFormComponent },    // <<<--- Eklendi
      { path: 'products/edit/:id', component: ProductFormComponent }, // <<
      { path: 'orders', component: SellerOrderListComponent }, // <<<--- Burayı güncelle
      { path: 'settings', component: SellerSettingsComponent }, // <-- Yeni Hali

      // Varsayılan olarak ürünlere yönlendir
      { path: '', redirectTo: 'products', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SellerRoutingModule { }
