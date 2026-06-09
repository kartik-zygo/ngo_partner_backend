# Services & Orders — Admin/Sales App Integration Guide

This guide documents every API endpoint the admin and sales apps need to implement
the full service-catalogue management and order-monitoring workflow.

---

## Role Permissions Summary

| Action | USER | SALES | ADMIN |
|---|---|---|---|
| List services (active only) | ✅ | ✅ | ✅ |
| List services (incl. inactive) | ❌ | ❌ | ✅ (`includeInactive=true`) |
| Get service detail | ✅ | ✅ | ✅ |
| List categories | ✅ | ✅ | ✅ |
| Create service | ❌ | ❌ | ✅ |
| Update service (name/desc/price/category) | ❌ | ❌ | ✅ |
| Toggle active/inactive | ❌ | ❌ | ✅ |
| Delete service | ❌ | ❌ | ✅ |
| Create order (purchase a service) | ✅ | ❌ | ❌ |
| View own orders | ✅ | ❌ | ❌ |
| List all orders (any user) | ❌ | ✅ | ✅ |
| View any order detail | ❌ | ✅ | ✅ |
| Update fulfillment status + notes | ❌ | ✅ | ✅ |

---

## Base URL

```
Staging : http://64.227.162.249/api/v1
```

All authenticated requests must include:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Part 1 — Services CRUD (Admin App)

### 1.1 List Services

```
GET /services
```

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | Pagination page |
| `limit` | number | 20 | Results per page (max 100) |
| `category` | string | — | Filter by exact category name |
| `search` | string | — | Case-insensitive name/description search |
| `includeInactive` | `true` | — | **ADMIN only** — includes inactive services |

**Request (admin, all services with search):**
```
GET /services?page=1&limit=20&includeInactive=true&search=gst
```

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "3f2a1b4c-0000-0000-0000-000000000001",
      "name": "GST Filing",
      "description": "Complete GST return filing for small businesses",
      "category": "Taxation",
      "basePrice": 1999.00,
      "isActive": true,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-06-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasNext": false
  }
}
```

> **Note:** The `basePrice` field is visible to ADMIN and SALES roles.
> Regular USER accounts see extra fields `pricingLabel` and `purchasable` instead
> (see Section 1.1a below).

#### 1.1a — What users see (different shape)

When a USER calls `GET /services`, the response shape has two extra fields and
omits nothing (they now see the price since they can buy services):

```json
{
  "id": "...",
  "name": "GST Filing",
  "description": "...",
  "category": "Taxation",
  "basePrice": 1999.00,
  "isActive": true,
  "pricingLabel": "₹1,999",
  "purchasable": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

If `basePrice` is null:
```json
{
  "pricingLabel": "Contact for pricing",
  "purchasable": false
}
```

The `purchasable` flag tells the Flutter UI whether to show the **Buy Now** button.

---

### 1.2 List Categories

```
GET /services/categories
```

No auth required. Returns distinct categories for filter dropdowns.

**Response `200`:**
```json
{
  "success": true,
  "data": ["Company Registration", "Legal", "Taxation", "Compliance"]
}
```

---

### 1.3 Get Single Service

```
GET /services/:id
```

**Response `200`:** Same shape as a single item from list (section 1.1).

**Response `404`:**
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Service with id '...' not found" } }
```

---

### 1.4 Create Service  *(ADMIN only)*

```
POST /services
```

**Request body:**
```json
{
  "name": "GST Filing",
  "description": "Complete GST return filing for small businesses",
  "category": "Taxation",
  "basePrice": 1999
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | 1–255 chars |
| `description` | No | max 2000 chars |
| `category` | No | max 100 chars; use existing value from `/services/categories` for consistency |
| `basePrice` | No | Non-negative number; omit if price is not yet decided |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "name": "GST Filing",
    "description": "Complete GST return filing for small businesses",
    "category": "Taxation",
    "basePrice": 1999.00,
    "isActive": true,
    "createdAt": "2026-06-09T10:00:00.000Z",
    "updatedAt": "2026-06-09T10:00:00.000Z"
  }
}
```

> A service created without `basePrice` has `purchasable: false` for users — they cannot
> buy it until an admin sets the price.

---

### 1.5 Update Service  *(ADMIN only)*

```
PATCH /services/:id
```

Send **only the fields you want to change** (all fields are optional).

**Set / update price:**
```json
{ "basePrice": 2499 }
```

**Update name and category:**
```json
{ "name": "GST Filing — Annual", "category": "Taxation" }
```

**Clear description:**
```json
{ "description": "" }
```

**Response `200`:** Full updated service object (same shape as Create response).

**Common errors:**
```json
// 404 — service not found or already deleted
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Service with id '...' not found" } }

