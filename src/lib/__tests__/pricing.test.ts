import { describe, it, expect } from "vitest";
import {
  roundTo2,
  calculateLineItemTotal,
  calculateSubtotal,
  calculateDiscountTotal,
  calculateTax,
  calculateTotal,
  calculateSaleTotals,
} from "@/lib/pricing";

describe("roundTo2", () => {
  it.each([
    [10.005, 10.01],
    [10.004, 10.00],
    [10, 10],
    [0, 0],
    [-10.005, -10.01],
    [1.999, 2.00],
    [0.1 + 0.2, 0.3],
  ])("roundTo2(%s) → %s", (input: number, expected: number) => {
    expect(roundTo2(input)).toBe(expected);
  });
});

describe("calculateLineItemTotal", () => {
  it.each([
    { qty: 3, price: 10, disc: 0, expected: 30 },
    { qty: 3, price: 10, disc: 5, expected: 25 },
    { qty: 0, price: 10, disc: 0, expected: 0 },
    { qty: 2, price: 10.5, disc: 0, expected: 21 },
    { qty: 1000, price: 9999.99, disc: 0, expected: 9999990 },
    { qty: 10, price: 1.5, disc: 3, expected: 12 },
    { qty: 3, price: 0.1, disc: 0, expected: 0.3 },
    { qty: 1, price: 0.01, disc: 0, expected: 0.01 },
  ])("$qty × $price - $disc → $expected", ({ qty, price, disc, expected }: { qty: number; price: number; disc: number; expected: number }) => {
    expect(calculateLineItemTotal(qty, price, disc)).toBe(expected);
  });
});

describe("calculateSubtotal", () => {
  it("single item", () => {
    expect(calculateSubtotal([{ unitPrice: 10, quantity: 2 }])).toBe(20);
  });

  it("multiple items", () => {
    expect(
      calculateSubtotal([
        { unitPrice: 10, quantity: 2 },
        { unitPrice: 5, quantity: 3 },
      ]),
    ).toBe(35);
  });

  it("empty array returns 0", () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it("decimal prices", () => {
    expect(
      calculateSubtotal([{ unitPrice: 10.5, quantity: 3 }]),
    ).toBe(31.5);
  });

  it("large values", () => {
    expect(
      calculateSubtotal([
        { unitPrice: 999999.99, quantity: 100 },
      ]),
    ).toBe(99999999);
  });
});

describe("calculateDiscountTotal", () => {
  it("single item", () => {
    expect(calculateDiscountTotal([{ discount: 5 }])).toBe(5);
  });

  it("multiple items", () => {
    expect(
      calculateDiscountTotal([{ discount: 5 }, { discount: 3 }]),
    ).toBe(8);
  });

  it("zero discounts", () => {
    expect(
      calculateDiscountTotal([{ discount: 0 }, { discount: 0 }]),
    ).toBe(0);
  });

  it("empty array returns 0", () => {
    expect(calculateDiscountTotal([])).toBe(0);
  });
});

describe("calculateTax", () => {
  it.each([
    [100, 10, 0, 0],
    [100, 10, 0.21, 18.9],
    [100, 0, 0.21, 21],
    [10.01, 0, 0.21, 2.1],
    [0, 0, 0.21, 0],
    [100, 100, 0.21, 0],
  ])(
    "subtotal=%s discount=%s rate=%s → %s",
    (subtotal: number, totalDiscount: number, rate: number, expected: number) => {
      expect(calculateTax(subtotal, totalDiscount, rate)).toBe(expected);
    },
  );
});

describe("calculateTotal", () => {
  it.each([
    [100, 0, 0, 100],
    [100, 10, 0, 90],
    [100, 0, 21, 121],
    [100, 10, 18.9, 108.9],
    [0, 0, 0, 0],
    [100, 100, 0, 0],
    [150.75, 15.5, 28.4, 163.65],
  ])(
    "subtotal=%s discount=%s tax=%s → %s",
    (subtotal: number, discount: number, tax: number, expected: number) => {
      expect(calculateTotal(subtotal, discount, tax)).toBe(expected);
    },
  );
});

describe("calculateSaleTotals", () => {
  it("single line item, no discount, no tax", () => {
    const result = calculateSaleTotals([
      { unitPrice: 10, quantity: 2, discount: 0 },
    ]);
    expect(result).toEqual({
      subtotal: 20,
      totalDiscount: 0,
      tax: 0,
      total: 20,
    });
  });

  it("multiple line items with discounts and tax", () => {
    const result = calculateSaleTotals(
      [
        { unitPrice: 100, quantity: 2, discount: 10 },
        { unitPrice: 50, quantity: 3, discount: 5 },
      ],
      0.21,
    );
    expect(result).toEqual({
      subtotal: 350,
      totalDiscount: 15,
      tax: 70.35,
      total: 405.35,
    });
  });

  it("discount exceeds subtotal", () => {
    const result = calculateSaleTotals([
      { unitPrice: 10, quantity: 1, discount: 15 },
    ]);
    expect(result.total).toBe(-5);
  });

  it("zero quantity items", () => {
    const result = calculateSaleTotals([
      { unitPrice: 10, quantity: 0, discount: 0 },
      { unitPrice: 20, quantity: 1, discount: 0 },
    ]);
    expect(result).toEqual({
      subtotal: 20,
      totalDiscount: 0,
      tax: 0,
      total: 20,
    });
  });

  it("decimal prices prevent floating-point drift", () => {
    const result = calculateSaleTotals(
      [
        { unitPrice: 0.1, quantity: 3, discount: 0 },
        { unitPrice: 0.2, quantity: 3, discount: 0 },
      ],
      0.21,
    );
    expect(result.subtotal).toBe(0.9);
    expect(result.tax).toBe(0.19);
    expect(result.total).toBe(1.09);
  });



  describe("calculateSaleTotals - receipt sample", () => {
    it("calculates subtotal and total from receipt values", () => {
      const result = calculateSaleTotals(
        [
          { unitPrice: 2395.00, quantity: 1, discount:0 },
          { unitPrice: 959.95, quantity: 4, discount:0 },
          { unitPrice: 989.95, quantity: 3, discount:0 },
        ],
        0,
      );

      expect(result.subtotal).toBe(9204.65);
      expect(result.totalDiscount).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(9204.65);
    });
  });

  it("large values do not overflow or lose precision", () => {
    const result = calculateSaleTotals(
      [
        { unitPrice: 999999.99, quantity: 100, discount: 50000 },
        { unitPrice: 500000, quantity: 50, discount: 25000 },
      ],
      0.21,
    );
    expect(result.subtotal).toBe(124999999);
    expect(result.totalDiscount).toBe(75000);
    expect(result.tax).toBe(26234249.79);
    expect(result.total).toBe(151159248.79);
  });

  it("empty items returns zeroed totals", () => {
    const result = calculateSaleTotals([], 0.21);
    expect(result).toEqual({
      subtotal: 0,
      totalDiscount: 0,
      tax: 0,
      total: 0,
    });
  });
});
