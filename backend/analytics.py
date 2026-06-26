"""Analytics engine for rental price calculations."""
from typing import List, Dict
from collections import Counter
import statistics


def safe_median(values):
    return statistics.median(values) if values else 0


def safe_mode(values):
    if not values:
        return 0
    try:
        return statistics.mode(values)
    except statistics.StatisticsError:
        return Counter(values).most_common(1)[0][0]


def compute_overall_stats(listings: List[Dict]) -> Dict:
    if not listings:
        return {
            "listing_count": 0,
            "average_price": 0,
            "median_price": 0,
            "mode_price": 0,
            "fair_price": 0,
            "average_size": 0,
            "min_price": 0,
            "max_price": 0,
            "rent_per_sqft": 0,
        }
    prices = [li["monthly_rent"] for li in listings]
    sizes = [li["size_sqft"] for li in listings if li.get("size_sqft")]
    median = safe_median(prices)
    avg = sum(prices) / len(prices)
    psf_values = [li["monthly_rent"] / li["size_sqft"] for li in listings if li.get("size_sqft") and li["size_sqft"] > 0]
    avg_psf = sum(psf_values) / len(psf_values) if psf_values else 0
    # Weighted fair price: 40% median + 30% avg + 30% (avg_size * avg_psf)
    avg_size = sum(sizes) / len(sizes) if sizes else 0
    psf_benchmark_price = avg_size * avg_psf if avg_psf and avg_size else median
    fair = 0.4 * median + 0.3 * avg + 0.3 * psf_benchmark_price
    return {
        "listing_count": len(listings),
        "average_price": round(avg, 2),
        "median_price": round(median, 2),
        "mode_price": round(safe_mode(prices), 2),
        "fair_price": round(fair, 2),
        "average_size": round(avg_size, 1),
        "min_price": min(prices),
        "max_price": max(prices),
        "rent_per_sqft": round(avg_psf, 2),
    }


def compute_by_unit_type(listings: List[Dict]) -> List[Dict]:
    groups: Dict[str, List[Dict]] = {}
    for li in listings:
        key = li.get("bedroom_type", "Unknown")
        groups.setdefault(key, []).append(li)
    out = []
    order_map = {"Studio": 0, "1BR": 1, "2BR": 2, "3BR": 3, "4BR": 4}
    for unit_type, items in groups.items():
        prices = [i["monthly_rent"] for i in items]
        sizes = [i["size_sqft"] for i in items if i.get("size_sqft")]
        median = safe_median(prices)
        avg = sum(prices) / len(prices)
        avg_size = sum(sizes) / len(sizes) if sizes else 0
        out.append({
            "unit_type": unit_type,
            "listing_count": len(items),
            "average_price": round(avg, 2),
            "median_price": round(median, 2),
            "mode_price": round(safe_mode(prices), 2),
            "fair_price": round(median, 2),
            "average_size": round(avg_size, 1),
            "rent_per_sqft": round((avg / avg_size) if avg_size > 0 else 0, 2),
        })
    out.sort(key=lambda x: order_map.get(x["unit_type"], 99))
    return out


def compute_furnishing_distribution(listings: List[Dict]) -> List[Dict]:
    counts = Counter(li.get("furnishing_status", "Unknown") for li in listings)
    total = sum(counts.values()) or 1
    return [
        {"name": k, "value": v, "percentage": round(v / total * 100, 1)}
        for k, v in counts.most_common()
    ]


def compute_price_histogram(listings: List[Dict], bins: int = 10) -> List[Dict]:
    prices = [li["monthly_rent"] for li in listings]
    if not prices:
        return []
    lo, hi = min(prices), max(prices)
    if lo == hi:
        return [{"range": f"RM {lo}", "count": len(prices)}]
    step = (hi - lo) / bins
    buckets = [0] * bins
    for p in prices:
        idx = min(int((p - lo) / step), bins - 1)
        buckets[idx] += 1
    out = []
    for i, c in enumerate(buckets):
        b_lo = int(lo + i * step)
        b_hi = int(lo + (i + 1) * step)
        out.append({"range": f"{b_lo}-{b_hi}", "count": c, "low": b_lo, "high": b_hi})
    return out


def compute_rent_per_sqft_by_type(listings: List[Dict]) -> List[Dict]:
    groups: Dict[str, List[float]] = {}
    for li in listings:
        if li.get("size_sqft") and li["size_sqft"] > 0:
            key = li.get("bedroom_type", "Unknown")
            groups.setdefault(key, []).append(li["monthly_rent"] / li["size_sqft"])
    order_map = {"Studio": 0, "1BR": 1, "2BR": 2, "3BR": 3, "4BR": 4}
    out = [
        {"unit_type": k, "rent_per_sqft": round(sum(v) / len(v), 2)}
        for k, v in groups.items()
    ]
    out.sort(key=lambda x: order_map.get(x["unit_type"], 99))
    return out


def compute_rule_based_insights(area: str, listings: List[Dict], by_type: List[Dict], furnishing: List[Dict], overall: Dict) -> List[str]:
    insights: List[str] = []
    if not listings:
        return ["No data available for this area."]
    total = overall["listing_count"]

    # 1. Dominant unit type
    if by_type:
        dominant = max(by_type, key=lambda x: x["listing_count"])
        pct = dominant["listing_count"] / total * 100
        insights.append(f"{dominant['unit_type']} is the most common unit type in {area} ({pct:.0f}% of listings).")

    # 2. Furnishing
    if furnishing:
        top_furn = furnishing[0]
        if top_furn["percentage"] >= 50:
            insights.append(f"{top_furn['percentage']:.0f}% of units in {area} are {top_furn['name'].lower()}.")

    # 3. Price range
    insights.append(
        f"Monthly rent in {area} ranges from RM {overall['min_price']:,} to RM {overall['max_price']:,}, with a median of RM {overall['median_price']:,.0f}."
    )

    # 4. Fair price vs average
    if overall["fair_price"] and overall["average_price"]:
        diff = (overall["fair_price"] - overall["average_price"]) / overall["average_price"] * 100
        if diff < -3:
            insights.append(f"Average asking price is ~{abs(diff):.0f}% higher than fair market value (RM {overall['fair_price']:,.0f}).")
        elif diff > 3:
            insights.append(f"Listings appear underpriced — fair value is ~{diff:.0f}% higher than the average asking price.")
        else:
            insights.append(f"Average asking prices closely match fair market value (RM {overall['fair_price']:,.0f}).")

    # 5. Rent per sqft
    insights.append(f"Average rent per sqft in {area} is RM {overall['rent_per_sqft']:.2f}/sqft.")

    # 6. Highest psf unit type
    psf_by_type = compute_rent_per_sqft_by_type(listings)
    if psf_by_type:
        top_psf = max(psf_by_type, key=lambda x: x["rent_per_sqft"])
        insights.append(f"{top_psf['unit_type']} units yield the highest rent per sqft (RM {top_psf['rent_per_sqft']:.2f}/sqft).")

    return insights[:7]