// 422 — validation failed
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": { ... } } }
```

---

### 1.6 Toggle Active / Inactive  *(ADMIN only)*

```
PATCH /services/:id/toggle
```

No request body. Flips `isActive` between `true` and `false`.

**Response `200`:** Full service object with the updated `isActive` value.

> Deactivating a service hides it from users immediately. Existing pending orders
> are not affected.

---

### 1.7 Delete Service  *(ADMIN only)*

```
DELETE /services/:id
```

Soft-deletes the service (sets `deleted_at`). The record is hidden from all queries.

**Response `204`:** Empty body.

**Blocked when active orders exist:**
```json
// 409 Conflict
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete a service that has active or paid orders. Deactivate it instead."
  }
}
```

> **Recommended workflow:** If you need to retire a service that has orders, use **Toggle**
> to deactivate it instead of deleting. Delete is for services that were created by mistake
> and have never been ordered.

---

## Part 2 — Order Management (Admin & Sales)

Admin and sales users can list all orders, view details, and update fulfillment status
after a user pays. Users can only see their own orders and cannot update fulfillment.

---

### 2.1 List All Orders  *(ADMIN / SALES)*

```
GET /orders
```

When called by ADMIN or SALES, returns orders from **all users**.
When called by USER, returns only that user's own orders.

**Query parameters (admin/sales only):**

| Param | Type | Notes |
|---|---|---|
| `page` | number | Default 1 |
| `limit` | number | Default 20, max 100 |
| `status` | string | Payment status filter — see table below |
| `fulfillmentStatus` | string | Fulfillment filter — `processing`, `completed`, `refund_initiated`, `refunded`, `none` (not yet actioned) |
| `serviceId` | UUID | Filter by service |
| `userId` | UUID | Filter by a specific user |
| `search` | string | Searches customer name, email, phone |
| `from` | ISO datetime | `created_at` range start |
| `to` | ISO datetime | `created_at` range end |

**Example — all paid orders not yet actioned:**
```
GET /orders?status=paid&fulfillmentStatus=none&page=1&limit=20
```

**Example — search by customer name:**
```
GET /orders?search=kartik&status=paid
```

**Example — orders for a specific service in June:**
```
GET /orders?serviceId=svc-uuid&from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z
```

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ord-uuid",
      "userId": "usr-uuid",
      "serviceId": "svc-uuid",
      "serviceName": "GST Filing",
      "amount": 1999.00,
      "currency": "INR",
      "status": "paid",
      "fulfillmentStatus": "processing",
      "adminNotes": null,
      "fulfillmentUpdatedBy": null,
      "fulfillmentUpdatedAt": null,
      "customerName": "Kartik Saroha",
      "customerEmail": "kartik@example.com",
      "customerPhone": "9876543210",
      "notes": "Urgent",
      "paidAt": "2026-06-09T10:05:32.000Z",
      "expiresAt": "2026-06-09T11:00:00.000Z",
      "createdAt": "2026-06-09T10:00:00.000Z",
      "updatedAt": "2026-06-09T10:05:32.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "hasNext": false }
}
```

> The list response does **not** include `transactions`. Fetch them from the detail endpoint.

---

### 2.2 Get Order Detail  *(ADMIN / SALES)*

```
GET /orders/:id
```

Returns the full order including the `transactions` array (every payment attempt).
Admin/sales also receive `adminNotes`, `fulfillmentUpdatedBy`, `fulfillmentUpdatedAt`.

