from sqlalchemy.orm import Session

from app.services.message_parser import parse_message


def parse_telegram_message(text: str, db: Session) -> dict:
    return parse_message(text, db)
