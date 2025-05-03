import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from '../../../shared/models/product.model';
import { Router } from '@angular/router';
import { ProductService } from '../../../features/services/product.service';

@Component({
  selector: 'app-seller-product-list',
  templateUrl: './seller-product-list.component.html',
  styleUrls: ['./seller-product-list.component.scss'],
  standalone:false
})
export class SellerProductListComponent implements OnInit {
  products$: Observable<Product[]> = of([]);
  isLoading = false;
  error: string | null = null;

  constructor(private productService: ProductService, private router: Router) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;
    this.products$ = this.productService.getProductsByCurrentSeller(); // Satıcıya özel metodu çağır
    this.products$.subscribe({ /* Hata/Loading yönetimi */ });
  }

  // Satıcı için ürün ekleme/düzenleme/silme metotları (ileride)
  addNewProduct(): void {
      // Admin'deki product-form component'i belki burada da kullanılabilir
       this.router.navigate(['/seller/products/new']); // Örnek rota
       alert('Yeni ürün ekleme formu açılacak (Satıcı için).');
  }
  editProduct(productId: number | string): void {
       this.router.navigate(['/seller/products/edit', productId]); // Örnek rota
       alert(`Product ID ${productId} düzenlenecek (Satıcı için).`);
  }
   deleteProduct(productId: number | string, productName: string): void {
       if(confirm(`'${productName}' ürününü silmek istediğinizden emin misiniz?`)) {
            alert(`Product ID ${productId} silinecek (Satıcı için).`);
            // Servis metodu çağrılıp liste yenilenecek
       }
   }
}
