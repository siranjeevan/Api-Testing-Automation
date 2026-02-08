import uvicorn
import json
import os
import uuid
from typing import List, Optional, Literal, Dict, Any, Union
from datetime import datetime
from fastapi import FastAPI, HTTPException, Body, Query, Path
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Ride Hailing Automation Test API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
def redirect_to_docs():
    return RedirectResponse(url="/docs")

DB_FILE = "database.json"

# --- Database Utils ---
def load_db():
    if not os.path.exists(DB_FILE):
        return {
            "drivers": [],
            "vehicles": [],
            "tariff_configs": [],
            "trips": [],
            "payments": [],
            "wallet_transactions": [],
            "driver_requests": []
        }
    with open(DB_FILE, "r") as f:
        data = json.load(f)
        for k in ["drivers", "vehicles", "tariff_configs", "trips", "payments", "wallet_transactions", "driver_requests"]:
            if k not in data:
                data[k] = []
        return data

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_next_id(list_data, id_field):
    if not list_data:
        return 1
    return max(item[id_field] for item in list_data) + 1

# ==========================================
# 1. DRIVERS API (/api/drivers)
# ==========================================

class CheckPhoneRequest(BaseModel):
    phone_number: str

class CheckPhoneResponse(BaseModel):
    exists: bool
    status: str
    message: str
    driver_id: Optional[str] = None
    name: Optional[str] = None

class CreateDriverRequest(BaseModel):
    name: str
    phone_number: str
    email: str
    primary_location: str

class CreateDriverResponse(BaseModel):
    driver_id: str
    name: str
    message: str

class Location(BaseModel):
    driver_id: str
    latitude: float
    longitude: float
    driver_name: str
    current_status: str

class DriverResponse(BaseModel):
    driver_id: str
    name: str
    phone_number: str
    email: str
    kyc_verified: str
    primary_location: str
    wallet_balance: float
    fcm_token: Optional[str] = None
    is_available: bool
    is_approved: bool

class UpdateDriverRequest(BaseModel):
    name: Optional[str] = None
    is_available: Optional[bool] = None

@app.post("/api/drivers/check-phone", response_model=CheckPhoneResponse, tags=["Drivers"])
def check_phone_exists(request: CheckPhoneRequest):
    db = load_db()
    driver = next((d for d in db["drivers"] if d["phone_number"] == request.phone_number), None)
    if driver:
        return {
            "exists": True,
            "status": "existing_user",
            "message": "User already exists",
            "driver_id": driver["driver_id"],
            "name": driver["name"]
        }
    else:
        # Implicit failure response structure if not found? 
        # Doc only shows 200 existing user. I'll mock non-existing too.
        return {
             "exists": False,
             "status": "new_user",
             "message": "User does not exist"
        }

@app.get("/api/drivers/", response_model=List[DriverResponse], tags=["Drivers"])
def get_drivers(skip: int = 0, limit: int = 100):
    db = load_db()
    return db["drivers"][skip : skip + limit]

@app.get("/api/drivers/locations", response_model=List[Location], tags=["Drivers"])
def get_driver_locations():
    db = load_db()
    # Mocking location data based on existing drivers
    locations = []
    for d in db["drivers"]:
        if d["is_available"]:
            locations.append({
                "driver_id": d["driver_id"],
                "latitude": 19.0760, # Mock lat
                "longitude": 72.8777, # Mock long
                "driver_name": d["name"],
                "current_status": "AVAILABLE"
            })
    return locations

@app.get("/api/drivers/locations/map", response_model=List[Location], tags=["Drivers"])
def get_driver_locations_map():
    # Helper alias
    return get_driver_locations()

