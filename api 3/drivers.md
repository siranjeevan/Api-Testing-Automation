# Drivers API Documentation

## Overview

The Drivers API provides comprehensive management of driver profiles, including registration, profile updates, availability tracking, wallet management, and real-time location.

## Base URL
```
/api/drivers
```

## Endpoints

### 1. Check Phone Exists

**POST** `/api/drivers/check-phone`

Check if a driver phone number exists to determine if registration is needed.

**Request Body:**
```json
{
  "phone_number": "9876543210"
}
```

**Response (200):**
```json
{
  "exists": true,
  "status": "existing_user",
  "message": "User already exists",
  "driver_id": "driver-uuid",
  "name": "John Doe"
}
```

### 2. Get All Drivers

**GET** `/api/drivers/`

Retrieve a paginated list of all drivers.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "driver_id": "driver-uuid",
    "name": "John Doe",
    "phone_number": "9876543210",
    "email": "john@example.com",
    "kyc_verified": "approved",
    "primary_location": "Mumbai",
    "wallet_balance": 1500.50,
    "fcm_token": "token...",
    "is_available": true,
    "is_approved": true
  }
]
```

### 3. Get Active Driver Locations (Map)

**GET** `/api/drivers/locations`
**GET** `/api/drivers/locations/map`

Get all active driver locations for map view.

**Response (200):**
```json
[
  {
    "driver_id": "driver-uuid",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "driver_name": "John Doe",
    "current_status": "AVAILABLE"
  }
]
```

### 4. Get Driver by ID

**GET** `/api/drivers/{driver_id}`

Retrieve detailed information for a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

### 5. Create New Driver

**POST** `/api/drivers/`

Register a new driver in the system.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone_number": "9876543211",
  "email": "jane@example.com",
  "primary_location": "Delhi"
}
```

**Response (201):**
```json
{
  "driver_id": "driver-uuid",
  "name": "Jane Smith",
  "message": "Driver created successfully"
}
```

### 6. Update Driver

**PUT** `/api/drivers/{driver_id}`

Update driver information.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "is_available": false
}
```

### 7. Update Driver Availability

**PATCH** `/api/drivers/{driver_id}/availability`

Update driver's availability status.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Query Parameters:**
- `is_available` (boolean, required): True for available, False for unavailable

### 8. Update KYC Status

**PATCH** `/api/drivers/{driver_id}/kyc-status`

Admin endpoint to approve/reject driver KYC.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Query Parameters:**
- `kyc_status` (string, required): `pending`, `approved`, or `rejected`

### 9. Approve Driver

**PATCH** `/api/drivers/{driver_id}/approve`

Admin endpoint to approve/disapprove driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Query Parameters:**
- `is_approved` (boolean, required): True to approve, False to disapprove

### 10. Helper: Wallet Balance

**GET** `/api/drivers/{driver_id}/wallet-balance`
**PATCH** `/api/drivers/{driver_id}/wallet-balance` (Admin update)

Manage driver wallet balance.

### 11. Delete Driver

**DELETE** `/api/drivers/{driver_id}`

Remove a driver from the system.

### 12. FCM Token Management

**POST** `/api/drivers/{driver_id}/fcm-token` (Add token)
**GET** `/api/drivers/{driver_id}/fcm-token` (Get token)
**DELETE** `/api/drivers/{driver_id}/fcm-token` (Remove specific token)
**DELETE** `/api/drivers/{driver_id}/fcm-tokens/all` (Clear all tokens)

### 13. Location Management

**POST** `/api/drivers/{driver_id}/location` (Update real-time location)
**GET** `/api/drivers/{driver_id}/location` (Get real-time location)
