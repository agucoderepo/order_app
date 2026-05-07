from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user, get_print_user
from app.models import Order, OrderItem, Product, PurchaseOrder, PurchaseOrderItem, ShoppingList, User
from app.schemas.purchase_order import (
    PurchaseOrderItemRead,
    PurchaseOrderRead,
    PurchaseOrderSummary,
    PurchaseOrderUpdate,
)
from app.services import audit_service

router = APIRouter()


def _po_detail(db: Session, pid: uuid.UUID) -> PurchaseOrderRead:
    po = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.shopping_list),
            joinedload(PurchaseOrder.provider),
            joinedload(PurchaseOrder.items)
            .joinedload(PurchaseOrderItem.product)
            .joinedload(Product.provider),
        )
        .filter(PurchaseOrder.id == pid)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    items = [
        PurchaseOrderItemRead(
            id=i.id,
            product=i.product,
            quantity=i.quantity,
            unit_price=i.unit_price,
            line_total=i.quantity * i.unit_price,
        )
        for i in po.items
    ]
    total_amount = sum((i.line_total for i in items), start=Decimal("0"))
    return PurchaseOrderRead(
        id=po.id,
        shopping_list_id=po.shopping_list_id,
        provider=po.provider,
        status=po.status,
        pdf_path=po.pdf_path,
        created_by=po.created_by,
        created_at=po.created_at,
        items=items,
        total_amount=total_amount,
    )


@router.get("/", response_model=list[PurchaseOrderSummary])
def list_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.shopping_list),
            joinedload(PurchaseOrder.provider),
            joinedload(PurchaseOrder.items),
        )
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        PurchaseOrderSummary(
            id=po.id,
            list_date=po.shopping_list.list_date,
            provider=po.provider,
            status=po.status,
            total_amount=sum(
                (i.quantity * i.unit_price for i in po.items), start=Decimal("0")
            ),
            pdf_path=po.pdf_path,
        )
        for po in rows
    ]


