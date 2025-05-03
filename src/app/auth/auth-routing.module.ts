import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component'; // LoginComponent'i import et
import { RegisterComponent } from './components/register/register.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent }, // /auth/login adresine gelindiğinde LoginComponent'i göster
  { path: 'register', component: RegisterComponent }, // Varsa register component için route
  // { path: 'forgot-password', component: ForgotPasswordComponent }, // Varsa şifremi unuttum
  { path: '', redirectTo: 'login', pathMatch: 'full' } // /auth adresine gelindiğinde login'e yönlendir (opsiyonel)
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
