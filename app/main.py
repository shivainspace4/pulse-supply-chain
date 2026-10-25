from app.inventory_risk import assess_inventory_risk
from app.db_models import InventoryLotRow
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.inventory import router as inventory_router
from app.database import SessionLocal
from app.db_models import LocationRow, ProductRow
from app.production_api import router as production_router
from fastapi.middleware.cors import CORSMiddleware
from app.demand_analytics import router as demand_router
from app.demand_ingestion import router as demand_ingestion_router
from app.stock_cover import router as stock_cover_router
from app.supplier_products import router as supplier_products_router
from app.replenishment import router as replenishment_router

app = FastAPI(
    title="SCM Decision Engine",
    description="Local supply-chain planning and analytics platform",
    version="0.1.0",
)
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173","http://127.0.0.1:5173",],allow_credentials=True,allow_methods=["*"], allow_headers=["*"],)
app.include_router(inventory_router)
app.include_router(production_router)
app.include_router(demand_router)
app.include_router(demand_ingestion_router)
app.include_router(stock_cover_router)
app.include_router(supplier_products_router)
app.include_router(replenishment_router)


def get_db():
    with SessionLocal() as session:
        yield session

@app.get("/")
def home():
    return {
        "message": "SCM Decision Engine is running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.scalars(
        select(ProductRow).order_by(ProductRow.sku)
    ).all()

    return [
        {
            "sku": product.sku,
            "name": product.name,
            "shelf_life_days": product.shelf_life_days,
            "unit_cost": product.unit_cost,
        }
        for product in products
    ]


@app.get("/locations")
def list_locations(db: Session = Depends(get_db)):
    locations = db.scalars(
        select(LocationRow).order_by(LocationRow.location_id)
    ).all()

    return [
        {
            "location_id": location.location_id,
            "name": location.name,
            "location_type": location.location_type,
        }
        for location in locations
    ]


@app.get("/products/{sku}")
def get_product(sku: str, db: Session = Depends(get_db)):
    product = db.get(ProductRow, sku)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return {
        "sku": product.sku,
        "name": product.name,
        "shelf_life_days": product.shelf_life_days,
        "unit_cost": product.unit_cost,
    }


@app.get("/inventory-risk", tags=["Inventory Risk"])
def get_inventory_risk(
    expiry_warning_days: int = 30,
    critical_expiry_days: int = 7,
    db: Session = Depends(get_db),
):
    if expiry_warning_days < 0 or expiry_warning_days > 365:
        raise HTTPException(
            status_code=400,
            detail="expiry_warning_days must be between 0 and 365",
        )

    if critical_expiry_days < 0 or critical_expiry_days > 365:
        raise HTTPException(
            status_code=400,
            detail="critical_expiry_days must be between 0 and 365",
        )

    if critical_expiry_days > expiry_warning_days:
        raise HTTPException(
            status_code=400,
            detail=(
                "critical_expiry_days cannot exceed "
                "expiry_warning_days"
            ),
        )

    inventory_rows = db.scalars(
        select(InventoryLotRow).order_by(
            InventoryLotRow.expiry_date,
            InventoryLotRow.lot_id,
        )
    ).all()

    lots = [
        {
            "lot_id": lot.lot_id,
            "sku": lot.sku,
            "location_id": lot.location_id,
            "quantity": lot.quantity,
            "expiry_date": lot.expiry_date,
            "unit_cost": lot.unit_cost,
        }
        for lot in inventory_rows
    ]

    return assess_inventory_risk(
        lots=lots,
        expiry_warning_days=expiry_warning_days,
        critical_expiry_days=critical_expiry_days,
    )

