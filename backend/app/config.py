import os
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DATABASE_URL = os.getenv("NOVA_DATABASE_URL", f"sqlite:///{ROOT / 'nova.db'}")
TIMEZONE = ZoneInfo(os.getenv("NOVA_TIMEZONE", "Asia/Kolkata"))
ORIGINS = os.getenv("NOVA_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
