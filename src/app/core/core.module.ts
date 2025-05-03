// src/app/core/core.module.ts
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http'; // HTTP_INTERCEPTORS'ı import et
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component'; // AuthInterceptor'ı import et// Varsa diğer Core servisleri, guard'lar...
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
  ],
  imports: [
    RouterModule,
    FormsModule,
    CommonModule, // CoreModule genellikle sadece provider içerir, CommonModule'e ihtiyaç olmayabilir
  ],
  providers: [
    // --->>> AuthInterceptor'ı BURADA provide edin:
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    // Varsa diğer Core provider'ları (singleton servisler, guard'lar)...
    // Örneğin: AuthService burada da provide edilebilirdi ama 'providedIn: root' kullandık.
  ],
  exports: [
    HeaderComponent, // Export et
    FooterComponent  // Export et
  ]
})
export class CoreModule {
  // CoreModule'ün sadece AppModule tarafından import edildiğinden emin olmak için constructor kontrolü (best practice)
  constructor(@Optional() @SkipSelf() parentModule?: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only');
    }
  }
}
