import os
import random
import statistics
import threading
import time
import urllib3
import uuid
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# =====================================================================
# Configuration from Environment Variables
# =====================================================================

# Individual service URLs (can point to individual ports or reverse proxy)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
AUTH_URL = os.getenv("AUTH_URL", os.getenv("BASE_URL", "http://localhost:3002")).rstrip("/")
ITEM_URL = os.getenv("ITEM_URL", "http://localhost:3001").rstrip("/")
ORDER_URL = os.getenv("ORDER_URL", "http://localhost:3003").rstrip("/")

# If BASE_URL was provided and pointed to an auth sub-path, normalize it
if "/api/v1/auth" in AUTH_URL:
    AUTH_URL = AUTH_URL.split("/api/v1/auth")[0].rstrip("/")

# Filter which services to test: 'all' or comma-separated list (e.g. 'frontend,auth,item,order')
TARGET_SERVICES = [
    s.strip().lower()
    for s in os.getenv("TARGET_SERVICES", "all").split(",")
    if s.strip()
]
if "all" in TARGET_SERVICES:
    TARGET_SERVICES = ["frontend", "auth", "item", "order"]

DURATION_SECONDS = int(os.getenv("DURATION", "60"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "8"))
TEST_EMAIL = os.getenv("TEST_EMAIL", "testseller@gmail.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Test@1234")
RUN_PREFLIGHT = os.getenv("PREFLIGHT", "true").lower() in ("true", "1", "yes")
# Fraction of requests to intentionally simulate as failed requests (e.g. 0.20 = 20%)
FAILURE_RATE = float(os.getenv("FAILURE_RATE", "0.20"))

# Known seed item ID in Order-Service DB for order creation
DEFAULT_ORDER_ITEM_ID = os.getenv("ORDER_ITEM_ID", "6aac0e6bd184e81fe0ffac61")

# =====================================================================
# Global Statistics & Context
# =====================================================================
stats = {
    "total": 0,
    "success": 0,
    "failure": 0,
    "latencies": [],
    "status_codes": {},
}
stats_lock = threading.Lock()
stop_event = threading.Event()

# Shared Context for Auth Tokens, User IDs, Items, and Orders
auth_context = {
    "buyer": {"token": None, "refresh_token": None, "user_id": None},
    "seller": {"token": None, "refresh_token": None, "user_id": None},
    "admin": {"token": None, "refresh_token": None, "user_id": None},
}
item_context = {
    "item_ids": [],
    "category_names": ["Electronics", "Computer", "Furniture", "Accessories"],
}
order_context = {
    "order_ids": [],
    "valid_item_id": DEFAULT_ORDER_ITEM_ID,
}
context_lock = threading.Lock()


