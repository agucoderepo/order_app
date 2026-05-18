from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_print_user, require_permission
from app.models import Invoice, Order, OrderItem, Product, User
from app.schemas.invoice import InvoiceRead, InvoiceSummary, InvoiceUpdate
from app.schemas.order import OrderItemRead
from app.services import audit_service

router = APIRouter()


def _invoice_read(db: Session, inv_id: uuid.UUID) -> InvoiceRead:
    inv = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.order)
            .joinedload(Order.items)
            .joinedload(OrderItem.product)
            .joinedload(Product.provider),
        )
        .filter(Invoice.id == inv_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    items = [OrderItemRead.model_validate(x) for x in inv.order.items]
    return InvoiceRead(
        id=inv.id,
        order_id=inv.order_id,
        client=inv.client,
        invoice_number=inv.invoice_number,
        total_amount=inv.total_amount,
        status=inv.status,
        pdf_path=inv.pdf_path,
        created_by=inv.created_by,
        created_at=inv.created_at,
        order_date=inv.order.order_date,
        items=items,
    )


@router.get("/", response_model=list[InvoiceSummary])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("invoices:read")),
):
    rows = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.order),
        )
        .order_by(Invoice.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        InvoiceSummary(
            id=inv.id,
            invoice_number=inv.invoice_number,
            client=inv.client,
            order_date=inv.order.order_date,
            total_amount=inv.total_amount,
            status=inv.status,
            pdf_path=inv.pdf_path,
        )
        for inv in rows
    ]


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("invoices:read")),
):
    try:
        iid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found") from None
    return _invoice_read(db, iid)


@router.get("/{invoice_id}/print", response_class=HTMLResponse)
def print_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_print_user),
):
    try:
        iid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found") from None
    inv = _invoice_read(db, iid)

    rows_html = ""
    for item in inv.items:
        qty = float(item.quantity)
        up = float(item.unit_price)
        disc = float(item.discount)
        line_total = up * qty * (1 - disc / 100)
        disc_cell = f"{disc:.1f}%" if disc > 0 else "—"
        rows_html += (
            f"<tr>"
            f"<td>{item.product.name}</td>"
            f"<td class='mono muted'>{item.product.unit}</td>"
            f"<td class='mono'>{qty:g}</td>"
            f"<td class='mono muted'>${up:.2f}</td>"
            f"<td class='mono muted'>{disc_cell}</td>"
            f"<td class='mono bold'>${line_total:.2f}</td>"
            f"</tr>"
        )

    phone_html = f"<div class='muted'>{inv.client.phone}</div>" if inv.client.phone else ""
    issue_date = inv.created_at.strftime("%B %d, %Y") if inv.created_at else "—"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{inv.invoice_number}</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:820px;margin:auto}}
    h1{{font-size:32px;font-weight:900;letter-spacing:-.5px}}
    .mono{{font-family:monospace}}
    .muted{{color:#666}}
    .bold{{font-weight:700}}
    .header{{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}}
    .inv-num{{font-family:monospace;font-size:13px;color:#444;margin-top:6px}}
    .parties{{display:flex;gap:60px;margin-bottom:32px}}
    .label{{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:4px}}
    .name{{font-size:16px;font-weight:700}}
    table{{width:100%;border-collapse:collapse;margin:24px 0}}
    th{{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#999;padding:8px 10px;border-bottom:2px solid #e0e0e0}}
    td{{padding:10px 10px;border-bottom:1px solid #eee}}
    .total-row{{text-align:right;padding-top:14px;font-size:15px}}
    .total-amount{{font-size:22px;font-weight:900;color:#111}}
    .badge{{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;background:#f0f0f0;font-family:monospace}}
    @media print{{@page{{margin:20mm}} body{{padding:0}} .no-print{{display:none}}}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Invoice</h1>
      <div class="inv-num">{inv.invoice_number}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Issue date</div>
      <div class="bold">{issue_date}</div>
      <div style="margin-top:8px"><span class="badge">{inv.status}</span></div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="label">Client</div>
      <div class="name">{inv.client.name}</div>
      {phone_html}
    </div>
    <div>
      <div class="label">Order date</div>
      <div class="bold" style="font-size:15px">{inv.order_date}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th><th>Unit</th><th>Qty</th>
        <th>Unit price</th><th>Disc %</th><th>Line total</th>
      </tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>

  <div class="total-row">
    Total: <span class="total-amount">${float(inv.total_amount):.2f}</span>
  </div>

  <script>window.addEventListener('load', () => window.print());</script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.patch("/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices:write")),
):
    try:
        iid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found") from None
    inv = db.query(Invoice).filter(Invoice.id == iid).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    old_status = inv.status
    if payload.status is not None:
        inv.status = payload.status
    audit_service.log(
        db, user=current_user,
        action="invoice.update",
        entity_type="invoice", entity_id=str(iid),
        detail=f"status={old_status}->{inv.status}" if old_status != inv.status else None,
    )
    db.commit()
    return _invoice_read(db, iid)
