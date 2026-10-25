
import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Factory,
  LayoutDashboard,
  MapPinned,
  Package,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";
import {
  getProducts,
  getInventory,
  getExpiringInventory,
  getReplenishmentRecommendations,
  createProductionPlan,
  type Product,
  type InventoryLot,
  type ReplenishmentRecommendation,
  type ProductionRequest,
  type ProductionPlan,
} from "./api";

type LoadStatus = "loading" | "connected" | "error";

const navigation = [
  { label: "Control Tower", icon: LayoutDashboard, active: true },
  { label: "Demand Intelligence", icon: BarChart3 },
  { label: "Supply Intelligence", icon: Activity },
  { label: "Inventory", icon: Boxes },
  { label: "Production", icon: Factory },
  { label: "Distribution & Transport", icon: Truck },
  { label: "Decision Deadlines", icon: CalendarClock },
  { label: "Scenario Lab", icon: Zap },
];

const demandData = [
  { day: "Mon", actual: 58, forecast: 52 },
  { day: "Tue", actual: 66, forecast: 63 },
  { day: "Wed", actual: 61, forecast: 67 },
  { day: "Thu", actual: 77, forecast: 71 },
  { day: "Fri", actual: 72, forecast: 76 },
  { day: "Sat", actual: 89, forecast: 82 },
  { day: "Sun", actual: 81, forecast: 85 },
];

const ingredientData = [
  { name: "Dragon fruit puree", value: 86, color: "purple" },
  { name: "Passion fruit", value: 72, color: "orange" },
  { name: "Mango concentrate", value: 61, color: "yellow" },
  { name: "Guava pulp", value: 48, color: "green" },
];

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function StatusPill({
  status,
  children,
}: {
  status: "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  return <span className={`status-pill status-${status}`}>{children}</span>;
}

function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  tone = "purple",
}: {
  label: string;
  value: string;
  detail: string;
  trend?: "up" | "down";
  icon: typeof Activity;
  tone?: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        {trend === "up" ? (
          <ArrowUpRight size={15} className="trend-up" />
        ) : trend === "down" ? (
          <ArrowDownRight size={15} className="trend-down" />
        ) : null}
        <span>{detail}</span>
      </div>
    </article>
  );
}

function DemandChart() {
  const max = Math.max(...demandData.flatMap((item) => [item.actual, item.forecast]));

  return (
    <div className="demand-chart">
      <div className="chart-legend">
        <span><i className="legend-dot actual-dot" /> Actual demand</span>
        <span><i className="legend-dot forecast-dot" /> Forecast</span>
      </div>
      <div className="chart-bars">
        {demandData.map((item) => (
          <div className="chart-day" key={item.day}>
            <div className="bar-pair">
              <div
                className="chart-bar actual-bar"
                style={{ height: `${(item.actual / max) * 100}%` }}
                title={`Actual: ${item.actual}k units`}
              />
              <div
                className="chart-bar forecast-bar"
                style={{ height: `${(item.forecast / max) * 100}%` }}
                title={`Forecast: ${item.forecast}k units`}
              />
            </div>
            <span className="chart-day-label">{item.day}</span>
          </div>
        ))}
      </div>
      <div className="chart-scale">
        <span>0</span>
        <span>25k</span>
        <span>50k</span>
        <span>75k</span>
        <span>100k units</span>
      </div>
      <p className="muted-note">
        Illustrative demand profile — replace with live forecast data when the
        forecasting endpoint is connected.
      </p>
    </div>
  );
}

