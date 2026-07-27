import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adminEmail = process.env.ADMIN_USERNAME || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!adminEmail || !adminPassword) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set to seed the database.");
}

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    },
  });
  console.log(`Created user: ${user.name}`);

  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: "Flour" }, update: {}, create: { name: "Flour" } }),
    prisma.category.upsert({ where: { name: "Sugar" }, update: {}, create: { name: "Sugar" } }),
    prisma.category.upsert({ where: { name: "Yerba Mate" }, update: {}, create: { name: "Yerba Mate" } }),
  ]);
  console.log(`Created ${categories.length} categories`);

  const products = [
    { barcode: "7891234560001", sku: "FLO-001", name: "Harina Leudante 1kg", categoryId: categories[0].id, unit: "bag", packSize: 1, cost: 3500 },
    { barcode: "7891234560002", sku: "FLO-002", name: "Harina 000 1kg", categoryId: categories[0].id, unit: "bag", packSize: 1, cost: 3200 },
    { barcode: "7891234560003", sku: "FLO-003", name: "Harina Integral 1kg", categoryId: categories[0].id, unit: "bag", packSize: 1, cost: 4000 },
    { barcode: "7891234560004", sku: "FLO-004", name: "Harina Leudante 5kg", categoryId: categories[0].id, unit: "bag", packSize: 5, cost: 15000 },
    { barcode: "7891234560005", sku: "FLO-005", name: "Harina 000 50kg", categoryId: categories[0].id, unit: "bag", packSize: 50, cost: 120000 },
    { barcode: "7891234560010", sku: "AZU-001", name: "Azucar Estandar 1kg", categoryId: categories[1].id, unit: "bag", packSize: 1, cost: 4200 },
    { barcode: "7891234560011", sku: "AZU-002", name: "Azucar Impalpable 1kg", categoryId: categories[1].id, unit: "bag", packSize: 1, cost: 5500 },
    { barcode: "7891234560012", sku: "AZU-003", name: "Azucar Estandar 5kg", categoryId: categories[1].id, unit: "bag", packSize: 5, cost: 18000 },
    { barcode: "7891234560013", sku: "AZU-004", name: "Azucar Rubia 1kg", categoryId: categories[1].id, unit: "bag", packSize: 1, cost: 5000 },
    { barcode: "7891234560014", sku: "AZU-005", name: "Azucar Estandar 50kg", categoryId: categories[1].id, unit: "bag", packSize: 50, cost: 160000 },
    { barcode: "7891234560020", sku: "YER-001", name: "Yerba Mate Marca 1kg", categoryId: categories[2].id, unit: "bag", packSize: 1, cost: 8000 },
    { barcode: "7891234560021", sku: "YER-002", name: "Yerba Mate Despalada 1kg", categoryId: categories[2].id, unit: "bag", packSize: 1, cost: 10000 },
    { barcode: "7891234560022", sku: "YER-003", name: "Yerba Mate Organica 500g", categoryId: categories[2].id, unit: "bag", packSize: 0.5, cost: 12000 },
    { barcode: "7891234560023", sku: "YER-004", name: "Yerba Mate Suave 1kg", categoryId: categories[2].id, unit: "bag", packSize: 1, cost: 9500 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku! },
      update: {},
      create: p,
    });
    await prisma.stock.upsert({
      where: { productId_warehouse: { productId: product.id, warehouse: "main" } },
      update: {},
      create: { productId: product.id, warehouse: "main", quantity: Math.floor(Math.random() * 200) + 20 },
    });
    createdProducts.push(product);
  }
  console.log(`Created ${createdProducts.length} products with stock`);

  const priceLists = await Promise.all([
    prisma.priceList.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: "Public" } }),
    prisma.priceList.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: "Reseller" } }),
    prisma.priceList.upsert({ where: { id: 3 }, update: {}, create: { id: 3, name: "Wholesale" } }),
  ]);
  console.log(`Created ${priceLists.length} price lists`);

  for (const product of createdProducts) {
    const basePrice = Number(product.cost) * 1.3;
    await prisma.productPrice.upsert({
      where: { productId_priceListId: { productId: product.id, priceListId: 1 } },
      update: {},
      create: { productId: product.id, priceListId: 1, price: Math.round(basePrice) },
    });
    await prisma.productPrice.upsert({
      where: { productId_priceListId: { productId: product.id, priceListId: 2 } },
      update: {},
      create: { productId: product.id, priceListId: 2, price: Math.round(basePrice * 0.9) },
    });
    await prisma.productPrice.upsert({
      where: { productId_priceListId: { productId: product.id, priceListId: 3 } },
      update: {},
      create: { productId: product.id, priceListId: 3, price: Math.round(basePrice * 0.8) },
    });
  }
  console.log("Created product prices for all price lists");

  const customers = [
    { name: "Almacen Don Pedro", taxId: "80012345-6", address: "Av. Principal 123", phone: "021-555123", creditLimit: 5000000 },
    { name: "Minimarket Sol", taxId: "80012345-7", address: "Calle Comercio 456", phone: "021-555456", creditLimit: 3000000 },
    { name: "Kiosco La Esquina", taxId: "80012345-8", address: "Av. Libertad 789", phone: "021-555789", creditLimit: 2000000 },
    { name: "Despensa Barrio", taxId: "80012345-9", address: "Calle San Juan 321", phone: "021-555321", creditLimit: 4000000 },
    { name: "Supermercado Familiar", taxId: "80012345-0", address: "Av. Brasil 654", phone: "021-555654", creditLimit: 10000000 },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { taxId: c.taxId! } });
    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data: {} });
    } else {
      await prisma.customer.create({ data: c });
    }
  }
  console.log(`Created ${customers.length} customers`);

  console.log("\nSeed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
