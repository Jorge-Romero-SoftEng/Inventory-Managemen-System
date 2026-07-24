export interface Product {
  id: number;
  barcode: string | null;
  sku: string | null;
  name: string;
  categoryId: number | null;
  unit: string;
  packSize: number;
  cost: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: Category | null;
  prices?: ProductPrice[];
  stock?: Stock[];
}

export interface Category {
  id: number;
  name: string;
  createdAt: Date;
}

export interface Customer {
  id: number;
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  creditLimit: number;
  balance: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceList {
  id: number;
  name: string;
  active: boolean;
  createdAt: Date;
}

export interface ProductPrice {
  id: number;
  productId: number;
  priceListId: number;
  price: number;
  priceList?: PriceList;
}

export interface Stock {
  id: number;
  productId: number;
  warehouse: string;
  quantity: number;
  updatedAt: Date;
}

export interface Sale {
  id: number;
  saleNumber: string;
  customerId: number | null;
  userId: number | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
  delivery: boolean;
  createdAt: Date;
  customer?: Customer | null;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  product?: Product;
}

export interface Payment {
  id: number;
  saleId: number;
  method: string;
  amount: number;
  reference: string | null;
  createdAt: Date;
}

export interface StockMovement {
  id: number;
  productId: number;
  movementType: string;
  quantity: number;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}
