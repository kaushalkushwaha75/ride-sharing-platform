# models.py
"""Data models for the Empty Vehicle Space Sharing platform.
Using pydantic for validation, schema enforcement, and serialization.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
import uuid


class DriverOffer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = Field(default_factory=lambda: f"off-{str(uuid.uuid4())[:6]}")
    driver_id: Optional[str] = None
    driver_name: str = Field(default="", description="Driver full name or ID")
    driver_phone: Optional[str] = Field("9876543210", description="Contact phone number")
    origin: str = Field(..., description="Departure city / location")
    destination: str = Field(..., description="Destination city / location")
    waypoints: Optional[str] = Field("", description="Comma-separated intermediate stops, e.g. 'Agra, Kanpur'")
    route: Optional[str] = Field(None, description="Formatted route string 'Origin->Dest'")
    seats_available: int = Field(..., ge=1, le=10, description="Available seats")
    total_seats: Optional[int] = Field(4, ge=1, le=10, description="Total passenger capacity")
    departure_time: datetime = Field(..., description="Planned departure time (ISO-8601)")
    price_per_km: float = Field(8.0, ge=1.0, description="Price per passenger per km in INR")
    vehicle_type: Optional[str] = Field("Sedan", description="Vehicle type: Sedan, SUV, Hatchback, EV, Van")
    vehicle_model: Optional[str] = Field("Swift Dzire", description="Vehicle make and model")
    vehicle_number: Optional[str] = Field("UP32-AB-1234", description="Vehicle registration number")
    ac_available: Optional[bool] = Field(True, description="Whether AC is available")
    luggage_allowed: Optional[str] = Field("Medium", description="Allowed luggage: Small, Medium, Large")
    pet_friendly: Optional[bool] = Field(False, description="Whether pets are allowed")
    notes: Optional[str] = Field("", description="Additional notes or pickup instructions")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "driver_id": self.driver_id or self.driver_name,
            "driver_name": self.driver_name,
            "driver_phone": self.driver_phone,
            "origin": self.origin,
            "destination": self.destination,
            "waypoints": self.waypoints,
            "route": self.route or f"{self.origin}->{self.destination}",
            "seats_available": self.seats_available,
            "total_seats": self.total_seats,
            "departure_time": self.departure_time.isoformat() if isinstance(self.departure_time, datetime) else str(self.departure_time),
            "price_per_km": self.price_per_km,
            "vehicle_type": self.vehicle_type,
            "vehicle_model": self.vehicle_model,
            "vehicle_number": self.vehicle_number,
            "ac_available": self.ac_available,
            "luggage_allowed": self.luggage_allowed,
            "pet_friendly": self.pet_friendly,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
        }

    # Backward compatibility
    dict = to_dict


class PassengerRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = Field(default_factory=lambda: f"req-{str(uuid.uuid4())[:6]}")
    passenger_id: Optional[str] = None
    passenger_name: str = Field(default="", description="Passenger full name or ID")
    passenger_phone: Optional[str] = Field("9876543210", description="Passenger phone number")
    origin: str = Field("Any", description="Pickup city")
    destination: str = Field(..., description="Desired destination city")
    earliest_departure: datetime = Field(..., description="Earliest acceptable departure time")
    latest_departure: datetime = Field(..., description="Latest acceptable departure time")
    seats_needed: int = Field(1, ge=1, le=10, description="Number of seats required")
    max_price_per_km: Optional[float] = Field(None, description="Max acceptable price/km")
    status: Optional[str] = Field("pending", description="Status: pending, matched, cancelled")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "passenger_id": self.passenger_id or self.passenger_name,
            "passenger_name": self.passenger_name,
            "passenger_phone": self.passenger_phone,
            "origin": self.origin,
            "destination": self.destination,
            "earliest_departure": self.earliest_departure.isoformat() if isinstance(self.earliest_departure, datetime) else str(self.earliest_departure),
            "latest_departure": self.latest_departure.isoformat() if isinstance(self.latest_departure, datetime) else str(self.latest_departure),
            "seats_needed": self.seats_needed,
            "max_price_per_km": self.max_price_per_km,
            "status": self.status,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
        }

    dict = to_dict


class Booking(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = Field(default_factory=lambda: f"bk-{str(uuid.uuid4())[:6]}")
    booking_code: Optional[str] = Field(default_factory=lambda: f"RS-{str(uuid.uuid4().hex[:6]).upper()}")
    offer_id: str = Field(..., description="ID of the driver offer booked")
    driver_name: str = Field(..., description="Driver name")
    driver_phone: Optional[str] = Field("9876543210", description="Driver contact phone")
    passenger_name: str = Field(..., description="Passenger name")
    passenger_phone: str = Field(..., description="Passenger phone number")
    passenger_email: Optional[str] = Field("", description="Passenger email for confirmation")
    origin: str = Field(..., description="Boarding point")
    destination: str = Field(..., description="Drop point")
    seats_booked: int = Field(..., ge=1, le=10, description="Number of seats booked")
    distance_km: float = Field(..., ge=1.0, description="Calculated trip distance")
    total_fare: float = Field(..., ge=0.0, description="Total fare in INR")
    departure_time: datetime = Field(..., description="Ride departure time")
    vehicle_info: Optional[str] = Field("", description="Vehicle model and number")
    status: Optional[str] = Field("confirmed", description="Status: confirmed, cancelled, completed")
    notes: Optional[str] = Field("", description="Pickup notes / luggage notes")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "booking_code": self.booking_code,
            "offer_id": self.offer_id,
            "driver_name": self.driver_name,
            "driver_phone": self.driver_phone,
            "passenger_name": self.passenger_name,
            "passenger_phone": self.passenger_phone,
            "passenger_email": self.passenger_email,
            "origin": self.origin,
            "destination": self.destination,
            "seats_booked": self.seats_booked,
            "distance_km": self.distance_km,
            "total_fare": self.total_fare,
            "departure_time": self.departure_time.isoformat() if isinstance(self.departure_time, datetime) else str(self.departure_time),
            "vehicle_info": self.vehicle_info,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
        }

    dict = to_dict


class MatchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    offer_id: str
    driver_id: str
    driver_name: str
    driver_phone: Optional[str]
    origin: str
    destination: str
    matched_route: str
    seats_available: int
    seats_matched: int
    distance_km: float
    estimated_duration_mins: int
    price_per_km: float
    estimated_cost: float
    departure_time: datetime
    vehicle_type: Optional[str]
    vehicle_model: Optional[str]
    vehicle_number: Optional[str]
    ac_available: Optional[bool]
    luggage_allowed: Optional[str]
    match_score: int
    match_type: str

    def to_dict(self):
        return {
            "offer_id": self.offer_id,
            "driver_id": self.driver_id,
            "driver_name": self.driver_name,
            "driver_phone": self.driver_phone,
            "origin": self.origin,
            "destination": self.destination,
            "matched_route": self.matched_route,
            "seats_available": self.seats_available,
            "seats_matched": self.seats_matched,
            "distance_km": self.distance_km,
            "estimated_duration_mins": self.estimated_duration_mins,
            "price_per_km": self.price_per_km,
            "estimated_cost": self.estimated_cost,
            "departure_time": self.departure_time.isoformat() if isinstance(self.departure_time, datetime) else str(self.departure_time),
            "vehicle_type": self.vehicle_type,
            "vehicle_model": self.vehicle_model,
            "vehicle_number": self.vehicle_number,
            "ac_available": self.ac_available,
            "luggage_allowed": self.luggage_allowed,
            "match_score": self.match_score,
            "match_type": self.match_type,
        }

    dict = to_dict


class FareEstimate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    origin: str
    destination: str
    distance_km: float
    estimated_duration_mins: int
    estimated_fare_per_seat: float
    recommended_price_per_km: float
    co2_saved_kg: float
    fuel_saved_liters: float

    def to_dict(self):
        return {
            "origin": self.origin,
            "destination": self.destination,
            "distance_km": self.distance_km,
            "estimated_duration_mins": self.estimated_duration_mins,
            "estimated_fare_per_seat": self.estimated_fare_per_seat,
            "recommended_price_per_km": self.recommended_price_per_km,
            "co2_saved_kg": self.co2_saved_kg,
            "fuel_saved_liters": self.fuel_saved_liters,
        }

    dict = to_dict
