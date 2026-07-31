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
    update: { email: adminEmail,passwordHash },
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
    { barcode: "7891234560001", name: "Harina Leudante 1kg", categoryId: categories[0].id, cost: 3500 },
    { barcode: "7891234560002", name: "Harina 000 1kg", categoryId: categories[0].id, cost: 3200 },
    { barcode: "7891234560003", name: "Harina Integral 1kg", categoryId: categories[0].id, cost: 4000 },
    { barcode: "7891234560004", name: "Harina Leudante 5kg", categoryId: categories[0].id, cost: 15000 },
    { barcode: "7891234560005", name: "Harina 000 50kg", categoryId: categories[0].id, cost: 120000 },
    { barcode: "7891234560010", name: "Azucar Estandar 1kg", categoryId: categories[1].id, cost: 4200 },
    { barcode: "7891234560011", name: "Azucar Impalpable 1kg", categoryId: categories[1].id, cost: 5500 },
    { barcode: "7891234560012", name: "Azucar Estandar 5kg", categoryId: categories[1].id, cost: 18000 },
    { barcode: "7891234560013", name: "Azucar Rubia 1kg", categoryId: categories[1].id, cost: 5000 },
    { barcode: "7891234560014", name: "Azucar Estandar 50kg", categoryId: categories[1].id, cost: 160000 },
    { barcode: "7891234560020", name: "Yerba Mate Marca 1kg", categoryId: categories[2].id, cost: 8000 },
    { barcode: "7891234560021", name: "Yerba Mate Despalada 1kg", categoryId: categories[2].id, cost: 10000 },
    { barcode: "7891234560022", name: "Yerba Mate Organica 500g", categoryId: categories[2].id, cost: 12000 },
    { barcode: "7891234560023", name: "Yerba Mate Suave 1kg", categoryId: categories[2].id, cost: 9500 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { barcode: p.barcode! },
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
    prisma.priceList.upsert({ where: { id: 1 }, update: { nameEs: "Público", nameEn: "Public" }, create: { id: 1, nameEs: "Público", nameEn: "Public" } }),
    prisma.priceList.upsert({ where: { id: 2 }, update: { nameEs: "Revendedor", nameEn: "Reseller" }, create: { id: 2, nameEs: "Revendedor", nameEn: "Reseller" } }),
    prisma.priceList.upsert({ where: { id: 3 }, update: { nameEs: "Mayorista", nameEn: "Wholesale" }, create: { id: 3, nameEs: "Mayorista", nameEn: "Wholesale" } }),
  ]);
  console.log(`Created ${priceLists.length} price lists`);

  for (const product of createdProducts) {
    const basePrice = Number(product.cost);
    const price = Math.round(basePrice * 100) / 100;
    await prisma.productPrice.upsert({
      where: { productId_priceListId: { productId: product.id, priceListId: 1 } },
      update: { price },
      create: { productId: product.id, priceListId: 1, price },
    });
    await prisma.productPrice.upsert({
      where: { productId_priceListId: { productId: product.id, priceListId: 2 } },
      update: { price },
      create: { productId: product.id, priceListId: 2, price },
    });
    await prisma.productPrice.upsert({
      where: { productId_priceListId: { productId: product.id, priceListId: 3 } },
      update: { price },
      create: { productId: product.id, priceListId: 3, price },
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
