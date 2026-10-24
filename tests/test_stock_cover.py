
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.db_models import (
    DemandRow,
    InventoryLotRow,
    LocationRow,
    ProductRow,
    SupplierProductRow,
    SupplierRow,
)
from app.main import app
from app.stock_cover import get_db


@pytest.fixture
def client():
    # Separate in-memory database; never touches local PostgreSQL.
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestSession = sessionmaker(
        bind=test_engine,
        autoflush=False,
        expire_on_commit=False,
    )

    Base.metadata.create_all(bind=test_engine)

    with TestSession() as db:
        db.add_all([
            ProductRow(
                sku="TEST_PRODUCT",
                name="Test product",
                shelf_life_days=90,
                unit_cost=10,
            ),
            LocationRow(
                location_id="TEST_DEPOT",
                name="Test depot",
                location_type="DEPOT",
            ),
            SupplierRow(
                supplier_id="TEST_SUPPLIER",
                name="Test supplier",
                lead_time_days=14,
            ),
        ])
        db.commit()

        app.dependency_overrides[get_db] = lambda: db

        try:
            yield TestClient(app)
        finally:
            app.dependency_overrides.pop(get_db, None)

    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


def add_inventory(db, quantity):
    db.add(
        InventoryLotRow(
            lot_id="TEST_LOT",
            sku="TEST_PRODUCT",
            location_id="TEST_DEPOT",
            quantity=quantity,
            expiry_date=date.today() + timedelta(days=60),
            unit_cost=10,
        )
    )
    db.commit()


def add_demand(db, actual_quantity=100, forecast_quantity=100):
    db.add(
        DemandRow(
            sku="TEST_PRODUCT",
            depot_id="TEST_DEPOT",
            demand_date=date.today(),
            forecast_quantity=forecast_quantity,
            actual_quantity=actual_quantity,
        )
    )
    db.commit()


def add_mapping(db, lead_time_days=None):
    db.add(
        SupplierProductRow(
            supplier_id="TEST_SUPPLIER",
            sku="TEST_PRODUCT",
            lead_time_days=lead_time_days,
        )
    )
    db.commit()


def test_stock_cover_below_supplier_lead_time(client):
    db = next(iter(app.dependency_overrides.values()))()
    add_inventory(db, 500)
    add_demand(db, actual_quantity=100)
    add_mapping(db)

    response = client.get(
        "/stock-cover/",
        params={"sku": "TEST_PRODUCT", "depot_id": "TEST_DEPOT"},
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    supplier = result["supplier_lead_time_comparison"]["suppliers"][0]

    assert result["days_of_cover"] == 5.0
    assert supplier["lead_time_days"] == 14
    assert supplier["cover_gap_days"] == 9.0
    assert supplier["status"] == "potential_stockout_before_replenishment"


def test_stock_cover_meets_supplier_lead_time(client):
    db = next(iter(app.dependency_overrides.values()))()
    add_inventory(db, 2000)
    add_demand(db, actual_quantity=100)
    add_mapping(db)

    response = client.get(
        "/stock-cover/",
        params={"sku": "TEST_PRODUCT", "depot_id": "TEST_DEPOT"},
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    supplier = result["supplier_lead_time_comparison"]["suppliers"][0]

    assert result["days_of_cover"] == 20.0
    assert supplier["cover_gap_days"] == 6.0
    assert supplier["status"] == "cover_meets_lead_time"


def test_missing_supplier_mapping_is_reported(client):
    db = next(iter(app.dependency_overrides.values()))()
    add_inventory(db, 500)
    add_demand(db, actual_quantity=100)

    response = client.get(
        "/stock-cover/",
        params={"sku": "TEST_PRODUCT", "depot_id": "TEST_DEPOT"},
    )

    assert response.status_code == 200
    result = response.json()["results"][0]

    assert result["supplier_lead_time_comparison"] == {
        "status": "unavailable_supplier_product_mapping",
        "suppliers": [],
    }


def test_missing_demand_data_does_not_crash(client):
    db = next(iter(app.dependency_overrides.values()))()
    add_inventory(db, 500)
    add_mapping(db)

    response = client.get(
        "/stock-cover/",
        params={"sku": "TEST_PRODUCT", "depot_id": "TEST_DEPOT"},
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    supplier = result["supplier_lead_time_comparison"]["suppliers"][0]

    assert result["days_of_cover"] is None
    assert supplier["status"] == "insufficient_demand_data"
    assert supplier["cover_gap_days"] is None
