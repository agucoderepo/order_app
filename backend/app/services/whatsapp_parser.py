import json
import anthropic
from rapidfuzz import process, fuzz
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Product

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """
You are a data extraction assistant. Given a WhatsApp message containing a grocery or
produce order, extract the client name (if mentioned) and a list of items with quantities.

Respond ONLY with valid JSON in this exact format, no preamble, no markdown:
{
  "client_hint": "name or null",
  "items": [
    { "product_hint": "product name", "quantity": 1.0, "unit_hint": "kg or null" }
  ]
}
"""


def parse_whatsapp_message(text: str, db: Session) -> dict:
    """
    1. Send raw WhatsApp text to Claude for structured extraction.
    2. Fuzzy-match extracted product hints against the products table.
    3. Return a draft order payload with confidence scores.
    """
    # Step 1: LLM extraction
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text}],
    )
    raw = response.content[0].text.strip()
    extracted = json.loads(raw)

    # Step 2: Load active products for fuzzy matching
    products = db.query(Product).filter(Product.is_active == True).all()
    product_names = {p.name: p for p in products}

    # Step 3: Match each extracted item to a product
    matched_items = []
    for item in extracted.get("items", []):
        hint = item["product_hint"]
        match = process.extractOne(hint, product_names.keys(),
                                   scorer=fuzz.WRatio, score_cutoff=60)
        matched_items.append({
            "product_hint":    hint,
            "quantity":        item["quantity"],
            "unit_hint":       item.get("unit_hint"),
            "matched_product": product_names[match[0]] if match else None,
            "match_score":     match[1] if match else 0,
            "needs_review":    match is None or match[1] < 85,
        })

    return {
        "client_hint":  extracted.get("client_hint"),
        "items":        matched_items,
        "raw_text":     text,
    }