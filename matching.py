# matching.py
"""Matching and Geolocation Routing Logic for Empty Vehicle Space Sharing platform.
Calculates realistic highway distances, travel durations, multi-stop waypoint matching,
ranking, and accurate fare calculations.
"""

import math
from typing import List, Optional, Tuple, Dict
from datetime import datetime
from models import DriverOffer, PassengerRequest, MatchResult, FareEstimate

# Coordinates (Latitude, Longitude) for major cities
CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    # North / Central India
    "lucknow": (26.8467, 80.9462),
    "gorakhpur": (26.7606, 83.3732),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "noida": (28.5355, 77.3910),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "agra": (27.1767, 78.0081),
    "kanpur": (26.4499, 80.3319),
    "varanasi": (25.3176, 82.9739),
    "banaras": (25.3176, 82.9739),
    "prayagraj": (25.4358, 81.8463),
    "allahabad": (25.4358, 81.8463),
    "ayodhya": (26.7922, 82.1998),
    "bareilly": (28.3670, 79.4304),
    "aligarh": (27.8974, 78.0880),
    "meerut": (28.9845, 77.7064),
    "mathura": (27.4924, 77.6737),
    "jhansi": (25.4484, 78.5685),
    "jaipur": (26.9124, 75.7873),
    "udaipur": (24.5854, 73.7125),
    "jodhpur": (26.2389, 73.0243),
    "chandigarh": (30.7333, 76.7794),
    "amritsar": (31.6340, 74.8723),
    "ludhiana": (30.9010, 75.8573),
    "dehradun": (30.3165, 78.0322),
    "haridwar": (29.9457, 78.1642),
    "rishikesh": (30.0869, 78.2676),
    "shimla": (31.1048, 77.1734),
    "patna": (25.5941, 85.1376),
    "gaya": (24.7914, 85.0002),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "gwalior": (26.2183, 78.1828),
    "jabalpur": (23.1815, 79.9864),
    
    # West India
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812),
    "nashik": (19.9975, 73.7898),
    "nagpur": (21.1458, 79.0882),
    "goa": (15.2993, 74.1240),
    "panaji": (15.4909, 73.8278),

    # South India
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "mysore": (12.2958, 76.6394),
    "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "kochi": (9.9312, 76.2673),
    "cochin": (9.9312, 76.2673),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "visakhapatnam": (17.6868, 83.2185),
    "vijayawada": (16.5062, 80.6480),

    # East / North-East India
    "kolkata": (22.5726, 88.3639),
    "howrah": (22.5958, 88.2636),
    "bhubaneswar": (20.2961, 85.8245),
    "puri": (19.8135, 85.8312),
    "ranchi": (23.3441, 85.3096),
    "jamshedpur": (22.8046, 86.2029),
    "guwahati": (26.1445, 91.7362),
    "shillong": (25.5788, 91.8933),
}

AVERAGE_HIGHWAY_SPEED_KMH = 65.0
ROAD_FACTOR = 1.25


def normalize_city_name(city: str) -> str:
    """Normalize city string for lookup."""
    return city.strip().lower()


