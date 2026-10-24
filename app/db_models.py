
from sqlalchemy import (
    CheckConstraint,
    Date,
    Float,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey
from app.database import Base

from sqlalchemy import UniqueConstraint


class SupplierRow(Base):
    __tablename__ = "suppliers"

    supplier_id: Mapped[str] = mapped_column(
        String(50), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "lead_time_days >= 0",
            name="ck_supplier_lead_time_nonnegative",
        ),
    )


class DemandRow(Base):
    __tablename__ = "demand"

    demand_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    sku: Mapped[str] = mapped_column(
        String(50), ForeignKey("products.sku"), nullable=False
    )
    depot_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("locations.location_id"),
        nullable=False,
    )
    demand_date: Mapped[Date] = mapped_column(Date, nullable=False)
    forecast_quantity: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    actual_quantity: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "forecast_quantity >= 0",
            name="ck_demand_forecast_nonnegative",
        ),
        CheckConstraint(
            "actual_quantity IS NULL OR actual_quantity >= 0",
            name="ck_demand_actual_nonnegative",
        ),
    )


class ProductionCapacityRow(Base):
    __tablename__ = "production_capacity"

    capacity_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    location_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("locations.location_id"),
        nullable=False,
    )
    period: Mapped[Date] = mapped_column(Date, nullable=False)
    capacity_units: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    utilization_limit: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "capacity_units >= 0",
            name="ck_capacity_units_nonnegative",
        ),
        CheckConstraint(
            "utilization_limit > 0 AND utilization_limit <= 1",
            name="ck_utilization_range",
        ),
        UniqueConstraint(
            "location_id", "period",
            name="uq_location_capacity_period",
        ),
    )


class ProductRow(Base):
    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    shelf_life_days: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "shelf_life_days > 0",
            name="ck_product_shelf_life_positive",
        ),
        CheckConstraint(
            "unit_cost >= 0",
            name="ck_product_unit_cost_nonnegative",
        ),
    )


class LocationRow(Base):
    __tablename__ = "locations"

    location_id: Mapped[str] = mapped_column(
        String(50), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )


class InventoryLotRow(Base):
    __tablename__ = "inventory_lots"

    lot_id: Mapped[str] = mapped_column(
        String(50), primary_key=True
    )
    sku: Mapped[str] = mapped_column(
    String(50),
    ForeignKey("products.sku"),
    nullable=False,
)
    location_id: Mapped[str] = mapped_column(
    String(50),
    ForeignKey("locations.location_id"),
    nullable=False,
)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_date: Mapped[Date] = mapped_column(Date, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "quantity >= 0",
            name="ck_inventory_quantity_nonnegative",
        ),
        CheckConstraint(
            "unit_cost >= 0",
            name="ck_inventory_cost_nonnegative",
        ),
    )



class SupplierProductRow(Base):
    __tablename__ = "supplier_products"

    supplier_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("suppliers.supplier_id"),
        primary_key=True,
    )
    sku: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("products.sku"),
        primary_key=True,
    )
    lead_time_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "lead_time_days IS NULL OR lead_time_days >= 0",
            name="ck_supplier_product_lead_time_nonnegative",
        ),
    )
