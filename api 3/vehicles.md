# Vehicles API Documentation

## Overview

The Vehicles API manages vehicle information, registration, approval workflow, and driver-vehicle associations.

## Base URL
```
/api/vehicles
```

## Endpoints

### 1. Get All Vehicles

**GET** `/api/vehicles/`

Retrieve a paginated list of all vehicles.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "vehicle_id": "vehicle-uuid",
    "driver_id": "driver-uuid",
    "vehicle_type": "sedan",
    "vehicle_brand": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_number": "MH01AB1234",
    "vehicle_approved": true,
    ...
  }
]
```

### 2. Get Vehicle by ID

**GET** `/api/vehicles/{vehicle_id}`

Retrieve detailed information for a specific vehicle.

**Path Parameters:**
- `vehicle_id` (string, required): Unique identifier of the vehicle

### 3. Get Vehicles by Driver

**GET** `/api/vehicles/driver/{driver_id}`

Retrieve all vehicles belonging to a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

### 4. Create New Vehicle

**POST** `/api/vehicles/`

Register a new vehicle for a driver.

**Request Body:**
```json
{
  "driver_id": "driver-uuid",
  "vehicle_type": "sedan",
  "vehicle_brand": "Toyota",
  "vehicle_model": "Camry",
  "vehicle_number": "MH01AB1234",
  "vehicle_color": "White",
  "seating_capacity": 4,
  "rc_expiry_date": "2025-12-31"
}
```

**Response (201):**
```json
{
  "vehicle_id": "vehicle-uuid",
  "driver_id": "driver-uuid",
  "vehicle_number": "MH01AB1234",
  "message": "Vehicle created successfully"
}
```

### 5. Update Vehicle

**PUT** `/api/vehicles/{vehicle_id}`

Update vehicle information.

**Path Parameters:**
- `vehicle_id` (string, required): Unique identifier of the vehicle

**Request Body:**
```json
{
  "vehicle_color": "Black",
  "seating_capacity": 5
}
```

### 6. Approve Vehicle

**PATCH** `/api/vehicles/{vehicle_id}/approve`

Approve or disapprove a vehicle for operational use.

**Path Parameters:**
- `vehicle_id` (string, required): Unique identifier of the vehicle

**Query Parameters:**
- `is_approved` (boolean, required): True to approve, False to disapprove

### 7. Delete Vehicle

**DELETE** `/api/vehicles/{vehicle_id}`

Remove a vehicle from the system.

**Path Parameters:**
- `vehicle_id` (string, required): Unique identifier of the vehicle
