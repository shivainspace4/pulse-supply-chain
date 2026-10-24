
import { useEffect, useState } from "react";
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
  type Product,
  type InventoryLot,
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

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productStatus, setProductStatus] = useState<LoadStatus>("loading");

  const [inventory, setInventory] = useState<InventoryLot[]>([]);
  const [expiringLots, setExpiringLots] = useState<InventoryLot[]>([]);
  const [inventoryStatus, setInventoryStatus] =
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

  async function refreshAll() {
    await Promise.all([loadProducts(), loadInventory()]);
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
        </div>
      </main>
    </div>
  );
}

export default App;
