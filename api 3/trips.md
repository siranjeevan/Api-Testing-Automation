# Trips API Documentation

## Overview

The Trips API manages the complete lifecycle of cab booking trips, including creation, driver assignment, status tracking, and completion.

## Base URL
```
/api/trips
```

## Endpoints

### 1. Get Available Trips

**GET** `/api/trips/available`

Get all available trips (OPEN status, no driver assigned).

**Response (200):**
```json
[
  {
    "trip_id": "uuid-string",
    "customer_name": "John Doe",
    "pickup_address": "Location A",
    "drop_address": "Location B",
    "trip_status": "OPEN",
    ...
  }
]
```

### 2. Get All Trips

**GET** `/api/trips/`

Retrieve a paginated list of all trips with optional status filtering.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)
- `status_filter` (string, optional): Filter trips by status (`OPEN`, `ASSIGNED`, `STARTED`, `COMPLETED`, `CANCELLED`)

**Response (200):**
```json
[
  {
    "trip_id": "uuid-string",
    "customer_name": "John Smith",
    "customer_phone": "9876543210",
    "pickup_address": "Mumbai Airport",
    "drop_address": "Bandra West",
    "trip_type": "one_way",
    "vehicle_type": "sedan",
    "trip_status": "ASSIGNED",
    "assigned_driver_id": "driver-uuid",
    "fare": 500.00,
    "total_amount": 550.00,
    "created_at": "2023-12-01T10:00:00"
  }
]
```

### 3. Get Trip by ID

**GET** `/api/trips/{trip_id}`

Retrieve detailed information for a specific trip, including assigned driver details if available.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Response (200):**
```json
{
  "trip_id": "uuid-string",
  "customer_name": "John Smith",
  "customer_phone": "9876543210",
  "pickup_address": "Mumbai Airport",
  "drop_address": "Bandra West",
  "trip_type": "one_way",
  "vehicle_type": "sedan",
  "trip_status": "ASSIGNED",
  "assigned_driver_id": "driver-uuid",
  "distance_km": 15.5,
  "fare": 500.00,
  "waiting_charges": 50.00,
  "total_amount": 550.00,
  "driver": {
    "driver_id": "driver-uuid",
    "name": "Driver Name",
    "phone_number": "1234567890",
    "is_available": false
  }
}
```

### 4. Create New Trip

**POST** `/api/trips/`

Create a new trip booking.

**Request Body:**
```json
{
  "customer_name": "Jane Doe",
  "customer_phone": "9876543211",
  "pickup_address": "Andheri East",
  "drop_address": "Powai",
  "trip_type": "one_way",
  "vehicle_type": "sedan",
  "passenger_count": 3,
  "planned_start_at": "2023-12-01T14:00:00"
}
```

**Response (201):**
```json
{
  "trip_id": "uuid-string",
  "customer_name": "Jane Doe",
  "trip_status": "OPEN",
  "message": "Trip created successfully"
}
```

### 5. Update Trip

**PUT** `/api/trips/{trip_id}`

Update trip information.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Request Body (TripUpdate schema):**
```json
{
  "trip_status": "STARTED",
  "fare": 750.00,
  "waiting_charges": 100.00
}
```

**Response (200):**
JSON object of updated trip.

### 6. Assign Driver to Trip

**PATCH** `/api/trips/{trip_id}/assign-driver/{driver_id}`

Manually assign a driver to a trip (Admin only).

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
{
  "message": "Driver assigned successfully",
  "trip_id": "trip-uuid",
  "driver_id": "driver-uuid",
  "trip_status": "ASSIGNED"
}
```

### 7. Unassign Driver from Trip

**PATCH** `/api/trips/{trip_id}/unassign`

Unassign driver from trip and reset status to OPEN (Admin only).

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Response (200):**
```json
{
  "message": "Driver unassigned successfully",
  "trip_id": "trip-uuid",
  "previous_driver_id": "driver-uuid",
  "trip_status": "OPEN"
}
```

### 8. Update Trip Status

**PATCH** `/api/trips/{trip_id}/status`

Update the status of a trip.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Request Body (Query param in simplified endpoint, check implementation):**
`new_status` (string, required) as query parameter.

**Response (200):**
```json
{
  "message": "Trip status updated to COMPLETED",
  "trip_id": "trip-uuid",
  "trip_status": "COMPLETED",
  "fare": 500.00
}
```

### 9. Get Trips by Driver

**GET** `/api/trips/driver/{driver_id}`

Retrieve all trips assigned to a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

### 10. Get Trip Statistics

**GET** `/api/trips/statistics/dashboard`

Get trip statistics for admin dashboard.

**Response (200):**
JSON object with statistics.

### 11. Start Trip (Odometer)

**PATCH** `/api/trips/{trip_id}/odometer/start`

Update trip starting odometer reading and set status to STARTED.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Query Parameters:**
- `odo_start` (integer, required): Starting odometer reading

**Response (200):**
```json
{
  "message": "Odometer start updated",
  "trip_id": "trip-uuid",
  "odo_start": 12500,
  "trip_status": "STARTED"
}
```

### 12. Complete Trip (Odometer End)

**PATCH** `/api/trips/{trip_id}/odometer/end`

Update trip ending odometer reading, calculate fare, and auto-complete trip.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Query Parameters:**
- `odo_end` (integer, required): Ending odometer reading
- `waiting_charges` (decimal, optional)
- `inter_state_permit_charges` (decimal, optional)
- `driver_allowance` (decimal, optional)
- `luggage_cost` (decimal, optional)
- `pet_cost` (decimal, optional)
- `toll_charges` (decimal, optional)
- `night_allowance` (decimal, optional)

**Response (200):**
```json
{
  "message": "Trip completed successfully",
  "trip_id": "trip-uuid",
  "odo_end": 12600,
  "fare": 500.00,
  "total_amount": 600.00,
  "trip_status": "COMPLETED",
  "commission_deducted": 50.00
}
```

### 13. Recalculate Fare

**POST** `/api/trips/{trip_id}/recalculate-fare`

Manually recalculate fare for a completed trip and update wallet transactions.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Response (200):**
```json
{
  "message": "Fare recalculated and wallet adjusted successfully",
  "trip_id": "trip-uuid",
  "old_fare": 450.00,
  "new_fare": 500.00,
  "net_adjustment": 5.00
}
```
