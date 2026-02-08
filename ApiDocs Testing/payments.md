# Payments API Documentation

## Overview

The Payments API manages payment transactions for trips, including creation, updates, and tracking of payment status.

## Base URL
```
/api/v1/payments
```

## Endpoints

### 1. Get All Payments

**GET** `/api/v1/payments`

Retrieve a paginated list of all payment transactions.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "payment_id": 1,
    "trip_id": 1,
    "amount": 500.00,
    "payment_method": "cash",
    "payment_status": "completed",
    "transaction_reference": "TXN_123456789",
    "payment_gateway": "razorpay",
    "gateway_transaction_id": "rzp_txn_987654321",
    "created_at": "2023-12-01T12:00:00",
    "updated_at": "2023-12-01T12:05:00"
  }
]
```

### 2. Get Payment by ID

**GET** `/api/v1/payments/{payment_id}`

Retrieve detailed information for a specific payment.

**Path Parameters:**
- `payment_id` (integer, required): Unique identifier of the payment

**Response (200):**
```json
{
  "payment_id": 1,
  "trip_id": 1,
  "amount": 500.00,
  "payment_method": "cash",
  "payment_status": "completed",
  "transaction_reference": "TXN_123456789",
  "payment_gateway": "razorpay",
  "gateway_transaction_id": "rzp_txn_987654321",
  "created_at": "2023-12-01T12:00:00",
  "updated_at": "2023-12-01T12:05:00"
}
```

### 3. Create Payment

**POST** `/api/v1/payments`

Create a new payment transaction for a trip.

**Request Body:**
```json
{
  "trip_id": 1,
  "amount": 750.50,
  "payment_method": "upi",
  "payment_status": "pending",
  "transaction_reference": "UPI_987654321",
  "payment_gateway": "phonepe",
  "gateway_transaction_id": "pp_txn_123456789"
}
```

**Response (201):**
```json
{
  "payment_id": 2,
  "trip_id": 1,
  "amount": 750.50,
  "payment_method": "upi",
  "payment_status": "pending",
  "transaction_reference": "UPI_987654321",
  "payment_gateway": "phonepe",
  "gateway_transaction_id": "pp_txn_123456789",
  "created_at": "2023-12-01T13:00:00",
  "updated_at": null
}
```

### 4. Update Payment

**PUT** `/api/v1/payments/{payment_id}`

Update payment information. Only provided fields will be updated.

**Path Parameters:**
- `payment_id` (integer, required): Unique identifier of the payment

**Request Body:**
```json
{
  "payment_status": "completed",
  "gateway_transaction_id": "pp_txn_123456789_updated",
  "gateway_response": "{\"status\":\"success\",\"txn_id\":\"pp_txn_123456789\"}"
}
```

**Response (200):**
```json
{
  "payment_id": 2,
  "trip_id": 1,
  "amount": 750.50,
  "payment_method": "upi",
  "payment_status": "completed",
  "transaction_reference": "UPI_987654321",
  "payment_gateway": "phonepe",
  "gateway_transaction_id": "pp_txn_123456789_updated",
  "created_at": "2023-12-01T13:00:00",
  "updated_at": "2023-12-01T13:05:00"
}
```

### 5. Delete Payment

**DELETE** `/api/v1/payments/{payment_id}`

Remove a payment transaction from the system.

**Path Parameters:**
- `payment_id` (integer, required): Unique identifier of the payment

**Response (200):**
```json
{
  "message": "Payment deleted successfully",
  "payment_id": 2
}
```

### 6. Get Payments by Trip

**GET** `/api/v1/payments/trip/{trip_id}`

Retrieve all payments associated with a specific trip.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip

**Response (200):**
```json
[
  {
    "payment_id": 1,
    "trip_id": 1,
    "amount": 500.00,
    "payment_method": "cash",
    "payment_status": "completed",
    "transaction_reference": "TXN_123456789",
    "payment_gateway": "razorpay",
    "gateway_transaction_id": "rzp_txn_987654321",
    "created_at": "2023-12-01T12:00:00",
    "updated_at": "2023-12-01T12:05:00"
  }
]
```

## Payment Methods

Supported payment methods:
- `cash`: Cash payment
- `upi`: UPI (Unified Payments Interface)
- `card`: Credit/Debit card
- `wallet`: Digital wallet
- `bank_transfer`: Bank transfer

## Payment Status

Payment status values:
- `pending`: Payment initiated but not completed
- `processing`: Payment is being processed
- `completed`: Payment successfully completed
- `failed`: Payment failed
- `refunded`: Payment has been refunded
- `cancelled`: Payment was cancelled

## Payment Gateways

Supported payment gateways:
- `razorpay`: Razorpay payment gateway
- `phonepe`: PhonePe payment gateway
- `paytm`: Paytm payment gateway
- `gpay`: Google Pay
- `cashfree`: Cashfree payment gateway

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid payment method"
}
```

**404 Not Found:**
```json
{
  "detail": "Payment not found"
}
```

**404 Not Found (Trip):**
```json
{
  "detail": "Trip not found"
}
```

## Notes

- Each trip can have multiple payment transactions (partial payments, refunds, etc.)
- Payment amounts are stored as decimal values for precision
- Gateway transaction IDs and responses are stored for reconciliation
- Transaction references should be unique for tracking purposes
- Payment status updates should be handled by webhooks from payment gateways
