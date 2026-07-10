# order-app MCP server

Exposes the order-management backend to AI agents (e.g. OpenClaw, Hermes) over MCP, so an
agent that reads a day's WhatsApp/Telegram messages can draft orders itself — a human still
has to confirm each draft in the app before it feeds into a shopping list or purchase order.

## Capabilities (tools)

| Tool | Does | Backend call |
|---|---|---|
| `search_products(query)` | Fuzzy-search active products by name. Returns `id`, `name`, `unit`, `price`, `provider_name`. | `GET /products/search` |
| `search_clients(query)` | Fuzzy-search active clients by name. Returns `id`, `name`, `phone`. | `GET /clients/search` |
| `create_draft_order(client_id, order_date, items, raw_text, source, notes?)` | Creates one order for a client from resolved `product_id`/`quantity` pairs. Always lands as `status="draft"`. `source` must be `"whatsapp"` or `"telegram"`; `raw_text` should be the original message(s), stored for audit. | `POST /orders/` |
| `list_draft_orders(order_date?, client_id?)` | Lists this agent's own **draft** orders (status is fixed to `draft`, not a parameter) with full detail — client, and each item's product/unit/quantity/provider — so the agent can match a vague human description ("the banana order for Fruteria Pocho") to a specific order before editing it. | `GET /orders/?status=draft&...` |
| `update_draft_order(order_id, items?, notes?)` | Updates a draft order's items and/or notes. Refuses if the order isn't a draft anymore (e.g. a human already confirmed it). **`items` replaces the entire line list** — always resend every line you want kept, not just the changed one; call `list_draft_orders` first to see the current lines. | `GET` then `PATCH /orders/{id}` |

There is deliberately **no** tool to confirm/finalize an order, aggregate a shopping list, or
touch purchase orders/invoices — the backing service account has no permission for any of
that, so the guarantee that a human must approve every order holds even if the calling agent
misbehaves. `update_draft_order`'s tool signature has no `status` parameter at all, so it's
structurally impossible for the agent to confirm an order through this tool even though the
underlying endpoint would technically allow a status change for other permission holders.

Both new tools only ever see/touch orders this same service account created — an order a human
drafted manually through the app isn't visible to the agent (the backend's existing per-owner
scoping on `orders:read`/`orders:write`, not something special-cased here).

This server doesn't do its own LLM extraction — the calling agent is expected to read the raw
messages, decide who ordered what, and resolve names to IDs itself by calling
`search_products`/`search_clients`. That's what's actually being evaluated when comparing
agent frameworks.

## 1. Create the service account

In the app's admin UI: **Users → New user**, role **Service**. This role is scoped to exactly
`products:read`, `clients:read`, `orders:read`, `orders:write` (see `backend/app/permissions.py`)
— it cannot read other users' data, touch shopping lists, or approve anything.

## 2. Configure

```bash
cp .env.example .env
```

Fill in:

| Var | Meaning |
|---|---|
| `BACKEND_API_URL` | Base URL of the FastAPI backend, e.g. `http://localhost:8000` |
| `MCP_SERVICE_EMAIL` / `MCP_SERVICE_PASSWORD` | Credentials of the service-role user from step 1 |
| `MCP_HOST` / `MCP_PORT` | Where this MCP server listens (default `0.0.0.0:8100`) |

## 3. Install & run

```bash
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash; use .venv\Scripts\Activate.ps1 in PowerShell
pip install -r requirements.txt
python server.py
```

The server runs over **Streamable HTTP** (the current standard remote MCP transport) at
`http://<MCP_HOST>:<MCP_PORT>/mcp`. It authenticates lazily on the first tool call — logs in
once, then transparently refreshes (or re-logs-in if the refresh token has also expired) on a
401, the same pattern the frontend's Axios interceptor uses.

## 4. Point an agent at it

Configure OpenClaw / Hermes (or any MCP-capable client) to connect to
`http://<host>:<port>/mcp` over Streamable HTTP. For manual testing without a full agent
framework, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector
```

## Notes

- This process is independent of the backend — it talks to it over plain HTTP using the
  existing `/auth/login` + `/auth/refresh` flow, not a direct DB connection. Don't point it at
  the SQLite file directly; running two processes with their own SQLAlchemy sessions against
  one SQLite file risks "database is locked" errors under concurrent writes.
- `raw_whatsapp_text` is reused as the audit column for Telegram-sourced orders too (not
  renamed) — always pass the original message text as `raw_text` so a human can review what
  the agent read if something looks off.
