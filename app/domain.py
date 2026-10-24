
from enum import Enum
from datetime import date
from pydantic import BaseModel, Field


class LocationType(str, Enum):
    PLANT = "PLANT"
    DEPOT = "DEPOT"
    COPACKER = "COPACKER"


class Product(BaseModel):
    sku: str
    name: str
    shelf_life_days: int = Field(gt=0)
    unit_cost: float = Field(ge=0)


class Location(BaseModel):
    location_id: str
    name: str
    location_type: LocationType


class Supplier(BaseModel):
    supplier_id: str
    name: str
    lead_time_days: int = Field(ge=0)



class InventoryLot(BaseModel):
    lot_id: str
    sku: str
    location_id: str
    quantity: int = Field(ge=0)
    expiry_date: date
    unit_cost: float = Field(ge=0)


class DemandRecord(BaseModel):
    sku: str
    depot_id: str
    demand_date: date
    forecast_quantity: int = Field(ge=0)
    actual_quantity: int | None = Field(default=None, ge=0)


class ProductionCapacity(BaseModel):
    location_id: str
    period: date
    capacity_units: int = Field(ge=0)
    utilization_limit: float = Field(gt=0, le=1)


class TransportLane(BaseModel):
    origin_id: str
    destination_id: str
    transit_days: int = Field(ge=0)
    cost_per_unit: float = Field(ge=0)
    is_active: bool = True
