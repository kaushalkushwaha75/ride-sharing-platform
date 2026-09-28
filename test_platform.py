# test_platform.py
"""Comprehensive automated tests for Empty Vehicle Space Sharing platform.
Tests storage, matching logic, routing, booking, seat decrement, cancellation, and API routes.
"""

import pytest
import os
import json
from datetime import datetime, timedelta
from models import DriverOffer, PassengerRequest, Booking
from storage import SQLiteStorage
from matching import (
    haversine_distance_km,
    get_city_distance_km,
    find_match,
    find_all_matches,
    calculate_fare_estimate,
    check_subroute_match,
    parse_route_nodes
)
from app import app


@pytest.fixture
def test_storage(tmp_path):
    db_file = os.path.join(tmp_path, "test_rideshare.db")
    st = SQLiteStorage(db_path=db_file)
    return st


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_distance_calculation():
    # Delhi to Agra distance should be ~200-250 km
    dist = get_city_distance_km("Delhi", "Agra")
    assert 180 <= dist <= 260

    # Lucknow to Gorakhpur should be ~250-320 km
    dist_lko_gkp = get_city_distance_km("Lucknow", "Gorakhpur")
    assert 240 <= dist_lko_gkp <= 340


def test_subroute_matching():
    nodes = parse_route_nodes("Delhi->Agra->Lucknow->Gorakhpur")
    assert len(nodes) == 4
    
    # Agra to Lucknow sub-route match
    matched, match_type, score = check_subroute_match(nodes, "Agra", "Lucknow")
    assert matched is True
    assert match_type == "Waypoint Match"

    # Reverse direction should NOT match
    matched_rev, _, _ = check_subroute_match(nodes, "Gorakhpur", "Delhi")
    assert matched_rev is False


def test_storage_and_booking_lifecycle(test_storage):
    now = datetime.utcnow()
    offer = DriverOffer(
        id="test-off-1",
        driver_name="Test Driver",
        driver_phone="9999999999",
        origin="Delhi",
        destination="Jaipur",
        seats_available=3,
        total_seats=4,
        departure_time=now + timedelta(hours=5),
        price_per_km=7.0,
        vehicle_type="Sedan",
    )
    test_storage.add_driver_offer(offer)

    # Verify retrieval
    stored = test_storage.get_driver_offer_by_id("test-off-1")
    assert stored is not None
    assert stored.seats_available == 3

    # Book 2 seats
    booking = Booking(
        id="test-bk-1",
        offer_id="test-off-1",
        driver_name="Test Driver",
        passenger_name="Test Passenger",
        passenger_phone="8888888888",
        origin="Delhi",
        destination="Jaipur",
        seats_booked=2,
        distance_km=270.0,
        total_fare=3780.0,
        departure_time=offer.departure_time,
    )
    saved_bk = test_storage.create_booking(booking)
    assert saved_bk.booking_code.startswith("RS-")

    # Verify remaining seats decremented to 1
    updated_offer = test_storage.get_driver_offer_by_id("test-off-1")
    assert updated_offer.seats_available == 1

    # Cancel booking
    cancelled = test_storage.cancel_booking(saved_bk.id)
    assert cancelled.status == "cancelled"

    # Verify seats restored to 3
    restored_offer = test_storage.get_driver_offer_by_id("test-off-1")
    assert restored_offer.seats_available == 3


def test_api_endpoints(client):
    # Test stats endpoint
    res = client.get('/api/stats')
    assert res.status_code == 200
    data = res.get_json()
    assert 'active_offers' in data
    assert 'available_seats' in data

    # Test cities endpoint
    res = client.get('/api/cities')
    assert res.status_code == 200
    cities = res.get_json()['cities']
    assert "Delhi" in cities
    assert "Lucknow" in cities

    # Test fare calculator endpoint
    res = client.post('/api/calculate-fare', json={
        "origin": "Delhi",
        "destination": "Agra",
        "price_per_km": 6.5
    })
    assert res.status_code == 200
    fare_data = res.get_json()
    assert fare_data['distance_km'] > 150
    assert fare_data['estimated_fare_per_seat'] > 500
    assert fare_data['co2_saved_kg'] > 0

    # Ensure a fresh active offer exists
    now = datetime.utcnow()
    offer_res = client.post('/api/offers', json={
        "driver_name": "API Test Driver",
        "driver_phone": "9811223344",
        "origin": "Lucknow",
        "destination": "Gorakhpur",
        "seats_available": 3,
        "total_seats": 4,
        "departure_time": (now + timedelta(hours=4)).isoformat(),
        "price_per_km": 7.0,
        "vehicle_type": "SUV"
    })
    assert offer_res.status_code == 201
    offer_id = offer_res.get_json()['offer']['id']

    # Test match endpoint
    res = client.post('/api/match', json={
        "passenger_name": "Test User",
        "origin": "Lucknow",
        "destination": "Gorakhpur",
        "earliest_departure": (now - timedelta(hours=2)).isoformat(),
        "latest_departure": (now + timedelta(hours=24)).isoformat(),
        "seats_needed": 1
    })
    assert res.status_code == 200
    match_data = res.get_json()
    assert match_data['destination'].lower() == "gorakhpur"
    assert match_data['seats_available'] >= 1

    # Test booking endpoint
    book_res = client.post('/api/book', json={
        "offer_id": offer_id,
        "passenger_name": "API Passenger",
        "passenger_phone": "9876543210",
        "seats_booked": 1
    })
    assert book_res.status_code == 201
    bk_data = book_res.get_json()['booking']
    assert bk_data['status'] == 'confirmed'
    booking_id = bk_data['id']

    # Test cancel booking endpoint
    cancel_res = client.post(f'/api/bookings/{booking_id}/cancel')
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()['booking']['status'] == 'cancelled'
