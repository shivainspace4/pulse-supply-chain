
from datetime import date

import pytest
from pydantic import ValidationError

from app.domain import InventoryLot, DemandRecord


def test_valid_inventory_lot():
    lot = InventoryLot(
        lot_id="LOT001",
        sku="JUICE001",
        location_id="PLANT01",
        quantity=1000,
        expiry_date=date(2027, 1, 15),
        unit_cost=25.0,
    )

    assert lot.quantity == 1000


def test_negative_inventory_is_rejected():
    with pytest.raises(ValidationError):
        InventoryLot(
            lot_id="LOT002",
            sku="JUICE001",
            location_id="PLANT01",
            quantity=-100,
            expiry_date=date(2027, 1, 15),
            unit_cost=25.0,
        )


def test_valid_forecast():
    demand = DemandRecord(
        sku="JUICE001",
        depot_id="DEPOT01",
        demand_date=date(2026, 11, 1),
        forecast_quantity=5000,
    )

    assert demand.forecast_quantity == 5000
    assert demand.actual_quantity is None


def test_negative_demand_is_rejected():
    with pytest.raises(ValidationError):
        DemandRecord(
            sku="JUICE001",
            depot_id="DEPOT01",
            demand_date=date(2026, 11, 1),
            forecast_quantity=-500,
        )
