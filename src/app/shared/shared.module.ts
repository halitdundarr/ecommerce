import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';



@NgModule({
  declarations: [
    LoadingSpinnerComponent,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LoadingSpinnerComponent, // <-- Export et
    CommonModule // <-- CommonModule'ü de export etmek iyi bir pratiktir
  ]
})
export class SharedModule { }
