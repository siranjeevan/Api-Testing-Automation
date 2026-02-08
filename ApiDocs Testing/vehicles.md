# Vehicles API Documentation

## Overview

The Vehicles API manages vehicle information, registration, approval workflow, and driver-vehicle associations.

## Base URL
```
/api/v1/vehicles
```

## Endpoints

### 1. Get All Vehicles

**GET** `/api/v1/vehicles`

Retrieve a paginated list of all vehicles.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "vehicle_id": 1,
    "driver_id": "550e8400-e29b-41d4-a716-446655440000",
    "vehicle_type": "sedan",
    "vehicle_brand": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_number": "MH01AB1234",
    "vehicle_color": "White",
    "seating_capacity": 4,
    "vehicle_approved": true,
    "created_at": "2023-12-01T10:00:00",
    "updated_at": "2023-12-01T10:00:00"
  }
]
```

### 2. Get Vehicle by ID

**GET** `/api/v1/vehicles/{vehicle_id}`

Retrieve detailed information for a specific vehicle.

**Path Parameters:**
- `vehicle_id` (integer, required): Unique identifier of the vehicle

**Response (200):**
```json
{
  "vehicle_id": 1,
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_type": "sedan",
  "vehicle_brand": "Toyota",
  "vehicle_model": "Camry",
  "vehicle_number": "MH01AB1234",
  "vehicle_color": "White",
  "seating_capacity": 4,
  "vehicle_approved": true,
  "created_at": "2023-12-01T10:00:00",
  "updated_at": "2023-12-01T10:00:00"
}
```

### 3. Get Vehicles by Driver

**GET** `/api/v1/vehicles/driver/{driver_id}`

Retrieve all vehicles belonging to a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
[
  {
    "vehicle_id": 1,
    "driver_id": "550e8400-e29b-41d4-a716-446655440000",
    "vehicle_type": "sedan",
    "vehicle_brand": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_number": "MH01AB1234",
    "vehicle_approved": true
  }
]
```

### 4. Add Vehicle to Driver

**POST** `/api/v1/vehicles`

Register a new vehicle for a driver.

**Request Body:**
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_type": "suv",
  "vehicle_brand": "Mahindra",
  "vehicle_model": "Scorpio",
  "vehicle_number": "MH01CD5678",
  "vehicle_color": "Black",
  "seating_capacity": 7,
  "rc_expiry_date": "2025-12-31",
  "fc_expiry_date": "2024-06-30"
}
```

**Response (201):**
```json
{
  "vehicle_id": 2,
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_number": "MH01CD5678",
  "message": "Vehicle created successfully"
}
```

**Error Response (400):**
```json
{
  "detail": "Vehicle number already registered"
}
```

**Error Response (404):**
```json
{
  "detail": "Driver not found"
}
```

### 5. Update Vehicle

**PUT** `/api/v1/vehicles/{vehicle_id}`

Update vehicle information. Only provided fields will be updated.

**Path Parameters:**
- `vehicle_id` (integer, required): Unique identifier of the vehicle

**Request Body:**
```json
{
  "vehicle_color": "Red",
  "seating_capacity": 5,
  "rc_expiry_date": "2026-12-31"
}
```

**Response (200):**
```json
{
  "vehicle_id": 2,
  "message": "Vehicle updated successfully"
}
```

### 6. Approve Vehicle

**PATCH** `/api/v1/vehicles/{vehicle_id}/approve`

Approve a vehicle for operational use.

**Path Parameters:**
- `vehicle_id` (integer, required): Unique identifier of the vehicle

**Response (200):**
```json
{
  "message": "Vehicle approved successfully",
  "vehicle_id": 2,
  "vehicle_number": "MH01CD5678",
  "approved": true
}
```

### 7. Delete Vehicle

**DELETE** `/api/v1/vehicles/{vehicle_id}`

Remove a vehicle from the system.

**Path Parameters:**
- `vehicle_id` (integer, required): Unique identifier of the vehicle

**Response (200):**
```json
{
  "message": "Vehicle deleted successfully",
  "vehicle_id": 2,
  "vehicle_number": "MH01CD5678"
}
```

## Vehicle Types

Supported vehicle types:
- `sedan`
- `suv`
- `hatchback`
- `bike`
- `auto`

## Approval Workflow

1. **Registration**: Driver registers vehicle through API
2. **Pending Approval**: Vehicle is created with `vehicle_approved: false`
3. **Admin Review**: System administrator reviews vehicle documents
4. **Approval**: Vehicle is approved via `/approve` endpoint
5. **Active**: Vehicle can now be used for trips

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Vehicle number already registered"
}
```

**404 Not Found:**
```json
{
  "detail": "Vehicle not found"
}
```

**404 Not Found (Driver):**
```json
{
  "detail": "Driver not found"
}
```

## Notes

- Vehicle numbers must be unique across the system
- Vehicles must be approved before they can be used for trips
- Each vehicle belongs to exactly one driver
- RC (Registration Certificate) and FC (Fitness Certificate) expiry dates are tracked for compliance
