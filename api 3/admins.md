# Admin API Documentation

## Overview

The Admin API handles administrative tasks such as creating and managing admin accounts.

## Base URL
```
/api/admins
```

## Endpoints

### 1. Get All Admins

**GET** `/api/admins/`

Get all admins (SUPER_ADMIN only).

**Query Parameters:**
- `skip` (integer, optional): Number of records to skip (default: 0)
- `limit` (integer, optional): Maximum number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "admin_id": "admin-uuid",
    "name": "Super Admin",
    "phone_number": "9876543210",
    "role": "SUPER_ADMIN",
    "is_active": true,
    "created_at": "2023-12-01T10:00:00"
  }
]
```

### 2. Get Admin by ID

**GET** `/api/admins/{admin_id}`

Get admin by ID.

**Path Parameters:**
- `admin_id` (string, required): Unique identifier of the admin

**Response (200):**
```json
{
  "admin_id": "admin-uuid",
  "name": "Admin Name",
  "phone_number": "9876543210",
  "role": "ADMIN",
  "is_active": true
}
```

### 3. Create Admin

**POST** `/api/admins/`

Create new admin (SUPER_ADMIN only).

**Request Body:**
```json
{
  "name": "New Admin",
  "phone_number": "9876543211",
  "role": "ADMIN",
  "password": "securepassword",
  ...
}
```

**Response (201):**
```json
{
  "admin_id": "admin-uuid",
  "name": "New Admin",
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2023-12-01T10:00:00"
}
```

### 4. Update Admin

**PATCH** `/api/admins/{admin_id}`

Update admin details.

**Path Parameters:**
- `admin_id` (string, required): Unique identifier of the admin

**Request Body:**
```json
{
  "role": "SUPER_ADMIN",
  "is_active": false
}
```

**Response (200):**
```json
{
  "admin_id": "admin-uuid",
  "message": "Admin updated successfully",
  "updated_at": "2023-12-01T10:00:00"
}
```

### 5. Delete Admin

**DELETE** `/api/admins/{admin_id}`

Delete admin (SUPER_ADMIN only).

**Path Parameters:**
- `admin_id` (string, required): Unique identifier of the admin

**Response (200):**
```json
{
  "message": "Admin deleted successfully",
  "admin_id": "admin-uuid"
}
```

### 6. Get Admin by Phone

**GET** `/api/admins/phone/{phone_number}`

Get admin by phone number.

**Path Parameters:**
- `phone_number` (integer, required): Phone number of the admin

**Response (200):**
```json
{
  "admin_id": "admin-uuid",
  "name": "Admin Name",
  "phone_number": "9876543210",
  "role": "ADMIN"
}
```
