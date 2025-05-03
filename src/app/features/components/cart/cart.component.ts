// src/app/features/components/cart/cart.component.ts
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { Cart, CartItem } from '../../../shared/models/cart.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  standalone: false // Zaten vardı
})
export class CartComponent implements OnInit {

  cart$!: Observable<Cart | null>;

  constructor(private cartService: CartService,
    private notificationService: NotificationService
  ) {
    this.cart$ = this.cartService.getCart();
  }

  ngOnInit(): void { }

  // Miktarı inputtan güncelleme metodu
  updateQuantityFromInput(item: CartItem, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = inputElement.valueAsNumber;

    // DÜZELTME: Log mesajında item.product.name kullan
    console.log(`Updating quantity for ${item.product?.name} to ${newQuantity} via input`);

    if (!isNaN(newQuantity) && newQuantity >= 0 && item.id !== undefined) {
      // DÜZELTME: Servise cartItemId (item.id) gönder
      this.cartService.updateQuantity(item.id, newQuantity);
    } else {
       // Geçersizse veya item.id tanımsızsa eski değere döndür (veya hata göster)
       inputElement.value = item.quantity.toString();
       if(item.id === undefined) {
           console.error("Cannot update quantity: CartItem ID is missing.");
       }
    }
  }

  // Sepetten ürün çıkarma metodu
  removeFromCart(item: CartItem): void {
    if (item.id !== undefined) {
        this.cartService.removeFromCart(item.id);
        this.notificationService.showInfo(`${item.product.name} sepetten çıkarıldı.`); // Örnek
    } else {
        this.notificationService.showError("Ürün sepetten çıkarılamadı: Ürün ID eksik.");
        console.error("Cannot remove item: CartItem ID is missing.");
    }
  }

  // Sepeti tamamen boşaltma metodu (Aynı kalabilir)
  clearCart(): void {
    if (confirm('Sepeti tamamen boşaltmak istediğinizden emin misiniz?')) {
      this.cartService.clearCart();
      this.notificationService.showSuccess('Sepet başarıyla boşaltıldı.'); // Örnek
    }
  }

  // Miktar artırma
  incrementQuantity(item: CartItem): void {
      if (item.id !== undefined) {
          // DÜZELTME: Servise cartItemId (item.id) gönder
          this.cartService.updateQuantity(item.id, item.quantity + 1);
      } else {
           console.error("Cannot increment quantity: CartItem ID is missing.");
      }
  }

  // Miktar azaltma
  decrementQuantity(item: CartItem): void {
      if (item.id !== undefined) {
          // Miktar 1'den büyükse azalt, değilse kaldır
          if (item.quantity > 1) {
              // DÜZELTME: Servise cartItemId (item.id) gönder
              this.cartService.updateQuantity(item.id, item.quantity - 1);
          } else {
              this.removeFromCart(item); // Bu zaten item.id kontrolü yapıyor
          }
      } else {
          console.error("Cannot decrement quantity: CartItem ID is missing.");
      }
  }
}
