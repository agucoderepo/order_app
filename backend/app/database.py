from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# connect_args only needed for SQLite (disables same-thread check)
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=settings.debug,       # Logs SQL in debug mode
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and ensures it closes after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()