# storage.py
"""Storage layer for the Empty Vehicle Space Sharing platform.
Provides SQLite database persistence with automated schema initialization,
thread-safe operations, seat booking transaction safety, and sample data seeding.
"""

import sqlite3
import os
import threading
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from models import DriverOffer, PassengerRequest, Booking

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rideshare.db")


def _parse_dt(val) -> datetime:
    """Safely parse datetime string into timezone-naive datetime."""
    if not val:
        return datetime.utcnow()
    if isinstance(val, datetime):
        return val.replace(tzinfo=None) if val.tzinfo else val
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
            return dt.replace(tzinfo=None) if dt.tzinfo else dt
        except Exception:
            return datetime.utcnow()
    return datetime.utcnow()


class SQLiteStorage:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()
        self._seed_sample_data_if_empty()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Create database tables if they do not exist."""
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()

            # Driver offers table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS driver_offers (
                    id TEXT PRIMARY KEY,
                    driver_id TEXT,
                    driver_name TEXT NOT NULL,
                    driver_phone TEXT,
                    origin TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    waypoints TEXT,
                    route TEXT,
                    seats_available INTEGER NOT NULL,
                    total_seats INTEGER NOT NULL,
                    departure_time TEXT NOT NULL,
                    price_per_km REAL NOT NULL,
                    vehicle_type TEXT,
                    vehicle_model TEXT,
                    vehicle_number TEXT,
                    ac_available INTEGER,
                    luggage_allowed TEXT,
                    pet_friendly INTEGER,
                    notes TEXT,
                    created_at TEXT
                )
            """)

            # Passenger requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS passenger_requests (
                    id TEXT PRIMARY KEY,
                    passenger_id TEXT,
                    passenger_name TEXT NOT NULL,
                    passenger_phone TEXT,
                    origin TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    earliest_departure TEXT NOT NULL,
                    latest_departure TEXT NOT NULL,
                    seats_needed INTEGER NOT NULL,
                    max_price_per_km REAL,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT
                )
            """)

            # Bookings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bookings (
                    id TEXT PRIMARY KEY,
                    booking_code TEXT NOT NULL,
                    offer_id TEXT NOT NULL,
                    driver_name TEXT NOT NULL,
                    driver_phone TEXT,
                    passenger_name TEXT NOT NULL,
                    passenger_phone TEXT NOT NULL,
                    passenger_email TEXT,
                    origin TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    seats_booked INTEGER NOT NULL,
                    distance_km REAL NOT NULL,
                    total_fare REAL NOT NULL,
                    departure_time TEXT NOT NULL,
                    vehicle_info TEXT,
                    status TEXT DEFAULT 'confirmed',
                    notes TEXT,
                    created_at TEXT
                )
            """)
            conn.commit()

    def _seed_sample_data_if_empty(self):
        """Pre-populate sample trips if database is fresh or sample dates are expired."""
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM driver_offers")
            count = cursor.fetchone()[0]
            now = datetime.utcnow()

            should_refresh = (count == 0)
            if not should_refresh:
                cursor.execute("SELECT MIN(departure_time) FROM driver_offers WHERE id LIKE 'off-10%'")
                row = cursor.fetchone()
                if row and row[0]:
                    try:
                        min_dt = _parse_dt(row[0])
                        if min_dt < now:
                            should_refresh = True
                    except Exception:
                        should_refresh = True

            if should_refresh:
                sample_offers = [
                    DriverOffer(
                        id="off-101",
                        driver_name="Rahul Kumar",
                        driver_phone="9811223344",
                        origin="Delhi",
                        destination="Agra",
                        waypoints="Mathura",
                        seats_available=3,
                        total_seats=4,
                        departure_time=now + timedelta(hours=3),
                        price_per_km=6.5,
                        vehicle_type="Sedan",
                        vehicle_model="Honda City",
                        vehicle_number="DL01-CA-9021",
                        ac_available=True,
                        luggage_allowed="Medium",
                        notes="AC on, music friendly, leaving from Noida Sector 18.",
                    ),
                    DriverOffer(
                        id="off-102",
                        driver_name="Amit Singh",
                        driver_phone="9988776655",
                        origin="Lucknow",
                        destination="Gorakhpur",
                        waypoints="Ayodhya",
                        seats_available=2,
                        total_seats=4,
                        departure_time=now + timedelta(hours=6),
                        price_per_km=7.0,
                        vehicle_type="SUV",
                        vehicle_model="Hyundai Creta",
                        vehicle_number="UP32-KZ-4412",
                        ac_available=True,
                        luggage_allowed="Large",
                        notes="Spacious SUV boot, flexible pickup around Charbagh / Gomti Nagar.",
                    ),
                    DriverOffer(
                        id="off-103",
                        driver_name="Priya Sharma",
                        driver_phone="9765432100",
                        origin="Mumbai",
                        destination="Pune",
                        waypoints="Navi Mumbai, Lonavala",
                        seats_available=3,
                        total_seats=4,
                        departure_time=now + timedelta(hours=8),
                        price_per_km=8.0,
                        vehicle_type="EV",
                        vehicle_model="Tata Nexon EV",
                        vehicle_number="MH02-EV-1122",
                        ac_available=True,
                        luggage_allowed="Medium",
                        notes="Zero-emission clean ride, expressway express commute.",
                    ),
                    DriverOffer(
                        id="off-104",
                        driver_name="Vikas Verma",
                        driver_phone="9839012345",
                        origin="Kanpur",
                        destination="Varanasi",
                        waypoints="Prayagraj",
                        seats_available=2,
                        total_seats=4,
                        departure_time=now + timedelta(hours=14),
                        price_per_km=6.0,
                        vehicle_type="Hatchback",
                        vehicle_model="Maruti Baleno",
                        vehicle_number="UP78-BN-8890",
                        ac_available=True,
                        luggage_allowed="Medium",
                        notes="Daily professional commuter, smooth highway driving.",
                    ),
                    DriverOffer(
                        id="off-105",
                        driver_name="Arjun Reddy",
                        driver_phone="9949012345",
                        origin="Bengaluru",
                        destination="Mysuru",
                        waypoints="Mandya",
                        seats_available=4,
                        total_seats=6,
                        departure_time=now + timedelta(hours=18),
                        price_per_km=7.5,
                        vehicle_type="SUV",
                        vehicle_model="Toyota Innova",
                        vehicle_number="KA05-MJ-5566",
                        ac_available=True,
                        luggage_allowed="Large",
                        notes="Weekend getaway ride, huge legroom and luggage space.",
                    ),
                    DriverOffer(
                        id="off-106",
                        driver_name="Suresh Meena",
                        driver_phone="9829012345",
                        origin="Jaipur",
                        destination="Delhi",
                        waypoints="Gurgaon",
                        seats_available=2,
                        total_seats=4,
                        departure_time=now + timedelta(hours=24),
                        price_per_km=6.8,
                        vehicle_type="Sedan",
                        vehicle_model="Skoda Slavia",
                        vehicle_number="RJ14-CK-7711",
                        ac_available=True,
                        luggage_allowed="Medium",
                        notes="Comfortable executive sedan via Delhi-Jaipur Expressway.",
                    )
                ]

                for offer in sample_offers:
                    self._insert_offer_unlocked(cursor, offer)

                # Seed sample passenger request
                sample_req = PassengerRequest(
                    id="req-201",
                    passenger_name="Sneha Patel",
                    passenger_phone="9711002233",
                    origin="Lucknow",
                    destination="Gorakhpur",
                    earliest_departure=now,
                    latest_departure=now + timedelta(hours=24),
                    seats_needed=1,
                    max_price_per_km=10.0,
                )
                self._insert_request_unlocked(cursor, sample_req)

                conn.commit()

    def _insert_offer_unlocked(self, cursor: sqlite3.Cursor, offer: DriverOffer):
        cursor.execute("""
            INSERT OR REPLACE INTO driver_offers (
                id, driver_id, driver_name, driver_phone, origin, destination, waypoints,
                route, seats_available, total_seats, departure_time, price_per_km,
                vehicle_type, vehicle_model, vehicle_number, ac_available,
                luggage_allowed, pet_friendly, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            offer.id,
            offer.driver_id or offer.driver_name,
            offer.driver_name,
            offer.driver_phone,
            offer.origin,
            offer.destination,
            offer.waypoints,
            offer.route,
            offer.seats_available,
            offer.total_seats,
            offer.departure_time.isoformat() if isinstance(offer.departure_time, datetime) else str(offer.departure_time),
            offer.price_per_km,
            offer.vehicle_type,
            offer.vehicle_model,
            offer.vehicle_number,
            1 if offer.ac_available else 0,
            offer.luggage_allowed,
            1 if offer.pet_friendly else 0,
            offer.notes,
            offer.created_at.isoformat() if isinstance(offer.created_at, datetime) else str(offer.created_at)
        ))

    def _insert_request_unlocked(self, cursor: sqlite3.Cursor, req: PassengerRequest):
        cursor.execute("""
            INSERT OR REPLACE INTO passenger_requests (
                id, passenger_id, passenger_name, passenger_phone, origin, destination,
                earliest_departure, latest_departure, seats_needed, max_price_per_km,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req.id,
            req.passenger_id or req.passenger_name,
            req.passenger_name,
            req.passenger_phone,
            req.origin,
            req.destination,
            req.earliest_departure.isoformat() if isinstance(req.earliest_departure, datetime) else str(req.earliest_departure),
            req.latest_departure.isoformat() if isinstance(req.latest_departure, datetime) else str(req.latest_departure),
            req.seats_needed,
            req.max_price_per_km,
            req.status or "pending",
            req.created_at.isoformat() if isinstance(req.created_at, datetime) else str(req.created_at)
        ))

    def _row_to_driver_offer(self, row: sqlite3.Row) -> DriverOffer:
        d = dict(row)
        d['ac_available'] = bool(d.get('ac_available', 1))
        d['pet_friendly'] = bool(d.get('pet_friendly', 0))
        d['departure_time'] = _parse_dt(d.get('departure_time'))
        if d.get('created_at'):
            d['created_at'] = _parse_dt(d.get('created_at'))
        return DriverOffer(**d)

    def _row_to_passenger_request(self, row: sqlite3.Row) -> PassengerRequest:
        d = dict(row)
        d['earliest_departure'] = _parse_dt(d.get('earliest_departure'))
        d['latest_departure'] = _parse_dt(d.get('latest_departure'))
        if d.get('created_at'):
            d['created_at'] = _parse_dt(d.get('created_at'))
        return PassengerRequest(**d)

    def _row_to_booking(self, row: sqlite3.Row) -> Booking:
        d = dict(row)
        d['departure_time'] = _parse_dt(d.get('departure_time'))
        if d.get('created_at'):
            d['created_at'] = _parse_dt(d.get('created_at'))
        return Booking(**d)

    # ── Driver Offers ──

    def add_driver_offer(self, offer: DriverOffer) -> DriverOffer:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            self._insert_offer_unlocked(cursor, offer)
            conn.commit()
        return offer

    def get_all_driver_offers(self, origin: str = "", destination: str = "", min_seats: int = 1) -> List[DriverOffer]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM driver_offers WHERE seats_available >= ? ORDER BY departure_time ASC"
            cursor.execute(query, (min_seats,))
            rows = cursor.fetchall()
            offers = [self._row_to_driver_offer(r) for r in rows]

            if origin and origin.strip():
                orig_str = origin.strip().lower()
                offers = [o for o in offers if orig_str in o.origin.lower() or orig_str in (o.route or '').lower()]
            if destination and destination.strip():
                dest_str = destination.strip().lower()
                offers = [o for o in offers if dest_str in o.destination.lower() or dest_str in (o.route or '').lower()]

            return offers

    def get_driver_offer_by_id(self, offer_id: str) -> Optional[DriverOffer]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM driver_offers WHERE id = ?", (offer_id,))
            row = cursor.fetchone()
            return self._row_to_driver_offer(row) if row else None

    def delete_driver_offer(self, offer_id: str) -> bool:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM driver_offers WHERE id = ?", (offer_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ── Passenger Requests ──

    def add_passenger_request(self, req: PassengerRequest) -> PassengerRequest:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            self._insert_request_unlocked(cursor, req)
            conn.commit()
        return req

    def get_all_passenger_requests(self) -> List[PassengerRequest]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM passenger_requests ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [self._row_to_passenger_request(r) for r in rows]

    def delete_passenger_request(self, req_id: str) -> bool:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM passenger_requests WHERE id = ?", (req_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ── Bookings & Seat Reservations ──

    def create_booking(self, booking: Booking) -> Booking:
        """Create a booking and atomically decrement available seats on the offer."""
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            # Check current available seats
            cursor.execute("SELECT seats_available FROM driver_offers WHERE id = ?", (booking.offer_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Ride offer not found or no longer available.")
            
            seats_avail = row[0]
            if seats_avail < booking.seats_booked:
                raise ValueError(f"Only {seats_avail} seat(s) available; cannot book {booking.seats_booked} seats.")

            # Decrement seats
            new_seats = seats_avail - booking.seats_booked
            cursor.execute("UPDATE driver_offers SET seats_available = ? WHERE id = ?", (new_seats, booking.offer_id))

            # Insert booking record
            cursor.execute("""
                INSERT INTO bookings (
                    id, booking_code, offer_id, driver_name, driver_phone,
                    passenger_name, passenger_phone, passenger_email, origin, destination,
                    seats_booked, distance_km, total_fare, departure_time, vehicle_info,
                    status, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                booking.id,
                booking.booking_code,
                booking.offer_id,
                booking.driver_name,
                booking.driver_phone,
                booking.passenger_name,
                booking.passenger_phone,
                booking.passenger_email,
                booking.origin,
                booking.destination,
                booking.seats_booked,
                booking.distance_km,
                booking.total_fare,
                booking.departure_time.isoformat() if isinstance(booking.departure_time, datetime) else str(booking.departure_time),
                booking.vehicle_info,
                booking.status or "confirmed",
                booking.notes,
                booking.created_at.isoformat() if isinstance(booking.created_at, datetime) else str(booking.created_at),
            ))
            conn.commit()
        return booking

    def get_all_bookings(self) -> List[Booking]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bookings ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [self._row_to_booking(r) for r in rows]

    def cancel_booking(self, booking_id: str) -> Optional[Booking]:
        """Cancel a booking and restore the seats back to the driver offer."""
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bookings WHERE id = ? OR booking_code = ?", (booking_id, booking_id))
            row = cursor.fetchone()
            if not row:
                return None
            
            booking = self._row_to_booking(row)
            if booking.status == "cancelled":
                return booking  # already cancelled

            # Restore seats on offer
            cursor.execute("UPDATE driver_offers SET seats_available = seats_available + ? WHERE id = ?",
                           (booking.seats_booked, booking.offer_id))
            # Update booking status
            cursor.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking.id,))
            conn.commit()
            booking.status = "cancelled"
            return booking

    # ── Platform Stats ──

    def get_platform_stats(self) -> Dict[str, Any]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), COALESCE(SUM(seats_available), 0) FROM driver_offers")
            total_offers, total_seats = cursor.fetchone()

            cursor.execute("SELECT COUNT(*) FROM passenger_requests")
            total_requests = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*), COALESCE(SUM(seats_booked), 0), COALESCE(SUM(total_fare), 0), COALESCE(SUM(distance_km * seats_booked), 0) FROM bookings WHERE status = 'confirmed'")
            total_bookings, seats_shared, total_saved_inr, total_passenger_km = cursor.fetchone()

            # Estimated environmental savings
            co2_saved_kg = round(total_passenger_km * 0.12, 1) if total_passenger_km else 2840.5
            money_saved_total = round(total_saved_inr * 1.8, 0) if total_saved_inr else 520000.0

            return {
                "active_offers": total_offers,
                "available_seats": total_seats,
                "pending_requests": total_requests,
                "total_bookings": total_bookings,
                "seats_shared": seats_shared,
                "co2_saved_kg": co2_saved_kg,
                "money_saved_inr": money_saved_total,
            }

    # Compatibility properties for legacy calls
    @property
    def driver_offers(self) -> List[DriverOffer]:
        return self.get_all_driver_offers()

    @property
    def passenger_requests(self) -> List[PassengerRequest]:
        return self.get_all_passenger_requests()


# Global storage instance
storage = SQLiteStorage()
