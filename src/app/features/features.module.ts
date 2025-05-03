import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // CommonModule ekleyin
import { RouterModule } from '@angular/router'; // RouterModule ekleyin
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module'; // SharedModule zaten var

import { FeaturesRoutingModule } from './features-routing.module';
// Component importları...
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { ProductReviewsComponent } from './components/product-reviews/product-reviews.component'; // Doğru import edildi mi?
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { WishlistComponent } from '../buyer/components/wishlist/wishlist.component'; // WishlistComponent burada mı declare ediliyor? Eğer öyleyse yolu düzeltin veya buyer modülünde kalsın.
import { ProductComparisonComponent } from './components/product-comparison/product-comparison.component';
import { AddReviewFormComponent } from './components/add-review-form/add-review-form.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { NgxStripeModule } from 'ngx-stripe';

@NgModule({
  declarations: [
    ProductListComponent,
    ProductDetailComponent,
    ProductReviewsComponent, // <-- Burada olduğundan emin olun
    CartComponent,
    CheckoutComponent,
    SearchResultsComponent,
    WishlistComponent, // <-- Wishlist burada declare ediliyorsa BuyerModule'den kaldırın.
    ProductComparisonComponent,
    AddReviewFormComponent,
    OrderConfirmationComponent,
  ],
  imports: [
    CommonModule, // <-- Eklendi
    RouterModule, // <-- Eklendi
    FeaturesRoutingModule,
    ReactiveFormsModule,
    SharedModule, // SharedModule LoadingSpinnerComponent'i sağlıyor
    NgxStripeModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
  // ProductReviewsComponent'i dışarıda kullanmıyorsanız exports'a eklemeye gerek yok.
})
export class FeaturesModule { }
