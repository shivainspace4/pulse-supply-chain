
const API_BASE_URL = "http://localhost:8000";

export type Product = {
  sku: string;
  name: string;
  shelf_life_days: number;
  unit_cost: number;
};

async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function getProducts(): Promise<Product[]> {
  return getJSON<Product[]>("/products");
}

export function getHealth(): Promise<{ status: string }> {
  return getJSON<{ status: string }>("/health");
}


export type InventoryLot = {
  lot_id: string;
  sku: string;
  location_id: string;
  quantity: number;
  expiry_date: string;
  days_to_expiry: number;
  unit_cost: number;
};

export function getInventory(): Promise<InventoryLot[]> {
  return getJSON<InventoryLot[]>("/inventory/");
}

export function getExpiringInventory(
  withinDays = 30,
): Promise<InventoryLot[]> {
  return getJSON<InventoryLot[]>(
    `/inventory/expiring?within_days=${withinDays}`,
  );
}

