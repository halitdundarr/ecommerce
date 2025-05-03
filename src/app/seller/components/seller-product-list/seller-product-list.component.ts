// src/app/seller/components/seller-product-list/seller-product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
// Product yerine ProductSummary import edin (veya ikisi de kalabilir)
import { Product, ProductSummary } from '../../../shared/models/product.model';
import { Router } from '@angular/router';
import { ProductService } from '../../../features/services/product.service'; // Features altındaki service
import { catchError, finalize } from 'rxjs/operators'; // finalize ve catchError ekleyin

@Component({
  selector: 'app-seller-product-list',
  templateUrl: './seller-product-list.component.html',
  styleUrls: ['./seller-product-list.component.scss'],
  standalone:false
})
export class SellerProductListComponent implements OnInit {
  // ***** DEĞİŞİKLİK: Tip ProductSummary[] oldu *****
  products$: Observable<ProductSummary[]> = of([]);
  // ************************************************

  isLoading = false;
  error: string | null = null;

  constructor(private productService: ProductService, private router: Router) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;
    // Servis metodu zaten Observable<ProductSummary[]> döndürüyor
    this.products$ = this.productService.getProductsByCurrentSeller().pipe(
        catchError(err => {
             console.error("Error loading seller products:", err);
             this.error = "Ürünleriniz yüklenirken bir hata oluştu.";
             return of([]); // Hata durumunda boş liste döndür
        }),
        finalize(() => {
            // Yüklenme durumunu asenkron güncelle
            setTimeout(() => { this.isLoading = false; }, 0);
        })
    );
  }

  addNewProduct(): void {
       this.router.navigate(['/seller/products/new']);
  }

  editProduct(productId: number | string): void {
       this.router.navigate(['/seller/products/edit', productId]);
  }

   deleteProduct(productId: number | string, productName: string | undefined): void { // productName opsiyonel olabilir
       if(confirm(`'${productName || 'Bu ürün'}' ürününü silmek istediğinizden emin misiniz?`)) {
            // alert(`Product ID ${productId} silinecek (Satıcı için - servis çağrısı eklenecek).`);
            this.productService.deleteProduct(productId).subscribe({
                next: (response) => {
                    if (response.success) {
                        alert('Ürün başarıyla silindi.');
                        this.loadProducts(); // Listeyi yenile
                    } else {
                        alert('Ürün silinemedi.');
                        this.error = 'Ürün silinemedi.';
                    }
                },
                error: (err) => {
                     alert('Ürün silinirken hata oluştu.');
                     this.error = 'Ürün silinirken hata oluştu: ' + err.message;
                }
            });
       }
   }
}
