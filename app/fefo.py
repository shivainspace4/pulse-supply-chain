
from datetime import date, timedelta


def allocate_fefo(
    lots: list[dict],
    demand_quantity: int,
    delivery_date: date,
    min_remaining_days: int = 60,
) -> dict:
    """
    Allocate eligible inventory using First Expiry, First Out.

    Each lot must contain:
      lot_id, quantity, expiry_date

    A lot is eligible only if its expiry date is at least
    min_remaining_days after the planned delivery date.

    This function does not modify the database.
    """

    if demand_quantity < 0:
        raise ValueError("Demand quantity cannot be negative")

    if min_remaining_days < 0:
        raise ValueError("Minimum remaining shelf life cannot be negative")

    minimum_expiry_date = delivery_date + timedelta(
        days=min_remaining_days
    )

    eligible_lots = []
    excluded_lots = []

    for lot in lots:
        if lot["quantity"] < 0:
            raise ValueError(
                f"Negative quantity in lot {lot['lot_id']}"
            )

        expiry_date = lot["expiry_date"]

        if expiry_date < minimum_expiry_date:
            excluded_lots.append({
                "lot_id": lot["lot_id"],
                "quantity": lot["quantity"],
                "expiry_date": expiry_date.isoformat(),
                "reason": "Insufficient remaining shelf life",
            })
        elif lot["quantity"] > 0:
            eligible_lots.append(lot)

    # Earliest eligible expiry first.
    eligible_lots.sort(
        key=lambda lot: (lot["expiry_date"], lot["lot_id"])
    )

    remaining_demand = demand_quantity
    allocations = []

    for lot in eligible_lots:
        if remaining_demand == 0:
            break

        allocated_quantity = min(
            lot["quantity"],
            remaining_demand,
        )

        if allocated_quantity > 0:
            allocations.append({
                "lot_id": lot["lot_id"],
                "quantity_allocated": allocated_quantity,
                "expiry_date": lot["expiry_date"].isoformat(),
            })

            remaining_demand -= allocated_quantity

    allocated_total = demand_quantity - remaining_demand

    return {
        "demand_quantity": demand_quantity,
        "allocated_quantity": allocated_total,
        "unfulfilled_quantity": remaining_demand,
        "allocations": allocations,
        "excluded_lots": excluded_lots,
    }
