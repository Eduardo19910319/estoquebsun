export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  size: string;
  color: string;
  price: number;
  cost: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Installment {
  id: string;
  number: number;
  dueDate: string; // ISO Date string
  value: number; // Valor previsto
  amountPaid: number; // Valor efetivamente pago (novo campo)
  paid: boolean; // Mantido para compatibilidade visual rápida, mas calculado baseado no valor
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // ISO Date string
  total: number;
  discount?: number;
  items: { productId: string; productName: string; quantity: number; price: number }[];
  installments: Installment[];
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  SALES = 'SALES',
  NEW_SALE = 'NEW_SALE',
  SETTINGS = 'SETTINGS'
}