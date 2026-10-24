
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.db_models import DemandRow, InventoryLotRow


router = APIRouter(prefix="/demand", tags=["Demand Analytics"])


def get_db():
    with SessionLocal() as session:
        yield session


@router.get("/analytics")
def demand_analytics(
    sku: str | None = None,
    depot_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    statement = select(DemandRow)

    if sku:
        statement = statement.where(DemandRow.sku == sku)

    if depot_id:
        statement = statement.where(DemandRow.depot_id == depot_id)

    if start_date:
        statement = statement.where(
            DemandRow.demand_date >= start_date
        )

    if end_date:
        statement = statement.where(
            DemandRow.demand_date <= end_date
        )

    rows = db.scalars(
        statement.order_by(
            DemandRow.demand_date,
            DemandRow.demand_id,
        )
    ).all()

    if not rows:
        return {
            "status": "insufficient_demand_data",
            "filters": {
                "sku": sku,
                "depot_id": depot_id,
                "start_date": (
                    start_date.isoformat() if start_date else None
                ),
                "end_date": (
                    end_date.isoformat() if end_date else None
                ),
            },
            "records": 0,
            "actual_demand_records": 0,
            "forecast_records": 0,
            "total_actual_demand": None,
            "total_forecast_demand": None,
            "average_daily_actual_demand": None,
            "average_daily_forecast_demand": None,
            "message": (
                "No demand records match these filters. "
                "Demand rates cannot be calculated."
            ),
        }

    actual_rows = [
        row for row in rows if row.actual_quantity is not None
    ]

    # Forecasts exist for every row because forecast_quantity is non-null.
    forecast_total = sum(row.forecast_quantity for row in rows)

    # Calculate actual demand only over days with recorded actuals.
    actual_by_day = {}
    for row in actual_rows:
        actual_by_day[row.demand_date] = (
            actual_by_day.get(row.demand_date, 0)
            + row.actual_quantity
        )

    forecast_by_day = {}
    for row in rows:
        forecast_by_day[row.demand_date] = (
            forecast_by_day.get(row.demand_date, 0)
            + row.forecast_quantity
        )

    actual_total = sum(actual_by_day.values())
    actual_days = len(actual_by_day)
    forecast_days = len(forecast_by_day)

    return {
        "status": "ok",
        "filters": {
            "sku": sku,
            "depot_id": depot_id,
            "start_date": (
                start_date.isoformat() if start_date else None
            ),
            "end_date": (
                end_date.isoformat() if end_date else None
            ),
        },
        "records": len(rows),
        "actual_demand_records": len(actual_rows),
        "forecast_records": len(rows),
        "total_actual_demand": (
            actual_total if actual_rows else None
        ),
        "total_forecast_demand": forecast_total,
        "average_daily_actual_demand": (
            round(actual_total / actual_days, 2)
            if actual_days else None
        ),
        "average_daily_forecast_demand": (
            round(forecast_total / forecast_days, 2)
            if forecast_days else None
        ),
        "actual_days_with_data": actual_days,
        "forecast_days_with_data": forecast_days,
        "message": (
            "Actual demand averages use days with recorded actuals. "
            "Forecast averages use days with forecast records; "
            "missing calendar dates are not assumed to be zero."
        ),
    }
