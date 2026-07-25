import { MercadoPagoConfig, Order } from "mercadopago";

let clientInstance: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (!clientInstance) {
    clientInstance = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
      options: { timeout: 10000 },
    });
  }
  return clientInstance;
}

export function getMercadoPagoOrder() {
  return new Order(getMercadoPagoClient());
}

export function getMpStoreId(): string {
  return process.env.MP_STORE_ID!;
}