def get_headers(worker_id=0, token=None, user_id=None):
    ip = f"10.{random.randint(1, 250)}.{worker_id % 250}.{random.randint(1, 250)}"
    headers = {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if user_id:
        headers["x-user-id"] = user_id
    return headers


def record_metric(endpoint_name, status_code, latency_ms):
    with stats_lock:
        stats["total"] += 1
        stats["status_codes"][status_code] = stats["status_codes"].get(status_code, 0) + 1
        stats["latencies"].append(latency_ms)

        if endpoint_name not in endpoint_stats:
            endpoint_stats[endpoint_name] = {
                "total": 0,
                "success": 0,
                "failure": 0,
                "latencies": [],
                "status_codes": {},
            }

        ep = endpoint_stats[endpoint_name]
        ep["total"] += 1
        ep["status_codes"][status_code] = ep["status_codes"].get(status_code, 0) + 1
        ep["latencies"].append(latency_ms)

        if isinstance(status_code, int) and 200 <= status_code < 300:
            stats["success"] += 1
            ep["success"] += 1
        else:
            stats["failure"] += 1
            ep["failure"] += 1


def generate_user_payload(role="buyer"):
    uid = uuid.uuid4().hex[:8]
    return {
        "firstName": f"Load{role.capitalize()}",
        "lastName": "Tester",
        "username": f"user_{uid}",
        "email": f"load_{role}_{uid}@example.com",
        "password": "Password@123",
        "phoneNumber": f"+1{random.randint(1000000000, 9999999999)}",
        "role": role,
    }


def seed_account(role, session):
    headers = get_headers(worker_id=0)
    if role == "seller":
        try:
            resp = session.post(
                f"{AUTH_URL}/api/v1/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
                headers=headers,
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                token = data.get("access_token")
                refresh_token = data.get("refresh_token")
                prof_resp = session.get(
                    f"{AUTH_URL}/api/v1/auth/profile",
                    headers=get_headers(token=token),
                    timeout=10,
                )
                user_id = prof_resp.json().get("data", {}).get("_id")
                return token, refresh_token, user_id
        except Exception:
            pass

    payload = generate_user_payload(role=role)
    try:
        reg_resp = session.post(
            f"{AUTH_URL}/api/v1/auth/register",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if reg_resp.status_code == 201:
            user_data = reg_resp.json().get("data", {})
            user_id = user_data.get("user_id")

            log_resp = session.post(
                f"{AUTH_URL}/api/v1/auth/login",
                json={"email": payload["email"], "password": payload["password"]},
                headers=headers,
                timeout=10,
            )
            if log_resp.status_code == 200:
                data = log_resp.json().get("data", {})
                return data.get("access_token"), data.get("refresh_token"), user_id
    except Exception as e:
        print(f"⚠️ Warning: Failed seeding {role} account: {e}")

    return None, None, None


def initialize_environment():
    session = requests.Session()
    print("🔑 Initializing test data across services...")

    # 1. Auth Service accounts
    if "auth" in TARGET_SERVICES:
        for role in ["seller", "buyer", "admin"]:
            token, refresh_token, user_id = seed_account(role, session)
            with context_lock:
                auth_context[role]["token"] = token
                auth_context[role]["refresh_token"] = refresh_token
                auth_context[role]["user_id"] = user_id
            status_text = "READY" if token else "FAILED"
            print(f"   - [Auth] {role.capitalize():<6} account: {status_text} (ID: {user_id or 'N/A'})")

    # 2. Item Service initial item discovery
    if "item" in TARGET_SERVICES:
        try:
            r = session.get(f"{ITEM_URL}/api/v1/items?page=1&limit=10", timeout=10)
            if r.status_code == 200:
                items = r.json().get("data", {}).get("items", [])
                with context_lock:
                    item_context["item_ids"] = [it["_id"] for it in items if "_id" in it]
                print(f"   - [Item] Discovered {len(item_context['item_ids'])} existing catalog items")
        except Exception as e:
            print(f"   - [Item] Warning discovering items: {e}")

    # 3. Order Service initial orders discovery
    if "order" in TARGET_SERVICES:
        try:
            r = session.get(f"{ORDER_URL}/api/v1/orders", timeout=10)
            if r.status_code == 200:
                orders = r.json().get("data", [])
                with context_lock:
                    order_context["order_ids"] = [o["_id"] for o in orders if "_id" in o]
                print(f"   - [Order] Discovered {len(order_context['order_ids'])} existing orders")
        except Exception as e:
            print(f"   - [Order] Warning discovering orders: {e}")


def get_token(role="seller"):
    with context_lock:
        return auth_context[role]["token"] or auth_context["buyer"]["token"]


def get_refresh_token(role="seller"):
    with context_lock:
        return auth_context[role]["refresh_token"] or auth_context["buyer"]["refresh_token"]


def get_user_id(role="seller"):
    with context_lock:
        return auth_context[role]["user_id"] or auth_context["buyer"]["user_id"] or "u-load-test"


def get_random_item_id():
    with context_lock:
        if item_context["item_ids"]:
            return random.choice(item_context["item_ids"])
    return "6a76392fac0f834bcf2f37e1"


def get_random_order_id():
    with context_lock:
        if order_context["order_ids"]:
            return random.choice(order_context["order_ids"])
    return "6aac0e6e0fc79c89a9a152e1"


# =====================================================================
# 1. FRONTEND SERVICE EXECUTORS (Port 3000)
# =====================================================================

def execute_frontend_home(session, worker_id, fail=False):
    endpoint = "[Frontend] GET /"
    t0 = time.time()
    if fail:
        resp = session.get(f"{FRONTEND_URL}/non-existent-page-{uuid.uuid4().hex[:6]}", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{FRONTEND_URL}/", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_frontend_catalog(session, worker_id, fail=False):
    endpoint = "[Frontend] GET /catalog"
    t0 = time.time()
    if fail:
        resp = session.post(f"{FRONTEND_URL}/catalog", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{FRONTEND_URL}/catalog", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_frontend_auth_buyer(session, worker_id, fail=False):
    endpoint = "[Frontend] GET /auth/buyer"
    t0 = time.time()
    if fail:
        resp = session.post(f"{FRONTEND_URL}/auth/buyer", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{FRONTEND_URL}/auth/buyer", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_frontend_auth_seller(session, worker_id, fail=False):
    endpoint = "[Frontend] GET /auth/seller"
    t0 = time.time()
    if fail:
        resp = session.post(f"{FRONTEND_URL}/auth/seller", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{FRONTEND_URL}/auth/seller", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_frontend_profile(session, worker_id, fail=False):
    endpoint = "[Frontend] GET /profile"
    t0 = time.time()
    if fail:
        resp = session.post(f"{FRONTEND_URL}/profile", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{FRONTEND_URL}/profile", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_frontend_health(session, worker_id, fail=False):
    endpoint = "[Frontend] GET /api/health"
    t0 = time.time()
    if fail:
        resp = session.post(f"{FRONTEND_URL}/api/health", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{FRONTEND_URL}/api/health", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


# =====================================================================
# 2. AUTH SERVICE EXECUTORS (Port 3002)
# =====================================================================

def execute_auth_root(session, worker_id, fail=False):
    endpoint = "[Auth] GET /"
    t0 = time.time()
    if fail:
        resp = session.post(f"{AUTH_URL}/", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{AUTH_URL}/", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_info(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/info"
    t0 = time.time()
    if fail:
        resp = session.post(f"{AUTH_URL}/api/v1/auth/info", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/info", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_health(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/health"
    t0 = time.time()
    if fail:
        resp = session.post(f"{AUTH_URL}/api/v1/auth/health", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/health", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_api_docs(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/api-docs/"
    t0 = time.time()
    if fail:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/api-docs/",
            data="malformed{json",
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
    else:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/api-docs/", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_register(session, worker_id, fail=False):
    endpoint = "[Auth] POST /api/v1/auth/register"
    t0 = time.time()
    if fail:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/register",
            json={"username": "ab", "email": "invalid-email"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        payload = generate_user_payload(random.choice(["buyer", "seller"]))
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/register",
            json=payload,
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_login(session, worker_id, fail=False):
    endpoint = "[Auth] POST /api/v1/auth/login"
    t0 = time.time()
    if fail:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/login",
            json={"email": TEST_EMAIL, "password": "WrongPassword@999"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers=get_headers(worker_id),
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            with context_lock:
                if data.get("access_token"):
                    auth_context["seller"]["token"] = data["access_token"]
                if data.get("refresh_token"):
                    auth_context["seller"]["refresh_token"] = data["refresh_token"]
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_refresh(session, worker_id, fail=False):
    endpoint = "[Auth] POST /api/v1/auth/refresh"
    t0 = time.time()
    if fail:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/refresh",
            json={"refresh_token": "malformed.invalid.refresh_token"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        rt = get_refresh_token("seller")
        if not rt:
            return None, None, None
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/refresh",
            json={"refresh_token": rt},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_logout(session, worker_id, fail=False):
    endpoint = "[Auth] POST /api/v1/auth/logout"
    t0 = time.time()
    if fail:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/logout", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(f"{AUTH_URL}/api/v1/auth/logout", json={}, headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_buyer_only(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/buyer-only"
    t0 = time.time()
    if fail:
        tok = get_token("seller")
        resp = session.get(f"{AUTH_URL}/api/v1/auth/buyer-only", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        tok = get_token("buyer")
        if not tok:
            return None, None, None
        resp = session.get(f"{AUTH_URL}/api/v1/auth/buyer-only", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_seller_only(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/seller-only"
    t0 = time.time()
    if fail:
        tok = get_token("buyer")
        resp = session.get(f"{AUTH_URL}/api/v1/auth/seller-only", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        tok = get_token("seller")
        if not tok:
            return None, None, None
        resp = session.get(f"{AUTH_URL}/api/v1/auth/seller-only", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_admin_only(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/admin-only"
    t0 = time.time()
    if fail:
        tok = get_token("buyer")
        resp = session.get(f"{AUTH_URL}/api/v1/auth/admin-only", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        tok = get_token("admin")
        if not tok:
            return None, None, None
        resp = session.get(f"{AUTH_URL}/api/v1/auth/admin-only", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_profile_get(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/profile"
    t0 = time.time()
    if fail:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/profile", headers=get_headers(worker_id, token="invalid.token"), timeout=10)
    else:
        tok = get_token("seller")
        if not tok:
            return None, None, None
        resp = session.get(f"{AUTH_URL}/api/v1/auth/profile", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_profile_detailed(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/profile/detailed"
    t0 = time.time()
    if fail:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/profile/detailed", headers=get_headers(worker_id, token="invalid.token"), timeout=10)
    else:
        tok = get_token("seller")
        if not tok:
            return None, None, None
        resp = session.get(f"{AUTH_URL}/api/v1/auth/profile/detailed", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_avatar_presigned(session, worker_id, fail=False):
    endpoint = "[Auth] GET /api/v1/auth/profile/avatar-presigned-url"
    tok = get_token("seller")
    if not tok:
        return None, None, None
    t0 = time.time()
    if fail:
        resp = session.get(f"{AUTH_URL}/api/v1/auth/profile/avatar-presigned-url", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        resp = session.get(
            f"{AUTH_URL}/api/v1/auth/profile/avatar-presigned-url?fileExtension=png",
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_preview_presigned(session, worker_id, fail=False):
    endpoint = "[Auth] POST /api/v1/auth/profile/presigned-url/preview"
    t0 = time.time()
    if fail:
        resp = session.post(f"{AUTH_URL}/api/v1/auth/profile/presigned-url/preview", json={}, headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/profile/presigned-url/preview",
            json={"file_name": "avatar/images/seller/test.png"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_user_avatar_url(session, worker_id, fail=False):
    endpoint = "[Auth] POST /api/v1/auth/user/avatar-url"
    t0 = time.time()
    if fail:
        resp = session.post(f"{AUTH_URL}/api/v1/auth/user/avatar-url", json={}, headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(
            f"{AUTH_URL}/api/v1/auth/user/avatar-url",
            json={"fileExtension": "png", "role": "buyer"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_user_update(session, worker_id, fail=False):
    endpoint = "[Auth] PUT /api/v1/auth/user/:id"
    tok = get_token("seller") or get_token("buyer")
    if not tok:
        return None, None, None
    t0 = time.time()
    if fail:
        foreign_id = "507f1f77bcf86cd799439011"
        resp = session.put(
            f"{AUTH_URL}/api/v1/auth/user/{foreign_id}",
            json={"city": "FailCity"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    else:
        uid = get_user_id("seller") or get_user_id("buyer")
        resp = session.put(
            f"{AUTH_URL}/api/v1/auth/user/{uid}",
            json={"city": f"City_{random.randint(100, 999)}"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_auth_profile_update(session, worker_id, fail=False):
    endpoint = "[Auth] PUT /api/v1/auth/profile/:id"
    tok = get_token("seller")
    if not tok:
        return None, None, None
    t0 = time.time()
    if fail:
        foreign_id = "507f1f77bcf86cd799439011"
        resp = session.put(
            f"{AUTH_URL}/api/v1/auth/profile/{foreign_id}",
            json={"city": "FailMetro"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    else:
        uid = get_user_id("seller")
        resp = session.put(
            f"{AUTH_URL}/api/v1/auth/profile/{uid}",
            json={"city": f"Metro_{random.randint(100, 999)}"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


# =====================================================================
# 3. ITEM SERVICE EXECUTORS (Port 3001)
# =====================================================================

def execute_item_health(session, worker_id, fail=False):
    endpoint = "[Item] GET /api/v1/items/health"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ITEM_URL}/api/v1/items/health", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{ITEM_URL}/api/v1/items/health", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_info(session, worker_id, fail=False):
    endpoint = "[Item] GET /api/v1/items/info"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ITEM_URL}/api/v1/items/info", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{ITEM_URL}/api/v1/items/info", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_categories_get(session, worker_id, fail=False):
    endpoint = "[Item] GET /api/v1/items/categories"
    t0 = time.time()
    if fail:
        resp = session.put(f"{ITEM_URL}/api/v1/items/categories", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{ITEM_URL}/api/v1/items/categories", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_category_create(session, worker_id, fail=False):
    endpoint = "[Item] POST /api/v1/items/categories"
    t0 = time.time()
    if fail:
        # Empty payload triggers 400 Bad Request
        resp = session.post(f"{ITEM_URL}/api/v1/items/categories", json={}, headers=get_headers(worker_id), timeout=10)
    else:
        cat_name = f"Category_{uuid.uuid4().hex[:6]}"
        resp = session.post(f"{ITEM_URL}/api/v1/items/categories", json={"name": cat_name}, headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_list(session, worker_id, fail=False):
    endpoint = "[Item] GET /api/v1/items"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ITEM_URL}/api/v1/items", json={"invalid": "schema"}, headers=get_headers(worker_id), timeout=10)
    else:
        page = random.randint(1, 3)
        resp = session.get(f"{ITEM_URL}/api/v1/items?page={page}&limit=6", headers=get_headers(worker_id), timeout=10)
        if resp.status_code == 200:
            items = resp.json().get("data", {}).get("items", [])
            with context_lock:
                for it in items:
                    if "_id" in it and it["_id"] not in item_context["item_ids"]:
                        item_context["item_ids"].append(it["_id"])
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_create(session, worker_id, fail=False):
    endpoint = "[Item] POST /api/v1/items"
    t0 = time.time()
    if fail:
        # Invalid schema (missing name, negative price) triggers 400
        resp = session.post(
            f"{ITEM_URL}/api/v1/items",
            json={"price": -5, "quantity": 0},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        payload = {
            "name": f"Product_{uuid.uuid4().hex[:6]}",
            "price": round(random.uniform(15.0, 300.0), 2),
            "quantity": random.randint(5, 50),
            "category": random.choice(item_context["category_names"]),
            "brand": "LoadTestBrand",
        }
        resp = session.post(f"{ITEM_URL}/api/v1/items", json=payload, headers=get_headers(worker_id), timeout=10)
        if resp.status_code == 201:
            item_data = resp.json().get("data", {})
            if "_id" in item_data:
                with context_lock:
                    item_context["item_ids"].append(item_data["_id"])
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_update(session, worker_id, fail=False):
    endpoint = "[Item] PUT /api/v1/items/:id"
    t0 = time.time()
    if fail:
        # Invalid ID or negative price triggers 400
        resp = session.put(
            f"{ITEM_URL}/api/v1/items/invalid-id",
            json={"price": -10},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        item_id = get_random_item_id()
        payload = {
            "name": f"Updated_{uuid.uuid4().hex[:4]}",
            "price": round(random.uniform(20.0, 150.0), 2),
            "quantity": random.randint(1, 20),
        }
        resp = session.put(f"{ITEM_URL}/api/v1/items/{item_id}", json=payload, headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_presigned(session, worker_id, fail=False):
    endpoint = "[Item] GET /api/v1/items/presigned-url"
    t0 = time.time()
    if fail:
        # Missing required fileExtension query param triggers 400
        resp = session.get(f"{ITEM_URL}/api/v1/items/presigned-url", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(
            f"{ITEM_URL}/api/v1/items/presigned-url?fileExtension=png",
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_item_preview(session, worker_id, fail=False):
    endpoint = "[Item] POST /api/v1/items/presigned-url/preview"
    t0 = time.time()
    if fail:
        # Missing file_name in payload triggers 400
        resp = session.post(f"{ITEM_URL}/api/v1/items/presigned-url/preview", json={}, headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(
            f"{ITEM_URL}/api/v1/items/presigned-url/preview",
            json={"file_name": "product/images/sample.png"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


# =====================================================================
# 4. ORDER SERVICE EXECUTORS (Port 3003)
# =====================================================================

def execute_order_health(session, worker_id, fail=False):
    endpoint = "[Order] GET /health"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ORDER_URL}/health", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{ORDER_URL}/health", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_order_info(session, worker_id, fail=False):
    endpoint = "[Order] GET /info"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ORDER_URL}/info", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{ORDER_URL}/info", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_order_list(session, worker_id, fail=False):
    endpoint = "[Order] GET /api/v1/orders"
    t0 = time.time()
    if fail:
        resp = session.delete(f"{ORDER_URL}/api/v1/orders", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{ORDER_URL}/api/v1/orders", headers=get_headers(worker_id), timeout=10)
        if resp.status_code == 200:
            orders = resp.json().get("data", [])
            with context_lock:
                for o in orders:
                    if "_id" in o and o["_id"] not in order_context["order_ids"]:
                        order_context["order_ids"].append(o["_id"])
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_order_create(session, worker_id, fail=False):
    endpoint = "[Order] POST /api/v1/orders"
    t0 = time.time()
    if fail:
        # Invalid item ID format or empty items triggers 400
        resp = session.post(
            f"{ORDER_URL}/api/v1/orders",
            json={"items": []},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        # Use order valid item ID
        payload = {
            "items": [{"item": order_context["valid_item_id"], "quantity": random.randint(1, 4)}]
        }
        resp = session.post(f"{ORDER_URL}/api/v1/orders", json=payload, headers=get_headers(worker_id), timeout=10)
        if resp.status_code == 201:
            order_data = resp.json().get("data", {})
            if "_id" in order_data:
                with context_lock:
                    order_context["order_ids"].append(order_data["_id"])
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_order_get_by_id(session, worker_id, fail=False):
    endpoint = "[Order] GET /api/v1/orders/:id"
    t0 = time.time()
    if fail:
        # Non-existent order ID triggers 404
        resp = session.get(f"{ORDER_URL}/api/v1/orders/507f1f77bcf86cd799439011", headers=get_headers(worker_id), timeout=10)
    else:
        order_id = get_random_order_id()
        resp = session.get(f"{ORDER_URL}/api/v1/orders/{order_id}", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_cart_get(session, worker_id, fail=False):
    endpoint = "[Order] GET /api/v1/cart"
    user_id = f"worker_{worker_id}"
    t0 = time.time()
    if fail:
        resp = session.patch(f"{ORDER_URL}/api/v1/cart", headers=get_headers(worker_id, user_id=user_id), timeout=10)
    else:
        resp = session.get(f"{ORDER_URL}/api/v1/cart", headers=get_headers(worker_id, user_id=user_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_cart_count(session, worker_id, fail=False):
    endpoint = "[Order] GET /api/v1/cart/count"
    user_id = f"worker_{worker_id}"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ORDER_URL}/api/v1/cart/count", headers=get_headers(worker_id, user_id=user_id), timeout=10)
    else:
        resp = session.get(f"{ORDER_URL}/api/v1/cart/count", headers=get_headers(worker_id, user_id=user_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_cart_add(session, worker_id, fail=False):
    endpoint = "[Order] POST /api/v1/cart/items"
    user_id = f"worker_{worker_id}"
    t0 = time.time()
    if fail:
        # Missing required name and price triggers 400
        resp = session.post(
            f"{ORDER_URL}/api/v1/cart/items",
            json={"productId": "item_123"},
            headers=get_headers(worker_id, user_id=user_id),
            timeout=10,
        )
    else:
        payload = {
            "productId": f"prod_{random.randint(1, 20)}",
            "name": f"Cart Product {random.randint(1, 20)}",
            "price": round(random.uniform(10.0, 100.0), 2),
            "quantity": random.randint(1, 3),
            "category": "Electronics",
        }
        resp = session.post(
            f"{ORDER_URL}/api/v1/cart/items",
            json=payload,
            headers=get_headers(worker_id, user_id=user_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_cart_update(session, worker_id, fail=False):
    endpoint = "[Order] PUT /api/v1/cart/items/:productId"
    user_id = f"worker_{worker_id}"
    prod_id = f"prod_{random.randint(1, 20)}"
    t0 = time.time()
    if fail:
        # Negative quantity triggers 400
        resp = session.put(
            f"{ORDER_URL}/api/v1/cart/items/{prod_id}",
            json={"quantity": -1},
            headers=get_headers(worker_id, user_id=user_id),
            timeout=10,
        )
    else:
        resp = session.put(
            f"{ORDER_URL}/api/v1/cart/items/{prod_id}",
            json={"quantity": random.randint(1, 5)},
            headers=get_headers(worker_id, user_id=user_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_cart_sync(session, worker_id, fail=False):
    endpoint = "[Order] POST /api/v1/cart/sync"
    user_id = f"worker_{worker_id}"
    t0 = time.time()
    if fail:
        resp = session.post(
            f"{ORDER_URL}/api/v1/cart/sync",
            json={"items": "invalid_array"},
            headers=get_headers(worker_id, user_id=user_id),
            timeout=10,
        )
    else:
        payload = {
            "items": [
                {
                    "productId": f"prod_{random.randint(1, 5)}",
                    "name": "Sync Item 1",
                    "price": 29.99,
                    "quantity": 2,
                }
            ]
        }
        resp = session.post(
            f"{ORDER_URL}/api/v1/cart/sync",
            json=payload,
            headers=get_headers(worker_id, user_id=user_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_cart_clear(session, worker_id, fail=False):
    endpoint = "[Order] DELETE /api/v1/cart"
    user_id = f"worker_{worker_id}"
    t0 = time.time()
    if fail:
        resp = session.post(f"{ORDER_URL}/api/v1/cart", json={"invalid": True}, headers=get_headers(worker_id, user_id=user_id), timeout=10)
    else:
        resp = session.delete(f"{ORDER_URL}/api/v1/cart", headers=get_headers(worker_id, user_id=user_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


# =====================================================================
# Action Registry & Discovery
# =====================================================================

SERVICE_ACTIONS = {
    "frontend": [
        ("execute_frontend_home", execute_frontend_home),
        ("execute_frontend_catalog", execute_frontend_catalog),
        ("execute_frontend_auth_buyer", execute_frontend_auth_buyer),
        ("execute_frontend_auth_seller", execute_frontend_auth_seller),
        ("execute_frontend_profile", execute_frontend_profile),
        ("execute_frontend_health", execute_frontend_health),
    ],
    "auth": [
        ("execute_auth_root", execute_auth_root),
        ("execute_auth_info", execute_auth_info),
        ("execute_auth_health", execute_auth_health),
        ("execute_auth_api_docs", execute_auth_api_docs),
        ("execute_auth_register", execute_auth_register),
        ("execute_auth_login", execute_auth_login),
        ("execute_auth_refresh", execute_auth_refresh),
        ("execute_auth_logout", execute_auth_logout),
        ("execute_auth_buyer_only", execute_auth_buyer_only),
        ("execute_auth_seller_only", execute_auth_seller_only),
        ("execute_auth_admin_only", execute_auth_admin_only),
        ("execute_auth_profile_get", execute_auth_profile_get),
        ("execute_auth_profile_detailed", execute_auth_profile_detailed),
        ("execute_auth_avatar_presigned", execute_auth_avatar_presigned),
        ("execute_auth_preview_presigned", execute_auth_preview_presigned),
        ("execute_auth_profile_update", execute_auth_profile_update),
        ("execute_auth_user_avatar_url", execute_auth_user_avatar_url),
        ("execute_auth_user_update", execute_auth_user_update),
    ],
    "item": [
        ("execute_item_health", execute_item_health),
        ("execute_item_info", execute_item_info),
        ("execute_item_categories_get", execute_item_categories_get),
        ("execute_item_category_create", execute_item_category_create),
        ("execute_item_list", execute_item_list),
        ("execute_item_create", execute_item_create),
        ("execute_item_update", execute_item_update),
        ("execute_item_presigned", execute_item_presigned),
        ("execute_item_preview", execute_item_preview),
    ],
    "order": [
        ("execute_order_health", execute_order_health),
        ("execute_order_info", execute_order_info),
        ("execute_order_list", execute_order_list),
        ("execute_order_create", execute_order_create),
        ("execute_order_get_by_id", execute_order_get_by_id),
        ("execute_cart_get", execute_cart_get),
        ("execute_cart_count", execute_cart_count),
        ("execute_cart_add", execute_cart_add),
        ("execute_cart_update", execute_cart_update),
        ("execute_cart_sync", execute_cart_sync),
        ("execute_cart_clear", execute_cart_clear),
    ],
}

# Build active action dispatch list based on enabled target services
ACTION_DISPATCH = {}
ENDPOINT_NAMES = []
endpoint_stats = {}

for svc in TARGET_SERVICES:
    if svc in SERVICE_ACTIONS:
        for name, fn in SERVICE_ACTIONS[svc]:
            ACTION_DISPATCH[name] = fn

ACTIONS = list(ACTION_DISPATCH.keys())


def run_preflight_check():
    """Runs tests across all registered endpoints verifying BOTH success (2xx) and failure (4xx) handling."""
    print("\n🔍 Running Preflight Sanity Check across target services:", ", ".join(TARGET_SERVICES))
    print("   Verifying both Success (2xx) and Simulated Failure (4xx) paths:\n")
    session = requests.Session()
    working_actions = []

    for action_name in ACTIONS:
        func = ACTION_DISPATCH[action_name]
        try:
            # 1. Success test
            ep_s, sc_s, lat_s = func(session, worker_id=0, fail=False)
            icon_s = "✓" if sc_s and 200 <= sc_s < 300 else "✗"
            desc_s = f"OK [{sc_s}]" if sc_s else "ERR"

            # 2. Failure test
            ep_f, sc_f, lat_f = func(session, worker_id=0, fail=True)
            icon_f = "✓" if sc_f and 400 <= sc_f < 600 else "✗"
            desc_f = f"FAIL-SIM [{sc_f}]" if sc_f else "ERR"

            ep_name = ep_s or ep_f or action_name
            if ep_name not in ENDPOINT_NAMES:
                ENDPOINT_NAMES.append(ep_name)
                endpoint_stats[ep_name] = {
                    "total": 0,
                    "success": 0,
                    "failure": 0,
                    "latencies": [],
                    "status_codes": {},
                }

            is_working = (sc_s and 200 <= sc_s < 300)
            if is_working:
                working_actions.append(action_name)

            lat_s_str = f"{lat_s:5.1f}ms" if lat_s is not None else " N/A "
            lat_f_str = f"{lat_f:5.1f}ms" if lat_f is not None else " N/A "
            print(f"   {icon_s} {ep_name:<46} -> {desc_s:<12} ({lat_s_str}) | {icon_f} {desc_f:<16} ({lat_f_str})")
        except Exception as e:
            print(f"   ✗ Action {action_name:<45} -> Exception: {e}")

    print("-" * 80)
    print(f"   Verified {len(working_actions)}/{len(ACTIONS)} endpoints active and working.")
    print("-" * 80)
    return working_actions


def worker(worker_id, active_actions):
    session = requests.Session()

    while not stop_event.is_set():
        action = random.choice(active_actions)
        func = ACTION_DISPATCH[action]
        should_fail = random.random() < FAILURE_RATE
        endpoint_name = ""

        try:
            endpoint_name, status_code, latency_ms = func(session, worker_id, fail=should_fail)
            if endpoint_name and status_code is not None:
                record_metric(endpoint_name, status_code, latency_ms)
        except Exception:
            if endpoint_name:
                record_metric(endpoint_name, "error", 0.0)
            else:
                with stats_lock:
                    stats["total"] += 1
                    stats["failure"] += 1
                    stats["status_codes"]["error"] = stats["status_codes"].get("error", 0) + 1

        time.sleep(random.uniform(0.04, 0.12))


if __name__ == "__main__":
    print("=" * 80)
    print(f"🚀 Microservices Full-Stack Load Test")
    print(f"   Target Services: {', '.join(TARGET_SERVICES).upper()}")
    print(f"   Frontend URL:    {FRONTEND_URL}")
    print(f"   Auth-Service:    {AUTH_URL}")
    print(f"   Item-Service:    {ITEM_URL}")
    print(f"   Order-Service:   {ORDER_URL}")
    print(f"   Duration:        {DURATION_SECONDS}s")
    print(f"   Concurrency:     {CONCURRENCY} workers")
    print(f"   Failure Rate:    {FAILURE_RATE * 100:.1f}% (simulating realistic 4xx failures)")
    print("=" * 80)

    initialize_environment()

    active_actions = ACTIONS
    if RUN_PREFLIGHT:
        verified_working = run_preflight_check()
        if verified_working:
            active_actions = verified_working

    print(f"\n⚡ Commencing multi-service load test across {len(active_actions)} endpoints for {DURATION_SECONDS} seconds...")
    start_time = time.time()
    threads = []

    for i in range(CONCURRENCY):
        t = threading.Thread(target=worker, args=(i, active_actions))
        t.daemon = True
        t.start()
        threads.append(t)

    try:
        while time.time() - start_time < DURATION_SECONDS:
            elapsed = time.time() - start_time
            with stats_lock:
                tot = stats["total"]
                suc = stats["success"]
                fail = stats["failure"]
                recent_lat = stats["latencies"][-10:] if stats["latencies"] else []
                avg_recent = sum(recent_lat) / len(recent_lat) if recent_lat else 0

            progress = int((elapsed / DURATION_SECONDS) * 30)
            bar = "█" * progress + "░" * (30 - progress)
            print(
                f"\r[{bar}] {int(elapsed):2d}s/{DURATION_SECONDS}s | Sent: {tot:4d} | OK: {suc:4d} | Err: {fail:2d} | Curr Lat: {avg_recent:5.1f}ms",
                end="",
                flush=True,
            )
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Load test stopped early by user...")

    stop_event.set()
    for t in threads:
        t.join(timeout=2)

    total_time = time.time() - start_time
    print(f"\n\n🏁 Load Test Completed in {total_time:.2f} seconds")
    print("=" * 80)
    print(f"Total Requests:      {stats['total']}")
    print(f"Successful (2xx):    {stats['success']}")
    print(f"Failed (4xx/5xx):    {stats['failure']}")
    print(f"Status Breakdown:    {dict(stats['status_codes'])}")
    if total_time > 0:
        print(f"Overall Throughput:  {stats['total'] / total_time:.2f} req/s")

    if stats["latencies"]:
        lats = sorted(stats["latencies"])
        p50 = statistics.median(lats)
        p90 = statistics.quantiles(lats, n=100)[89] if len(lats) >= 100 else statistics.quantiles(lats, n=10)[8] if len(lats) >= 10 else max(lats)
        p99 = statistics.quantiles(lats, n=100)[98] if len(lats) >= 100 else max(lats)

        print("-" * 80)
        print(f"Overall Min Latency: {min(lats):.2f} ms")
        print(f"Overall Avg Latency: {sum(lats) / len(lats):.2f} ms")
        print(f"Overall p50 Median:  {p50:.2f} ms")
        print(f"Overall p90 Latency: {p90:.2f} ms")
        print(f"Overall p99 Latency: {p99:.2f} ms")
        print(f"Overall Max Latency: {max(lats):.2f} ms")

    print("\n" + "=" * 80)
    print("📊 PER-ENDPOINT BREAKDOWN (SUCCESS & FAILURE DISTRIBUTION)")
    print("=" * 80)
    print(f"{'Endpoint':<46} {'Reqs':>5} {'OK%':>6} {'Avg(ms)':>8} {'p95(ms)':>8}  {'Status Codes'}")
    print("-" * 80)

    # Sort endpoints by name grouped by service
    sorted_endpoints = sorted(list(endpoint_stats.keys()))
    for ep_name in sorted_endpoints:
        data = endpoint_stats[ep_name]
        ep_total = data["total"]
        if ep_total > 0:
            ok_pct = (data["success"] / ep_total) * 100
            ep_lats = sorted(data["latencies"])
            avg_lat = sum(ep_lats) / len(ep_lats)
            p95 = statistics.quantiles(ep_lats, n=20)[18] if len(ep_lats) >= 20 else max(ep_lats)
            codes_str = ", ".join(f"{k}:{v}" for k, v in sorted(data["status_codes"].items(), key=lambda x: str(x[0])))
            print(f"{ep_name:<46} {ep_total:>5d} {ok_pct:>5.1f}% {avg_lat:>8.1f} {p95:>8.1f}  [{codes_str}]")
        else:
            print(f"{ep_name:<46} {'0':>5} {'N/A':>6} {'N/A':>8} {'N/A':>8}  []")

    print("=" * 80)
