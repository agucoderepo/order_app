from typing import Optional

from pydantic import BaseModel

from api_client import backend

ALLOWED_SOURCES = {"whatsapp", "telegram"}


def search_products(query: str) -> list[dict]:
    """
    Search active products by name (fuzzy substring match).
    Returns id, name, unit, price, and provider_name for each match — use the
    id as product_id when calling create_draft_order.
    """
    return backend.get("/products/search", params={"q": query})


def search_clients(query: str) -> list[dict]:
    """
    Search active clients by name (fuzzy substring match).
    Returns id, name, and phone for each match — use the id as client_id
    when calling create_draft_order.
    """
    return backend.get("/clients/search", params={"q": query})


class OrderItemInput(BaseModel):
    product_id: str
    quantity: float


def create_draft_order(
    client_id: str,
    order_date: str,
    items: list[OrderItemInput],
    raw_text: str,
    source: str,
    notes: Optional[str] = None,
) -> dict:
    """
    Create a DRAFT order for one client from resolved product_id/quantity pairs.
    The order always lands with status='draft' — a human must confirm it in the
    app before it feeds into any shopping list or purchase order. This tool
    cannot confirm, finalize, or otherwise change an order's status.

    client_id/product_id must come from search_clients/search_products.
    order_date must be an ISO date string (YYYY-MM-DD).
    raw_text should be the original message(s) this order was drafted from, for audit.
    source must be 'whatsapp' or 'telegram'.
    """
    if source not in ALLOWED_SOURCES:
        raise ValueError(f"source must be one of {ALLOWED_SOURCES}")
    payload = {
        "client_id": client_id,
        "order_date": order_date,
        "items": [item.model_dump() for item in items],
        "source": source,
        "raw_whatsapp_text": raw_text,
        "notes": notes,
    }
    return backend.post("/orders/", json=payload)


def list_draft_orders(
    order_date: Optional[str] = None,
    client_id: Optional[str] = None,
) -> list[dict]:
    """
    List DRAFT orders (never confirmed/delivered — status is not a parameter,
    this tool only ever returns drafts) so an agent can find the order(s) a
    human is referring to from a vague description.

    Returns full detail per order: client, and each item's product name, unit,
    quantity, and provider name — enough to match against a description like
    "the banana order for Fruteria Pocho" or "the one from Distribuidora del Sur".

    order_date, if given, must be an ISO date string (YYYY-MM-DD); omit to see
    all of this agent's own draft orders regardless of date.
    Only returns orders this agent itself created — orders drafted manually by
    a human through the app are not visible here.
    """
    params: dict = {"status": "draft"}
    if order_date is not None:
        params["order_date"] = order_date
    if client_id is not None:
        params["client_id"] = client_id
    return backend.get("/orders/", params=params)


def update_draft_order(
    order_id: str,
    items: Optional[list[OrderItemInput]] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Update a DRAFT order's items and/or notes. Refuses if the order is no
    longer a draft (e.g. a human already confirmed it) — this tool can never
    confirm/finalize an order or otherwise change its status.

    IMPORTANT: items, if given, REPLACES the order's entire line list, not
    just the lines being changed — resend every line you want kept (use
    list_draft_orders first to see the current lines), not only the new/changed
    ones, or the omitted lines will be dropped from the order.
    """
    order = backend.get(f"/orders/{order_id}")
    if order["status"] != "draft":
        raise ValueError(
            f"Order {order_id} is no longer a draft (status='{order['status']}') "
            "and cannot be modified through this tool."
        )
    payload: dict = {}
    if items is not None:
        payload["items"] = [item.model_dump() for item in items]
    if notes is not None:
        payload["notes"] = notes
    return backend.patch(f"/orders/{order_id}", json=payload)
