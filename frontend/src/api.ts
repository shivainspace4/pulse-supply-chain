
const API_BASE_URL = "http://localhost:8000";

export type Product = {
  sku: string;
  name: string;
  shelf_life_days: number;
  unit_cost: number;
};

async function getJSON<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `API request failed: ${response.status} ${detail}`,
    );
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


export type ReplenishmentRecommendation = {
  sku: string;
  depot_id: string;
  usable_units: number;
  days_of_cover: number | null;
  daily_demand: number | null;
  demand_basis: string | null;
  confidence: string;
  supplier_id: string | null;
  supplier_name: string | null;
  lead_time_days: number | null;
  safety_stock_days: number;
  target_stock_units: number | null;
  recommended_order_quantity: number | null;
  action: string;
  reason: string | null;
};

export type ReplenishmentResponse = {
  as_of: string | null;
  status: string;
  safety_stock_days: number;
  count: number;
  results: ReplenishmentRecommendation[];
  method_note: string;
};

export function getReplenishmentRecommendations(
  sku?: string,
  depotId?: string,
  safetyStockDays = 3,
): Promise<ReplenishmentResponse> {
  const params = new URLSearchParams({
    safety_stock_days: String(safetyStockDays),
  });

  if (sku) params.set("sku", sku);
  if (depotId) params.set("depot_id", depotId);

  return getJSON<ReplenishmentResponse>(
    `/replenishment/?${params.toString()}`,
  );
}


export type ProductionRequest = {
  demand_units: number;
  plant_capacity_units: number;
  utilization_limit: number;
  copacker_capacity_units: number;
};

export type ProductionPlan = {
  demand_units: number;
  plant_capacity_units: number;
  plant_output_units: number;
  copacker_capacity_units: number;
  copacker_output_units: number;
  total_production_units: number;
  unmet_demand_units: number;
  unused_plant_capacity_units: number;
};

export function createProductionPlan(
  request: ProductionRequest,
): Promise<ProductionPlan> {
  return getJSON<ProductionPlan>("/production/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}