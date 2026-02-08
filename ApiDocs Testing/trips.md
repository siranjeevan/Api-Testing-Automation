# Trips API Documentation

## Overview

The Trips API manages the complete lifecycle of cab booking trips, including creation, driver assignment, status tracking, and completion.

## Base URL
```
/api/v1/trips
```

## Endpoints

### 1. Get All Trips

**GET** `/api/v1/trips`

Retrieve a paginated list of all trips with optional status filtering.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)
- `status_filter` (string, optional): Filter trips by status (`pending`, `assigned`, `started`, `completed`, `cancelled`)

**Response (200):**
```json
[
  {
    "trip_id": 1,
    "customer_name": "John Smith",
    "customer_phone": "9876543210",
    "pickup_address": "Mumbai Airport",
    "drop_address": "Bandra West",
    "trip_type": "one_way",
    "vehicle_type": "sedan",
    "assigned_driver_id": 1,
    "trip_status": "assigned",
    "fare": 500.00,
    "created_at": "2023-12-01T10:00:00"
  }
]
```

### 2. Get Trip by ID

**GET** `/api/v1/trips/{trip_id}`

Retrieve detailed information for a specific trip.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip

**Response (200):**
```json
{
  "trip_id": 1,
  "customer_name": "John Smith",
  "customer_phone": "9876543210",
  "pickup_address": "Mumbai Airport",
  "drop_address": "Bandra West",
  "trip_type": "one_way",
  "vehicle_type": "sedan",
  "assigned_driver_id": 1,
  "trip_status": "assigned",
  "fare": 500.00,
  "created_at": "2023-12-01T10:00:00"
}
```

### 3. Create New Trip

**POST** `/api/v1/trips`

Create a new trip booking.

**Request Body:**
```json
{
  "customer_name": "Jane Doe",
  "customer_phone": "9876543211",
  "pickup_address": "Andheri East",
  "drop_address": "Powai",
  "trip_type": "round_trip",
  "vehicle_type": "suv",
  "passenger_count": 3,
  "planned_start_at": "2023-12-01T14:00:00",
  "planned_end_at": "2023-12-01T18:00:00"
}
```

**Response (201):**
```json
{
  "trip_id": 2,
  "customer_name": "Jane Doe",
  "trip_status": "pending",
  "fare": 100.00,
  "message": "Trip created successfully"
}
```

### 4. Update Trip

**PUT** `/api/v1/trips/{trip_id}`

Update trip information. Only provided fields will be updated.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip

**Request Body:**
```json
{
  "trip_status": "started",
  "distance_km": 15.5,
  "fare": 750.00,
  "odo_start": 12500,
  "odo_end": 12650,
  "started_at": "2023-12-01T14:30:00"
}
```

**Response (200):**
```json
{
  "trip_id": 2,
  "message": "Trip updated successfully"
}
```

### 5. Assign Driver to Trip

**PATCH** `/api/v1/trips/{trip_id}/assign-driver/{driver_id}`

Manually assign a driver to a trip.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
{
  "message": "Driver assigned to trip successfully",
  "trip_id": 2,
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "driver_name": "John Doe",
  "trip_status": "assigned"
}
```

**Error Response (400):**
```json
{
  "detail": "Driver is not available"
}
```

### 6. Update Trip Status

**PATCH** `/api/v1/trips/{trip_id}/status`

Update the status of a trip.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip

**Request Body:**
```json
"completed"
```

**Valid Status Values:**
- `pending`
- `assigned`
- `started`
- `completed`
- `cancelled`

**Response (200):**
```json
{
  "message": "Trip status updated from assigned to completed",
  "trip_id": 2,
  "old_status": "assigned",
  "new_status": "completed"
}
```

### 7. Create Driver Request

**POST** `/api/v1/trips/{trip_id}/driver-requests`

Create a request for a driver to accept a trip.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip

**Request Body:**
```json
{
  "driver_id": 1
}
```

**Response (201):**
```json
{
  "message": "Driver request created successfully",
  "request_id": 1,
  "trip_id": 2,
  "driver_id": 1,
  "status": "pending"
}
```

### 8. Get Trips by Driver

**GET** `/api/v1/trips/driver/{driver_id}`

Retrieve all trips assigned to a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
[
  {
    "trip_id": 1,
    "customer_name": "John Smith",
    "trip_status": "completed",
    "fare": 500.00
  }
]
```

### 9. Delete Trip

**DELETE** `/api/v1/trips/{trip_id}`

Remove a trip from the system.

**Path Parameters:**
- `trip_id` (integer, required): Unique identifier of the trip

**Response (200):**
```json
{
  "message": "Trip deleted successfully",
  "trip_id": 2
}
```

## Trip Types

- `one_way`: Single journey from pickup to drop location
- `round_trip`: Return journey (pickup to drop and back to pickup)

## Trip Status Flow

```
pending → assigned → started → completed
    ↓        ↓         ↓        ↓
 cancelled  cancelled  cancelled  (final)
```

## Driver Assignment

Drivers can be assigned to trips in two ways:

1. **Manual Assignment**: Admin/system assigns driver via `/assign-driver/{driver_id}` endpoint
2. **Driver Request System**: System creates requests that drivers can accept/reject

## Automatic Actions

When a trip status changes:
- **Completed/Cancelled**: Assigned driver becomes available again
- **Started**: Odometer readings and timestamps are recorded
- **Assigned**: Driver availability is set to false

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid status. Valid statuses: pending, assigned, started, completed, cancelled"
}
```

**404 Not Found:**
```json
{
  "detail": "Trip not found"
}
```

## Notes

- Trip fares are calculated based on tariff configurations
- Distance tracking uses odometer readings when available
- Driver availability is automatically managed based on trip status
- Manual assignments bypass the normal driver request system
