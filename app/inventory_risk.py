
from datetime import date
from collections import defaultdict
from typing import Any


def assess_inventory_risk(
    lots: list[dict[str, Any]],
    as_of: date | None = None,
    expiry_warning_days: int = 30,
    critical_expiry_days: int = 7,
) -> dict[str, Any]:
    """
    Assess inventory expiry and financial exposure.

    Input lots must contain:
        lot_id, sku, location_id, quantity, expiry_date, unit_cost

    This function does not modify inventory.
    """
    if expiry_warning_days < 0:
        raise ValueError("expiry_warning_days must be >= 0")

    if critical_expiry_days < 0:
        raise ValueError("critical_expiry_days must be >= 0")

    if critical_expiry_days > expiry_warning_days:
        raise ValueError(
            "critical_expiry_days cannot exceed expiry_warning_days"
        )

    today = as_of or date.today()

    total_units = 0
    total_value = 0.0
    expired_units = 0
    expiring_soon_units = 0
    expired_value = 0.0
    expiring_soon_value = 0.0

    product_totals: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"quantity": 0, "value": 0.0}
    )
    location_totals: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"quantity": 0, "value": 0.0}
    )

    risks = []

    for lot in lots:
        quantity = int(lot["quantity"])
        unit_cost = float(lot["unit_cost"])
        expiry_date = lot["expiry_date"]

        if isinstance(expiry_date, str):
            expiry_date = date.fromisoformat(expiry_date)

        if quantity < 0 or unit_cost < 0:
            raise ValueError("Quantity and unit cost cannot be negative")

        days_to_expiry = (expiry_date - today).days
        inventory_value = quantity * unit_cost

        total_units += quantity
        total_value += inventory_value

        product_totals[lot["sku"]]["quantity"] += quantity
        product_totals[lot["sku"]]["value"] += inventory_value

        location_totals[lot["location_id"]]["quantity"] += quantity
        location_totals[lot["location_id"]]["value"] += inventory_value

        if quantity == 0:
            continue

        if days_to_expiry < 0:
            expired_units += quantity
            expired_value += inventory_value
            risk_level = "HIGH"
            risk_reason = "EXPIRED_STOCK"
        elif days_to_expiry <= critical_expiry_days:
            expiring_soon_units += quantity
            expiring_soon_value += inventory_value
            risk_level = "HIGH"
            risk_reason = "CRITICAL_EXPIRY"
        elif days_to_expiry <= expiry_warning_days:
            expiring_soon_units += quantity
            expiring_soon_value += inventory_value
            risk_level = "MEDIUM"
            risk_reason = "EXPIRY_WARNING"
        else:
            continue

        risks.append(
            {
                "lot_id": lot["lot_id"],
                "sku": lot["sku"],
                "location_id": lot["location_id"],
                "quantity": quantity,
                "unit_cost": unit_cost,
                "inventory_value": round(inventory_value, 2),
                "expiry_date": expiry_date.isoformat(),
                "days_to_expiry": days_to_expiry,
                "risk_level": risk_level,
                "risk_reason": risk_reason,
            }
        )

    risks.sort(
        key=lambda item: (
            0 if item["risk_level"] == "HIGH" else 1,
            item["days_to_expiry"],
            -item["inventory_value"],
        )
    )

    def format_totals(items):
        return {
            key: {
                "quantity": int(value["quantity"]),
                "inventory_value": round(float(value["value"]), 2),
            }
            for key, value in sorted(items.items())
        }

    return {
        "as_of": today.isoformat(),
        "status": (
            "HIGH"
            if expired_units > 0
            or any(r["risk_level"] == "HIGH" for r in risks)
            else "MEDIUM"
            if risks
            else "LOW"
        ),
        "summary": {
            "total_lots": len(lots),
            "total_units": total_units,
            "total_inventory_value": round(total_value, 2),
            "expired_units": expired_units,
            "expired_inventory_value": round(expired_value, 2),
            "expiring_soon_units": expiring_soon_units,
            "expiring_soon_value": round(expiring_soon_value, 2),
            "high_risk_lots": sum(
                r["risk_level"] == "HIGH" for r in risks
            ),
            "medium_risk_lots": sum(
                r["risk_level"] == "MEDIUM" for r in risks
            ),
        },
        "by_product": format_totals(product_totals),
        "by_location": format_totals(location_totals),
        "risks": risks,
        "demand_coverage": {
            "status": "insufficient_demand_data",
            "days_of_cover": None,
            "message": (
                "Demand history is empty. Days of inventory cover "
                "cannot be calculated reliably."
            ),
        },
        "inventory_updated": False,
    }
