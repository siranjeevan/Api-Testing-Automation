# Analytics API Documentation

## Overview

The Analytics API provides statistical data and revenue reports for the admin dashboard.

## Base URL
```
/api/analytics
```

## Endpoints

### 1. Get Dashboard Summary

**GET** `/api/analytics/dashboard`

Get dashboard summary statistics (total revenue, trips, active drivers, etc.).

**Response (200):**
```json
{
  "total_revenue": 10000.00,
  "today_revenue": 200.00,
  "total_trips": 150,
  "today_trips": 5,
  "active_drivers": 10,
  "total_drivers": 20,
  "completed_trips": 130,
  "cancelled_trips": 10,
  "assigned_trips": 5,
  "pending_trips": 2,
  "in_progress_trips": 3
}
```

### 2. Get Monthly Revenue

**GET** `/api/analytics/revenue/monthly`

Get monthly revenue breakdown for a specific year.

**Query Parameters:**
- `year` (integer, required): Year for monthly revenue breakdown (e.g., 2023)

**Response (200):**
```json
{
  "year": 2023,
  "monthly_revenue": [
    {
      "month": 1,
      "month_name": "January",
      "revenue": 5000.00,
      "trips": 50
    },
    ...
  ],
  "total_year_revenue": 60000.00,
  "total_year_trips": 600
}
```

### 3. Get Revenue by Vehicle Type

**GET** `/api/analytics/revenue/vehicle-type`

Get revenue breakdown by vehicle type.

**Query Parameters:**
- `year` (integer, optional): Year filter (optional)

**Response (200):**
```json
{
  "vehicle_revenue": [
    {
      "vehicle_type": "Sedan",
      "revenue": 30000.00,
      "trips": 300,
      "percentage": 50.0
    },
    ...
  ],
  "total_revenue": 60000.00
}
```

### 4. Get 12 Months Revenue

**GET** `/api/analytics/revenue/12-months`

Get revenue for the last 12 months from current date.

**Response (200):**
```json
{
  "period": "Last 12 Months",
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "total_revenue": 60000.00,
  "total_trips": 600,
  "monthly_data": [
    ...
  ]
}
```

### 5. Get Revenue by Date Range

**GET** `/api/analytics/revenue/range`

Get revenue for a specific date range.

**Query Parameters:**
- `start_date` (string, required): Start date (YYYY-MM-DD)
- `end_date` (string, required): End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "start_date": "2023-12-01",
  "end_date": "2023-12-31",
  "total_revenue": 5000.00,
  "total_trips": 50,
  "daily_breakdown": [
    {
      "date": "2023-12-01",
      "revenue": 200.00,
      "trips": 2
    },
    ...
  ]
}
```