**Response `200` (admin/sales view):**
```json
{
  "success": true,
  "data": {
    "id": "ord-uuid",
    "userId": "usr-uuid",
    "serviceId": "svc-uuid",
    "serviceName": "GST Filing",
    "amount": 1999.00,
    "currency": "INR",
    "status": "paid",
    "cashfreeOrderId": "cf_12345678",
    "paymentSessionId": null,
    "customerName": "Kartik Saroha",
    "customerEmail": "kartik@example.com",
    "customerPhone": "9876543210",
    "notes": "Urgent filing needed",
    "fulfillmentStatus": "processing",
    "adminNotes": "Assigned to Priya. Expected completion 12 June.",
    "fulfillmentUpdatedBy": "admin-user-uuid",
    "fulfillmentUpdatedAt": "2026-06-09T11:00:00.000Z",
    "paidAt": "2026-06-09T10:05:32.000Z",
    "expiresAt": "2026-06-09T11:00:00.000Z",
    "createdAt": "2026-06-09T10:00:00.000Z",
    "updatedAt": "2026-06-09T11:00:00.000Z",
    "transactions": [
      {
        "id": "txn-uuid",
        "orderId": "ord-uuid",
        "cashfreePaymentId": "1234567890",
        "cashfreeOrderId": "cf_12345678",
        "paymentMethod": "upi",
        "paymentStatus": "SUCCESS",
        "amount": 1999.00,
        "currency": "INR",
        "errorCode": null,
        "errorDescription": null,
        "webhookReceivedAt": "2026-06-09T10:05:35.000Z",
        "createdAt": "2026-06-09T10:05:35.000Z"
      }
    ]
  }
}
```

> `adminNotes`, `fulfillmentUpdatedBy`, `fulfillmentUpdatedAt` are **stripped** from
> the response when a regular USER calls this endpoint — those fields are internal only.

---

### 2.3 Update Fulfillment Status  *(ADMIN / SALES)*

```
PATCH /orders/:id/fulfillment
```

Used after the user pays to track the actual service delivery lifecycle.
**Only works when the order's payment `status` is `paid`** — calling it on a `pending`
or `failed` order returns 422.

**Request body:**
```json
{
  "fulfillmentStatus": "completed",
  "adminNotes": "GST returns filed and acknowledgement sent to customer via email."
}
```

| Field | Required | Notes |
|---|---|---|
| `fulfillmentStatus` | ✅ | One of the values in the table below |
| `adminNotes` | No | Max 2000 chars. Overwrites previous notes if provided. |

**Fulfillment status values and transitions:**

| Status | Meaning | Set when |
|---|---|---|
| `processing` | Team has picked up the order | **Auto-set** when Cashfree confirms payment. Can also be set manually to re-open. |
| `completed` | Service has been fully delivered | Mark when work is done and customer has received output |
| `refund_initiated` | Refund process started | When customer requests refund or issue found after payment |
| `refunded` | Refund has been processed | After Cashfree refund is completed |

**Recommended transitions:**
```
(auto) payment confirmed
       └─► processing
               ├─► completed          (normal path)
               └─► refund_initiated
                       └─► refunded
```

**Response `200`:** Full updated order object (same shape as 2.2, without transactions).

**Error — order not yet paid:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot update fulfillment on an order with payment status 'pending'. Order must be paid first."
  }
}
```

---

### 2.4 Order & Fulfillment Status Reference

**Payment status** — set automatically by Cashfree webhook, never edited manually:

| `status` | Meaning |
|---|---|
| `pending` | Order created, payment not yet completed |
| `paid` | Payment confirmed via Cashfree webhook |
| `failed` | Payment attempt failed (bank/card declined) |
| `cancelled` | Cancelled before payment |
| `expired` | Cashfree order session expired without payment |

**Fulfillment status** — managed by admin/sales team:

| `fulfillmentStatus` | Meaning |
|---|---|
| `null` | No action taken yet (auto-set to `processing` on payment success) |
| `processing` | Team is actively working on the service |
| `completed` | Service delivered |
| `refund_initiated` | Refund in progress |
| `refunded` | Refund completed |

---

## Part 3 — User App Flow (for reference)

This section documents the buyer-side flow so the admin team understands
what users experience.

### Step 1 — Browse services

```
GET /services?page=1&limit=20
```

The user app renders a list. Only services with `purchasable: true` show a **Buy Now** button.

### Step 2 — Create order

```
POST /orders
```

```json
{
  "serviceId": "3f2a1b4c-...",
  "customerPhone": "9876543210",
  "notes": "Optional note"
}
```

`customerPhone` can be omitted if the user has already saved their phone in their profile.

**Success `201`:**
```json
{
  "success": true,
  "data": {
    "id": "ord-uuid",
    "paymentSessionId": "session_abc123xyz",
    "amount": 1999.00,
    "status": "pending",
    ...
  }
}
```

The Flutter app passes `paymentSessionId` to the Cashfree SDK to open the payment sheet.

### Step 3 — Poll after payment

```
GET /orders/:id
```

Called after the Cashfree SDK fires its `onPaymentVerify` callback.
The `status` field is the source of truth.

### Step 4 — Order history

```
GET /orders?page=1&limit=20&status=paid
```

Optional `status` filter. Returns only the calling user's orders.

---

## Part 4 — Admin App UI Recommendations

### Service Management Screen

**List view should:**
- Show `name`, `category`, `basePrice` (or "No price set" if null), `isActive` badge
- Have search bar (passes `search` param)
- Have category dropdown filter (populated from `GET /services/categories`)
- Have "Show inactive" toggle (sends `includeInactive=true`)

**Create/Edit form fields:**

| Field | UI component | Notes |
|---|---|---|
| Name | Text input | Required |
| Category | Dropdown + "Add new" option | Values from `/services/categories` |
| Price (₹) | Number input | Show "Not set — users cannot buy" hint when empty |
| Description | Multiline text | Optional |

**Price field guidance:**
- Leave empty → service appears with "Contact for pricing" to users, no Buy button
- Set a value → Buy button appears in user app immediately

**Delete vs Deactivate:**
- Show **Deactivate** as the primary action on a service card
- Show **Delete** only when `isActive === false` and ideally after confirming no orders exist
- If delete returns 409, show: *"This service has existing orders. Deactivate it instead."*

### Order Management Screen (Admin & Sales)

**List view — recommended filters to expose in UI:**
- Status tabs: **All / Pending / Paid / Failed**
- Fulfillment tabs (shown only under "Paid"): **New (none) / Processing / Completed / Refund**
- Search bar → passes `search` param (searches name, email, phone)
- Service dropdown → passes `serviceId`
- Date range picker → passes `from` / `to`

**The most useful default view on login:**
```
GET /orders?status=paid&fulfillmentStatus=none
```
This shows all paid orders that nobody has actioned yet — the team's work queue.

**Order detail screen — what to show:**
- Payment section: `status`, `amount`, `paidAt`, `paymentMethod` (from first transaction)
- Customer section: `customerName`, `customerEmail`, `customerPhone`, `notes`
- Fulfillment section: `fulfillmentStatus` badge, `adminNotes` textarea, **Update** button

**Fulfillment update form:**
```
Fulfillment Status: [Processing ▼]  (dropdown of 4 values)
Notes: [_________________________]  (optional textarea)
                         [Save Changes]
```
Calls: `PATCH /orders/:id/fulfillment`

**Transaction history (collapse by default):**
Show each item from `transactions[]` with `paymentStatus`, `paymentMethod`,
`errorDescription` (if failed), and `webhookReceivedAt`. Useful for diagnosing
"I paid but it shows pending" support queries.

**Failed payment handling:**
When `status === 'failed'`, show only the error from `transactions[0].errorDescription`.
Do not show the fulfillment section — there is nothing to action.

---

## Part 5 — Error Reference

| HTTP | `code` | When it happens |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Role does not have permission |
| 404 | `NOT_FOUND` | Service or order ID does not exist |
| 409 | `CONFLICT` | Delete blocked by active orders |
| 422 | `VALIDATION_ERROR` | Invalid field values; `details` has per-field errors |
| 503 | `PAYMENT_NOT_CONFIGURED` | Cashfree env vars not set on server |

All errors follow the same envelope:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { }
  }
}
```
