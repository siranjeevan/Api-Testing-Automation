# Wallet Transactions API Documentation

## Overview

The Wallet Transactions API manages driver wallet transactions, including credits (earnings) and debits (withdrawals, penalties), with automatic balance updates.

## Base URL
```
/api/v1/wallet-transactions
```

## Endpoints

### 1. Get All Wallet Transactions

**GET** `/api/v1/wallet-transactions`

Retrieve a paginated list of all wallet transactions.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "transaction_id": 1,
    "driver_id": 1,
    "transaction_type": "credit",
    "amount": 500.00,
    "description": "Trip payment received",
    "reference_id": "TRIP_123",
    "created_at": "2023-12-01T12:00:00",
    "updated_at": null
  }
]
```

### 2. Get Wallet Transaction by ID

**GET** `/api/v1/wallet-transactions/{transaction_id}`

Retrieve detailed information for a specific wallet transaction.

**Path Parameters:**
- `transaction_id` (integer, required): Unique identifier of the transaction

**Response (200):**
```json
{
  "transaction_id": 1,
  "driver_id": 1,
  "transaction_type": "credit",
  "amount": 500.00,
  "description": "Trip payment received",
  "reference_id": "TRIP_123",
  "created_at": "2023-12-01T12:00:00",
  "updated_at": null
}
```

### 3. Create Wallet Transaction

**POST** `/api/v1/wallet-transactions`

Create a new wallet transaction and automatically update the driver's balance.

**Request Body:**
```json
{
  "driver_id": 1,
  "transaction_type": "debit",
  "amount": 200.00,
  "description": "Wallet withdrawal",
  "reference_id": "WD_456"
}
```

**Response (201):**
```json
{
  "transaction_id": 2,
  "driver_id": 1,
  "transaction_type": "debit",
  "amount": 200.00,
  "description": "Wallet withdrawal",
  "reference_id": "WD_456",
  "created_at": "2023-12-01T13:00:00",
  "updated_at": null
}
```

**Error Response (400):**
```json
{
  "detail": "Insufficient wallet balance"
}
```

### 4. Update Wallet Transaction

**PUT** `/api/v1/wallet-transactions/{transaction_id}`

Update wallet transaction information. Only provided fields will be updated.

**Path Parameters:**
- `transaction_id` (integer, required): Unique identifier of the transaction

**Request Body:**
```json
{
  "description": "Updated withdrawal description",
  "reference_id": "WD_456_UPDATED"
}
```

**Response (200):**
```json
{
  "transaction_id": 2,
  "driver_id": 1,
  "transaction_type": "debit",
  "amount": 200.00,
  "description": "Updated withdrawal description",
  "reference_id": "WD_456_UPDATED",
  "created_at": "2023-12-01T13:00:00",
  "updated_at": "2023-12-01T13:05:00"
}
```

### 5. Delete Wallet Transaction

**DELETE** `/api/v1/wallet-transactions/{transaction_id}`

Remove a wallet transaction from the system.

**Path Parameters:**
- `transaction_id` (integer, required): Unique identifier of the transaction

**Response (200):**
```json
{
  "message": "Wallet transaction deleted successfully",
  "transaction_id": 2
}
```

### 6. Get Wallet Transactions by Driver

**GET** `/api/v1/wallet-transactions/driver/{driver_id}`

Retrieve all wallet transactions for a specific driver.

**Path Parameters:**
- `driver_id` (integer, required): Unique identifier of the driver

**Response (200):**
```json
[
  {
    "transaction_id": 1,
    "driver_id": 1,
    "transaction_type": "credit",
    "amount": 500.00,
    "description": "Trip payment received",
    "reference_id": "TRIP_123",
    "created_at": "2023-12-01T12:00:00",
    "updated_at": null
  },
  {
    "transaction_id": 2,
    "driver_id": 1,
    "transaction_type": "debit",
    "amount": 200.00,
    "description": "Wallet withdrawal",
    "reference_id": "WD_456",
    "created_at": "2023-12-01T13:00:00",
    "updated_at": null
  }
]
```

## Transaction Types

- `credit`: Money added to driver's wallet (trip earnings, bonuses, etc.)
- `debit`: Money deducted from driver's wallet (withdrawals, penalties, fees, etc.)

## Balance Management

When creating a wallet transaction:

- **Credit Transaction**: Amount is added to driver's wallet balance
- **Debit Transaction**: Amount is subtracted from driver's wallet balance (fails if insufficient balance)

## Common Transaction Scenarios

### Trip Earnings (Credit)
```json
{
  "driver_id": 1,
  "transaction_type": "credit",
  "amount": 450.00,
  "description": "Trip fare received - Mumbai to Pune",
  "reference_id": "TRIP_789"
}
```

### Wallet Withdrawal (Debit)
```json
{
  "driver_id": 1,
  "transaction_type": "debit",
  "amount": 1000.00,
  "description": "Bank transfer withdrawal",
  "reference_id": "WD_123"
}
```

### Penalty/Fee (Debit)
```json
{
  "driver_id": 1,
  "transaction_type": "debit",
  "amount": 50.00,
  "description": "Late cancellation penalty",
  "reference_id": "PENALTY_456"
}
```

### Bonus/Reward (Credit)
```json
{
  "driver_id": 1,
  "transaction_type": "credit",
  "amount": 100.00,
  "description": "Performance bonus",
  "reference_id": "BONUS_DEC"
}
```

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Insufficient wallet balance"
}
```

**404 Not Found:**
```json
{
  "detail": "Wallet transaction not found"
}
```

**404 Not Found (Driver):**
```json
{
  "detail": "Driver not found"
}
```

## Notes

- All amounts are stored as decimal values for precision
- Reference IDs should be unique and link to the originating transaction (trip, withdrawal, etc.)
- Balance updates happen atomically with transaction creation
- Transactions cannot be modified after creation (except for description/reference updates)
- Driver wallet balances are maintained in the drivers table and updated with each transaction
