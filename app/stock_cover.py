
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.db_models import (
    DemandRow,
    InventoryLotRow,
    SupplierProductRow,
    SupplierRow,
)

router = APIRouter(prefix="/stock-cover", tags=["Stock Cover"])


def get_db():
    with SessionLocal() as session:
        yield session


@router.get("/")
def calculate_stock_cover(
    sku: str | None = None,
    depot_id: str | None = None,
    db: Session = Depends(get_db),
):
    today = date.today()

    inventory_statement = select(InventoryLotRow)
    demand_statement = select(DemandRow)

    if sku:
        inventory_statement = inventory_statement.where(
            InventoryLotRow.sku == sku
        )
        demand_statement = demand_statement.where(
            DemandRow.sku == sku
        )

    if depot_id:
        inventory_statement = inventory_statement.where(
            InventoryLotRow.location_id == depot_id
        )
        demand_statement = demand_statement.where(
            DemandRow.depot_id == depot_id
        )

    lots = db.scalars(inventory_statement).all()
    demand_rows = db.scalars(demand_statement).all()

    # Load explicitly configured supplier-product mappings.
    mapping_statement = select(SupplierProductRow)

    if sku:
        mapping_statement = mapping_statement.where(
            SupplierProductRow.sku == sku
        )

    mappings = db.scalars(mapping_statement).all()

    supplier_ids = {mapping.supplier_id for mapping in mappings}
    suppliers = {}

    if supplier_ids:
        supplier_rows = db.scalars(
            select(SupplierRow).where(
                SupplierRow.supplier_id.in_(supplier_ids)
            )
        ).all()

        suppliers = {
            supplier.supplier_id: supplier
            for supplier in supplier_rows
        }

    mappings_by_sku = defaultdict(list)

    for mapping in mappings:
        supplier = suppliers.get(mapping.supplier_id)

        if supplier is None:
            continue

        effective_lead_time = (
            mapping.lead_time_days
            if mapping.lead_time_days is not None
            else supplier.lead_time_days
        )

        mappings_by_sku[mapping.sku].append({
            "supplier_id": supplier.supplier_id,
            "supplier_name": supplier.name,
            "lead_time_days": effective_lead_time,
        })

    # Group inventory by product and depot.
    inventory = defaultdict(
        lambda: {
            "usable_units": 0,
            "expired_units": 0,
            "total_units": 0,
            "usable_value": 0.0,
            "nearest_expiry_days": None,
        }
    )

    for lot in lots:
        key = (lot.sku, lot.location_id)
        item = inventory[key]
        item["total_units"] += lot.quantity

        if lot.expiry_date < today:
            item["expired_units"] += lot.quantity
            continue

        if lot.quantity <= 0:
            continue

        item["usable_units"] += lot.quantity
        item["usable_value"] += lot.quantity * lot.unit_cost

        days = (lot.expiry_date - today).days
        current = item["nearest_expiry_days"]

        if current is None or days < current:
            item["nearest_expiry_days"] = days

    # Aggregate demand by product, depot, and date.
    actual_by_day = defaultdict(int)
    forecast_by_day = defaultdict(int)

    for row in demand_rows:
        key = (row.sku, row.depot_id, row.demand_date)
        forecast_by_day[key] += row.forecast_quantity

        if row.actual_quantity is not None:
            actual_by_day[key] += row.actual_quantity

    actual_groups = defaultdict(list)
    forecast_groups = defaultdict(list)

    for (product, depot, _), quantity in actual_by_day.items():
        actual_groups[(product, depot)].append(quantity)

    for (product, depot, _), quantity in forecast_by_day.items():
        forecast_groups[(product, depot)].append(quantity)

    # Include product-depot pairs found in inventory or demand.
    keys = set(inventory)
    keys.update(
        (product, depot)
        for product, depot, _ in forecast_by_day
    )

    results = []

    for product, depot in sorted(keys):
        stock = inventory[(product, depot)]

        actual_values = actual_groups[(product, depot)]
        forecast_values = forecast_groups[(product, depot)]

        actual_days = len(actual_values)
        forecast_days = len(forecast_values)

        avg_actual = (
            sum(actual_values) / actual_days
            if actual_days else None
        )
        avg_forecast = (
            sum(forecast_values) / forecast_days
            if forecast_days else None
        )

        # Prefer actual demand when its average is positive.
        if avg_actual is not None and avg_actual > 0:
            selected_rate = avg_actual
            demand_basis = "actual"
            confidence = "LOW" if actual_days < 7 else "MODERATE"
        elif avg_forecast is not None and avg_forecast > 0:
            selected_rate = avg_forecast
            demand_basis = "forecast"
            confidence = "LOW"
        else:
            selected_rate = None
            demand_basis = None
            confidence = "INSUFFICIENT_DATA"

        usable_units = stock["usable_units"]

        # Calculate stock cover BEFORE comparing supplier lead times.
        if selected_rate is None:
            days_cover = None
            risk_level = (
                "NO_USABLE_STOCK" if usable_units == 0
                else "UNKNOWN"
            )
        else:
            days_cover = round(usable_units / selected_rate, 2)

            if usable_units == 0:
                risk_level = "HIGH"
            elif days_cover <= 3:
                risk_level = "HIGH"
            elif days_cover <= 7:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

        # Compare stock cover with each mapped supplier's lead time.
        product_suppliers = mappings_by_sku.get(product, [])

        if not product_suppliers:
            supplier_comparison = {
                "status": "unavailable_supplier_product_mapping",
                "suppliers": [],
            }
        else:
            supplier_comparison = {
                "status": "ok",
                "suppliers": [],
            }

            for supplier_info in product_suppliers:
                lead_time = supplier_info["lead_time_days"]

                if days_cover is None:
                    lead_status = "insufficient_demand_data"
                    cover_gap_days = None
                elif days_cover < lead_time:
                    lead_status = (
                        "potential_stockout_before_replenishment"
                    )
                    cover_gap_days = round(
                        lead_time - days_cover, 2
                    )
                else:
                    lead_status = "cover_meets_lead_time"
                    cover_gap_days = round(
                        days_cover - lead_time, 2
                    )

                supplier_comparison["suppliers"].append({
                    **supplier_info,
                    "days_of_cover": days_cover,
                    "cover_gap_days": cover_gap_days,
                    "status": lead_status,
                })

        results.append({
            "sku": product,
            "depot_id": depot,
            "usable_units": usable_units,
            "expired_units": stock["expired_units"],
            "total_units_including_expired": stock["total_units"],
            "usable_inventory_value": round(
                stock["usable_value"], 2
            ),
            "nearest_expiry_days": stock["nearest_expiry_days"],
            "average_daily_actual_demand": (
                round(avg_actual, 2)
                if avg_actual is not None else None
            ),
            "average_daily_forecast_demand": (
                round(avg_forecast, 2)
                if avg_forecast is not None else None
            ),
            "demand_basis": demand_basis,
            "days_of_cover": days_cover,
            "risk_level": risk_level,
            "confidence": confidence,
            "actual_days_with_data": actual_days,
            "forecast_days_with_data": forecast_days,
            "supplier_lead_time_comparison": supplier_comparison,
        })

    return {
        "as_of": today.isoformat(),
        "status": "ok" if results else "no_matching_records",
        "count": len(results),
        "results": results,
        "inventory_updated": False,
        "risk_rule_note": (
            "Preliminary inventory rules: HIGH at 3 or fewer days "
            "of cover, MEDIUM at 4-7 days, and LOW above 7 days. "
            "Supplier lead-time comparisons are additional warnings "
            "and do not automatically change risk_level. "
            "Demand estimates with fewer than 7 actual-demand days "
            "are marked LOW confidence."
        ),
    }