@app.get("/api/drivers/{driver_id}", response_model=DriverResponse, tags=["Drivers"])
def get_driver_by_id(driver_id: str):
    db = load_db()
    driver = next((d for d in db["drivers"] if d["driver_id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@app.post("/api/drivers/", response_model=CreateDriverResponse, status_code=201, tags=["Drivers"])
def create_driver(request: CreateDriverRequest):
    db = load_db()
    
    if any(d["phone_number"] == request.phone_number for d in db["drivers"]):
        raise HTTPException(status_code=400, detail="Phone number already registered")

    new_driver = request.dict()
    new_driver["driver_id"] = str(uuid.uuid4())
    new_driver["kyc_verified"] = "pending" # Default based on doc implying "approved" later
    new_driver["wallet_balance"] = 0.0
    new_driver["is_available"] = True
    new_driver["is_approved"] = False
    new_driver["fcm_token"] = None
    new_driver["created_at"] = datetime.now().isoformat()
    new_driver["updated_at"] = new_driver["created_at"]
    
    db["drivers"].append(new_driver)
    save_db(db)
    
    return {
        "driver_id": new_driver["driver_id"],
        "name": new_driver["name"],
        "message": "Driver created successfully"
    }

@app.put("/api/drivers/{driver_id}", response_model=DriverResponse, tags=["Drivers"])
def update_driver(driver_id: str, request: UpdateDriverRequest):
    db = load_db()
    driver = next((d for d in db["drivers"] if d["driver_id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = request.dict(exclude_unset=True)
    for k, v in update_data.items():
        driver[k] = v
    driver["updated_at"] = datetime.now().isoformat()
    save_db(db)
    return driver

@app.patch("/api/drivers/{driver_id}/availability", tags=["Drivers"])
def update_driver_availability(driver_id: str, is_available: bool = Query(...)):
    db = load_db()
    driver = next((d for d in db["drivers"] if d["driver_id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver["is_available"] = is_available
    save_db(db)
    return {
        "message": "Driver availability updated to " + ("available" if is_available else "unavailable"),
        "driver_id": driver_id,
        "is_available": is_available
    }

@app.patch("/api/drivers/{driver_id}/kyc-status", tags=["Drivers"])
def update_kyc_status(driver_id: str, kyc_status: str = Query(...)):
    db = load_db()
    driver = next((d for d in db["drivers"] if d["driver_id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    if kyc_status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    driver["kyc_verified"] = kyc_status
    save_db(db)
    return {"message": "KYC status updated", "driver_id": driver_id, "kyc_status": kyc_status}

@app.patch("/api/drivers/{driver_id}/approve", tags=["Drivers"])
def approve_driver(driver_id: str, is_approved: bool = Query(...)):
    db = load_db()
    driver = next((d for d in db["drivers"] if d["driver_id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver["is_approved"] = is_approved
    save_db(db)
    return {"message": "Driver approval status updated", "driver_id": driver_id, "is_approved": is_approved}

@app.delete("/api/drivers/{driver_id}", tags=["Drivers"])
def delete_driver(driver_id: str):
    db = load_db()
    initial_len = len(db["drivers"])
    db["drivers"] = [d for d in db["drivers"] if d["driver_id"] != driver_id]
    if len(db["drivers"]) == initial_len:
         raise HTTPException(status_code=404, detail="Driver not found")
    save_db(db)
    return {"message": "Driver deleted successfully", "driver_id": driver_id}


# ==========================================
# 2. VEHICLES API (/api/vehicles)
# ==========================================

class CreateVehicleRequest(BaseModel):
    driver_id: str
    vehicle_type: Literal["sedan", "suv", "hatchback", "bike", "auto"]
    vehicle_brand: str
    vehicle_model: str
    vehicle_number: str
    vehicle_color: str
    seating_capacity: int
    rc_expiry_date: str

class CreateVehicleResponse(BaseModel):
    vehicle_id: str
    driver_id: str
    vehicle_number: str
    message: str

class VehicleResponse(BaseModel):
    vehicle_id: str
    driver_id: str
    vehicle_type: str
    vehicle_brand: str
    vehicle_model: str
    vehicle_number: str
    vehicle_approved: bool
    vehicle_color: Optional[str] = None
    seating_capacity: Optional[int] = None
    rc_expiry_date: Optional[str] = None

class UpdateVehicleRequest(BaseModel):
    vehicle_color: Optional[str] = None
    seating_capacity: Optional[int] = None

@app.get("/api/vehicles/", response_model=List[VehicleResponse], tags=["Vehicles"])
def get_vehicles(skip: int = 0, limit: int = 100):
    db = load_db()
    return db["vehicles"][skip : skip + limit]

@app.get("/api/vehicles/{vehicle_id}", response_model=VehicleResponse, tags=["Vehicles"])
def get_vehicle(vehicle_id: str):
    db = load_db()
    vehicle = next((v for v in db["vehicles"] if v["vehicle_id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@app.get("/api/vehicles/driver/{driver_id}", response_model=List[VehicleResponse], tags=["Vehicles"])
def get_vehicles_by_driver(driver_id: str):
    db = load_db()
    return [v for v in db["vehicles"] if v["driver_id"] == driver_id]

@app.post("/api/vehicles/", response_model=CreateVehicleResponse, status_code=201, tags=["Vehicles"])
def create_vehicle(request: CreateVehicleRequest):
    db = load_db()
    if any(v["vehicle_number"] == request.vehicle_number for v in db["vehicles"]):
        raise HTTPException(status_code=400, detail="Vehicle number already registered")
    
    if not any(d["driver_id"] == request.driver_id for d in db["drivers"]):
        raise HTTPException(status_code=404, detail="Driver not found")

    new_vehicle = request.dict()
    new_vehicle["vehicle_id"] = str(uuid.uuid4())
    new_vehicle["vehicle_approved"] = False
    new_vehicle["created_at"] = datetime.now().isoformat()
    new_vehicle["updated_at"] = new_vehicle["created_at"]
    
    db["vehicles"].append(new_vehicle)
    save_db(db)
    
    return {
        "vehicle_id": new_vehicle["vehicle_id"],
        "driver_id": new_vehicle["driver_id"],
        "vehicle_number": new_vehicle["vehicle_number"],
        "message": "Vehicle created successfully"
    }

@app.put("/api/vehicles/{vehicle_id}", tags=["Vehicles"])
def update_vehicle(vehicle_id: str, request: UpdateVehicleRequest):
    db = load_db()
    vehicle = next((v for v in db["vehicles"] if v["vehicle_id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = request.dict(exclude_unset=True)
    for k, v in update_data.items():
        vehicle[k] = v
    vehicle["updated_at"] = datetime.now().isoformat()
    save_db(db)
    return {"vehicle_id": vehicle_id, "message": "Vehicle updated successfully"}

@app.patch("/api/vehicles/{vehicle_id}/approve", tags=["Vehicles"])
def approve_vehicle(vehicle_id: str, is_approved: bool = Query(...)):
    db = load_db()
    vehicle = next((v for v in db["vehicles"] if v["vehicle_id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle["vehicle_approved"] = is_approved
    save_db(db)
    return {
        "message": "Vehicle approval status updated", 
        "vehicle_id": vehicle_id, 
        "vehicle_number": vehicle["vehicle_number"], 
        "approved": is_approved
    }

@app.delete("/api/vehicles/{vehicle_id}", tags=["Vehicles"])
def delete_vehicle(vehicle_id: str):
    db = load_db()
    initial_len = len(db["vehicles"])
    db["vehicles"] = [v for v in db["vehicles"] if v["vehicle_id"] != vehicle_id]
    if len(db["vehicles"]) == initial_len:
         raise HTTPException(status_code=404, detail="Vehicle not found")
    save_db(db)
    return {"message": "Vehicle deleted successfully", "vehicle_id": vehicle_id}


# ==========================================
# 3. TRIPS API (/api/trips)
# ==========================================

class CreateTripRequest(BaseModel):
    customer_name: str
    customer_phone: str
    pickup_address: str
    drop_address: str
    trip_type: Literal["one_way", "round_trip"]
    vehicle_type: Literal["sedan", "suv", "hatchback", "bike", "auto"]
    passenger_count: int
    planned_start_at: str

class CreateTripResponse(BaseModel):
    trip_id: str
    customer_name: str
    trip_status: str
    message: str

class DriverInfo(BaseModel):
    driver_id: str
    name: str 
    phone_number: str
    is_available: bool

class TripResponse(BaseModel):
    trip_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    pickup_address: str
    drop_address: str
    trip_type: Optional[str] = None
    vehicle_type: Optional[str] = None
    trip_status: str
    assigned_driver_id: Optional[str] = None
    fare: Optional[float] = None
    total_amount: Optional[float] = None
    created_at: Optional[str] = None
    distance_km: Optional[float] = None
    waiting_charges: Optional[float] = None
    driver: Optional[DriverInfo] = None

class UpdateTripRequest(BaseModel):
    trip_status: Optional[str] = None
    fare: Optional[float] = None
    waiting_charges: Optional[float] = None

@app.get("/api/trips/available", response_model=List[TripResponse], tags=["Trips"])
def get_available_trips():
    db = load_db()
    return [t for t in db["trips"] if t["trip_status"] == "OPEN"]

@app.get("/api/trips/", response_model=List[TripResponse], tags=["Trips"])
def get_trips(skip: int = 0, limit: int = 100, status_filter: Optional[str] = None):
    db = load_db()
    trips = db["trips"]
    if status_filter:
        trips = [t for t in trips if t["trip_status"] == status_filter]
    return trips[skip : skip + limit]

@app.get("/api/trips/{trip_id}", response_model=TripResponse, tags=["Trips"])
def get_trip_by_id(trip_id: str):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Enrich with driver info if assigned
    if trip.get("assigned_driver_id"):
        driver = next((d for d in db["drivers"] if d["driver_id"] == trip["assigned_driver_id"]), None)
        if driver:
            trip["driver"] = {
                "driver_id": driver["driver_id"],
                "name": driver["name"],
                "phone_number": driver["phone_number"],
                "is_available": driver["is_available"]
            }
            
    return trip

@app.post("/api/trips/", response_model=CreateTripResponse, status_code=201, tags=["Trips"])
def create_trip(request: CreateTripRequest):
    db = load_db()
    # Fare estimation
    tariff = next((t for t in db["tariff_configs"] if t["vehicle_type"] == request.vehicle_type and t["is_active"]), None)
    estimated_fare = 100.0 
    if tariff:
        dist = 10 # Default dummy distance
        per_km = tariff["one_way_per_km"] if request.trip_type == "one_way" else tariff["round_trip_per_km"]
        estimated_fare = (per_km * dist) + tariff["driver_allowance"]
    
    new_trip = request.dict()
    new_trip["trip_id"] = str(uuid.uuid4())
    new_trip["fare"] = estimated_fare
    new_trip["trip_status"] = "OPEN"
    new_trip["created_at"] = datetime.now().isoformat()
    new_trip["assigned_driver_id"] = None
    
    db["trips"].append(new_trip)
    save_db(db)
    
    return {
        "trip_id": new_trip["trip_id"],
        "customer_name": new_trip["customer_name"],
        "trip_status": new_trip["trip_status"],
        "message": "Trip created successfully"
    }

@app.put("/api/trips/{trip_id}", tags=["Trips"])
def update_trip(trip_id: str, request: UpdateTripRequest):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_data = request.dict(exclude_unset=True)
    for k, v in update_data.items():
        trip[k] = v
    save_db(db)
    return trip

@app.patch("/api/trips/{trip_id}/assign-driver/{driver_id}", tags=["Trips"])
def assign_driver(trip_id: str, driver_id: str):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    driver = next((d for d in db["drivers"] if d["driver_id"] == driver_id), None)
    if not driver:
         raise HTTPException(status_code=404, detail="Driver not found")
         
    trip["assigned_driver_id"] = driver_id
    trip["trip_status"] = "ASSIGNED"
    driver["is_available"] = False
    
    save_db(db)
    return {
        "message": "Driver assigned successfully",
        "trip_id": trip_id,
        "driver_id": driver_id,
        "trip_status": "ASSIGNED"
    }

@app.patch("/api/trips/{trip_id}/unassign", tags=["Trips"])
def unassign_driver(trip_id: str):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    prev_driver_id = trip.get("assigned_driver_id")
    if prev_driver_id:
        driver = next((d for d in db["drivers"] if d["driver_id"] == prev_driver_id), None)
        if driver:
            driver["is_available"] = True
            
    trip["assigned_driver_id"] = None
    trip["trip_status"] = "OPEN"
    save_db(db)
    return {
        "message": "Driver unassigned successfully",
        "trip_id": trip_id,
        "previous_driver_id": prev_driver_id,
        "trip_status": "OPEN"
    }

@app.patch("/api/trips/{trip_id}/status", tags=["Trips"])
def update_trip_status(trip_id: str, new_status: str = Query(...)):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip["trip_status"] = new_status
    
    if new_status in ["COMPLETED", "CANCELLED"] and trip.get("assigned_driver_id"):
        driver = next((d for d in db["drivers"] if d["driver_id"] == trip["assigned_driver_id"]), None)
        if driver:
            driver["is_available"] = True
            
    save_db(db)
    return {
        "message": f"Trip status updated to {new_status}",
        "trip_id": trip_id,
        "trip_status": new_status,
        "fare": trip.get("fare")
    }

@app.patch("/api/trips/{trip_id}/odometer/start", tags=["Trips"])
def update_odometer_start(trip_id: str, odo_start: int = Query(...)):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip["odo_start"] = odo_start
    trip["trip_status"] = "STARTED"
    save_db(db)
    return {
        "message": "Odometer start updated",
        "trip_id": trip_id,
        "odo_start": odo_start,
        "trip_status": "STARTED"
    }

@app.patch("/api/trips/{trip_id}/odometer/end", tags=["Trips"])
def update_odometer_end(trip_id: str, odo_end: int = Query(...)):
    db = load_db()
    trip = next((t for t in db["trips"] if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip["odo_end"] = odo_end
    trip["trip_status"] = "COMPLETED"
    
    # Make driver available
    if trip.get("assigned_driver_id"):
        driver = next((d for d in db["drivers"] if d["driver_id"] == trip["assigned_driver_id"]), None)
        if driver:
            driver["is_available"] = True
            
    # Mock totals
    trip["total_amount"] = (trip.get("fare") or 0) + 50 # Adding random charges
    
    save_db(db)
    return {
        "message": "Trip completed successfully",
        "trip_id": trip_id,
        "odo_end": odo_end,
        "fare": trip.get("fare"),
        "total_amount": trip.get("total_amount"),
        "trip_status": "COMPLETED",
        "commission_deducted": 50.00
    }

@app.delete("/api/trips/{trip_id}", tags=["Trips"])
def delete_trip(trip_id: str):
    db = load_db()
    initial_len = len(db["trips"])
    db["trips"] = [t for t in db["trips"] if t["trip_id"] != trip_id]
    if len(db["trips"]) == initial_len:
         raise HTTPException(status_code=404, detail="Trip not found")
    save_db(db)
    return {"message": "Trip deleted successfully", "trip_id": trip_id}


# ==========================================
# 4. PAYMENTS API (/api/payments)
# ==========================================

class CreatePaymentRequest(BaseModel):
    driver_id: str
    amount: float
    transaction_type: Literal["CREDIT", "DEBIT"]
    status: Literal["PENDING", "COMPLETED", "FAILED"]
    razorpay_payment_id: str

class PaymentResponse(BaseModel):
    payment_id: str
    driver_id: Optional[str] = None
    amount: float
    transaction_type: Optional[str] = None
    status: str
    razorpay_payment_id: Optional[str] = None
    created_at: Optional[str] = None

class UpdatePaymentRequest(BaseModel):
    pass # Doc has generic "Update payment info" but no body spec. Assuming status or typical fields.

@app.get("/api/payments/", response_model=List[PaymentResponse], tags=["Payments"])
def get_payments(skip: int = 0, limit: int = 100):
    db = load_db()
    return db["payments"][skip : skip + limit]

@app.get("/api/payments/{payment_id}", response_model=PaymentResponse, tags=["Payments"])
def get_payment(payment_id: str):
    db = load_db()
    payment = next((p for p in db["payments"] if p["payment_id"] == payment_id), None)
    if not payment:
         raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@app.post("/api/payments/", response_model=PaymentResponse, status_code=201, tags=["Payments"])
def create_payment(request: CreatePaymentRequest):
    db = load_db()
    new_payment = request.dict()
    new_payment["payment_id"] = str(uuid.uuid4())
    new_payment["created_at"] = datetime.now().isoformat()
    
    db["payments"].append(new_payment)
    save_db(db)
    return new_payment

@app.delete("/api/payments/{payment_id}", tags=["Payments"])
def delete_payment(payment_id: str):
    db = load_db()
    initial_len = len(db["payments"])
    db["payments"] = [p for p in db["payments"] if p["payment_id"] != payment_id]
    if len(db["payments"]) == initial_len:
         raise HTTPException(status_code=404, detail="Payment not found")
    save_db(db)
    return {"message": "Payment deleted successfully", "payment_id": payment_id}


# ==========================================
# 5. WALLET TRANSACTIONS API (/api/v1/wallet-transactions)
# ==========================================
# NOTE: User docs maintained 'v1' here specifically.

class CreateWalletTxnRequest(BaseModel):
    driver_id: int # Doc says integer here!
    transaction_type: Literal["credit", "debit"]
    amount: float
    description: str
    reference_id: str

class WalletTxnResponse(BaseModel):
    transaction_id: int
    driver_id: int
    transaction_type: str
    amount: float
    description: str
    reference_id: str
    created_at: str
    updated_at: Optional[str] = None

class UpdateWalletTxnRequest(BaseModel):
    description: Optional[str] = None
    reference_id: Optional[str] = None

@app.get("/api/v1/wallet-transactions", response_model=List[WalletTxnResponse], tags=["Wallet Transactions"])
def get_all_transactions(skip: int = 0, limit: int = 100):
    db = load_db()
    return db["wallet_transactions"][skip : skip + limit]

@app.get("/api/v1/wallet-transactions/{transaction_id}", response_model=WalletTxnResponse, tags=["Wallet Transactions"])
def get_transaction(transaction_id: int):
    db = load_db()
    txn = next((t for t in db["wallet_transactions"] if t["transaction_id"] == transaction_id), None)
    if not txn:
        raise HTTPException(status_code=404, detail="Wallet transaction not found")
    return txn

@app.post("/api/v1/wallet-transactions", response_model=WalletTxnResponse, status_code=201, tags=["Wallet Transactions"])
def create_transaction(request: CreateWalletTxnRequest):
    db = load_db()
    
    # Try to find driver. CAREFUL: Driver ID in main system is UUID String.
    # Wallet System uses INT ID in docs.
    # If the user strictly follows the docs, they will send an INT ID.
    # But our drivers have STRING UUIDs.
    # I will allow the transaction to proceed by casting or just storing the ID as provided.
    # However, balance update logic will FAIL if IDs don't match.
    # I'll check if any driver has this ID (maybe cast string to int if digits?)
    # Or just skip balance update if driver not found, to be safe for Mocking.
    
    # For robust testing: "Driver wallet balances are maintained in the drivers table"
    # So I *attempt* to find a driver.
    found_driver = None
    for d in db["drivers"]:
        # Loose match logic
        if str(d["driver_id"]) == str(request.driver_id):
            found_driver = d
            break
            
    if found_driver:
        current = found_driver.get("wallet_balance", 0.0)
        if request.transaction_type == "debit":
            if current < request.amount:
                 raise HTTPException(status_code=400, detail="Insufficient wallet balance")
            found_driver["wallet_balance"] = current - request.amount
        else:
            found_driver["wallet_balance"] = current + request.amount

    new_txn = request.dict()
    new_txn["transaction_id"] = get_next_id(db["wallet_transactions"], "transaction_id")
    new_txn["created_at"] = datetime.now().isoformat()
    new_txn["updated_at"] = None
    
    db["wallet_transactions"].append(new_txn)
    save_db(db)
    return new_txn

@app.put("/api/v1/wallet-transactions/{transaction_id}", response_model=WalletTxnResponse, tags=["Wallet Transactions"])
def update_transaction(transaction_id: int, request: UpdateWalletTxnRequest):
    db = load_db()
    txn = next((t for t in db["wallet_transactions"] if t["transaction_id"] == transaction_id), None)
    if not txn:
        raise HTTPException(status_code=404, detail="Wallet transaction not found")
        
    if request.description: txn["description"] = request.description
    if request.reference_id: txn["reference_id"] = request.reference_id
        
    txn["updated_at"] = datetime.now().isoformat()
    save_db(db)
    return txn

@app.delete("/api/v1/wallet-transactions/{transaction_id}", tags=["Wallet Transactions"])
def delete_transaction(transaction_id: int):
    db = load_db()
    initial_len = len(db["wallet_transactions"])
    db["wallet_transactions"] = [t for t in db["wallet_transactions"] if t["transaction_id"] != transaction_id]
    
    if len(db["wallet_transactions"]) == initial_len:
        raise HTTPException(status_code=404, detail="Wallet transaction not found")
    save_db(db)
    return {"message": "Wallet transaction deleted successfully", "transaction_id": transaction_id}


# ==========================================
# 6. TARIFF CONFIG API (/api/v1/tariff-config)
# ==========================================

class TariffConfig(BaseModel):
    config_id: Optional[int] = None
    vehicle_type: Literal["sedan", "suv", "hatchback", "bike", "auto"]
    one_way_per_km: float
    one_way_min_km: float
    round_trip_per_km: float
    round_trip_min_km: float
    driver_allowance: float
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@app.get("/api/v1/tariff-config/", response_model=List[TariffConfig], tags=["Tariff Config"])
def get_tariffs(skip: int = 0, limit: int = 100):
    db = load_db()
    return db["tariff_configs"][skip : skip + limit]

@app.post("/api/v1/tariff-config/", response_model=TariffConfig, status_code=201, tags=["Tariff Config"])
def create_tariff(tariff: TariffConfig):
    db = load_db()
    new_tariff = tariff.dict()
    new_tariff["config_id"] = get_next_id(db["tariff_configs"], "config_id")
    new_tariff["created_at"] = datetime.now().isoformat()
    db["tariff_configs"].append(new_tariff)
    save_db(db)
    return new_tariff


if __name__ == "__main__":
    if not os.path.exists(DB_FILE):
        save_db({
            "drivers": [], "vehicles": [], "tariff_configs": [], 
            "trips": [], "payments": [], "wallet_transactions": [], "driver_requests": []
        })
    uvicorn.run(app, host="0.0.0.0", port=8001)
