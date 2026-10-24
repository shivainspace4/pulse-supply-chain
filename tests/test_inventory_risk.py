
from datetime import date, timedelta

import pytest

from app.inventory_risk import assess_inventory_risk


TODAY = date(2026, 10, 24)


@pytest.fixture
def sample_lots():
    return [
        {
            "lot_id": "LOT-A",
            "sku": "JUICE-A",
            "location_id": "DEPOT-1",
            "quantity": 100,
            "expiry_date": TODAY + timedelta(days=5),
            "unit_cost": 25.0,
        },
        {
            "lot_id": "LOT-B",
            "sku": "JUICE-B",
            "location_id": "DEPOT-1",
            "quantity": 200,
            "expiry_date": TODAY + timedelta(days=20),
            "unit_cost": 30.0,
        },
        {
            "lot_id": "LOT-C",
            "sku": "JUICE-C",
            "location_id": "DEPOT-2",
            "quantity": 50,
            "expiry_date": TODAY - timedelta(days=2),
            "unit_cost": 10.0,
        },
        {
            "lot_id": "LOT-D",
            "sku": "JUICE-D",
            "location_id": "DEPOT-2",
            "quantity": 0,
            "expiry_date": TODAY + timedelta(days=2),
            "unit_cost": 10.0,
        },
    ]


def test_inventory_totals(sample_lots):
    result = assess_inventory_risk(sample_lots, as_of=TODAY)

    assert result["summary"]["total_lots"] == 4
    assert result["summary"]["total_units"] == 350
    assert result["summary"]["total_inventory_value"] == 9000.0


def test_expired_inventory_is_high_risk(sample_lots):
    result = assess_inventory_risk(sample_lots, as_of=TODAY)

    assert result["summary"]["expired_units"] == 50
    assert result["summary"]["expired_inventory_value"] == 500.0
    assert result["status"] == "HIGH"

    expired = next(
        risk for risk in result["risks"]
        if risk["lot_id"] == "LOT-C"
    )
    assert expired["risk_reason"] == "EXPIRED_STOCK"


def test_critical_and_medium_expiry(sample_lots):
    result = assess_inventory_risk(sample_lots, as_of=TODAY)

    risks = {risk["lot_id"]: risk for risk in result["risks"]}

    assert risks["LOT-A"]["risk_level"] == "HIGH"
    assert risks["LOT-A"]["risk_reason"] == "CRITICAL_EXPIRY"

    assert risks["LOT-B"]["risk_level"] == "MEDIUM"
    assert risks["LOT-B"]["risk_reason"] == "EXPIRY_WARNING"


def test_zero_quantity_is_not_flagged(sample_lots):
    result = assess_inventory_risk(sample_lots, as_of=TODAY)

    risk_ids = {risk["lot_id"] for risk in result["risks"]}
    assert "LOT-D" not in risk_ids


def test_empty_demand_is_reported_honestly(sample_lots):
    result = assess_inventory_risk(sample_lots, as_of=TODAY)

    assert result["demand_coverage"]["status"] == (
        "insufficient_demand_data"
    )
    assert result["demand_coverage"]["days_of_cover"] is None
    assert result["inventory_updated"] is False


def test_invalid_thresholds_are_rejected(sample_lots):
    with pytest.raises(ValueError):
        assess_inventory_risk(
            sample_lots,
            as_of=TODAY,
            expiry_warning_days=7,
            critical_expiry_days=30,
        )
