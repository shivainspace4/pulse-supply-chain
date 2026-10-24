
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.production_planner import plan_production

router = APIRouter(prefix="/production", tags=["Production"])


class ProductionRequest(BaseModel):
    demand_units: int = Field(ge=0)
    plant_capacity_units: int = Field(ge=0)
    utilization_limit: float = Field(default=0.95, gt=0, le=1)
    copacker_capacity_units: int = Field(default=0, ge=0)


@router.post("/plan")
def create_production_plan(request: ProductionRequest):
    plan = plan_production(
        demand_units=request.demand_units,
        plant_capacity_units=request.plant_capacity_units,
        utilization_limit=request.utilization_limit,
        copacker_capacity_units=request.copacker_capacity_units,
    )

    return plan
