import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { CartComponent } from './components/cart/cart.component'; // CartComponent'i import et
import { AuthGuard } from '../core/guards/auth.guard'; // AuthGuard'ı import et (gerekliyse)
import { CheckoutComponent } from './components/checkout/checkout.component'; // Import et
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { ProductComparisonComponent } from './components/product-comparison/product-comparison.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';

const routes: Routes = [

  { path: 'order-confirmed/:orderId', component: OrderConfirmationComponent, canActivate: [AuthGuard] },

  // Ürün listesi ve detay rotaları (önceden vardı)
  { path: '', component: ProductListComponent },
  { path: 'detail/:id', component: ProductDetailComponent },
  // Yeni Sepet Sayfası Rotası
  {
    path: 'cart', // Örneğin /features/cart veya ana routing'de /cart olarak ayarlandıysa ona göre path='' olabilir
    component: CartComponent,
    canActivate: [AuthGuard] // Sadece giriş yapanlar sepeti görsün
  },
  {
    path: 'checkout', // URL: /features/checkout veya /checkout (ana routing'e göre)
    component: CheckoutComponent,
    canActivate: [AuthGuard] // Checkout için giriş yapmak zorunlu
  },
  { path: 'search', component: SearchResultsComponent }, // <<<--- Yeni arama rotası
  { path: 'compare', component: ProductComparisonComponent } // <-- YENİ KARŞILAŞTIRMA ROTASI
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule { }
