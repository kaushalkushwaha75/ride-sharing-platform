"""
Main Flask application for Empty Vehicle Space Sharing Platform.

Provides RESTful APIs for:
- Posting driver offers
- Passenger ride requests
- Finding ride matches
- Booking seats
- Cancelling bookings
- Calculating fares
- City autocomplete
- Platform statistics
- Serving React frontend
"""

import os

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from models import DriverOffer, PassengerRequest, Booking
from storage import storage
from matching import (
    find_match,
    find_all_matches,
    calculate_fare_estimate,
    CITY_COORDINATES
)


# ─────────────────────────────────────────────────────────────────────────────
# Flask Application
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(
    __name__,
    static_folder="frontend/build",
    static_url_path=""
)

CORS(app)


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints: Driver Offers
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/offer", methods=["POST"])
@app.route("/api/offers", methods=["POST"])
def post_offer():
    """Add a new driver offer."""

    data = request.get_json() or {}

    try:
        # Handle route auto-generation
        if (
            not data.get("origin")
            and data.get("route")
            and "->" in data["route"]
        ):
            parts = data["route"].split("->")
            data["origin"] = parts[0].strip()
            data["destination"] = parts[-1].strip()

        elif (
            not data.get("route")
            and data.get("origin")
            and data.get("destination")
        ):
            data["route"] = (
                f"{data['origin']}->{data['destination']}"
            )

        offer = DriverOffer(**data)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    saved_offer = storage.add_driver_offer(offer)

    all_offers = storage.get_all_driver_offers()

    return jsonify({
        "status": "offer added",
        "offer": saved_offer.dict(),
        "total_offers": len(all_offers)
    }), 201


@app.route("/api/offers", methods=["GET"])
def list_offers():
    """List all driver offers with optional filters."""

    origin = request.args.get("origin", "")
    destination = request.args.get("destination", "")

    try:
        min_seats = int(request.args.get("min_seats", 1))
    except ValueError:
        min_seats = 1

    offers = storage.get_all_driver_offers(
        origin=origin,
        destination=destination,
        min_seats=min_seats
    )

    return jsonify([o.dict() for o in offers]), 200


@app.route("/api/offers/<offer_id>", methods=["DELETE"])
def delete_offer(offer_id):
    """Delete a driver offer by ID."""

    success = storage.delete_driver_offer(offer_id)

    if success:
        return jsonify({
            "status": "deleted",
            "id": offer_id
        }), 200

    return jsonify({
        "error": "Offer not found"
    }), 404


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints: Passenger Requests
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/request", methods=["POST"])
@app.route("/api/requests", methods=["POST"])
def post_request():
    """Add a passenger ride request."""

    data = request.get_json() or {}

    try:
        if not data.get("origin"):
            data["origin"] = "Any"

        passenger = PassengerRequest(**data)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    saved_req = storage.add_passenger_request(passenger)

    all_reqs = storage.get_all_passenger_requests()

    return jsonify({
        "status": "request added",
        "request": saved_req.dict(),
        "total_requests": len(all_reqs)
    }), 201


@app.route("/api/requests", methods=["GET"])
def list_requests():
    """List all pending passenger requests."""

    reqs = storage.get_all_passenger_requests()

    return jsonify([
        r.dict() for r in reqs
    ]), 200


@app.route("/api/requests/<req_id>", methods=["DELETE"])
def delete_request(req_id):
    """Delete a passenger request by ID."""

    success = storage.delete_passenger_request(req_id)

    if success:
        return jsonify({
            "status": "deleted",
            "id": req_id
        }), 200

    return jsonify({
        "error": "Request not found"
    }), 404


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints: Matching Engine
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/match", methods=["POST"])
def match():
    """
    Match a passenger request against all available driver offers.

    Returns:
    - Top match
    - All ranked matches
    - Total matches
    """

    data = request.get_json() or {}

    try:
        if not data.get("origin"):
            data["origin"] = "Delhi"

        passenger = PassengerRequest(**data)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    all_offers = storage.get_all_driver_offers()

    ranked_matches = find_all_matches(
        all_offers,
        passenger
    )

    if ranked_matches:
        top_match = ranked_matches[0].dict()

        top_match["all_matches"] = [
            m.dict() for m in ranked_matches
        ]

        top_match["total_matches"] = len(
            ranked_matches
        )

        return jsonify(top_match), 200

    return jsonify({
        "error": (
            f"No suitable driver found for route "
            f"{passenger.origin} → "
            f"{passenger.destination} "
            f"in your time window."
        ),
        "total_matches": 0,
        "all_matches": []
    }), 404


@app.route("/api/matches", methods=["POST"])
def match_all():
    """Get all ranked matching driver offers."""

    data = request.get_json() or {}

    try:
        passenger = PassengerRequest(**data)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    all_offers = storage.get_all_driver_offers()

    ranked_matches = find_all_matches(
        all_offers,
        passenger
    )

    return jsonify({
        "total": len(ranked_matches),
        "matches": [
            m.dict() for m in ranked_matches
        ]
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints: Bookings & Reservations
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/book", methods=["POST"])
def book_seat():
    """
    Book seats on a driver offer.

    Atomically updates seat availability
    and creates a booking.
    """

    data = request.get_json() or {}

    try:
        # ---------------------------------------------------------
        # Validate offer ID
        # ---------------------------------------------------------

        offer_id = data.get("offer_id")

        if not offer_id:
            return jsonify({
                "error": "offer_id is required"
            }), 400

        # ---------------------------------------------------------
        # Find driver offer
        # ---------------------------------------------------------

        offer = storage.get_driver_offer_by_id(
            offer_id
        )

        if not offer:
            return jsonify({
                "error": "Ride offer not found"
            }), 404

        # ---------------------------------------------------------
        # Seats
        # ---------------------------------------------------------

        try:
            seats_booked = int(
                data.get("seats_booked", 1)
            )
        except (ValueError, TypeError):
            return jsonify({
                "error": "seats_booked must be a valid number"
            }), 400

        if seats_booked <= 0:
            return jsonify({
                "error": "seats_booked must be greater than 0"
            }), 400

        if offer.seats_available < seats_booked:
            return jsonify({
                "error": (
                    f"Only {offer.seats_available} seat(s) "
                    f"available. Cannot book "
                    f"{seats_booked} seat(s)."
                )
            }), 400

        # ---------------------------------------------------------
        # Calculate distance
        # ---------------------------------------------------------

        try:
            distance_km = float(
                data.get("distance_km", 0)
            )
        except (ValueError, TypeError):
            distance_km = 0

        if distance_km <= 0:

            fare_info = calculate_fare_estimate(
                data.get(
                    "origin",
                    offer.origin
                ),
                data.get(
                    "destination",
                    offer.destination
                ),
                offer.price_per_km
            )

            distance_km = fare_info.distance_km

        # ---------------------------------------------------------
        # Calculate total fare
        # ---------------------------------------------------------

        try:
            total_fare = float(
                data.get(
                    "total_fare",
                    round(
                        distance_km
                        * offer.price_per_km
                        * seats_booked,
                        2
                    )
                )
            )

        except (ValueError, TypeError):
            total_fare = round(
                distance_km
                * offer.price_per_km
                * seats_booked,
                2
            )

        # ---------------------------------------------------------
        # Create Booking
        # ---------------------------------------------------------

        booking = Booking(
            offer_id=offer.id,
            driver_name=offer.driver_name,
            driver_phone=offer.driver_phone,
            status="confirmed",
            passenger_name=data.get("passenger_name", "Passenger"),
            passenger_phone=data.get("passenger_phone", "9876543210"),
            passenger_email=data.get("passenger_email", ""),
            origin=data.get("origin", offer.origin),
            destination=data.get("destination", offer.destination),
            seats_booked=seats_booked,
            distance_km=distance_km,
            total_fare=total_fare,
            departure_time=offer.departure_time,
            vehicle_info=(
                f"{offer.vehicle_type} - "
                f"{offer.vehicle_model} "
                f"({offer.vehicle_number})"
            ),
            notes=data.get("notes", "")
        )
        # ---------------------------------------------------------
        # Save booking
        # ---------------------------------------------------------

        saved_booking = storage.create_booking(
            booking
        )

        return jsonify({
            "status": "success",
            "message": "Seat(s) reserved successfully!",
            "booking": saved_booking.dict()
        }), 201

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 400


@app.route("/api/bookings", methods=["GET"])
def list_bookings():
    """List all bookings."""

    bookings = storage.get_all_bookings()

    return jsonify([
        b.dict() for b in bookings
    ]), 200


@app.route(
    "/api/bookings/<booking_id>/cancel",
    methods=["POST", "PATCH"]
)
def cancel_booking(booking_id):
    """Cancel a booking and restore seat count."""

    cancelled = storage.cancel_booking(
        booking_id
    )

    if cancelled:
        return jsonify({
            "status": "cancelled",
            "message": (
                "Booking cancelled and seats restored."
            ),
            "booking": cancelled.dict()
        }), 200

    return jsonify({
        "error": "Booking not found"
    }), 404


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints: Fare & Route Calculator
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/calculate-fare", methods=["POST"])
def calculate_fare():
    """
    Calculate:
    - Distance
    - ETA
    - Per-seat fare
    - CO2 savings
    """

    data = request.get_json() or {}

    origin = data.get(
        "origin",
        ""
    ).strip()

    destination = data.get(
        "destination",
        ""
    ).strip()

    try:
        price_per_km = float(
            data.get(
                "price_per_km",
                8.0
            )
        )
    except (ValueError, TypeError):
        price_per_km = 8.0

    if not origin or not destination:
        return jsonify({
            "error": (
                "Both origin and destination "
                "are required"
            )
        }), 400

    estimate = calculate_fare_estimate(
        origin,
        destination,
        price_per_km
    )

    return jsonify(
        estimate.dict()
    ), 200


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoint: Cities
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/cities", methods=["GET"])
def get_cities():
    """Get list of supported cities."""

    cities = sorted([
        k.title()
        for k in CITY_COORDINATES.keys()
    ])

    # Remove duplicate city names
    unique_cities = []

    seen = set()

    for city in cities:

        if city.lower() not in seen:

            seen.add(
                city.lower()
            )

            unique_cities.append(
                city
            )

    return jsonify({
        "cities": unique_cities
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoint: Platform Statistics
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get live platform statistics."""

    stats = storage.get_platform_stats()

    return jsonify(stats), 200


# ─────────────────────────────────────────────────────────────────────────────
# Serve React Frontend
# ─────────────────────────────────────────────────────────────────────────────

FRONTEND_FOLDER = os.path.join(
    os.path.dirname(
        os.path.abspath(__file__)
    ),
    "frontend",
    "build"
)


@app.route("/")
def serve_react():
    """Serve React frontend."""

    index_file = os.path.join(
        FRONTEND_FOLDER,
        "index.html"
    )

    if not os.path.exists(index_file):

        return jsonify({
            "status": "Backend running",

            "message": (
                "Frontend build directory not found. "
                "Please run 'npm run build' "
                "in the frontend folder."
            ),

            "endpoints": [
                "/api/offers",
                "/api/requests",
                "/api/match",
                "/api/matches",
                "/api/book",
                "/api/bookings",
                "/api/calculate-fare",
                "/api/cities",
                "/api/stats"
            ]
        }), 200

    return send_from_directory(
        FRONTEND_FOLDER,
        "index.html"
    )


# ─────────────────────────────────────────────────────────────────────────────
# React SPA 404 Handler
# ─────────────────────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    """Fallback handler for React SPA routing."""

    if request.path.startswith("/api/"):

        return jsonify({
            "error": "API endpoint not found"
        }), 404

    index_file = os.path.join(
        FRONTEND_FOLDER,
        "index.html"
    )

    if os.path.exists(index_file):

        return send_from_directory(
            FRONTEND_FOLDER,
            "index.html"
        )

    return jsonify({
        "error": "Page not found"
    }), 404


# ─────────────────────────────────────────────────────────────────────────────
# Run Flask Application
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )