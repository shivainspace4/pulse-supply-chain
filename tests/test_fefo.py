
from datetime import date, timedelta

import pytest

from app.fefo import allocate_fefo


TODAY = date(2026, 10, 24)


def make_lot(lot_id, quantity, days_to_expiry):
    return {
        "lot_id": lot_id,
        "quantity": quantity,
        "expiry_date": TODAY + timedelta(days=days_to_expiry),
    }


def test_allocates_earliest_expiry_first():
    lots = [
        make_lot("LOT_A", 5000, 100),
        make_lot("LOT_B", 3000, 80),
    ]

    result = allocate_fefo(lots, 4000, TODAY)

    assert result["allocated_quantity"] == 4000
    assert result["unfulfilled_quantity"] == 0
    assert result["allocations"] == [
        {
            "lot_id": "LOT_B",
            "quantity_allocated": 3000,
            "expiry_date": (TODAY + timedelta(days=80)).isoformat(),
        },
        {
            "lot_id": "LOT_A",
            "quantity_allocated": 1000,
            "expiry_date": (TODAY + timedelta(days=100)).isoformat(),
        },
    ]


def test_excludes_lots_with_less_than_60_days_remaining():
    lots = [
        make_lot("LOT_A", 5000, 59),
        make_lot("LOT_B", 3000, 60),
    ]

    result = allocate_fefo(lots, 4000, TODAY)

    assert result["allocated_quantity"] == 3000
    assert result["unfulfilled_quantity"] == 1000
    assert result["excluded_lots"][0]["lot_id"] == "LOT_A"


def test_reports_unfulfilled_demand():
    lots = [make_lot("LOT_A", 1000, 90)]

    result = allocate_fefo(lots, 2500, TODAY)

    assert result["allocated_quantity"] == 1000
    assert result["unfulfilled_quantity"] == 1500


def test_does_not_allocate_expired_lots():
    lots = [make_lot("LOT_A", 5000, -1)]

    result = allocate_fefo(lots, 1000, TODAY)

    assert result["allocated_quantity"] == 0
    assert result["unfulfilled_quantity"] == 1000


def test_rejects_negative_demand():
    with pytest.raises(ValueError):
        allocate_fefo([], -1, TODAY)


def test_rejects_negative_inventory_quantity():
    lots = [make_lot("LOT_A", -100, 90)]

    with pytest.raises(ValueError):
        allocate_fefo(lots, 100, TODAY)
