# File Upload API Documentation

## Overview

The File Upload API handles KYC documents and photos for drivers and vehicles. Files are stored on Hostinger and URLs are saved to the database.

## Base URL
```
/api/v1/uploads
```

## Configuration

Add to your `.env` file:
```env
UPLOAD_DIR=/home/username/public_html/uploads
BASE_URL=https://yourdomain.com/uploads
```

## Supported File Types
- Images: `.jpg`, `.jpeg`, `.png`
- Documents: `.pdf`

## Driver Endpoints

### 1. Upload Driver Photo

**POST** `/api/v1/uploads/driver/{driver_id}/photo`

Upload driver profile photo.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response (200):**
```json
{
  "photo_url": "https://yourdomain.com/uploads/drivers/photos/20240101_120000_photo.jpg"
}
```

### 2. Upload Aadhar Card

**POST** `/api/v1/uploads/driver/{driver_id}/aadhar`

Upload driver Aadhar card document.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image/pdf file)

**Response (200):**
```json
{
  "aadhar_url": "https://yourdomain.com/uploads/drivers/aadhar/20240101_120000_aadhar.pdf"
}
```

### 3. Upload Driving Licence

**POST** `/api/v1/uploads/driver/{driver_id}/licence`

Upload driver's licence document.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image/pdf file)

**Response (200):**
```json
{
  "licence_url": "https://yourdomain.com/uploads/drivers/licence/20240101_120000_licence.pdf"
}
```

## Vehicle Endpoints

### 4. Upload RC Book

**POST** `/api/v1/uploads/vehicle/{vehicle_id}/rc`

Upload vehicle RC book document.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image/pdf file)

**Response (200):**
```json
{
  "rc_book_url": "https://yourdomain.com/uploads/vehicles/rc/20240101_120000_rc.pdf"
}
```

### 5. Upload FC Certificate

**POST** `/api/v1/uploads/vehicle/{vehicle_id}/fc`

Upload vehicle fitness certificate.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image/pdf file)

**Response (200):**
```json
{
  "fc_certificate_url": "https://yourdomain.com/uploads/vehicles/fc/20240101_120000_fc.pdf"
}
```

### 6. Upload Vehicle Photos

**POST** `/api/v1/uploads/vehicle/{vehicle_id}/photo/{position}`

Upload vehicle photos from different angles.

**Path Parameters:**
- `position`: `front`, `back`, `left`, or `right`

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response (200):**
```json
{
  "vehicle_front_url": "https://yourdomain.com/uploads/vehicles/front/20240101_120000_car.jpg"
}
```

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid file type"
}
```

**404 Not Found:**
```json
{
  "detail": "Driver not found"
}
```

## Testing with Postman

### Upload Driver Photo
```
POST http://localhost:8000/api/v1/uploads/driver/DRV001/photo
Body: form-data
  - Key: file
  - Type: File
  - Value: [Select image file]
```

### Upload Aadhar
```
POST http://localhost:8000/api/v1/uploads/driver/DRV001/aadhar
Body: form-data
  - Key: file
  - Type: File
  - Value: [Select PDF/image file]
```

## Hostinger Setup

### 1. Create Upload Directory
```bash
mkdir -p /home/username/public_html/uploads/drivers/{photos,aadhar,licence}
mkdir -p /home/username/public_html/uploads/vehicles/{rc,fc,front,back,left,right}
chmod -R 755 /home/username/public_html/uploads
```

### 2. Update .env
```env
UPLOAD_DIR=/home/username/public_html/uploads
BASE_URL=https://yourdomain.com/uploads
```

### 3. Verify Permissions
```bash
# Ensure web server can write to uploads directory
chown -R username:username /home/username/public_html/uploads
```

## Notes

- Files are automatically timestamped to prevent overwrites
- URLs are saved to database immediately after upload
- Maximum file size depends on your server configuration
- Ensure proper permissions on upload directory
