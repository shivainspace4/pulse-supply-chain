
from app.database import Base, engine
from app import db_models  # Registers the table definitions


def main():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")


if __name__ == "__main__":
    main()
