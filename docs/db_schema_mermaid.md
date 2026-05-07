# Database Schema (Mermaid ERD)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string name
        string email UK
        string password_hash
        string role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    USER_IDENTITIES {
        uuid id PK
        uuid user_id FK
        string provider
        string provider_user_id
        text access_token
        timestamp linked_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        boolean revoked
        timestamp created_at
    }

    CLIENTS {
        uuid id PK
        string name
        string phone
        text notes
        boolean is_active
        uuid created_by FK
        timestamp created_at
    }

    PROVIDERS {
        uuid id PK
        string name
        string contact_name
        string phone
        text notes
        boolean is_active
        uuid created_by FK
        timestamp created_at
    }

    PRODUCTS {
        uuid id PK
        uuid provider_id FK
        string name
        string unit
        decimal price
        boolean is_active
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    ORDERS {
        uuid id PK
        uuid client_id FK
        uuid created_by FK
        date order_date
        string status
        string source
        text raw_whatsapp_text
        text notes
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        decimal quantity
        decimal unit_price
        text notes
    }

    SHOPPING_LISTS {
        uuid id PK
        date list_date UK
        string status
        uuid created_by FK
        timestamp finalized_at
        timestamp created_at
    }

    SHOPPING_LIST_ITEMS {
        uuid id PK
        uuid shopping_list_id FK
        uuid product_id FK
        uuid provider_id FK
        decimal total_quantity
        decimal adjusted_quantity
        text notes
    }

    PURCHASE_ORDERS {
        uuid id PK
        uuid shopping_list_id FK
        uuid provider_id FK
        string status
        text pdf_path
        uuid created_by FK
        timestamp created_at
    }

    PURCHASE_ORDER_ITEMS {
        uuid id PK
        uuid purchase_order_id FK
        uuid product_id FK
        decimal quantity
        decimal unit_price
    }

    INVOICES {
        uuid id PK
        uuid order_id FK UK
        uuid client_id FK
        string invoice_number UK
        decimal total_amount
        string status
        text pdf_path
        uuid created_by FK
        timestamp created_at
    }

    USERS ||--o{ USER_IDENTITIES : "has"
    USERS ||--o{ REFRESH_TOKENS : "has"
    USERS ||--o{ CLIENTS : "creates"
    USERS ||--o{ PROVIDERS : "creates"
    USERS ||--o{ PRODUCTS : "creates"
    USERS ||--o{ ORDERS : "creates"
    USERS ||--o{ SHOPPING_LISTS : "creates"
    USERS ||--o{ PURCHASE_ORDERS : "creates"
    USERS ||--o{ INVOICES : "creates"

    PROVIDERS ||--o{ PRODUCTS : "supplies"
    CLIENTS ||--o{ ORDERS : "places"

    ORDERS ||--o{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered_as"

    SHOPPING_LISTS ||--o{ SHOPPING_LIST_ITEMS : "contains"
    PRODUCTS ||--o{ SHOPPING_LIST_ITEMS : "aggregated_as"
    PROVIDERS ||--o{ SHOPPING_LIST_ITEMS : "grouped_by"

    SHOPPING_LISTS ||--o{ PURCHASE_ORDERS : "generates"
    PROVIDERS ||--o{ PURCHASE_ORDERS : "receives"

    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : "purchased_as"

    ORDERS ||--|| INVOICES : "invoiced_as"
    CLIENTS ||--o{ INVOICES : "billed_to"
```
