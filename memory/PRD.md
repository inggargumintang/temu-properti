# SPEEDHOME Rental Market Intelligence — PRD

## Original Problem Statement
Web app to analyze property rental prices in Malaysia using public SPEEDHOME data. Target users: Property Investor, Agent, Owner, Researcher, Tenant.

## Architecture
- **Backend:** FastAPI + MongoDB (motor). Routes prefixed with `/api`.
- **Frontend:** React 19 + React Router + Tailwind + Shadcn UI + Recharts + Phosphor icons.
- **Auth:** JWT (httpOnly cookies) — register/login/logout/me.
- **Data Acquisition:** Hybrid — tries live SPEEDHOME scrape (httpx + bs4), falls back to realistic mock data for 25 Malaysian areas.
- **AI Insights:** Emergent LLM Key → Claude Sonnet 4.5 (bilingual EN/ID).
- **Exports:** XLSX (openpyxl, 4 sheets) and CSV.
- **Caching:** 24h area analysis cache in `area_analyses` collection.

## User Personas
- Property Investor — ROI calculator, area comparison
- Property Agent — fair price benchmarks
- Property Owner — pricing realism
- Researcher — exportable data
- Tenant — market price awareness

## What's Been Implemented (2026-06-26)
- JWT auth with seeded admin (admin@speedhome.com / Admin@12345), register allowed
- Bilingual (EN/ID) UI with language switcher
- Sidebar dashboard: Dashboard, Search, Saved Analysis, Compare Areas, ROI Calculator, Export History, Settings
- Search with realtime autocomplete (25 Malaysian areas)
- Dashboard: 6 KPI cards, 4 charts (histogram, avg-by-type bar, furnishing pie, psf bar), AI + rule insights
- Price Summary table by unit type
- Unit Listings table with pagination, sort, filter
- ROI Calculator (gross/net yield, payback)
- Compare Areas (up to 5)
- Saved Analyses (CRUD)
- Export to XLSX (4 sheets) and CSV
- Export History log

## Auth Credentials
- Admin: `admin@speedhome.com` / `Admin@12345` (seeded on startup)
- Register endpoint open for new accounts

## Backlog (P1/P2)
- Live scrape robustness (currently falls back to mock in dev environment)
- Historical price tracking
- Email alerts on price changes
- Portfolio tracking
- AI Market Report PDF
- Multi-platform support (PropertyGuru, iProperty, Mudah)
- Price prediction ML

## Key Files
- backend: server.py, auth.py, data_service.py, analytics.py, ai_insights.py, exports.py
- frontend: App.js, pages/{Dashboard,Login,Register,Search,Compare,ROI,SavedAnalysis,ExportHistory,Settings}.jsx
- frontend components: Sidebar, Layout, SearchBar, ProtectedRoute
