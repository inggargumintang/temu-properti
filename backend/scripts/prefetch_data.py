# scripts/prefetch_data.py
import asyncio
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from data_service import collect_listings, AREA_BASELINES

async def main():
    all_data = {}
    areas = list(AREA_BASELINES.keys())
    
    for area in areas:
        print(f"Fetching {area}...")
        result = await collect_listings(area)
        all_data[area] = result
        print(f"  → {len(result['listings'])} listings ({result['source']})")
    
    output = Path("static_data/listings.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(all_data, indent=2, ensure_ascii=False))
    print(f"\nDone! Saved to {output}")

asyncio.run(main())