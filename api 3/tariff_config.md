# Tariff Configuration API Documentation

## Overview

The Tariff Configuration API manages pricing structures for different vehicle types and trip types, enabling dynamic fare calculation based on distance and vehicle category.

## Base URL
```
/api/v1/tariff-config
```

## Endpoints

### 1. Get All Tariff Configurations

**GET** `/api/v1/tariff-config/`

Retrieve a paginated list of all tariff configurations.

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "config_id": 1,
    "vehicle_type": "sedan",
    "one_way_per_km": 12.00,
    "one_way_min_km": 2,
    "round_trip_per_km": 10.00,
    "round_trip_min_km": 4,
    "driver_allowance": 50.00,
    "is_active": true,
    "created_at": "2023-12-01T10:00:00",
    "updated_at": null
  }
]
```

### 2. Get Tariff Configuration by ID

**GET** `/api/v1/tariff-config/{config_id}`

Retrieve detailed information for a specific tariff configuration.

**Path Parameters:**
- `config_id` (integer, required): Unique identifier of the tariff configuration

**Response (200):**
```json
{
  "config_id": 1,
  "vehicle_type": "sedan",
  "one_way_per_km": 12.00,
  "one_way_min_km": 2,
  "round_trip_per_km": 10.00,
  "round_trip_min_km": 4,
  "driver_allowance": 50.00,
  "is_active": true,
  "created_at": "2023-12-01T10:00:00",
  "updated_at": null
}
```

### 3. Create Tariff Configuration

**POST** `/api/v1/tariff-config/`

Create a new tariff configuration for a vehicle type.

**Request Body:**
```json
{
  "vehicle_type": "suv",
  "one_way_per_km": 15.00,
  "one_way_min_km": 2,
  "round_trip_per_km": 12.00,
  "round_trip_min_km": 4,
  "driver_allowance": 75.00,
  "is_active": true
}
```

**Response (201):**
```json
{
  "config_id": 2,
  "vehicle_type": "suv",
  "one_way_per_km": 15.00,
  "one_way_min_km": 2,
  "round_trip_per_km": 12.00,
  "round_trip_min_km": 4,
  "driver_allowance": 75.00,
  "is_active": true,
  "created_at": "2023-12-01T11:00:00",
  "updated_at": null
}
```

### 4. Update Tariff Configuration

**PUT** `/api/v1/tariff-config/{config_id}`

Update tariff configuration information. Only provided fields will be updated.

**Path Parameters:**
- `config_id` (integer, required): Unique identifier of the tariff configuration

**Request Body:**
```json
{
  "one_way_per_km": 13.00,
  "driver_allowance": 60.00,
  "is_active": false
}
```

**Response (200):**
```json
{
  "config_id": 1,
  "vehicle_type": "sedan",
  "one_way_per_km": 13.00,
  "one_way_min_km": 2,
  "round_trip_per_km": 10.00,
  "round_trip_min_km": 4,
  "driver_allowance": 60.00,
  "is_active": false,
  "created_at": "2023-12-01T10:00:00",
  "updated_at": "2023-12-01T11:30:00"
}
```

### 5. Delete Tariff Configuration

**DELETE** `/api/v1/tariff-config/{config_id}`

Remove a tariff configuration from the system.

**Path Parameters:**
- `config_id` (integer, required): Unique identifier of the tariff configuration

**Response (200):**
```json
{
  "message": "Tariff configuration deleted successfully",
  "config_id": 1
}
```

### 6. Get Tariff Configurations by Vehicle Type

**GET** `/api/v1/tariff-config/vehicle-type/{vehicle_type}`

Retrieve all tariff configurations for a specific vehicle type.

**Path Parameters:**
- `vehicle_type` (string, required): Type of vehicle (sedan, suv, etc.)

**Response (200):**
```json
[
  {
    "config_id": 1,
    "vehicle_type": "sedan",
    "one_way_per_km": 12.00,
    "one_way_min_km": 2,
    "round_trip_per_km": 10.00,
    "round_trip_min_km": 4,
    "driver_allowance": 50.00,
    "is_active": true,
    "created_at": "2023-12-01T10:00:00",
    "updated_at": null
  }
]
```

### 7. Get Active Tariff Configuration

**GET** `/api/v1/tariff-config/active/{vehicle_type}`

Retrieve the active tariff configuration for a specific vehicle type.

**Path Parameters:**
- `vehicle_type` (string, required): Type of vehicle (sedan, suv, etc.)

**Response (200):**
```json
{
  "config_id": 1,
  "vehicle_type": "sedan",
  "one_way_per_km": 12.00,
  "one_way_min_km": 2,
  "round_trip_per_km": 10.00,
  "round_trip_min_km": 4,
  "driver_allowance": 50.00,
  "is_active": true,
  "created_at": "2023-12-01T10:00:00",
  "updated_at": null
}
```

**Error Response (404):**
```json
{
  "detail": "No active tariff configuration found for vehicle type: sedan"
}
```

## Fare Calculation Logic

### One-Way Trip
```
Base Fare = one_way_per_km × MAX(distance_km, one_way_min_km)
Total Fare = Base Fare + driver_allowance
```

### Round Trip
```
Base Fare = round_trip_per_km × MAX(distance_km, round_trip_min_km)
Total Fare = Base Fare + driver_allowance
```

### Examples

**Sedan, One-Way, 15 km:**
- Base Fare: 12.00 × 15 = 180.00
- Total Fare: 180.00 + 50.00 = 230.00

**SUV, Round Trip, 50 km:**
- Base Fare: 12.00 × 50 = 600.00
- Total Fare: 600.00 + 75.00 = 675.00

**Sedan, One-Way, 1 km (minimum):**
- Base Fare: 12.00 × 2 = 24.00 (minimum km applied)
- Total Fare: 24.00 + 50.00 = 74.00

## Vehicle Types

Supported vehicle types:
- `sedan`: Standard sedan cars
- `suv`: Sport Utility Vehicles
- `hatchback`: Hatchback cars
- `bike`: Two-wheeler motorcycles
- `auto`: Three-wheeler auto-rickshaws

## Configuration Rules

- Only one active configuration per vehicle type at a time
- Multiple inactive configurations can exist for historical reference
- All monetary values are stored as decimals for precision
- Minimum kilometer values ensure minimum fare guarantees

## Error Responses

**404 Not Found:**
```json
{
  "detail": "Tariff configuration not found"
}
```

**404 Not Found (Active Config):**
```json
{
  "detail": "No active tariff configuration found for vehicle type: sedan"
}
```

## Notes

- Tariff configurations determine trip pricing automatically
- Active configurations are used for new trip fare calculations
- Historical configurations can be kept for reference and auditing
- Driver allowance is added to all fares regardless of trip type
- Changes to active configurations affect future trip pricing immediately
