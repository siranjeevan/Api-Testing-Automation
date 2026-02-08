# Payments API Documentation

## Overview

The Payments API manages payment transactions for trips, including creation, updates, and tracking of payment status.

## Base URL
```
/api/payments
```

## Endpoints

### 1. Get All Payments

**GET** `/api/payments/`

Retrieve a paginated list of all payment transactions.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "payment_id": "payment-uuid",
    "driver_id": "driver-uuid",
    "amount": 500.00,
    "transaction_type": "CREDIT",
    "status": "COMPLETED",
    ...
  }
]
```

### 2. Get Payment by ID

**GET** `/api/payments/{payment_id}`

Retrieve detailed information for a specific payment.

**Path Parameters:**
- `payment_id` (string, required): Unique identifier of the payment

### 3. Create Payment

**POST** `/api/payments/`

Create a new payment transaction.

**Request Body:**
```json
{
  "driver_id": "driver-uuid",
  "amount": 750.50,
  "transaction_type": "CREDIT",
  "status": "PENDING",
  "razorpay_payment_id": "pay_..."
}
```

**Response (201):**
```json
{
  "payment_id": "payment-uuid",
  "amount": 750.50,
  "status": "PENDING",
  ...
}
```

### 4. Update Payment

**PUT** `/api/payments/{payment_id}`

Update payment information.

**Path Parameters:**
- `payment_id` (string, required): Unique identifier of the payment

### 5. Delete Payment

**DELETE** `/api/payments/{payment_id}`

Remove a payment transaction from the system.

**Path Parameters:**
- `payment_id` (string, required): Unique identifier of the payment

### 6. Get Payments by Driver

**GET** `/api/payments/driver/{driver_id}`

Retrieve all payments associated with a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
[
  {
    "payment_id": "payment-uuid",
    "amount": 500.00,
    ...
  }
]
```

### 7. Get Payment by Razorpay ID

**GET** `/api/payments/razorpay/{razorpay_payment_id}`

Get payment by Razorpay payment ID.

**Path Parameters:**
- `razorpay_payment_id` (string, required): Unique identifier of the razorpay payment

**Response (200):**
```json
{
  "payment_id": "payment-uuid",
  "razorpay_payment_id": "pay_...",
  ...
}
```
