
import pytest

from app.production_planner import plan_production


def test_plants_fulfil_demand_without_copacker():
    plan = plan_production(
        demand_units=900,
        plant_capacity_units=1000,
        utilization_limit=0.95,
    )

    assert plan.plant_output_units == 900
    assert plan.copacker_output_units == 0
    assert plan.unmet_demand_units == 0


def test_copacker_covers_capacity_shortage():
    plan = plan_production(
        demand_units=1000,
        plant_capacity_units=1000,
        utilization_limit=0.95,
        copacker_capacity_units=100,
    )

    assert plan.plant_output_units == 950
    assert plan.copacker_output_units == 50
    assert plan.unmet_demand_units == 0


def test_reports_unmet_demand_when_capacity_is_insufficient():
    plan = plan_production(
        demand_units=1200,
        plant_capacity_units=1000,
        utilization_limit=0.95,
        copacker_capacity_units=100,
    )

    assert plan.total_production_units == 1050
    assert plan.unmet_demand_units == 150


def test_rejects_negative_demand():
    with pytest.raises(ValueError):
        plan_production(
            demand_units=-1,
            plant_capacity_units=1000,
        )


def test_rejects_invalid_utilization():
    with pytest.raises(ValueError):
        plan_production(
            demand_units=100,
            plant_capacity_units=1000,
            utilization_limit=1.2,
        )