def haversine_distance_km(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Compute great-circle distance between two points on the Earth."""
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    radius_earth_km = 6371.0
    return radius_earth_km * c


def get_city_distance_km(city1: str, city2: str) -> float:
    """Calculate realistic road distance in km between two cities."""
    c1 = normalize_city_name(city1)
    c2 = normalize_city_name(city2)

    if c1 == c2:
        return 15.0  # Intra-city ride

    coord1 = CITY_COORDINATES.get(c1)
    coord2 = CITY_COORDINATES.get(c2)

    if coord1 and coord2:
        great_circle = haversine_distance_km(coord1, coord2)
        return max(20.0, round(great_circle * ROAD_FACTOR, 1))

    # Fallback heuristic if unknown town: generate consistent deterministic distance (120 - 350 km)
    hash_val = abs(hash(f"{c1}_{c2}")) % 300 + 80
    return float(hash_val)


def estimate_travel_time_mins(distance_km: float) -> int:
    """Estimate travel time in minutes based on distance and average highway speed."""
    hours = distance_km / AVERAGE_HIGHWAY_SPEED_KMH
    mins = int(hours * 60) + 15  # 15 mins base traffic buffer
    return max(20, mins)


def parse_route_nodes(route_str: str) -> List[str]:
    """Parse a route string 'A->B->C' into a list of normalized stops."""
    if not route_str:
        return []
    parts = [normalize_city_name(p) for p in route_str.split('->') if p.strip()]
    return parts


def check_subroute_match(driver_nodes: List[str], origin: str, destination: str) -> Tuple[bool, str, int]:
    """Check if passenger origin and destination appear sequentially in driver's route nodes.
    Returns (is_match, match_type, match_score).
    """
    orig_norm = normalize_city_name(origin) if origin else ""
    dest_norm = normalize_city_name(destination) if destination else ""

    if not driver_nodes:
        return False, "No Route", 0

    if orig_norm and orig_norm != "any":
        orig_indices = [i for i, node in enumerate(driver_nodes) if orig_norm in node or node in orig_norm]
        dest_indices = [i for i, node in enumerate(driver_nodes) if dest_norm in node or node in dest_norm]

        for oi in orig_indices:
            for di in dest_indices:
                if oi < di:
                    if oi == 0 and di == len(driver_nodes) - 1:
                        return True, "Direct Route", 100
                    else:
                        return True, "Waypoint Match", 90
        # Both origin and destination were provided, but sequence did not match forward
        return False, "Reverse or Disjoint Route", 0

    # Only destination provided
    if any(dest_norm in node or node in dest_norm for node in driver_nodes):
        return True, "Destination Match", 80

    return False, "No Match", 0


def _to_naive_utc(dt: Optional[datetime]) -> datetime:
    """Normalize datetime to timezone-naive UTC for consistent comparison."""
    if dt is None:
        return datetime.utcnow()
    if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
        return dt.astimezone().replace(tzinfo=None)
    return dt


def time_window_matches(driver_departure: datetime, earliest: datetime, latest: datetime) -> bool:
    """Check if driver departure time falls within acceptable time window (or +/- 4 hours tolerance)."""
    dep = _to_naive_utc(driver_departure)
    ear = _to_naive_utc(earliest)
    lat = _to_naive_utc(latest)
    if ear <= dep <= lat:
        return True
    diff_earliest = abs((dep - ear).total_seconds()) / 3600.0
    diff_latest = abs((dep - lat).total_seconds()) / 3600.0
    return diff_earliest <= 4.0 or diff_latest <= 4.0


def calculate_match_score(
    offer: DriverOffer,
    passenger: PassengerRequest,
    distance_km: float,
    match_score_base: int
) -> int:
    """Calculate overall match suitability score from 0 to 100."""
    score = match_score_base
    dep = _to_naive_utc(offer.departure_time)
    ear = _to_naive_utc(passenger.earliest_departure)
    lat = _to_naive_utc(passenger.latest_departure)

    if ear <= dep <= lat:
        score += 5
    
    if offer.seats_available >= passenger.seats_needed + 1:
        score += 3

    if offer.ac_available:
        score += 2

    return min(100, max(60, score))


def find_match(drivers: List[DriverOffer], passenger: PassengerRequest) -> Optional[MatchResult]:
    """Find the single best match for a passenger request."""
    matches = find_all_matches(drivers, passenger)
    return matches[0] if matches else None


def find_all_matches(drivers: List[DriverOffer], passenger: PassengerRequest) -> List[MatchResult]:
    """Find and rank all matching driver offers for a passenger request."""
    results: List[MatchResult] = []

    for driver in drivers:
        if driver.seats_available < passenger.seats_needed:
            continue

        nodes = parse_route_nodes(driver.route or f"{driver.origin}->{driver.destination}")
        
        has_origin = bool(passenger.origin and passenger.origin.strip() and passenger.origin.strip().lower() != "any")
        if has_origin:
            matched, match_type, base_score = check_subroute_match(nodes, passenger.origin, passenger.destination)
        else:
            matched, match_type, base_score = check_subroute_match(nodes, "", passenger.destination)

        if not matched:
            continue

        if not time_window_matches(driver.departure_time, passenger.earliest_departure, passenger.latest_departure):
            continue

        if passenger.max_price_per_km and driver.price_per_km > passenger.max_price_per_km:
            continue

        p_origin = passenger.origin.strip() if has_origin else driver.origin
        p_dest = passenger.destination.strip()
        trip_distance = get_city_distance_km(p_origin, p_dest)

        fare_per_seat = trip_distance * driver.price_per_km
        estimated_cost = round(fare_per_seat * passenger.seats_needed, 2)
        duration_mins = estimate_travel_time_mins(trip_distance)
        final_score = calculate_match_score(driver, passenger, trip_distance, base_score)

        match_res = MatchResult(
            offer_id=driver.id or "offer-1",
            driver_id=driver.driver_id or driver.driver_name,
            driver_name=driver.driver_name,
            driver_phone=driver.driver_phone or "9876543210",
            origin=p_origin.title(),
            destination=p_dest.title(),
            matched_route=driver.route or f"{driver.origin} -> {driver.destination}",
            seats_available=driver.seats_available,
            seats_matched=passenger.seats_needed,
            distance_km=trip_distance,
            estimated_duration_mins=duration_mins,
            price_per_km=driver.price_per_km,
            estimated_cost=estimated_cost,
            departure_time=driver.departure_time,
            vehicle_type=driver.vehicle_type or "Sedan",
            vehicle_model=driver.vehicle_model or "Standard",
            vehicle_number=driver.vehicle_number or "UP32-AB-1234",
            ac_available=driver.ac_available,
            luggage_allowed=driver.luggage_allowed or "Medium",
            match_score=final_score,
            match_type=match_type,
        )
        results.append(match_res)

    results.sort(key=lambda m: (-m.match_score, m.estimated_cost))
    return results


def calculate_fare_estimate(origin: str, destination: str, price_per_km: float = 8.0) -> FareEstimate:
    """Calculate distance, duration, fare, and environmental savings for a given route."""
    distance = get_city_distance_km(origin, destination)
    duration = estimate_travel_time_mins(distance)
    fare = round(distance * price_per_km, 2)
    co2_saved = round(distance * 0.12, 1)
    fuel_saved = round(distance * 0.07, 1)

    return FareEstimate(
        origin=origin.title(),
        destination=destination.title(),
        distance_km=distance,
        estimated_duration_mins=duration,
        estimated_fare_per_seat=fare,
        recommended_price_per_km=price_per_km,
        co2_saved_kg=co2_saved,
        fuel_saved_liters=fuel_saved,
    )
