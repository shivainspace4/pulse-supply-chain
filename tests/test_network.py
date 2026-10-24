
from datetime import date

import pytest
from pydantic import ValidationError

from app.domain import ProductionCapacity, TransportLane


def test_valid_production_capacity():
    capacity = ProductionCapacity(
        location_id="PLANT01",
        period=date(2027, 3, 1),
        capacity_units=1_250_000,
        utilization_limit=0.95,
    )

    assert capacity.capacity_units == 1_250_000
    assert capacity.utilization_limit == 0.95


def test_invalid_utilization_is_rejected():
    with pytest.raises(ValidationError):
        ProductionCapacity(
            location_id="PLANT01",
            period=date(2027, 3, 1),
            capacity_units=1_250_000,
            utilization_limit=1.5,
        )


def test_valid_transport_lane():
    lane = TransportLane(
        origin_id="PLANT01",
        destination_id="DEPOT01",
        transit_days=3,
        cost_per_unit=1.25,
    )

    assert lane.transit_days == 3
    assert lane.is_active is True


def test_inactive_transport_lane():
    lane = TransportLane(
        origin_id="PLANT01",
        destination_id="DEPOT01",
        transit_days=3,
        cost_per_unit=1.25,
        is_active=False,
    )

    assert lane.is_active is False
