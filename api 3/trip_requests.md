# Trip Driver Requests API Documentation

## Overview

The Trip Driver Requests API manages the communication between the system, drivers, and trips regarding trip assignments. It handles the creation, approval, and cancellation of driver requests for trips.

## Base URL
```
/api/trip-requests
```

## Endpoints

### 1. Get All Requests

**GET** `/api/trip-requests/`

Get all trip driver requests.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "request_id": "request-uuid",
    "trip_id": "trip-uuid",
    "driver_id": "driver-uuid",
    "driver_name": "Driver Name",
    "customer_name": "Customer Name",
    "status": "PENDING",
    "created_at": "2023-12-01T10:00:00"
  }
]
```

### 2. Get Request by ID

**GET** `/api/trip-requests/{request_id}`

Get trip driver request by ID.

**Path Parameters:**
- `request_id` (string, required): Unique identifier of the request

**Response (200):**
```json
{
  "request_id": "request-uuid",
  "trip_id": "trip-uuid",
  "driver_id": "driver-uuid",
  "status": "PENDING"
}
```

### 3. Create Request

**POST** `/api/trip-requests/`

Driver creates a request for a trip.

**Query Parameters:**
- `trip_id` (string, required): Unique identifier of the trip
- `driver_id` (string, required): Unique identifier of the driver

**Response (201):**
```json
{
  "message": "Trip request created",
  "request_id": "request-uuid",
  "status": "PENDING"
}
```

### 4. Update Request Status

**PATCH** `/api/trip-requests/{request_id}/status`

Update request status (PENDING/ACCEPTED/REJECTED/CANCELLED).

**Path Parameters:**
- `request_id` (string, required): Unique identifier of the request

**Query Parameters:**
- `new_status` (string, required): New status of the request

**Response (200):**
```json
{
  "message": "Request status updated to ACCEPTED",
  "request_id": "request-uuid",
  "status": "ACCEPTED"
}
```

### 5. Approve Request

**PATCH** `/api/trip-requests/{request_id}/approve`

Admin approves request and assigns driver to trip. This will also reject other pending requests for the same trip.

**Path Parameters:**
- `request_id` (string, required): Unique identifier of the request

**Response (200):**
```json
{
  "message": "Request approved and driver assigned",
  "trip_id": "trip-uuid",
  "driver_id": "driver-uuid",
  "driver_name": "Driver Name"
}
```

### 6. Get Requests by Trip

**GET** `/api/trip-requests/trip/{trip_id}`

Get all requests for a specific trip.

**Path Parameters:**
- `trip_id` (string, required): Unique identifier of the trip

**Response (200):**
```json
[
  {
    "request_id": "request-uuid",
    "driver_id": "driver-uuid",
    "driver_name": "Driver Name",
    "status": "PENDING",
    "created_at": "2023-12-01T10:00:00"
  }
]
```

### 7. Get Requests by Driver

**GET** `/api/trip-requests/driver/{driver_id}`

Get all requests by a specific driver.

**Path Parameters:**
- `driver_id` (string, required): Unique identifier of the driver

**Response (200):**
```json
[
  {
    "request_id": "request-uuid",
    "trip_id": "trip-uuid",
    "customer_name": "Customer Name",
    "status": "PENDING",
    "created_at": "2023-12-01T10:00:00"
  }
]
```

### 8. Cancel Request

**PATCH** `/api/trip-requests/{request_id}/cancel`

Cancel a trip driver request.

**Path Parameters:**
- `request_id` (string, required): Unique identifier of the request

**Response (200):**
```json
{
  "message": "Request cancelled successfully",
  "request_id": "request-uuid",
  "status": "CANCELLED"
}
```

### 9. Delete Request

**DELETE** `/api/trip-requests/{request_id}`

Delete a trip driver request.

**Path Parameters:**
- `request_id` (string, required): Unique identifier of the request

**Response (200):**
```json
{
  "message": "Request deleted successfully",
  "request_id": "request-uuid"
}
```
