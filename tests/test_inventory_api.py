
from datetime import date

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_products_endpoint():
    response = client.get("/products")

    assert response.status_code == 200

    products = response.json()
    assert len(products) == 5


def test_inventory_endpoint():
    response = client.get("/inventory/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_unknown_product_returns_404():
    payload = {
        "sku": "UNKNOWN_PRODUCT",
        "location_id": "DEPOT_01",
        "demand_quantity": 100,
        "delivery_date": date.today().isoformat(),
        "min_remaining_days": 60,
    }

    response = client.post("/inventory/allocate", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"


def test_negative_demand_returns_422():
    payload = {
        "sku": "MANGO_PEACH_BASIL",
        "location_id": "DEPOT_01",
        "demand_quantity": -100,
        "delivery_date": date.today().isoformat(),
        "min_remaining_days": 60,
    }

    response = client.post("/inventory/allocate", json=payload)

    assert response.status_code == 422


def test_allocation_request_succeeds():
    payload = {
        "sku": "MANGO_PEACH_BASIL",
        "location_id": "DEPOT_01",
        "demand_quantity": 6000,
        "delivery_date": date.today().isoformat(),
        "min_remaining_days": 60,
    }

    response = client.post("/inventory/allocate", json=payload)

    assert response.status_code == 200

    result = response.json()

    assert result["demand_quantity"] == 6000
    assert 0 <= result["allocated_quantity"] <= 6000
    assert result["unfulfilled_quantity"] == (
        6000 - result["allocated_quantity"]
    )
    assert result["inventory_updated"] is False


def test_allocation_simulation_does_not_change_stock():
    payload = {
        "sku": "MANGO_PEACH_BASIL",
        "location_id": "DEPOT_01",
        "demand_quantity": 6000,
        "delivery_date": date.today().isoformat(),
        "min_remaining_days": 60,
    }

    first_response = client.post(
        "/inventory/allocate", json=payload
    )
    second_response = client.post(
        "/inventory/allocate", json=payload
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    first_result = first_response.json()
    second_result = second_response.json()

    assert (
        first_result["allocated_quantity"]
        == second_result["allocated_quantity"]
    )
    assert first_result["allocations"] == second_result["allocations"]
    assert first_result["inventory_updated"] is False
    assert second_result["inventory_updated"] is False
