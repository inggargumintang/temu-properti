"""SPEEDHOME Rental Market Intelligence — FastAPI Backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from bson import ObjectId

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
    check_lockout, record_failed_attempt, clear_attempts, seed_admin,
)
from data_service import collect_listings, autocomplete_areas, AREA_BASELINES, find_area_match
from analytics import (
    compute_overall_stats, compute_by_unit_type, compute_furnishing_distribution,
    compute_price_histogram, compute_rent_per_sqft_by_type, compute_rule_based_insights,
)
from ai_insights import generate_ai_insights
from exports import export_xlsx, export_csv

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="SPEEDHOME Market Intelligence")
api_router = APIRouter(prefix="/api")


# ===== Models =====
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ROIIn(BaseModel):
    purchase_price: float = Field(gt=0)
    monthly_rent: float = Field(gt=0)
    occupancy_rate: float = Field(ge=0, le=1, default=0.95)
    annual_maintenance: float = Field(ge=0, default=0)
    annual_tax: float = Field(ge=0, default=0)


class SaveAnalysisIn(BaseModel):
    area: str
    payload: dict


# ===== Auth Routes =====
@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name or email.split("@")[0],
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": doc["name"], "role": "user"}


@api_router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    await check_lockout(db, ident)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await record_failed_attempt(db, ident)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await clear_attempts(db, ident)
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name"), "role": user.get("role", "user")}


@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request, db)
    return user


# ===== Search & Analysis =====
@api_router.get("/areas/autocomplete")
async def areas_autocomplete(q: str = ""):
    return {"suggestions": autocomplete_areas(q)}


@api_router.get("/areas/all")
async def all_areas():
    return {"areas": sorted(list(AREA_BASELINES.keys()))}


@api_router.get("/analyze")
async def analyze(area: str, lang: str = "en", request: Request = None):
    user = await get_current_user(request, db)
    if not area or not area.strip():
        raise HTTPException(status_code=400, detail="Area is required")

    # Check cache (24h)
    matched = find_area_match(area) or area.title()
    cached = await db.area_analyses.find_one({"area_name": matched})
    use_cache = False
    if cached:
        ts = cached.get("generated_at")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        if ts and (datetime.now(timezone.utc) - ts.replace(tzinfo=timezone.utc)).total_seconds() < 86400:
            use_cache = True

    if use_cache:
        result = cached["payload"]
        result["from_cache"] = True
    else:
        collection = await collect_listings(area)
        listings = collection["listings"]
        matched = collection["area"]
        overall = compute_overall_stats(listings)
        by_type = compute_by_unit_type(listings)
        furnishing = compute_furnishing_distribution(listings)
        histogram = compute_price_histogram(listings)
        psf_by_type = compute_rent_per_sqft_by_type(listings)
        rule_insights = compute_rule_based_insights(matched, listings, by_type, furnishing, overall)
        result = {
            "area": matched,
            "data_source": collection["source"],
            "listings": listings,
            "overall": overall,
            "by_unit_type": by_type,
            "furnishing_distribution": furnishing,
            "price_histogram": histogram,
            "psf_by_type": psf_by_type,
            "rule_insights": rule_insights,
            "rental_coverage": {
                "monthly": len(listings) > 0,
                "annual": len(listings) > 0,
                "daily": False,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "from_cache": False,
        }
        await db.area_analyses.update_one(
            {"area_name": matched},
            {"$set": {"area_name": matched, "payload": result, "generated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    # AI insights (always fresh, language-aware, not cached)
    ai = await generate_ai_insights(
        result["area"], result["overall"], result["by_unit_type"], result["furnishing_distribution"], lang=lang
    )
    result["ai_insights"] = ai

    # Save to search history
    await db.search_history.insert_one({
        "user_id": user["id"],
        "keyword": area,
        "matched_area": result["area"],
        "search_time": datetime.now(timezone.utc),
    })

    return result


@api_router.get("/search/history")
async def search_history(request: Request):
    user = await get_current_user(request, db)
    cursor = db.search_history.find({"user_id": user["id"]}).sort("search_time", -1).limit(30)
    items = []
    async for it in cursor:
        items.append({
            "id": str(it["_id"]),
            "keyword": it.get("keyword"),
            "matched_area": it.get("matched_area"),
            "search_time": it.get("search_time").isoformat() if it.get("search_time") else None,
        })
    return {"items": items}


# ===== Compare =====
class CompareIn(BaseModel):
    areas: List[str]


@api_router.post("/compare")
async def compare(body: CompareIn, request: Request):
    await get_current_user(request, db)
    if not body.areas or len(body.areas) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 areas")
    if len(body.areas) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 areas allowed")
    results = []
    for a in body.areas:
        collection = await collect_listings(a)
        listings = collection["listings"]
        overall = compute_overall_stats(listings)
        results.append({
            "area": collection["area"],
            "overall": overall,
            "listing_count": overall["listing_count"],
        })
    return {"comparison": results}


# ===== ROI =====
@api_router.post("/roi")
async def roi(body: ROIIn, request: Request):
    await get_current_user(request, db)
    annual_gross = body.monthly_rent * 12 * body.occupancy_rate
    expenses = body.annual_maintenance + body.annual_tax
    net_income = annual_gross - expenses
    gross_yield = annual_gross / body.purchase_price * 100
    net_yield = net_income / body.purchase_price * 100
    payback = body.purchase_price / net_income if net_income > 0 else None
    return {
        "annual_gross_income": round(annual_gross, 2),
        "annual_expenses": round(expenses, 2),
        "net_income": round(net_income, 2),
        "gross_yield": round(gross_yield, 2),
        "net_yield": round(net_yield, 2),
        "payback_period": round(payback, 1) if payback else None,
    }


# ===== Saved analyses =====
@api_router.post("/saved")
async def save_analysis(body: SaveAnalysisIn, request: Request):
    user = await get_current_user(request, db)
    doc = {
        "user_id": user["id"],
        "area": body.area,
        "payload": body.payload,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.saved_analyses.insert_one(doc)
    return {"id": str(res.inserted_id)}


@api_router.get("/saved")
async def list_saved(request: Request):
    user = await get_current_user(request, db)
    cursor = db.saved_analyses.find({"user_id": user["id"]}).sort("created_at", -1)
    items = []
    async for it in cursor:
        items.append({
            "id": str(it["_id"]),
            "area": it.get("area"),
            "created_at": it.get("created_at").isoformat() if it.get("created_at") else None,
            "overall": (it.get("payload") or {}).get("overall"),
        })
    return {"items": items}


@api_router.get("/saved/{saved_id}")
async def get_saved(saved_id: str, request: Request):
    user = await get_current_user(request, db)
    try:
        doc = await db.saved_analyses.find_one({"_id": ObjectId(saved_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": str(doc["_id"]),
        "area": doc.get("area"),
        "payload": doc.get("payload"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


@api_router.delete("/saved/{saved_id}")
async def delete_saved(saved_id: str, request: Request):
    user = await get_current_user(request, db)
    try:
        await db.saved_analyses.delete_one({"_id": ObjectId(saved_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ===== Export =====
@api_router.get("/export/{fmt}")
async def export(fmt: str, area: str, request: Request):
    await get_current_user(request, db)
    if fmt not in ("xlsx", "csv"):
        raise HTTPException(status_code=400, detail="Format must be xlsx or csv")
    collection = await collect_listings(area)
    listings = collection["listings"]
    matched = collection["area"]
    overall = compute_overall_stats(listings)
    by_type = compute_by_unit_type(listings)
    furnishing = compute_furnishing_distribution(listings)
    rule_insights = compute_rule_based_insights(matched, listings, by_type, furnishing, overall)

    safe_area = matched.replace(" ", "_")
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"SPEEDHOME_{safe_area}_{date_str}.{fmt}"

    if fmt == "xlsx":
        data = export_xlsx(matched, overall, by_type, listings, rule_insights, furnishing)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        data = export_csv(listings)
        media = "text/csv"

    # Log export
    await db.export_history.insert_one({
        "area": matched,
        "format": fmt,
        "filename": filename,
        "created_at": datetime.now(timezone.utc),
    })

    return StreamingResponse(
        io.BytesIO(data),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api_router.get("/export/history/list")
async def export_history(request: Request):
    await get_current_user(request, db)
    cursor = db.export_history.find().sort("created_at", -1).limit(50)
    items = []
    async for it in cursor:
        items.append({
            "id": str(it["_id"]),
            "area": it.get("area"),
            "format": it.get("format"),
            "filename": it.get("filename"),
            "created_at": it.get("created_at").isoformat() if it.get("created_at") else None,
        })
    return {"items": items}


@api_router.get("/")
async def root():
    return {"service": "SPEEDHOME Market Intelligence", "status": "ok"}


# Register router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.search_history.create_index([("user_id", 1), ("search_time", -1)])
    await db.area_analyses.create_index("area_name", unique=True)
    await seed_admin(db)
    logger.info("Startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
