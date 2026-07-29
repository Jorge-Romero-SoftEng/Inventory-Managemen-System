export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
  discount: number,
): number {
  return roundTo2(quantity * unitPrice - discount);
}

export interface LineItemInput {
  unitPrice: number;
  quantity: number;
}

export function calculateSubtotal(items: LineItemInput[]): number {
  return roundTo2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
}

export interface DiscountInput {
  discount: number;
}

export function calculateDiscountTotal(items: DiscountInput[]): number {
  return roundTo2(items.reduce((sum, item) => sum + item.discount, 0));
}

export function calculateTax(
  subtotal: number,
  totalDiscount: number,
  taxRate: number,
): number {
  return roundTo2((subtotal - totalDiscount) * taxRate);
}

export function calculateTotal(
  subtotal: number,
  totalDiscount: number,
  tax: number,
): number {
  return roundTo2(subtotal - totalDiscount + tax);
}

export interface SaleItemInput extends LineItemInput, DiscountInput {}

export interface SaleTotals {
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
}

export function calculateSaleTotals(
  items: SaleItemInput[],
  taxRate = 0,
): SaleTotals {
  const subtotal = calculateSubtotal(items);
  const totalDiscount = calculateDiscountTotal(items);
  const tax = calculateTax(subtotal, totalDiscount, taxRate);
  const total = calculateTotal(subtotal, totalDiscount, tax);
  return { subtotal, totalDiscount, tax, total };
}
