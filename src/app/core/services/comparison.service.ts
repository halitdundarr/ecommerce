import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product, ProductSummary } from '../../shared/models/product.model'; // Product modelleri

// localStorage için anahtar
const COMPARISON_STORAGE_KEY = 'ecommerce_comparison';
const MAX_COMPARE_ITEMS = 4; // Karşılaştırılabilecek maksimum ürün sayısı

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {

  // Karşılaştırma listesindeki ürün ID'lerini veya ProductSummary'leri tutabiliriz.
  // Şimdilik ProductSummary tutalım.
  private comparisonListSubject = new BehaviorSubject<ProductSummary[]>([]);
  public comparisonList$: Observable<ProductSummary[]> = this.comparisonListSubject.asObservable();

  // Karşılaştırma listesindeki ürün sayısını dışarıya açalım
  public comparisonItemCount$: Observable<number> = this.comparisonList$.pipe(
      map(list => list.length)
  );

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Servis ilk yüklendiğinde localStorage'dan veriyi yükle
    this._loadComparisonListFromLocalStorage();
  }

  // Karşılaştırmaya ürün ekleme
  addToComparison(product: Product | ProductSummary): void {
    if (!product) return;

    const currentList = this.comparisonListSubject.getValue();

    // Maksimum sayı kontrolü
    if (currentList.length >= MAX_COMPARE_ITEMS) {
        alert(`En fazla ${MAX_COMPARE_ITEMS} ürünü karşılaştırabilirsiniz.`);
        return;
    }

    // Ürün zaten listede var mı kontrolü
    const alreadyExists = currentList.some(item => item.id === product.id);
    if (alreadyExists) {
        console.log(`Product ${product.id} already in comparison list.`);
        // İsterseniz kullanıcıya bildirim verebilirsiniz
        // alert(`${product.name} zaten karşılaştırma listenizde.`);
        return;
    }

    // ProductSummary formatında ekleyelim
    const summaryToAdd: ProductSummary = {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: 'imageUrl' in product && product.imageUrl
                    ? product.imageUrl
                    : ('images' in product && product.images && product.images.length > 0
                        ? product.images[0].imageUrl
                        : undefined),
        averageRating: 'averageRating' in product ? product.averageRating : undefined,
        categoryId: 'categoryId' in product ? product.categoryId : ('category' in product ? product.category?.id : undefined)
    };

    const updatedList = [...currentList, summaryToAdd];
    this._updateComparisonList(updatedList);
    console.log('Product added to comparison:', summaryToAdd.name);
  }

  // Karşılaştırmadan ürün çıkarma
  removeFromComparison(productId: number | string): void {
    const currentList = this.comparisonListSubject.getValue();
    const updatedList = currentList.filter(item => item.id !== productId);

    if (updatedList.length !== currentList.length) {
        this._updateComparisonList(updatedList);
        console.log('Product removed from comparison:', productId);
    }
  }

  // Karşılaştırma listesini tamamen temizleme
  clearComparison(): void {
    this._updateComparisonList([]);
    console.log('Comparison list cleared.');
  }

  // Bir ürünün karşılaştırma listesinde olup olmadığını kontrol etme
  isInComparison(productId: number | string): Observable<boolean> {
      return this.comparisonList$.pipe(
          map(list => list.some(item => item.id === productId))
      );
  }

  // Karşılaştırma listesini Observable olarak döndür
  getComparisonList(): Observable<ProductSummary[]> {
      return this.comparisonList$;
  }

  // --- Private Yardımcı Metotlar ---

  private _updateComparisonList(list: ProductSummary[]): void {
    this._saveComparisonListToLocalStorage(list);
    this.comparisonListSubject.next(list);
  }

  private _saveComparisonListToLocalStorage(list: ProductSummary[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Sadece ID'leri saklamak daha verimli olabilir ama şimdilik özeti saklayalım
        const listJson = JSON.stringify(list);
        localStorage.setItem(COMPARISON_STORAGE_KEY, listJson);
      } catch (e) {
        console.error('Error saving comparison list to localStorage', e);
      }
    }
  }

  private _loadComparisonListFromLocalStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const listJson = localStorage.getItem(COMPARISON_STORAGE_KEY);
        if (listJson) {
          const list = JSON.parse(listJson) as ProductSummary[];
          this.comparisonListSubject.next(list ?? []);
        } else {
            this.comparisonListSubject.next([]); // Storage boşsa boş liste ile başlat
        }
      } catch (e) {
        console.error('Error loading comparison list from localStorage', e);
        localStorage.removeItem(COMPARISON_STORAGE_KEY); // Hatalı veri varsa temizle
        this.comparisonListSubject.next([]);
      }
    } else {
         this.comparisonListSubject.next([]); // Sunucuda ise boş liste ile başlat
    }
  }

}
