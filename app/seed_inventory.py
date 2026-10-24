
from datetime import date, timedelta

from app.database import SessionLocal
from app.db_models import InventoryLotRow


def main():
    today = date.today()

    # Synthetic test data, not actual company inventory.
    lots = [
        # lot_id, SKU, location, quantity, days to expiry, unit cost
        ("LOT001", "MANGO_PEACH_BASIL", "DEPOT_01", 5000, 20, 25.0),
        ("LOT002", "MANGO_PEACH_BASIL", "DEPOT_01", 8000, 65, 25.0),
        ("LOT003", "GUAVA_CHILLI", "DEPOT_01", 4000, 45, 23.0),
        ("LOT004", "PASSIONFRUIT_PUNCH", "DEPOT_02", 3000, 75, 28.0),
        ("LOT005", "DRAGONFRUIT_BLOOM", "DEPOT_03", 6000, 15, 30.0),
        ("LOT006", "DRAGON_PASSION", "PLANT_01", 10000, 80, 29.0),
        ("LOT007", "MANGO_PEACH_BASIL", "DEPOT_02", 2500, 8, 25.0),
        ("LOT008", "GUAVA_CHILLI", "PLANT_02", 7000, 100, 23.0),
        ("LOT009", "PASSIONFRUIT_PUNCH", "DEPOT_01", 1500, 55, 28.0),
        ("LOT010", "DRAGONFRUIT_BLOOM", "DEPOT_01", 3500, 35, 30.0),
    ]

    with SessionLocal() as session:
        inserted = 0

        for lot_id, sku, location_id, quantity, days_left, unit_cost in lots:
            if session.get(InventoryLotRow, lot_id) is not None:
                continue

            session.add(
                InventoryLotRow(
                    lot_id=lot_id,
                    sku=sku,
                    location_id=location_id,
                    quantity=quantity,
                    expiry_date=today + timedelta(days=days_left),
                    unit_cost=unit_cost,
                )
            )
            inserted += 1

        session.commit()

    print(f"Inventory seeding complete. New lots inserted: {inserted}")


if __name__ == "__main__":
    main()
