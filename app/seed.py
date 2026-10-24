
from sqlalchemy import select

from app.database import SessionLocal
from app.db_models import LocationRow, ProductRow, SupplierRow


PRODUCTS = [
    ("MANGO_PEACH_BASIL", "Mango Peach Basil", 90, 25.0),
    ("GUAVA_CHILLI", "Guava Chilli", 90, 23.0),
    ("PASSIONFRUIT_PUNCH", "Passionfruit Punch", 90, 28.0),
    ("DRAGONFRUIT_BLOOM", "Dragonfruit Bloom", 90, 30.0),
    ("DRAGON_PASSION", "Dragon Passion", 90, 29.0),
]

LOCATIONS = [
    ("PLANT_01", "Plant 1", "PLANT"),
    ("PLANT_02", "Plant 2", "PLANT"),
    ("COPACKER_01", "External Co-packer", "COPACKER"),
    *[
        (f"DEPOT_{i:02d}", f"Depot {i}", "DEPOT")
        for i in range(1, 10)
    ],
]

SUPPLIERS = [
    ("SUP_MANGO", "Mango pulp suppliers", 14),
    ("SUP_PEACH", "Peach pulp suppliers", 21),
    ("SUP_BASIL", "Basil contract farms", 7),
    ("SUP_GUAVA", "Guava pulp suppliers", 14),
    ("SUP_PASSION", "Passionfruit cooperative", 21),
    ("SUP_DRAGON_DOM", "Domestic dragonfruit suppliers", 14),
    ("SUP_DRAGON_IMP", "Imported dragonfruit suppliers", 56),
]


def seed_database():
    with SessionLocal() as session:
        for sku, name, shelf_life, unit_cost in PRODUCTS:
            existing = session.get(ProductRow, sku)
            if existing is None:
                session.add(
                    ProductRow(
                        sku=sku,
                        name=name,
                        shelf_life_days=shelf_life,
                        unit_cost=unit_cost,
                    )
                )

        for location_id, name, location_type in LOCATIONS:
            existing = session.get(LocationRow, location_id)
            if existing is None:
                session.add(
                    LocationRow(
                        location_id=location_id,
                        name=name,
                        location_type=location_type,
                    )
                )

        for supplier_id, name, lead_time in SUPPLIERS:
            existing = session.get(SupplierRow, supplier_id)
            if existing is None:
                session.add(
                    SupplierRow(
                        supplier_id=supplier_id,
                        name=name,
                        lead_time_days=lead_time,
                    )
                )

        session.commit()

    print("Seed data loaded successfully.")


if __name__ == "__main__":
    seed_database()
