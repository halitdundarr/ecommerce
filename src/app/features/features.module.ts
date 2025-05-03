import { NgModule } from '@angular/core';


import { SharedModule } from '../shared/shared.module'; // <-- Import et
import { FeaturesRoutingModule } from './features-routing.module';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { ProductReviewsComponent } from './components/product-reviews/product-reviews.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { WishlistComponent } from '../buyer/components/wishlist/wishlist.component';
import { ProductComparisonComponent } from './components/product-comparison/product-comparison.component';
import { AddReviewFormComponent } from './components/add-review-form/add-review-form.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';

@NgModule({
  declarations: [
    ProductListComponent,
    ProductDetailComponent,
    ProductReviewsComponent,
    CartComponent,
    CheckoutComponent,
    SearchResultsComponent,
    WishlistComponent,
    ProductComparisonComponent,
    AddReviewFormComponent,
    OrderConfirmationComponent,

  ],
  imports: [
    FeaturesRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class FeaturesModule { }
