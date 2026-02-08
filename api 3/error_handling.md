# Error Handling API Documentation

## Overview

The Error Handling API manages predefined error codes and driver document review processes. It provides endpoints for admins to review driver documents, assign errors, and for drivers to view their assigned errors.

## Base URL
```
/api/errors
```

## Error Code Categories

### Document Errors (1000-1999)
- **1001**: Driving licence is blurry or unclear
- **1002**: Driving licence has expired
- **1003**: Driving licence information doesn't match profile
- **1004**: Aadhar card is blurry or unclear
- **1005**: Aadhar card information doesn't match profile
- **1006**: Profile photo is not clear
- **1007**: RC book is blurry or unclear
- **1008**: RC book has expired
- **1009**: FC certificate is blurry or unclear
- **1010**: FC certificate has expired
- **1011**: Vehicle photos are not clear
- **1012**: Wrong document uploaded

### Profile Errors (2000-2999)
- **2001**: Phone number verification required
- **2002**: Email verification required
- **2003**: Complete profile information required

### Vehicle Errors (3000-3999)
- **3001**: Vehicle registration number mismatch
- **3002**: Vehicle type not supported
- **3003**: Vehicle condition not acceptable

---

## API Endpoints

### 1. Get All Error Logs
**GET** `/api/errors/`

Retrieve all error logs with pagination.

**Query Parameters**:
- `skip` (int, optional): Number of records to skip (default: 0)
- `limit` (int, optional): Maximum records to return (default: 100)

**Response**:
```json
[
  {
    "error_id": "uuid-string",
    "error_code": 1001,
    "error_type": "DOCUMENT",
    "error_description": "Driving licence is blurry or unclear",
    ...
  }
]
```

### 2. Get Predefined Errors
**GET** `/api/errors/predefined-errors`

Get all predefined errors for admin checkbox selection.

**Response**:
```json
{
  "errors": [
    {
      "error_code": 1001,
      "error_type": "DOCUMENT",
      "error_description": "Driving licence is blurry or unclear"
    },
    ...
  ]
}
```

### 3. Get Error by ID
**GET** `/api/errors/{error_id}`

Get specific error log by ID.

**Path Parameters**:
- `error_id` (string): UUID of the error log

### 4. Create Error Log
**POST** `/api/errors/`

Create a new error log.

**Request Body**:
```json
{
  "error_code": 4001,
  "error_type": "CUSTOM",
  "error_description": "Custom error description"
}
```

### 5. Review Driver Documents
**POST** `/api/errors/review-driver-documents`

Admin reviews driver documents and approves/rejects with error assignment.

**Request Body (Query Parameters used in some implementations, checks logic):**
The code consumes a JSON body typically, but let's verify `routers/error_handling.py`.
`def review_driver_documents(..., action: str, ...)` -> These are Query parameters in FastAPI unless `Body()` is specified.
The code: 
```python
def review_driver_documents(
    driver_id: str,
    action: str,
    selected_error_codes: List[int] = None,
    db: Session = Depends(get_db)
):
```
These are QUERY PARAMETERS. `selected_error_codes` as a list in query params: `?selected_error_codes=1001&selected_error_codes=1002`.

**Query Parameters**:
- `driver_id` (string, required)
- `action` (string, required): `approve` or `reject`
- `selected_error_codes` (list of int, optional): Required if action is reject

**Response**:
```json
{
  "message": "Driver John Doe approved successfully",
  "driver_id": "driver-uuid",
  "status": "approved"
}
```

### 6. Assign Errors to Driver
**POST** `/api/errors/assign-errors-to-driver`

**Query Parameters**:
- `driver_id` (string, required)
- `error_codes` (list of int, required)

### 7. Get Driver Errors
**GET** `/api/errors/driver/{driver_id}`

Get all errors assigned to a specific driver.

**Path Parameters**:
- `driver_id` (string): UUID of the driver

**Response**:
```json
{
  "driver_id": "driver-uuid",
  "has_errors": true,
  "errors": [...]
}
```

### 8. Remove Error from Driver
**DELETE** `/api/errors/remove-from-driver`

Admin removes specific error from driver.

**Query Parameters**:
- `driver_id` (string, required)
- `error_code` (integer, required)

### 9. Delete Error Log
**DELETE** `/api/errors/{error_id}`

Delete an error log.

**Path Parameters**:
- `error_id` (string): UUID of the error log