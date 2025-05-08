import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // <-- Animasyon modülünü import et
import { ToastrModule } from 'ngx-toastr'; // <-- Toastr modülünü import et
import { NgxStripeModule } from 'ngx-stripe';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SellerModule } from './seller/seller.module';
import { BuyerModule } from './buyer/buyer.module';
import { FeaturesModule } from './features/features.module';
import { CoreModule } from "./core/core.module";
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // <-- Animasyon modülünü ekle
    ToastrModule.forRoot( // <-- Toastr modülünü yapılandırma ile ekle
      {
        timeOut: 3000, // Bildirim ne kadar süre ekranda kalacak (ms)
        positionClass: 'toast-bottom-right', // Bildirimlerin konumu
        preventDuplicates: true, // Aynı bildirimin tekrar tekrar çıkmasını engelle
        closeButton: true, // Kapatma butonu görünsün mü?
        progressBar: true, // Süreç çubuğu görünsün mü?
      }
    ),
    AppRoutingModule,
    AuthModule,
    AdminModule,
    SellerModule,
    BuyerModule,
    FeaturesModule,
    CoreModule,
    HttpClientModule,
    NgxStripeModule.forRoot('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY') // Stripe Publishable Key'inizi buraya yazın
],
  providers: [
    provideClientHydration(withEventReplay())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
