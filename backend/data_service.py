"""Data acquisition service. Tries live SPEEDHOME scraping, falls back to mock data."""
import random
import re
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone
import json
from pathlib import Path
import anyio  # atau asyncio

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Known Malaysian rental areas with realistic price baselines (RM/month for 2BR)
AREA_BASELINES = {
    "Mont Kiara": {"base": 3800, "variance": 1500, "per_sqft": 3.6, "popularity": 0.95},
    "Mont Kiara Aman": {"base": 4200, "variance": 1200, "per_sqft": 3.8, "popularity": 0.8},
    "Mont Kiara Bayu": {"base": 4500, "variance": 1400, "per_sqft": 4.0, "popularity": 0.75},
    "Mont Kiara Palma": {"base": 4000, "variance": 1300, "per_sqft": 3.7, "popularity": 0.78},
    "KLCC": {"base": 5500, "variance": 2500, "per_sqft": 4.8, "popularity": 0.98},
    "Bukit Bintang": {"base": 4200, "variance": 1800, "per_sqft": 4.2, "popularity": 0.92},
    "Bangsar": {"base": 3500, "variance": 1500, "per_sqft": 3.4, "popularity": 0.88},
    "Damansara Heights": {"base": 4800, "variance": 2000, "per_sqft": 4.1, "popularity": 0.82},
    "Petaling Jaya": {"base": 2200, "variance": 900, "per_sqft": 2.4, "popularity": 0.85},
    "Subang Jaya": {"base": 2000, "variance": 800, "per_sqft": 2.2, "popularity": 0.8},
    "Cheras": {"base": 1800, "variance": 700, "per_sqft": 2.0, "popularity": 0.78},
    "Puchong": {"base": 1600, "variance": 600, "per_sqft": 1.9, "popularity": 0.75},
    "Shah Alam": {"base": 1500, "variance": 500, "per_sqft": 1.7, "popularity": 0.7},
    "Kelana Jaya": {"base": 2100, "variance": 700, "per_sqft": 2.3, "popularity": 0.72},
    "Ara Damansara": {"base": 2400, "variance": 800, "per_sqft": 2.6, "popularity": 0.74},
    "Bandar Sunway": {"base": 2300, "variance": 900, "per_sqft": 2.5, "popularity": 0.83},
    "Mid Valley": {"base": 3000, "variance": 1200, "per_sqft": 3.0, "popularity": 0.86},
    "USJ": {"base": 1700, "variance": 600, "per_sqft": 1.9, "popularity": 0.68},
    "Setapak": {"base": 1400, "variance": 500, "per_sqft": 1.6, "popularity": 0.65},
    "Kepong": {"base": 1500, "variance": 550, "per_sqft": 1.7, "popularity": 0.67},
    "Old Klang Road": {"base": 1800, "variance": 600, "per_sqft": 2.0, "popularity": 0.7},
    "Sentul": {"base": 1900, "variance": 700, "per_sqft": 2.1, "popularity": 0.7},
    "Wangsa Maju": {"base": 1600, "variance": 600, "per_sqft": 1.8, "popularity": 0.68},
    "Ampang": {"base": 2400, "variance": 1000, "per_sqft": 2.6, "popularity": 0.76},
    "TTDI": {"base": 3200, "variance": 1100, "per_sqft": 3.1, "popularity": 0.8},
}

PROPERTY_NAMES = {
    "Mont Kiara": ["Verve Suites", "Kiara Designer Suites", "Residensi 22", "Arcoris Soho", "Solaris Mont Kiara"],
    "KLCC": ["The Binjai On The Park", "Pavilion Residences", "Vortex Suites", "Idaman Residence", "Stonor 3"],
    "Bukit Bintang": ["Tribeca Bukit Bintang", "Star Residences", "The Robertson", "Soho Suites KLCC"],
    "Bangsar": ["Park Residences", "Bangsar Trade Centre", "One Menerung", "Bangsar Heights"],
    "Petaling Jaya": ["Tropicana Gardens", "Pacific Star", "Section 13 Residences", "PJ Trade Centre"],
    "Subang Jaya": ["USJ Heights", "Subang Olives", "Geo Avenue", "Casa Subang"],
    "Cheras": ["EkoCheras", "M Vertica", "You Vista", "Sentul Point"],
}

FURNISHING_OPTIONS = ["Fully Furnished", "Partially Furnished", "Unfurnished"]
BEDROOM_OPTIONS = [
    ("Studio", 0, 0.10),
    ("1BR", 1, 0.18),
    ("2BR", 2, 0.40),
    ("3BR", 3, 0.22),
    ("4BR", 4, 0.10),
]


def find_area_match(query: str) -> Optional[str]:
    q = query.strip().lower()
    if not q:
        return None
    # exact
    for a in AREA_BASELINES:
        if a.lower() == q:
            return a
    # prefix
    for a in AREA_BASELINES:
        if a.lower().startswith(q):
            return a
    # contains
    for a in AREA_BASELINES:
        if q in a.lower():
            return a
    return None


def autocomplete_areas(query: str, limit: int = 12) -> List[str]:
    q = (query or "").strip().lower()
    if not q:
        return list(AREA_BASELINES.keys())[:limit]
    results = []
    for a in AREA_BASELINES:
        if a.lower().startswith(q):
            results.append(a)
    for a in AREA_BASELINES:
        if a not in results and q in a.lower():
            results.append(a)
    return results[:limit]


def pick_bedroom() -> tuple:
    r = random.random()
    cumulative = 0.0
    for label, count, weight in BEDROOM_OPTIONS:
        cumulative += weight
        if r <= cumulative:
            return label, count
    return "2BR", 2

