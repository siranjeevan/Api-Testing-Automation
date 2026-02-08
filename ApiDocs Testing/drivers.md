# Drivers API Documentation

## Overview

The Drivers API provides comprehensive management of driver profiles, including registration, profile updates, availability tracking, and wallet management.

## Base URL
```
/api/v1/drivers
```

## Endpoints

### 1. Get All Drivers

**GET** `/api/v1/drivers`

Retrieve a paginated list of all drivers.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "driver_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "phone_number": "9876543210",
    "email": "john@example.com",
    "kyc_verified": true,
    "primary_location": "Mumbai",
    "wallet_balance": 1500.50,
    "is_available": true,
    "is_approved": true,
    "created_at": "2023-12-01T10:00:00",
    "updated_at": "2023-12-01T10:00:00"
  }
]
```

### 2. Get Driver by ID

**GET** `/api/v1/drivers/{driver_id}`

Retrieve detailed information for a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "phone_number": "9876543210",
  "email": "john@example.com",
  "kyc_verified": true,
  "primary_location": "Mumbai",
  "wallet_balance": 1500.50,
  "is_available": true,
  "is_approved": true,
  "created_at": "2023-12-01T10:00:00",
  "updated_at": "2023-12-01T10:00:00"
}
```

**Error Response (404):**
```json
{
  "detail": "Driver not found"
}
```

### 3. Create New Driver

**POST** `/api/v1/drivers`

Register a new driver in the system.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone_number": "9876543211",
  "email": "jane@example.com",
  "primary_location": "Delhi",
  "licence_number": "DL123456789",
  "aadhar_number": "123456789012",
  "licence_expiry": "2025-12-31",
  "device_id": "device_12345"
}
```

**Response (201):**
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Jane Smith",
  "phone_number": "9876543211",
  "email": "jane@example.com",
  "message": "Driver created successfully"
}
```

**Error Response (400):**
```json
{
  "detail": "Phone number already registered"
}
```

### 4. Update Driver

**PUT** `/api/v1/drivers/{driver_id}`

Update driver information. Only provided fields will be updated.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "email": "jane.updated@example.com",
  "primary_location": "Bangalore",
  "is_available": false
}
```

**Response (200):**
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Jane Smith Updated",
  "phone_number": "9876543211",
  "email": "jane.updated@example.com",
  "kyc_verified": true,
  "primary_location": "Bangalore",
  "wallet_balance": 0.0,
  "is_available": false,
  "is_approved": false,
  "created_at": "2023-12-01T10:00:00",
  "updated_at": "2023-12-01T11:00:00"
}
```

### 5. Update Driver Availability

**PATCH** `/api/v1/drivers/{driver_id}/availability`

Update driver's availability status.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Request Body:**
```json
true
```

**Response (200):**
```json
{
  "message": "Driver availability updated to available",
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_available": true
}
```

### 6. Get Driver Wallet Balance

**GET** `/api/v1/drivers/{driver_id}/wallet-balance`

Retrieve the current wallet balance for a driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "wallet_balance": 1500.50,
  "name": "John Doe"
}
```

### 7. Delete Driver

**DELETE** `/api/v1/drivers/{driver_id}`

Remove a driver from the system.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
{
  "message": "Driver deleted successfully",
  "driver_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "detail": "Invalid input data"
}
```

**404 Not Found:**
```json
{
  "detail": "Driver not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

## Notes

- Driver IDs are UUID strings
- Phone numbers must be unique across the system
- Wallet balances are stored as decimal values
- Driver approval is required before they can be assigned to trips
- KYC verification status affects driver capabilities
