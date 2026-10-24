from pydantic import BaseModel, Field
from datetime import date

from app.fefo import allocate_fefo
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.db_models import InventoryLotRow, ProductRow, LocationRow


class AllocationRequest(BaseModel):
    sku: str
    location_id: str
    demand_quantity: int = Field(ge=0)
    delivery_date: date
    min_remaining_days: int = Field(default=60, ge=0, le=365)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def get_db():
    with SessionLocal() as session:
        yield session


@router.get("/")
def list_inventory(
    location_id: str | None = None,
    sku: str | None = None,
    db: Session = Depends(get_db),
):
    statement = select(InventoryLotRow)

    if location_id:
        statement = statement.where(
            InventoryLotRow.location_id == location_id
        )

    if sku:
        statement = statement.where(
            InventoryLotRow.sku == sku
        )

    lots = db.scalars(
        statement.order_by(InventoryLotRow.expiry_date)
    ).all()

    today = date.today()

    return [
        {
            "lot_id": lot.lot_id,
            "sku": lot.sku,
            "location_id": lot.location_id,
            "quantity": lot.quantity,
            "expiry_date": lot.expiry_date.isoformat(),
            "days_to_expiry": (lot.expiry_date - today).days,
            "unit_cost": lot.unit_cost,
        }
        for lot in lots
    ]


@router.get("/expiring")
def expiring_inventory(
    within_days: int = Query(default=30, ge=0, le=365),
    db: Session = Depends(get_db),
):
    today = date.today()
    cutoff_date = date.fromordinal(today.toordinal() + within_days)

    statement = (
        select(InventoryLotRow)
        .where(
            InventoryLotRow.expiry_date >= today,
            InventoryLotRow.expiry_date <= cutoff_date,
            InventoryLotRow.quantity > 0,
        )
        .order_by(InventoryLotRow.expiry_date)
    )

    lots = db.scalars(statement).all()

    return [
        {
            "lot_id": lot.lot_id,
            "sku": lot.sku,
            "location_id": lot.location_id,
            "quantity": lot.quantity,
            "expiry_date": lot.expiry_date.isoformat(),
            "days_to_expiry": (lot.expiry_date - today).days,
        }
        for lot in lots
    ]


@router.get("/{lot_id}")
def get_inventory_lot(
    lot_id: str,
    db: Session = Depends(get_db),
):
    lot = db.get(InventoryLotRow, lot_id)

    if lot is None:
        raise HTTPException(
            status_code=404,
            detail="Inventory lot not found",
        )

    return {
        "lot_id": lot.lot_id,
        "sku": lot.sku,
        "location_id": lot.location_id,
        "quantity": lot.quantity,
        "expiry_date": lot.expiry_date.isoformat(),
        "days_to_expiry": (lot.expiry_date - date.today()).days,
        "unit_cost": lot.unit_cost,
    }

@router.post("/allocate")
def allocate_inventory(
    request: AllocationRequest,
    db: Session = Depends(get_db),
):
    # Confirm the product exists.
    product = db.get(ProductRow, request.sku)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    # Confirm the destination exists.
    location = db.get(LocationRow, request.location_id)

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    # Retrieve inventory for this product at this location.
    statement = select(InventoryLotRow).where(
        InventoryLotRow.sku == request.sku,
        InventoryLotRow.location_id == request.location_id,
    )

    inventory_rows = db.scalars(statement).all()

    # Convert database rows into the format expected by FEFO.
    lots = [
        {
            "lot_id": lot.lot_id,
            "quantity": lot.quantity,
            "expiry_date": lot.expiry_date,
        }
        for lot in inventory_rows
    ]

    # Calculate the allocation. This does not change database stock.
    result = allocate_fefo(
        lots=lots,
        demand_quantity=request.demand_quantity,
        delivery_date=request.delivery_date,
        min_remaining_days=request.min_remaining_days,
    )

    return {
        "sku": request.sku,
        "location_id": request.location_id,
        "delivery_date": request.delivery_date.isoformat(),
        "minimum_remaining_days": request.min_remaining_days,
        **result,
        "inventory_updated": False,
    }
