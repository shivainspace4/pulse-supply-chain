
import pytest
from pydantic import ValidationError
from app.domain import Location, LocationType, Product, Supplier

def test_valid_product():
    product = Product(sku="JUICE001", name="Mango Peach Basil", shelf_life_days=90, unit_cost=25.0,)
    assert product.name == "Mango Peach Basil"
    assert product.shelf_life_days == 90


def test_negative_shelf_life_is_rejected():
    with pytest.raises(ValidationError):
        Product(sku="JUICE001", name="Mango Peach Basil", shelf_life_days=-10, unit_cost=25.0,)


def test_valid_depot():
    depot = Location(location_id="DEPOT01", name="Chennai Depot", location_type=LocationType.DEPOT,)
    assert depot.location_type == LocationType.DEPOT


def test_invalid_location_type_is_rejected():
    with pytest.raises(ValidationError):
        Location(location_id="LOC01", name="Unknown Location", location_type="WAREHOUSE",)


def test_negative_supplier_lead_time_is_rejected():
    with pytest.raises(ValidationError):
        Supplier(supplier_id="SUP001", name="Passionfruit Supplier", lead_time_days=-5,)