@router.get("/{po_id}", response_model=PurchaseOrderRead)
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        pid = uuid.UUID(po_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Purchase order not found") from None
    return _po_detail(db, pid)


@router.get("/{po_id}/print", response_class=HTMLResponse)
def print_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_print_user),
):
    try:
        pid = uuid.UUID(po_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Purchase order not found") from None
    po = _po_detail(db, pid)
    sl = db.query(ShoppingList).filter(ShoppingList.id == po.shopping_list_id).first()
    list_date_str = str(sl.list_date) if sl else "—"
    from datetime import datetime as _dt
    issue_date = _dt.now().strftime("%B %d, %Y")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PO — {po.provider.name} — {list_date_str}</title>
  <style>{_PRINT_CSS}</style>
</head>
<body>
  {_po_header_html(po.provider, list_date_str, po.status, issue_date)}
  {_po_items_html(po.items)}
  <script>window.addEventListener('load', () => window.print());</script>
</body>
</html>"""
    return HTMLResponse(content=html)


_PRINT_CSS = """
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:860px;margin:auto}
  h1{font-size:32px;font-weight:900;letter-spacing:-.5px}
  h2{font-size:14px;font-weight:700;color:#444;margin:32px 0 12px;padding-bottom:6px;border-bottom:2px solid #e0e0e0;text-transform:uppercase;letter-spacing:.08em}
  .mono{font-family:monospace}
  .muted{color:#666}
  .bold{font-weight:700}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
  .ref{font-family:monospace;font-size:13px;color:#444;margin-top:6px}
  .parties{display:flex;gap:60px;margin-bottom:32px}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:4px}
  .name{font-size:16px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#999;padding:8px 10px;border-bottom:2px solid #e0e0e0}
  td{padding:10px 10px;border-bottom:1px solid #eee}
  .total-row{text-align:right;padding-top:14px;font-size:15px}
  .total-amount{font-size:22px;font-weight:900;color:#111}
  .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;background:#f0f0f0;font-family:monospace}
  .product-group{margin-bottom:20px}
  .product-title{font-weight:700;font-size:13px;margin-bottom:6px}
  .product-total{font-family:monospace;color:#666;font-size:12px;margin-left:6px}
  .client-row{display:flex;justify-content:space-between;padding:5px 0 5px 18px;border-bottom:1px solid #f0f0f0;font-size:13px}
  .client-qty{font-family:monospace;font-weight:700}
  @media print{@page{margin:20mm} body{padding:0} .no-print{display:none}}
"""


def _po_header_html(provider, list_date_str: str, status: str, issue_date: str) -> str:
    contact_html = f"<div class='muted'>{provider.contact_name}</div>" if getattr(provider, 'contact_name', None) else ""
    phone_html = f"<div class='muted'>{provider.phone}</div>" if getattr(provider, 'phone', None) else ""
    return f"""
  <div class="header">
    <div>
      <h1>Purchase Order</h1>
      <div class="ref">List date: {list_date_str}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Date</div>
      <div class="bold">{issue_date}</div>
      <div style="margin-top:8px"><span class="badge">{status}</span></div>
    </div>
  </div>
  <div class="parties">
    <div>
      <div class="label">Provider</div>
      <div class="name">{provider.name}</div>
      {contact_html}{phone_html}
    </div>
  </div>"""


def _po_items_html(items) -> str:
    rows = ""
    for item in items:
        rows += (
            f"<tr><td>{item.product.name}</td>"
            f"<td class='mono muted'>{item.product.unit}</td>"
            f"<td class='mono'>{float(item.quantity):g}</td>"
            f"<td class='mono muted'>${float(item.unit_price):.2f}</td>"
            f"<td class='mono bold'>${float(item.line_total):.2f}</td></tr>"
        )
    return f"""
  <table>
    <thead><tr><th>Product</th><th>Unit</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
  <div class="total-row">Total: <span class="total-amount">${float(sum(float(i.line_total) for i in items)):.2f}</span></div>"""


@router.get("/{po_id}/print-breakdown", response_class=HTMLResponse)
def print_purchase_order_breakdown(
    po_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_print_user),
):
    try:
        pid = uuid.UUID(po_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Purchase order not found") from None

    po_orm = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.provider),
            joinedload(PurchaseOrder.shopping_list),
            joinedload(PurchaseOrder.items)
            .joinedload(PurchaseOrderItem.product),
        )
        .filter(PurchaseOrder.id == pid)
        .first()
    )
    if not po_orm:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    po = _po_detail(db, pid)  # Pydantic model for totals/rendering
    sl = po_orm.shopping_list
    list_date_str = str(sl.list_date) if sl else "—"

    from datetime import datetime as _dt
    issue_date = _dt.now().strftime("%B %d, %Y")

    # Build client breakdown: product_id -> [(client_name, quantity)]
    po_product_ids = {item.product_id for item in po_orm.items}

    order_ids_q = (
        db.query(Order.id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .filter(
            Order.order_date == sl.list_date,
            Order.status == "confirmed",
            OrderItem.product_id.in_(po_product_ids),
        )
        .distinct()
    )
    orders = (
        db.query(Order)
        .options(
            joinedload(Order.client),
            joinedload(Order.items),
        )
        .filter(Order.id.in_(order_ids_q))
        .all()
    )

    # product_id -> {name, unit, total_qty, clients: [(name, qty)]}
    breakdown: dict = {}
    for po_item in po_orm.items:
        breakdown[po_item.product_id] = {
            "name": po_item.product.name,
            "unit": po_item.product.unit,
            "total": float(po_item.quantity),
            "clients": [],
        }
    for order in orders:
        for item in order.items:
            if item.product_id in breakdown:
                breakdown[item.product_id]["clients"].append(
                    (order.client.name, float(item.quantity))
                )

    breakdown_html = ""
    for entry in breakdown.values():
        client_rows = "".join(
            f"<div class='client-row'>"
            f"<span>{name}</span>"
            f"<span class='client-qty'>{qty:g} {entry['unit']}</span>"
            f"</div>"
            for name, qty in sorted(entry["clients"], key=lambda x: x[0])
        )
        breakdown_html += (
            f"<div class='product-group'>"
            f"<div class='product-title'>{entry['name']}"
            f"<span class='product-total'>({entry['total']:g} {entry['unit']} total)</span>"
            f"</div>{client_rows}</div>"
        )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PO Breakdown — {po_orm.provider.name} — {list_date_str}</title>
  <style>{_PRINT_CSS}</style>
</head>
<body>
  {_po_header_html(po_orm.provider, list_date_str, po_orm.status, issue_date)}
  <h2>Items</h2>
  {_po_items_html(po.items)}
  <h2>Client breakdown</h2>
  {breakdown_html}
  <script>window.addEventListener('load', () => window.print());</script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.patch("/{po_id}", response_model=PurchaseOrderRead)
def update_purchase_order(
    po_id: str,
    payload: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        pid = uuid.UUID(po_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Purchase order not found") from None
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == pid).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    old_status = po.status
    if payload.status is not None:
        po.status = payload.status
    audit_service.log(
        db, user=current_user,
        action="purchase_order.update",
        entity_type="purchase_order", entity_id=str(pid),
        detail=f"status={old_status}->{po.status}" if old_status != po.status else None,
    )
    db.commit()
    return _po_detail(db, pid)
