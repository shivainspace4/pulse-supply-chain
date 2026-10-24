
from dataclasses import dataclass


@dataclass
class ProductionPlan:
    demand_units: int
    plant_capacity_units: int
    plant_output_units: int
    copacker_capacity_units: int
    copacker_output_units: int
    total_production_units: int
    unmet_demand_units: int
    unused_plant_capacity_units: int


def plan_production(
    demand_units: int,
    plant_capacity_units: int,
    utilization_limit: float = 0.95,
    copacker_capacity_units: int = 0,
) -> ProductionPlan:
    """
    Create a simple production plan.

    All quantities must use the same unit, such as bottles.
    Co-packer capacity is assumed to be available at the
    stated quantity. Cost optimization comes later.
    """

    if demand_units < 0:
        raise ValueError("Demand cannot be negative")

    if plant_capacity_units < 0:
        raise ValueError("Plant capacity cannot be negative")

    if copacker_capacity_units < 0:
        raise ValueError("Co-packer capacity cannot be negative")

    if not 0 < utilization_limit <= 1:
        raise ValueError("Utilization limit must be in (0, 1]")

    plant_output = min(
        demand_units,
        int(plant_capacity_units * utilization_limit),
    )

    remaining_demand = demand_units - plant_output

    copacker_output = min(
        remaining_demand,
        copacker_capacity_units,
    )

    total_production = plant_output + copacker_output

    return ProductionPlan(
        demand_units=demand_units,
        plant_capacity_units=plant_capacity_units,
        plant_output_units=plant_output,
        copacker_capacity_units=copacker_capacity_units,
        copacker_output_units=copacker_output,
        total_production_units=total_production,
        unmet_demand_units=demand_units - total_production,
        unused_plant_capacity_units=(
            int(plant_capacity_units * utilization_limit)
            - plant_output
        ),
    )
