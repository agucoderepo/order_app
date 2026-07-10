"""
Permission name constants and default role-permission mappings.

Permission naming convention: "<resource>:<action>" or "<resource>:<action>:all"
The ":all" suffix means "across all users/records, not just own".
"""

ALL_PERMISSIONS: dict[str, str] = {
    # Users
    "users:read":                   "List and view user accounts",
    "users:write":                  "Create and update user accounts",
    # Clients
    "clients:read":                 "List and view clients",
    "clients:write":                "Create and update clients",
    # Providers
    "providers:read":               "List and view providers",
    "providers:write":              "Create and update providers",
    # Products
    "products:read":                "List, search, and view products",
    "products:write":               "Create and update products",
    # Orders
    "orders:read":                  "Read own orders",
    "orders:read:all":              "Read all orders across all users",
    "orders:write":                 "Create and update own orders",
    "orders:write:all":             "Update any order regardless of owner",
    "orders:parse":                 "Parse WhatsApp messages into order drafts",
    # Shopping lists
    "shopping_lists:read":          "Read own shopping lists",
    "shopping_lists:read:all":      "Read all shopping lists across all users",
    "shopping_lists:write":         "Adjust items on own shopping lists",
    "shopping_lists:aggregate":     "Aggregate confirmed orders into a shopping list",
    "shopping_lists:finalize":      "Finalize a shopping list (creates POs and invoices)",
    "shopping_lists:reopen":        "Reopen a finalized shopping list",
    # Purchase orders
    "purchase_orders:read":         "Read own purchase orders",
    "purchase_orders:read:all":     "Read all purchase orders across all users",
    "purchase_orders:write":        "Update own purchase order status",
    "purchase_orders:write:all":    "Update any purchase order status",
    # Invoices
    "invoices:read":                "List and view invoices",
    "invoices:write":               "Update invoice status",
    # Audit logs
    "audit_logs:read":              "View audit log entries",
}

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": list(ALL_PERMISSIONS.keys()),
    "operator": [
        "clients:read",
        "clients:write",
        "providers:read",
        "products:read",
        "orders:read",
        "orders:write",
        "orders:parse",
        "shopping_lists:read",
        "shopping_lists:write",
        "shopping_lists:aggregate",
        "shopping_lists:finalize",
        "shopping_lists:reopen",
        "purchase_orders:read",
        "invoices:read",
        "invoices:write",
    ],
    # Headless integrations (e.g. the MCP server used by AI order-drafting
    # agents) — only enough to search products/clients and create/read/update
    # its own draft orders. No read-all/write-all, no shopping_lists/
    # purchase_orders/invoices access.
    "service": [
        "products:read",
        "clients:read",
        "orders:read",
        "orders:write",
    ],
}