function ProductMaster({
  products,
  status,
  onRefresh,
}: {
  products: Product[];
  status: LoadStatus;
  onRefresh: () => void;
}) {
  return (
    <section className="panel product-panel">
      <PanelHeader
        eyebrow="MASTER DATA"
        title="Product Master"
        action={
          <button className="subtle-button" onClick={onRefresh}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="panel-meta">
        <span>Products registered in the backend</span>
        {status === "connected" ? (
          <StatusPill status="success">
            <CheckCircle2 size={12} /> Connected
          </StatusPill>
        ) : status === "loading" ? (
          <StatusPill status="neutral">Loading</StatusPill>
        ) : (
          <StatusPill status="danger">Connection error</StatusPill>
        )}
      </div>

      {status === "error" ? (
        <div className="empty-state">
          <AlertTriangle size={22} />
          <strong>Could not load products</strong>
          <span>Check that the FastAPI backend is running on port 8000.</span>
        </div>
      ) : products.length === 0 && status === "connected" ? (
        <div className="empty-state">
          <Package size={22} />
          <strong>No products found</strong>
          <span>Add products through your backend to display them here.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Shelf life</th>
                <th>Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.sku}>
                  <td><span className="sku-code">{product.sku}</span></td>
                  <td className="product-name">{product.name}</td>
                  <td>{product.shelf_life_days} days</td>
                  <td>{formatINR(Number(product.unit_cost))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LiveInventory({
  inventory,
  expiringLots,
  status,
  onRefresh,
}: {
  inventory: InventoryLot[];
  expiringLots: InventoryLot[];
  status: LoadStatus;
  onRefresh: () => void;
}) {
  const totalUnits = inventory.reduce(
    (sum, lot) => sum + Number(lot.quantity || 0),
    0,
  );

  const totalValue = inventory.reduce(
    (sum, lot) => sum + Number(lot.quantity || 0) * Number(lot.unit_cost || 0),
    0,
  );

  const expiringUnits = expiringLots.reduce(
    (sum, lot) => sum + Number(lot.quantity || 0),
    0,
  );

  const locations = new Set(inventory.map((lot) => lot.location_id)).size;

  return (
    <section className="panel inventory-live-panel">
      <PanelHeader
        eyebrow="WAREHOUSE VISIBILITY"
        title="Live Inventory"
        action={
          <button className="subtle-button" onClick={onRefresh}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="panel-meta">
        <span>Stock levels and expiry exposure from the inventory API</span>
        {status === "connected" ? (
          <StatusPill status="success">
            <CheckCircle2 size={12} /> Live API
          </StatusPill>
        ) : status === "loading" ? (
          <StatusPill status="neutral">Loading</StatusPill>
        ) : (
          <StatusPill status="danger">API unavailable</StatusPill>
        )}
      </div>

      {status === "error" ? (
        <div className="empty-state">
          <AlertTriangle size={22} />
          <strong>Could not load inventory</strong>
          <span>
            Verify that the backend is running and the inventory endpoints are
            available.
          </span>
        </div>
      ) : (
        <>
          <div className="inventory-summary">
            <div className="inventory-stat">
              <span>Total units</span>
              <strong>{formatNumber(totalUnits)}</strong>
              <small>Across all inventory lots</small>
            </div>
            <div className="inventory-stat">
              <span>Recorded stock value</span>
              <strong>{formatINR(totalValue)}</strong>
              <small>Quantity × recorded unit cost</small>
            </div>
            <div className="inventory-stat warning-stat">
              <span>Expiring within 30 days</span>
              <strong>{formatNumber(expiringUnits)}</strong>
              <small>Units requiring attention</small>
            </div>
            <div className="inventory-stat">
              <span>Storage locations</span>
              <strong>{locations}</strong>
              <small>Locations represented in the data</small>
            </div>
          </div>

          <div className="inventory-table-heading">
            <div>
              <h3>Inventory lots</h3>
              <p>Review quantities, locations and expiry dates.</p>
            </div>
            <span className="record-count">{inventory.length} lots</span>
          </div>

          {inventory.length === 0 && status === "connected" ? (
            <div className="empty-state">
              <Warehouse size={22} />
              <strong>No inventory lots found</strong>
              <span>Inventory records will appear here when available.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lot ID</th>
                    <th>SKU</th>
                    <th>Location</th>
                    <th>Quantity</th>
                    <th>Expiry date</th>
                    <th>Unit cost</th>
                    <th>Expiry status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((lot) => {
                    const days = Number(lot.days_to_expiry);
                    const isExpired = days < 0;
                    const isExpiring = days >= 0 && days <= 30;

                    return (
                      <tr key={lot.lot_id}>
                        <td><span className="sku-code">{lot.lot_id}</span></td>
                        <td className="product-name">{lot.sku}</td>
                        <td>{lot.location_id}</td>
                        <td>{formatNumber(Number(lot.quantity))}</td>
                        <td>{lot.expiry_date}</td>
                        <td>{formatINR(Number(lot.unit_cost))}</td>
                        <td>
                          {isExpired ? (
                            <StatusPill status="danger">Expired</StatusPill>
                          ) : isExpiring ? (
                            <StatusPill status="warning">
                              {days} days left
                            </StatusPill>
                          ) : (
                            <StatusPill status="success">In date</StatusPill>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="muted-note">
            Inventory figures are calculated from the records returned by your
            backend. Confirm the underlying data before using them for
            operational decisions.
          </p>
        </>
      )}
    </section>
  );
}

function ReplenishmentPanel({
  recommendations,
  status,
  onRefresh,
}: {
  recommendations: ReplenishmentRecommendation[];
  status: LoadStatus;
  onRefresh: () => void;
}) {
  const reorderCount = recommendations.filter(
    (item) => item.action === "REORDER_RECOMMENDED",
  ).length;
  const lowConfidenceCount = recommendations.filter(
    (item) => item.confidence === "LOW",
  ).length;

  return (
    <section className="panel replenishment-panel" id="replenishment">
      <PanelHeader
        eyebrow="SUPPLY INTELLIGENCE · LIVE API"
        title="Replenishment recommendations"
        action={
          <button className="subtle-button" onClick={onRefresh}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="panel-meta replenishment-meta">
        <span>Demand-led reorder suggestions using supplier lead times and safety stock</span>
        {status === "connected" ? (
          <StatusPill status="success">
            <CheckCircle2 size={12} /> API connected
          </StatusPill>
        ) : status === "loading" ? (
          <StatusPill status="neutral">Loading</StatusPill>
        ) : (
          <StatusPill status="danger">API unavailable</StatusPill>
        )}
      </div>

      {status === "error" ? (
        <div className="empty-state">
          <AlertTriangle size={22} />
          <strong>Could not load replenishment recommendations</strong>
          <span>Check that FastAPI is running and GET /replenishment/ is registered.</span>
        </div>
      ) : status === "loading" ? (
        <div className="empty-state">
          <RefreshCw size={20} />
          <strong>Loading recommendations</strong>
          <span>PULSE is checking stock cover, demand and supplier lead times.</span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="empty-state">
          <Package size={22} />
          <strong>No recommendations returned</strong>
          <span>Check that products have inventory, demand data and supplier mappings.</span>
        </div>
      ) : (
        <>
          <div className="inventory-summary replenishment-summary">
            <div className="inventory-stat">
              <span>Recommendations</span>
              <strong>{recommendations.length}</strong>
              <small>Supplier scenarios returned</small>
            </div>
            <div className="inventory-stat replenishment-positive-stat">
              <span>Reorder signals</span>
              <strong>{reorderCount}</strong>
              <small>Require review</small>
            </div>
            <div className="inventory-stat warning-stat">
              <span>Low-confidence results</span>
              <strong>{lowConfidenceCount}</strong>
              <small>Validate demand history</small>
            </div>
          </div>

          <div className="inventory-table-heading">
            <div>
              <h3>Suggested actions</h3>
              <p>Review quantities and confidence before placing any order.</p>
            </div>
            <span className="record-count">{recommendations.length} results</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product / depot</th>
                  <th>Supplier</th>
                  <th>Usable stock</th>
                  <th>Cover</th>
                  <th>Lead time</th>
                  <th>Target stock</th>
                  <th>Suggested order</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((item, index) => {
                  const isReorder = item.action === "REORDER_RECOMMENDED";
                  const isLowConfidence = item.confidence === "LOW";
                  const actionStatus = isReorder
                    ? "danger"
                    : item.action === "NO_REORDER_NEEDED"
                      ? "success"
                      : "warning";

                  return (
                    <tr key={`${item.sku}-${item.depot_id}-${item.supplier_id ?? "unmapped"}-${index}`}>
                      <td>
                        <span className="sku-code">{item.sku}</span>
                        <div className="muted-note">{item.depot_id}</div>
                      </td>
                      <td>
                        <div className="product-name">{item.supplier_name ?? "Mapping required"}</div>
                        <div className="muted-note">{item.supplier_id ?? "No supplier mapping"}</div>
                      </td>
                      <td>{formatNumber(item.usable_units)}</td>
                      <td>{item.days_of_cover == null ? "Unknown" : `${item.days_of_cover.toFixed(1)} days`}</td>
                      <td>{item.lead_time_days == null ? "Unknown" : `${item.lead_time_days} days`}</td>
                      <td>{item.target_stock_units == null ? "—" : formatNumber(item.target_stock_units)}</td>
                      <td>
                        <strong className={isReorder ? "replenishment-quantity risk-text" : "replenishment-quantity positive-text"}>
                          {item.recommended_order_quantity == null
                            ? "—"
                            : `${formatNumber(item.recommended_order_quantity)} units`}
                        </strong>
                      </td>
                      <td>
                        <div className="replenishment-badges">
                          <StatusPill status={actionStatus}>
                            {item.action.replaceAll("_", " ")}
                          </StatusPill>
                          {isLowConfidence && (
                            <StatusPill status="warning">Low confidence</StatusPill>
                          )}
                        </div>
                        {item.reason && <div className="muted-note replenishment-reason">{item.reason}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="muted-note replenishment-disclaimer">
            Preliminary decision support only. Recommendations exclude open purchase orders, minimum order quantities,
            pack sizes, supplier capacity and stock that may expire before consumption. Validate demand and supplier
            mappings before acting; separate supplier rows are scenarios, not instructions to order from every supplier.
          </p>
        </>
      )}
    </section>
  );
}


function ProductionPanel() {
  const [demandUnits, setDemandUnits] = useState("10000");
  const [plantCapacityUnits, setPlantCapacityUnits] = useState("8000");
  const [utilizationLimit, setUtilizationLimit] = useState("0.95");
  const [copackerCapacityUnits, setCopackerCapacityUnits] = useState("3000");
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setPlan(null);

    const request: ProductionRequest = {
      demand_units: Number(demandUnits),
      plant_capacity_units: Number(plantCapacityUnits),
      utilization_limit: Number(utilizationLimit),
      copacker_capacity_units: Number(copackerCapacityUnits),
    };

    if (
      ![request.demand_units, request.plant_capacity_units, request.utilization_limit, request.copacker_capacity_units].every(Number.isFinite) ||
      request.demand_units < 0 ||
      request.plant_capacity_units < 0 ||
      request.copacker_capacity_units < 0 ||
      request.utilization_limit <= 0 ||
      request.utilization_limit > 1
    ) {
      setStatus("error");
      setErrorMessage("Enter non-negative unit quantities and a utilization limit greater than 0 and at most 1.");
      return;
    }

    try {
      const result = await createProductionPlan(request);
      setPlan(result);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not create the production plan.");
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
    color: "#cbd5e1",
    fontSize: 12,
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    height: 43,
    padding: "10px 12px",
    border: "1px solid #334155",
    borderRadius: 8,
    background: "#0b1220",
    color: "#f8fafc",
    fontSize: 13,
  };

  const resultCardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
    padding: 17,
    border: "1px solid #263449",
    borderRadius: 11,
    background: "#111c2c",
  };

  const number = (value: number) => value.toLocaleString("en-IN");

  return (
    <section className="panel">
      <PanelHeader eyebrow="PRODUCTION PLANNING" title="Create a production plan" />

      <p className="panel-description">
        Allocate demand to the plant first, respecting its utilization limit, then use available co-packer capacity for remaining demand. Quantities must use the same unit.
      </p>

      <form
        onSubmit={submitPlan}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: "100%",
          marginTop: 22,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
            gap: 18,
            width: "100%",
          }}
        >
          <label style={fieldStyle}>
            Demand (units)
            <input style={inputStyle} type="number" min="0" step="1" required value={demandUnits} onChange={(e) => setDemandUnits(e.target.value)} />
          </label>

          <label style={fieldStyle}>
            Plant capacity (units)
            <input style={inputStyle} type="number" min="0" step="1" required value={plantCapacityUnits} onChange={(e) => setPlantCapacityUnits(e.target.value)} />
          </label>

          <label style={fieldStyle}>
            Utilization limit (0–1)
            <input style={inputStyle} type="number" min="0.01" max="1" step="0.01" required value={utilizationLimit} onChange={(e) => setUtilizationLimit(e.target.value)} />
            <small style={{ color: "#8295b2", fontSize: 10 }}>0.95 means 95% of plant capacity.</small>
          </label>

          <label style={fieldStyle}>
            Co-packer capacity (units)
            <input style={inputStyle} type="number" min="0" step="1" required value={copackerCapacityUnits} onChange={(e) => setCopackerCapacityUnits(e.target.value)} />
          </label>
        </div>

        <button className="primary-button" type="submit" disabled={status === "loading"} style={{ alignSelf: "flex-start" }}>
          <Factory size={15} />
          {status === "loading" ? "Creating plan..." : "Create production plan"}
        </button>
      </form>

      {status === "error" && (
        <div className="production-error" role="alert" style={{ marginTop: 18 }}>
          <AlertTriangle size={17} /> {errorMessage}
        </div>
      )}

      {plan && (
        <div style={{ marginTop: 27, paddingTop: 23, borderTop: "1px solid #263449" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15, marginBottom: 18, flexWrap: "wrap" }}>
            <div>
              <div className="eyebrow">PLAN RESULT</div>
              <h3 style={{ margin: "6px 0 0" }}>Production allocation</h3>
            </div>
            <StatusPill status={plan.unmet_demand_units === 0 ? "success" : "warning"}>
              {plan.unmet_demand_units === 0 ? "Demand covered" : "Demand shortfall"}
            </StatusPill>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 13, margin: "17px 0 21px" }}>
            {[
              ["Total production", plan.total_production_units],
              ["Plant output", plan.plant_output_units],
              ["Co-packer output", plan.copacker_output_units],
              ["Unmet demand", plan.unmet_demand_units],
            ].map(([label, value]) => (
              <div key={String(label)} style={resultCardStyle}>
                <span style={{ color: "#8ca5c8", fontSize: 11 }}>{label}</span>
                <strong style={{ color: "#f8fafc", fontSize: 24 }}>{number(Number(value))}</strong>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              ["Demand", `${number(plan.demand_units)} units`],
              ["Plant capacity", `${number(plan.plant_capacity_units)} units`],
              ["Unused permitted plant capacity", `${number(plan.unused_plant_capacity_units)} units`],
              ["Available co-packer capacity", `${number(plan.copacker_capacity_units)} units`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid #202e41", flexWrap: "wrap" }}>
                <span style={{ color: "#8ca5c8", fontSize: 11 }}>{label}</span>
                <strong style={{ fontSize: 11 }}>{value}</strong>
              </div>
            ))}
          </div>

          <p className="muted-note">
            Live API result. The planner assumes the entered co-packer capacity is available and does not optimize production cost.
          </p>
        </div>
      )}
    </section>
  );
}

function pageDescription(page: string): string {
  const descriptions: Record<string, string> = {
    "Demand Intelligence": "Understand demand signals and forecast performance.",
    "Supply Intelligence": "Review supplier lead times and replenishment decisions.",
    Inventory: "Track stock, expiry exposure and product master data.",
    Production: "Plan production across plant capacity and co-packer support.",
    "Distribution & Transport": "Monitor depot movement, dispatches and transport execution.",
    "Decision Deadlines": "Track time-sensitive operational decisions and follow-ups.",
    "Scenario Lab": "Explore what-if scenarios for supply chain decisions.",
    Settings: "Manage the local workspace and service status.",
  };
  return descriptions[page] ?? "Supply chain operations workspace.";
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productStatus, setProductStatus] = useState<LoadStatus>("loading");

  const [inventory, setInventory] = useState<InventoryLot[]>([]);
  const [expiringLots, setExpiringLots] = useState<InventoryLot[]>([]);
  const [inventoryStatus, setInventoryStatus] =
    useState<LoadStatus>("loading");

  const [replenishments, setReplenishments] = useState<ReplenishmentRecommendation[]>([]);
  const [replenishmentStatus, setReplenishmentStatus] =
    useState<LoadStatus>("loading");

  const [activeNav, setActiveNav] = useState("Control Tower");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadProducts() {
    setProductStatus("loading");

    try {
      const data = await getProducts();
      setProducts(data);
      setProductStatus("connected");
    } catch (error) {
      console.error("Failed to load products:", error);
      setProductStatus("error");
    }
  }

  async function loadInventory() {
    setInventoryStatus("loading");

    try {
      const [lots, expiring] = await Promise.all([
        getInventory(),
        getExpiringInventory(30),
      ]);

      setInventory(lots);
      setExpiringLots(expiring);
      setInventoryStatus("connected");
    } catch (error) {
      console.error("Failed to load inventory:", error);
      setInventoryStatus("error");
    }
  }

  async function loadReplenishments() {
    setReplenishmentStatus("loading");

    try {
      const data = await getReplenishmentRecommendations();
      setReplenishments(data.results);
      setReplenishmentStatus("connected");
    } catch (error) {
      console.error("Failed to load replenishment recommendations:", error);
      setReplenishmentStatus("error");
    }
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadInventory(), loadReplenishments()]);
    setLastUpdated(new Date());
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    );
  });

  const backendConnected =
    productStatus === "connected" && inventoryStatus === "connected";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Activity size={23} /></div>
          <div>
            <div className="brand-name">PULSE<span>.</span></div>
            <div className="brand-caption">SUPPLY CHAIN INTELLIGENCE</div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-selector">
          <div className="workspace-avatar">PR</div>
          <div className="workspace-copy">
            <strong>Pulp Riot</strong>
            <span>India Operations</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-section-label">OPERATIONS</div>
        <nav className="sidebar-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => setActiveNav(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Decision Deadlines" && (
                <span className="nav-count">3</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-status">
          <div className="sidebar-status-top">
            <span className={`connection-dot ${backendConnected ? "online" : ""}`} />
            <strong>{backendConnected ? "Backend connected" : "Backend status"}</strong>
          </div>
          <p>
            {backendConnected
              ? "Product and inventory APIs are responding."
              : "Checking product and inventory services."}
          </p>
          <div className="sidebar-status-footer">
            <span>API · localhost:8000</span>
            <ShieldCheck size={15} />
          </div>
        </div>

        <button className="nav-item settings-item" onClick={() => setActiveNav("Settings")}>
          <Settings2 size={18} />
          <span>Settings</span>
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">V</div>
          <div className="workspace-copy">
            <strong>Operations Team</strong>
            <span>Administrator</span>
          </div>
          <CircleHelp size={17} />
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activeNav}</strong>
          </div>

          <div className="topbar-actions">
            <div className="topbar-date">
              <Clock3 size={14} />
              <span>
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Connecting to APIs"}
              </span>
            </div>
            <button className="icon-button" title="Notifications">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-avatar">V</div>
          </div>
        </header>

        <div className="page-content">
          {activeNav !== "Control Tower" ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow page-eyebrow">
                    <span className="live-indicator" /> PULSE WORKSPACE
                  </div>
                  <h1>{activeNav}<span>.</span></h1>
                  <p>{pageDescription(activeNav)}</p>
                </div>
                <button className="primary-button" onClick={() => void refreshAll()}>
                  <RefreshCw size={15} /> Refresh data
                </button>
              </section>

              {activeNav === "Inventory" ? (
                <>
                  <section className="dashboard-data-section">
                    <div className="section-heading"><div><h2>Inventory intelligence</h2><p>Live lot-level stock and expiry visibility from the backend.</p></div></div>
                    <LiveInventory inventory={inventory} expiringLots={expiringLots} status={inventoryStatus} onRefresh={() => void loadInventory()} />
                  </section>
                  <section className="dashboard-data-section" id="product-master">
                    <div className="section-heading"><div><h2>Product master</h2><p>Products registered in your application backend.</p></div><div className="search-box"><Search size={15} /><input aria-label="Search products" placeholder="Search products or SKU..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div></div>
                    <ProductMaster products={filteredProducts} status={productStatus} onRefresh={() => void loadProducts()} />
                  </section>
                </>
              ) : activeNav === "Supply Intelligence" ? (
                <>
                  <ReplenishmentPanel recommendations={replenishments} status={replenishmentStatus} onRefresh={() => void loadReplenishments()} />
                  <section className="panel"><PanelHeader eyebrow="SUPPLY INTELLIGENCE" title="Supplier and lead-time signals" /><p className="panel-description">Recommendations use available supplier mappings, estimated daily demand, usable inventory and safety stock. Validate low-confidence demand and supplier data before acting.</p></section>
                </>
              ) : activeNav === "Production" ? (
                <ProductionPanel />
              ) : activeNav === "Demand Intelligence" ? (
                <>
                  <section className="panel demand-panel"><PanelHeader eyebrow="DEMAND INTELLIGENCE" title="Demand vs. forecast" /><div className="empty-state"><BarChart3 size={22} /><strong>Demand history integration pending</strong><span>The current chart on Control Tower is illustrative. This page will become data-driven when a time-series demand endpoint is available.</span></div><DemandChart /></section>
                </>
              ) : activeNav === "Settings" ? (
                <section className="panel"><PanelHeader eyebrow="WORKSPACE" title="Settings" /><p className="panel-description">PULSE is currently configured to use the local FastAPI service at localhost:8000. Environment and user-management settings are not yet implemented.</p><div className="panel-meta"><span>Product API</span><StatusPill status={productStatus === "connected" ? "success" : productStatus === "error" ? "danger" : "neutral"}>{productStatus}</StatusPill></div><div className="panel-meta"><span>Inventory API</span><StatusPill status={inventoryStatus === "connected" ? "success" : inventoryStatus === "error" ? "danger" : "neutral"}>{inventoryStatus}</StatusPill></div><div className="panel-meta"><span>Replenishment API</span><StatusPill status={replenishmentStatus === "connected" ? "success" : replenishmentStatus === "error" ? "danger" : "neutral"}>{replenishmentStatus}</StatusPill></div></section>
              ) : (
                <section className="panel"><PanelHeader eyebrow="WORKSPACE MODULE" title={activeNav} /><div className="empty-state"><Clock3 size={22} /><strong>This module is not connected yet</strong><span>{pageDescription(activeNav)} The navigation now opens its own page; the operational workflow and backend integration for this module are still to be built.</span></div></section>
              )}
              <footer className="page-footer"><span>PULSE Supply Chain Intelligence</span><span><MapPinned size={13} /> India Operations</span><span>Prototype dashboard · Validate data before operational use</span></footer>
            </>
          ) : (
            <>
          <section className="page-heading">
            <div>
              <div className="eyebrow page-eyebrow">
                <span className="live-indicator" /> OPERATIONS OVERVIEW
              </div>
              <h1>Control Tower<span>.</span></h1>
              <p>
                One view of your supply chain. Clear priorities, faster
                decisions, fewer surprises.
              </p>
            </div>

            <button className="primary-button" onClick={() => void refreshAll()}>
              <RefreshCw size={15} /> Refresh data
            </button>
          </section>

          <section className="alert-banner">
            <div className="alert-banner-icon"><AlertTriangle size={19} /></div>
            <div className="alert-banner-copy">
              <strong>Protect inventory before it loses value</strong>
              <span>
                Review lots approaching expiry and prioritize stock rotation
                before replenishing.
              </span>
            </div>
            <button
              className="alert-banner-action"
              onClick={() => {
                document.getElementById("live-inventory")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              Review inventory <ArrowUpRight size={15} />
            </button>
          </section>

          <div className="section-heading">
            <div>
              <h2>Network snapshot</h2>
              <p>High-level operational indicators</p>
            </div>
            <span className="data-note">
              <span className="connection-dot online" /> Prototype metrics
            </span>
          </div>

          <section className="metrics-grid">
            <MetricCard
              label="Service level"
              value="96.4%"
              detail="Illustrative · target 98%"
              icon={CheckCircle2}
              tone="green"
            />
            <MetricCard
              label="Demand forecast accuracy"
              value="91.8%"
              detail="Illustrative model output"
              icon={BarChart3}
              tone="purple"
            />
            <MetricCard
              label="Inventory at risk"
              value="₹13.7L"
              detail="Illustrative exposure"
              icon={AlertTriangle}
              tone="orange"
            />
            <MetricCard
              label="Open decisions"
              value="03"
              detail="Illustrative action queue"
              icon={CalendarClock}
              tone="blue"
            />
          </section>

          <div className="dashboard-grid">
            <section className="panel demand-panel">
              <PanelHeader
                eyebrow="DEMAND INTELLIGENCE"
                title="Demand vs. forecast"
                action={
                  <button className="select-button">
                    Last 7 days <ChevronDown size={14} />
                  </button>
                }
              />
              <div className="chart-summary">
                <div>
                  <strong>504k</strong>
                  <span>Actual units</span>
                </div>
                <div>
                  <strong>496k</strong>
                  <span>Forecast units</span>
                </div>
                <div>
                  <strong className="positive-text">+1.6%</strong>
                  <span>Variance</span>
                </div>
              </div>
              <DemandChart />
            </section>

            <section className="panel exposure-panel">
              <PanelHeader
                eyebrow="SUPPLY INTELLIGENCE"
                title="Ingredient exposure"
                action={<button className="more-button">•••</button>}
              />
              <p className="panel-description">
                Illustrative view of ingredient supply pressure.
              </p>
              <div className="exposure-list">
                {ingredientData.map((item) => (
                  <div className="exposure-item" key={item.name}>
                    <div className="exposure-label-row">
                      <span>{item.name}</span>
                      <strong>{item.value}%</strong>
                    </div>
                    <div className="exposure-track">
                      <div
                        className={`exposure-fill ${item.color}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="exposure-footer">
                <AlertTriangle size={15} />
                <span>Connect supplier lead-time data for live risk scores.</span>
              </div>
            </section>
          </div>

          <ReplenishmentPanel
            recommendations={replenishments}
            status={replenishmentStatus}
            onRefresh={() => void loadReplenishments()}
          />

          <section className="panel action-panel">
            <PanelHeader
              eyebrow="DECISION SUPPORT"
              title="Priority actions"
              action={
                <StatusPill status="warning">Illustrative queue</StatusPill>
              }
            />
            <div className="action-list">
              <div className="action-row">
                <div className="action-icon urgent"><AlertTriangle size={17} /></div>
                <div className="action-copy">
                  <strong>Review near-expiry inventory</strong>
                  <span>Check the live inventory lots below and plan stock rotation.</span>
                </div>
                <StatusPill status="warning">High priority</StatusPill>
                <button
                  className="row-arrow"
                  aria-label="Go to inventory"
                  onClick={() =>
                    document.getElementById("live-inventory")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="action-row">
                <div className="action-icon info"><BarChart3 size={17} /></div>
                <div className="action-copy">
                  <strong>Validate demand forecast</strong>
                  <span>Compare the illustrative chart with actual sales data.</span>
                </div>
                <StatusPill status="neutral">Review</StatusPill>
                <button className="row-arrow" aria-label="Review demand">
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="action-row">
                <div className="action-icon good"><CheckCircle2 size={17} /></div>
                <div className="action-copy">
                  <strong>Verify product master data</strong>
                  <span>Confirm shelf life and unit cost values are current.</span>
                </div>
                <StatusPill status="success">Available</StatusPill>
                <button
                  className="row-arrow"
                  aria-label="Go to products"
                  onClick={() =>
                    document.getElementById("product-master")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </div>
          </section>

          <section id="product-master" className="dashboard-data-section">
            <div className="section-heading">
              <div>
                <h2>Master data</h2>
                <p>Products registered in your application backend</p>
              </div>
              <div className="search-box">
                <Search size={15} />
                <input
                  aria-label="Search products"
                  placeholder="Search products or SKU..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
            <ProductMaster
              products={filteredProducts}
              status={productStatus}
              onRefresh={() => void loadProducts()}
            />
          </section>

          <section id="live-inventory" className="dashboard-data-section">
            <div className="section-heading">
              <div>
                <h2>Inventory intelligence</h2>
                <p>Lot-level visibility, stock value and expiry exposure</p>
              </div>
              <div className="inventory-section-icon"><Warehouse size={19} /></div>
            </div>
            <LiveInventory
              inventory={inventory}
              expiringLots={expiringLots}
              status={inventoryStatus}
              onRefresh={() => void loadInventory()}
            />
          </section>

          <footer className="page-footer">
            <span>PULSE Supply Chain Intelligence</span>
            <span>
              <MapPinned size={13} /> India Operations
            </span>
            <span>Prototype dashboard · Validate data before operational use</span>
          </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