def generate_mock_listings(area: str, count: int = 40) -> List[Dict]:
    """Generate realistic mock listings for an area."""
    baseline = AREA_BASELINES.get(area, {"base": 2000, "variance": 800, "per_sqft": 2.2})
    listings = []
    properties = PROPERTY_NAMES.get(area, [f"{area} Residences", f"{area} Heights", f"{area} Tower", f"{area} Suites"])
    random.seed(hash(area) % (2**31))
    for i in range(count):
        bed_label, bed_count = pick_bedroom()
        # Size based on bedroom count
        size = {
            0: random.randint(380, 600),
            1: random.randint(550, 800),
            2: random.randint(750, 1200),
            3: random.randint(1100, 1800),
            4: random.randint(1600, 2600),
        }[bed_count]
        # Price = size * per_sqft + noise
        base_psf = baseline["per_sqft"] * random.uniform(0.85, 1.2)
        rent = int(size * base_psf / 50) * 50  # round to nearest 50
        # Add bedroom premium variance
        rent += random.randint(-200, 300)
        rent = max(rent, 600)
        furnishing = random.choices(FURNISHING_OPTIONS, weights=[0.55, 0.30, 0.15])[0]
        prop_name = random.choice(properties)
        title = f"{bed_label} {furnishing.split()[0]} unit at {prop_name}, {area}"
        listings.append({
            "source": "speedhome",
            "source_listing_id": f"SH-{abs(hash(area + str(i))) % 1000000}",
            "title": title,
            "property_name": prop_name,
            "area_name": area,
            "monthly_rent": rent,
            "annual_rent": rent * 12,
            "size_sqft": size,
            "bedroom_count": bed_count,
            "bedroom_type": bed_label,
            "furnishing_status": furnishing,
            "listing_url": f"https://speedhome.com/rent/{area.lower().replace(' ', '-')}/listing-{abs(hash(area + str(i))) % 1000000}",
            "collected_at": datetime.now(timezone.utc).isoformat(),
        })
    random.seed()  # reset
    return listings


async def try_scrape_speedhome(area: str) -> Optional[List[Dict]]:
    """Attempt to scrape SPEEDHOME. Returns None on ANY failure."""
    try:
        url = f"https://speedhome.com/rent/{area.lower().replace(' ', '-')}"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        # Tambah connect timeout terpisah, lebih pendek untuk Railway
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=4.0, read=8.0, write=4.0, pool=4.0),
            follow_redirects=True,
        ) as cli:
            r = await cli.get(url, headers=headers)

        if r.status_code != 200 or len(r.text) < 1000:
            return None

        soup = BeautifulSoup(r.text, "lxml")
        cards = soup.select("[data-listing-id], .listing-card, .property-card")
        if not cards:
            return None

        listings = []
        for c in cards[:60]:
            txt = c.get_text(" ", strip=True)
            price_m = re.search(r"RM\s*([\d,]+)", txt)
            size_m = re.search(r"(\d{3,5})\s*(?:sq\s*ft|sqft)", txt, re.IGNORECASE)
            bed_m = re.search(r"(\d+)\s*(?:bed|br|bedroom)", txt, re.IGNORECASE)
            if not price_m:
                continue
            rent = int(price_m.group(1).replace(",", ""))
            size = int(size_m.group(1)) if size_m else 0
            bed_count = int(bed_m.group(1)) if bed_m else 2
            listings.append({
                "source": "speedhome",
                "source_listing_id": c.get("data-listing-id") or str(hash(txt) % 10**6),
                "title": txt[:120],
                "property_name": area,
                "area_name": area,
                "monthly_rent": rent,
                "annual_rent": rent * 12,
                "size_sqft": size,
                "bedroom_count": bed_count,
                "bedroom_type": f"{bed_count}BR" if bed_count > 0 else "Studio",
                "furnishing_status": "Fully Furnished" if "furnish" in txt.lower() else "Partially Furnished",
                "listing_url": url,
                "collected_at": datetime.now(timezone.utc).isoformat(),
            })
        return listings if len(listings) >= 5 else None

    except (
        httpx.ConnectError,
        httpx.ConnectTimeout,
        httpx.ReadTimeout,
        httpx.RemoteProtocolError,
        httpx.HTTPStatusError,
        OSError,                    # Railway-level network block
        Exception,                  # Fallback untuk error lain
    ) as e:
        logger.info(f"Live scrape failed ({type(e).__name__}): {e}")
        return None


# Path ke static data yang di-bundle saat deploy
_STATIC_DATA_PATH = Path(__file__).parent / "static_data" / "listings.json"
_static_cache: dict | None = None

def _load_static_data() -> dict:
    global _static_cache
    if _static_cache is None:
        if _STATIC_DATA_PATH.exists():
            _static_cache = json.loads(_STATIC_DATA_PATH.read_text())
        else:
            _static_cache = {}
    return _static_cache

async def collect_listings(area: str) -> Dict:
    """Main entry: try live scrape → static bundle → mock."""
    matched = find_area_match(area) or area.strip().title()

    # 1. Coba live scrape
    live = await try_scrape_speedhome(matched)
    if live and len(live) >= 5:
        return {"area": matched, "listings": live, "source": "live"}

    # 2. Fallback ke static data (pre-fetched dari laptop)
    static = _load_static_data()
    if matched in static:
        logger.info(f"Using static bundle data for {matched}")
        return {
            "area": matched,
            "listings": static[matched]["listings"],
            "source": "static",   # bisa dibedakan dari "live" atau "mock"
        }

    # 3. Last resort: mock
    listings = generate_mock_listings(matched, count=random.randint(35, 55))
    return {"area": matched, "listings": listings, "source": "mock"}
