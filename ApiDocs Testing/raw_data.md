# Raw Data API Documentation

## Overview

The Raw Data API provides direct database access endpoints that bypass Pydantic validation, useful for administrative tasks, data export, and debugging.

## Base URL
```
/api/v1/raw
```

## Endpoints

### 1. Get Raw Drivers Data

**GET** `/api/v1/raw/drivers`

Retrieve raw driver data directly from the database (limited to 10 records).

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
    "wallet_balance": 1500.5,
    "is_available": true,
    "is_approved": true
  }
]
```

### 2. Get Raw Vehicles Data

**GET** `/api/v1/raw/vehicles`

Retrieve raw vehicle data directly from the database (limited to 10 records).

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

### 3. Get Raw Trips Data

**GET** `/api/v1/raw/trips`

Retrieve raw trip data directly from the database (limited to 10 records).

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
    "trip_status": "completed"
  }
]
```

## Important Notes

### ⚠️ Security Considerations

- **Admin Only**: These endpoints should only be accessible to administrators
- **No Validation**: Data is returned directly from database without Pydantic validation
- **Limited Results**: All endpoints return maximum 10 records for performance
- **Raw Access**: Bypasses business logic and data transformation

### Use Cases

- **Data Export**: Quick data dumps for analysis
- **Debugging**: Inspecting raw database state
- **Migration**: Data verification during system updates
- **Reporting**: Administrative reporting without complex joins

### Data Format

Raw data endpoints return data in a simplified format:
- Decimal values are converted to floats
- UUIDs are returned as strings
- Timestamps are in ISO format
- Only essential fields are included

### Performance

- All queries include `LIMIT 10` to prevent large data dumps
- No complex joins or aggregations
- Direct SQL execution for speed

### Error Handling

These endpoints have minimal error handling:
- Database connection errors will return 500
- No validation of input parameters
- No business rule enforcement

## Recommendations

1. **Restrict Access**: Use authentication and authorization to limit access to admin users only
2. **Monitor Usage**: Log access to these endpoints for audit purposes
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Alternative APIs**: Prefer validated APIs for production application use

## Comparison with Standard APIs

| Aspect | Raw Data API | Standard APIs |
|--------|-------------|---------------|
| Validation | None | Pydantic schemas |
| Performance | Fast | Moderate (with validation) |
| Security | Low | High (with auth/validation) |
| Data Format | Simplified | Structured |
| Error Handling | Minimal | Comprehensive |
| Use Case | Admin/Debug | Production apps |
