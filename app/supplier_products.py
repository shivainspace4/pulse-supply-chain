
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.db_models import (
    SupplierProductRow,
    SupplierRow,
    ProductRow,
)

router = APIRouter(
    prefix="/supplier-products",
    tags=["Supplier Products"],
)


def get_db():
    with SessionLocal() as session:
        yield session


class SupplierProductCreate(BaseModel):
    supplier_id: str = Field(min_length=1, max_length=50)
    sku: str = Field(min_length=1, max_length=50)
    lead_time_days: int | None = Field(default=None, ge=0)


@router.post("/", status_code=201)
def create_supplier_product(
    payload: SupplierProductCreate,
    db: Session = Depends(get_db),
):
    supplier = db.get(SupplierRow, payload.supplier_id)
    if supplier is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found",
        )

    product = db.get(ProductRow, payload.sku)
    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    mapping_key = (payload.supplier_id, payload.sku)
    existing = db.get(SupplierProductRow, mapping_key)

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="This supplier-product mapping already exists",
        )

    mapping = SupplierProductRow(
        supplier_id=payload.supplier_id,
        sku=payload.sku,
        lead_time_days=payload.lead_time_days,
    )

    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    effective_lead_time = (
        mapping.lead_time_days
        if mapping.lead_time_days is not None
        else supplier.lead_time_days
    )

    return {
        "supplier_id": mapping.supplier_id,
        "sku": mapping.sku,
        "lead_time_days": mapping.lead_time_days,
        "effective_lead_time_days": effective_lead_time,
    }


@router.get("/")
def list_supplier_products(
    supplier_id: str | None = None,
    sku: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(SupplierProductRow)

    if supplier_id is not None:
        query = query.where(
            SupplierProductRow.supplier_id == supplier_id
        )

    if sku is not None:
        query = query.where(SupplierProductRow.sku == sku)

    mappings = db.scalars(
        query.order_by(
            SupplierProductRow.supplier_id,
            SupplierProductRow.sku,
        )
    ).all()

    results = []

    for mapping in mappings:
        supplier = db.get(SupplierRow, mapping.supplier_id)
        effective_lead_time = (
            mapping.lead_time_days
            if mapping.lead_time_days is not None
            else supplier.lead_time_days
        )

        results.append({
            "supplier_id": mapping.supplier_id,
            "supplier_name": supplier.name,
            "sku": mapping.sku,
            "lead_time_days": mapping.lead_time_days,
            "effective_lead_time_days": effective_lead_time,
        })

    return results
