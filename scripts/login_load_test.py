import os
import random
import statistics
import threading
import time
import urllib3
import uuid
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration from Environment Variables
RAW_URL = os.getenv("BASE_URL", os.getenv("TARGET_URL", "http://localhost:3002"))
if "/api/v1/auth" in RAW_URL:
    BASE_URL = RAW_URL.split("/api/v1/auth")[0].rstrip("/")
else:
    BASE_URL = RAW_URL.rstrip("/")

DURATION_SECONDS = int(os.getenv("DURATION", "60"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "8"))
TEST_EMAIL = os.getenv("TEST_EMAIL", "testseller@gmail.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Test@1234")
RUN_PREFLIGHT = os.getenv("PREFLIGHT", "true").lower() in ("true", "1", "yes")
# Fraction of requests to intentionally simulate as failed requests (e.g. 0.20 = 20%)
FAILURE_RATE = float(os.getenv("FAILURE_RATE", "0.20"))

# Global Statistics
stats = {
    "total": 0,
    "success": 0,
    "failure": 0,
    "latencies": [],
    "status_codes": {},
}
stats_lock = threading.Lock()
stop_event = threading.Event()

# Per-Endpoint Statistics
ENDPOINT_NAMES = [
    "GET /",
    "GET /api/v1/auth/info",
    "GET /api/v1/auth/health",
    "GET /api/v1/auth/api-docs/",
    "POST /api/v1/auth/register",
    "POST /api/v1/auth/login",
    "POST /api/v1/auth/refresh",
    "POST /api/v1/auth/logout",
    "GET /api/v1/auth/buyer-only",
    "GET /api/v1/auth/seller-only",
    "GET /api/v1/auth/admin-only",
    "POST /api/v1/auth/user/avatar-url",
    "PUT /api/v1/auth/user/:id",
    "DELETE /api/v1/auth/user/:id",
    "GET /api/v1/auth/profile",
    "GET /api/v1/auth/profile/detailed",
    "GET /api/v1/auth/profile/avatar-presigned-url",
    "POST /api/v1/auth/profile/presigned-url/preview",
    "PUT /api/v1/auth/profile/:id",
    "DELETE /api/v1/auth/profile/:id",
]

endpoint_stats = {
    name: {
        "total": 0,
        "success": 0,
        "failure": 0,
        "latencies": [],
        "status_codes": {},
    }
    for name in ENDPOINT_NAMES
}

# Shared Context for Auth Tokens & User IDs
auth_context = {
    "buyer": {"token": None, "refresh_token": None, "user_id": None},
    "seller": {"token": None, "refresh_token": None, "user_id": None},
    "admin": {"token": None, "refresh_token": None, "user_id": None},
}
context_lock = threading.Lock()


def get_headers(worker_id=0, token=None):
    ip = f"10.{random.randint(1, 250)}.{worker_id % 250}.{random.randint(1, 250)}"
    headers = {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def record_metric(endpoint_name, status_code, latency_ms):
    with stats_lock:
        stats["total"] += 1
        stats["status_codes"][status_code] = stats["status_codes"].get(status_code, 0) + 1
        stats["latencies"].append(latency_ms)

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
                f"{BASE_URL}/api/v1/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
                headers=headers,
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                token = data.get("access_token")
                refresh_token = data.get("refresh_token")
                prof_resp = session.get(
                    f"{BASE_URL}/api/v1/auth/profile",
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
            f"{BASE_URL}/api/v1/auth/register",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if reg_resp.status_code == 201:
            user_data = reg_resp.json().get("data", {})
            user_id = user_data.get("user_id")

            log_resp = session.post(
                f"{BASE_URL}/api/v1/auth/login",
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


def initialize_accounts():
    session = requests.Session()
    print("🔑 Initializing test accounts for roles: buyer, seller, admin...")
    for role in ["seller", "buyer", "admin"]:
        token, refresh_token, user_id = seed_account(role, session)
        with context_lock:
            auth_context[role]["token"] = token
            auth_context[role]["refresh_token"] = refresh_token
            auth_context[role]["user_id"] = user_id
        status_text = "READY" if token else "FAILED"
        print(f"   - {role.capitalize():<6} account: {status_text} (ID: {user_id or 'N/A'})")


def get_token(role="seller"):
    with context_lock:
        return auth_context[role]["token"] or auth_context["buyer"]["token"]


def get_refresh_token(role="seller"):
    with context_lock:
        return auth_context[role]["refresh_token"] or auth_context["buyer"]["refresh_token"]


def get_user_id(role="seller"):
    with context_lock:
        return auth_context[role]["user_id"] or auth_context["buyer"]["user_id"]


# =====================================================================
# Request Executors for Every Route (Success & Simulated Failure)
# =====================================================================

def execute_root(session, worker_id, fail=False):
    endpoint = "GET /"
    t0 = time.time()
    if fail:
        # Unsupported method triggers 404
        resp = session.post(f"{BASE_URL}/", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{BASE_URL}/", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_info(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/info"
    t0 = time.time()
    if fail:
        # Unsupported method triggers 404
        resp = session.post(f"{BASE_URL}/api/v1/auth/info", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{BASE_URL}/api/v1/auth/info", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_health(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/health"
    t0 = time.time()
    if fail:
        # Unsupported method triggers 404
        resp = session.post(f"{BASE_URL}/api/v1/auth/health", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.get(f"{BASE_URL}/api/v1/auth/health", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_api_docs(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/api-docs/"
    t0 = time.time()
    if fail:
        # Malformed JSON payload triggers error in Express middleware
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/api-docs/",
            data="malformed{json",
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
    else:
        resp = session.get(f"{BASE_URL}/api/v1/auth/api-docs/", headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_register(session, worker_id, fail=False):
    endpoint = "POST /api/v1/auth/register"
    t0 = time.time()
    if fail:
        # Missing required fields triggers 400 schema_validation error
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/register",
            json={"username": "ab", "email": "invalid-email"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        payload = generate_user_payload(random.choice(["buyer", "seller"]))
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=payload,
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_login(session, worker_id, fail=False):
    endpoint = "POST /api/v1/auth/login"
    t0 = time.time()
    if fail:
        # Invalid password triggers 401 invalid_credentials
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": TEST_EMAIL, "password": "WrongPassword@999"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/login",
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


def execute_refresh(session, worker_id, fail=False):
    endpoint = "POST /api/v1/auth/refresh"
    t0 = time.time()
    if fail:
        # Malformed JWT refresh token triggers 403 / 400
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/refresh",
            json={"refresh_token": "malformed.invalid.refresh_token"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    else:
        rt = get_refresh_token("seller")
        if not rt:
            return None, None, None
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/refresh",
            json={"refresh_token": rt},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_logout(session, worker_id, fail=False):
    endpoint = "POST /api/v1/auth/logout"
    t0 = time.time()
    if fail:
        # Unsupported method triggers 404
        resp = session.get(f"{BASE_URL}/api/v1/auth/logout", headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(f"{BASE_URL}/api/v1/auth/logout", json={}, headers=get_headers(worker_id), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_buyer_only(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/buyer-only"
    t0 = time.time()
    if fail:
        # Seller token triggers 403 Forbidden
        tok = get_token("seller")
        resp = session.get(f"{BASE_URL}/api/v1/auth/buyer-only", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        tok = get_token("buyer")
        if not tok:
            return None, None, None
        resp = session.get(f"{BASE_URL}/api/v1/auth/buyer-only", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_seller_only(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/seller-only"
    t0 = time.time()
    if fail:
        # Buyer token triggers 403 Forbidden
        tok = get_token("buyer")
        resp = session.get(f"{BASE_URL}/api/v1/auth/seller-only", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        tok = get_token("seller")
        if not tok:
            return None, None, None
        resp = session.get(f"{BASE_URL}/api/v1/auth/seller-only", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_admin_only(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/admin-only"
    t0 = time.time()
    if fail:
        # Buyer/Seller token triggers 403 Forbidden
        tok = get_token("buyer")
        resp = session.get(f"{BASE_URL}/api/v1/auth/admin-only", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        tok = get_token("admin")
        if not tok:
            return None, None, None
        resp = session.get(f"{BASE_URL}/api/v1/auth/admin-only", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_user_avatar_url(session, worker_id, fail=False):
    endpoint = "POST /api/v1/auth/user/avatar-url"
    t0 = time.time()
    if fail:
        # Empty payload triggers 400 schema_validation error
        resp = session.post(f"{BASE_URL}/api/v1/auth/user/avatar-url", json={}, headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/user/avatar-url",
            json={"fileExtension": "png", "role": "buyer"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_user_update(session, worker_id, fail=False):
    endpoint = "PUT /api/v1/auth/user/:id"
    tok = get_token("seller") or get_token("buyer")
    if not tok:
        return None, None, None
    t0 = time.time()
    if fail:
        # Attempting to update another user's ID triggers 403 Forbidden
        foreign_id = "507f1f77bcf86cd799439011"
        resp = session.put(
            f"{BASE_URL}/api/v1/auth/user/{foreign_id}",
            json={"city": "FailCity"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    else:
        uid = get_user_id("seller") or get_user_id("buyer")
        resp = session.put(
            f"{BASE_URL}/api/v1/auth/user/{uid}",
            json={"city": f"City_{random.randint(100, 999)}"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_user_delete(session, worker_id, fail=False):
    endpoint = "DELETE /api/v1/auth/user/:id"
    tok = get_token("buyer")
    t0 = time.time()
    if fail:
        # Attempting to delete another user's account triggers 403 Forbidden
        foreign_id = "507f1f77bcf86cd799439011"
        resp = session.delete(
            f"{BASE_URL}/api/v1/auth/user/{foreign_id}",
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
        return endpoint, resp.status_code, (time.time() - t0) * 1000
    else:
        # Create temp user, then delete it
        tmp = generate_user_payload("buyer")
        r = session.post(f"{BASE_URL}/api/v1/auth/register", json=tmp, headers=get_headers(worker_id), timeout=10)
        if r.status_code == 201:
            u_id = r.json().get("data", {}).get("user_id")
            l = session.post(f"{BASE_URL}/api/v1/auth/login", json={"email": tmp["email"], "password": tmp["password"]}, headers=get_headers(worker_id), timeout=10)
            if l.status_code == 200:
                t = l.json().get("data", {}).get("access_token")
                t0 = time.time()
                resp = session.delete(f"{BASE_URL}/api/v1/auth/user/{u_id}", headers=get_headers(worker_id, token=t), timeout=10)
                return endpoint, resp.status_code, (time.time() - t0) * 1000
    return None, None, None


def execute_profile_get(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/profile"
    t0 = time.time()
    if fail:
        # Invalid bearer token triggers 403 Forbidden
        resp = session.get(f"{BASE_URL}/api/v1/auth/profile", headers=get_headers(worker_id, token="invalid.token.string"), timeout=10)
    else:
        tok = get_token("seller")
        if not tok:
            return None, None, None
        resp = session.get(f"{BASE_URL}/api/v1/auth/profile", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_profile_detailed(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/profile/detailed"
    t0 = time.time()
    if fail:
        # Invalid bearer token triggers 403 Forbidden
        resp = session.get(f"{BASE_URL}/api/v1/auth/profile/detailed", headers=get_headers(worker_id, token="invalid.token.string"), timeout=10)
    else:
        tok = get_token("seller")
        if not tok:
            return None, None, None
        resp = session.get(f"{BASE_URL}/api/v1/auth/profile/detailed", headers=get_headers(worker_id, token=tok), timeout=10)
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_profile_avatar_presigned(session, worker_id, fail=False):
    endpoint = "GET /api/v1/auth/profile/avatar-presigned-url"
    tok = get_token("seller")
    if not tok:
        return None, None, None
    t0 = time.time()
    if fail:
        # Missing required query param fileExtension triggers 400 Bad Request
        resp = session.get(f"{BASE_URL}/api/v1/auth/profile/avatar-presigned-url", headers=get_headers(worker_id, token=tok), timeout=10)
    else:
        resp = session.get(
            f"{BASE_URL}/api/v1/auth/profile/avatar-presigned-url?fileExtension=png",
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_profile_preview_presigned(session, worker_id, fail=False):
    endpoint = "POST /api/v1/auth/profile/presigned-url/preview"
    t0 = time.time()
    if fail:
        # Empty payload triggers 400 schema_validation error
        resp = session.post(f"{BASE_URL}/api/v1/auth/profile/presigned-url/preview", json={}, headers=get_headers(worker_id), timeout=10)
    else:
        resp = session.post(
            f"{BASE_URL}/api/v1/auth/profile/presigned-url/preview",
            json={"file_name": "avatar/images/seller/1786131881740/4415c7bb-ee95-4c2d-b7e2-06efe7c35a31.png"},
            headers=get_headers(worker_id),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_profile_update(session, worker_id, fail=False):
    endpoint = "PUT /api/v1/auth/profile/:id"
    tok = get_token("seller")
    if not tok:
        return None, None, None
    t0 = time.time()
    if fail:
        # Attempting to update another user's profile triggers 403 Forbidden
        foreign_id = "507f1f77bcf86cd799439011"
        resp = session.put(
            f"{BASE_URL}/api/v1/auth/profile/{foreign_id}",
            json={"city": "FailMetro"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    else:
        uid = get_user_id("seller")
        resp = session.put(
            f"{BASE_URL}/api/v1/auth/profile/{uid}",
            json={"city": f"Metro_{random.randint(100, 999)}"},
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
    return endpoint, resp.status_code, (time.time() - t0) * 1000


def execute_profile_delete(session, worker_id, fail=False):
    endpoint = "DELETE /api/v1/auth/profile/:id"
    tok = get_token("buyer")
    t0 = time.time()
    if fail:
        # Attempting to delete another user's profile triggers 403 Forbidden
        foreign_id = "507f1f77bcf86cd799439011"
        resp = session.delete(
            f"{BASE_URL}/api/v1/auth/profile/{foreign_id}",
            headers=get_headers(worker_id, token=tok),
            timeout=10,
        )
        return endpoint, resp.status_code, (time.time() - t0) * 1000
    else:
        # Create temp user, then delete profile
        tmp = generate_user_payload("buyer")
        r = session.post(f"{BASE_URL}/api/v1/auth/register", json=tmp, headers=get_headers(worker_id), timeout=10)
        if r.status_code == 201:
            u_id = r.json().get("data", {}).get("user_id")
            l = session.post(f"{BASE_URL}/api/v1/auth/login", json={"email": tmp["email"], "password": tmp["password"]}, headers=get_headers(worker_id), timeout=10)
            if l.status_code == 200:
                t = l.json().get("data", {}).get("access_token")
                t0 = time.time()
                resp = session.delete(f"{BASE_URL}/api/v1/auth/profile/{u_id}", headers=get_headers(worker_id, token=t), timeout=10)
                return endpoint, resp.status_code, (time.time() - t0) * 1000
    return None, None, None


# Map of action names to execution functions
ACTION_DISPATCH = {
    "root": execute_root,
    "info": execute_info,
    "health": execute_health,
    "api_docs": execute_api_docs,
    "register": execute_register,
    "login": execute_login,
    "refresh": execute_refresh,
    "logout": execute_logout,
    "buyer_only": execute_buyer_only,
    "seller_only": execute_seller_only,
    "admin_only": execute_admin_only,
    "user_avatar_url": execute_user_avatar_url,
    "user_update": execute_user_update,
    "user_delete": execute_user_delete,
    "profile_get": execute_profile_get,
    "profile_detailed": execute_profile_detailed,
    "profile_avatar_presigned": execute_profile_avatar_presigned,
    "profile_preview_presigned": execute_profile_preview_presigned,
    "profile_update": execute_profile_update,
    "profile_delete": execute_profile_delete,
}

ACTIONS = list(ACTION_DISPATCH.keys())


def run_preflight_check():
    """Runs tests across all 20 endpoints verifying BOTH success (2xx) and failure (4xx) handling."""
    print("\n🔍 Running Preflight Sanity Check across all 20 Auth-Service endpoints...")
    print("   Verifying both Success (2xx) and Simulated Failure (4xx) paths:\n")
    session = requests.Session()

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

            print(f"   {icon_s} {ep_s:<45} -> {desc_s:<12} ({lat_s:5.1f}ms) | {icon_f} {desc_f:<16} ({lat_f:5.1f}ms)")
        except Exception as e:
            print(f"   ✗ Action {action_name:<40} -> Exception: {e}")

    print("-" * 75)


def worker(worker_id):
    session = requests.Session()

    while not stop_event.is_set():
        action = random.choice(ACTIONS)
        func = ACTION_DISPATCH[action]
        should_fail = random.random() < FAILURE_RATE
        endpoint_name = ""

        try:
            endpoint_name, status_code, latency_ms = func(session, worker_id, fail=should_fail)
            if endpoint_name and status_code is not None:
                record_metric(endpoint_name, status_code, latency_ms)
        except Exception as e:
            if endpoint_name:
                record_metric(endpoint_name, "error", 0.0)
            else:
                with stats_lock:
                    stats["total"] += 1
                    stats["failure"] += 1
                    stats["status_codes"]["error"] = stats["status_codes"].get("error", 0) + 1

        time.sleep(random.uniform(0.04, 0.12))


if __name__ == "__main__":
    print("=" * 75)
    print(f"🚀 Starting Multi-Endpoint Load Test for Auth-Service")
    print(f"   Target URL:    {BASE_URL}")
    print(f"   Duration:      {DURATION_SECONDS}s")
    print(f"   Workers:       {CONCURRENCY}")
    print(f"   Endpoints:     {len(ENDPOINT_NAMES)} distinct routes")
    print(f"   Failure Rate:  {FAILURE_RATE * 100:.1f}% (simulating realistic 4xx failures)")
    print("=" * 75)

    initialize_accounts()

    if RUN_PREFLIGHT:
        run_preflight_check()

    print(f"\n⚡ Commencing load test for {DURATION_SECONDS} seconds...")
    start_time = time.time()
    threads = []

    for i in range(CONCURRENCY):
        t = threading.Thread(target=worker, args=(i,))
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
    print("=" * 75)
    print(f"Total Requests:      {stats['total']}")
    print(f"Successful (2xx):    {stats['success']}")
    print(f"Failed (4xx/5xx):    {stats['failure']}")
    print(f"Status Breakdown:    {dict(stats['status_codes'])}")
    print(f"Overall Throughput:  {stats['total'] / total_time:.2f} req/s")

    if stats["latencies"]:
        lats = sorted(stats["latencies"])
        p50 = statistics.median(lats)
        p90 = statistics.quantiles(lats, n=100)[89] if len(lats) >= 100 else statistics.quantiles(lats, n=10)[8] if len(lats) >= 10 else max(lats)
        p99 = statistics.quantiles(lats, n=100)[98] if len(lats) >= 100 else max(lats)

        print("-" * 75)
        print(f"Overall Min Latency: {min(lats):.2f} ms")
        print(f"Overall Avg Latency: {sum(lats) / len(lats):.2f} ms")
        print(f"Overall p50 Median:  {p50:.2f} ms")
        print(f"Overall p90 Latency: {p90:.2f} ms")
        print(f"Overall p99 Latency: {p99:.2f} ms")
        print(f"Overall Max Latency: {max(lats):.2f} ms")

    print("\n" + "=" * 75)
    print("📊 PER-ENDPOINT BREAKDOWN (SUCCESS & FAILURE DISTRIBUTION)")
    print("=" * 75)
    print(f"{'Endpoint':<42} {'Reqs':>5} {'OK%':>6} {'Avg(ms)':>8} {'p95(ms)':>8}  {'Status Codes'}")
    print("-" * 75)

    for ep_name in ENDPOINT_NAMES:
        data = endpoint_stats[ep_name]
        ep_total = data["total"]
        if ep_total > 0:
            ok_pct = (data["success"] / ep_total) * 100
            ep_lats = sorted(data["latencies"])
            avg_lat = sum(ep_lats) / len(ep_lats)
            p95 = statistics.quantiles(ep_lats, n=20)[18] if len(ep_lats) >= 20 else max(ep_lats)
            codes_str = ", ".join(f"{k}:{v}" for k, v in sorted(data["status_codes"].items(), key=lambda x: str(x[0])))
            print(f"{ep_name:<42} {ep_total:>5d} {ok_pct:>5.1f}% {avg_lat:>8.1f} {p95:>8.1f}  [{codes_str}]")
        else:
            print(f"{ep_name:<42} {'0':>5} {'N/A':>6} {'N/A':>8} {'N/A':>8}  []")

    print("=" * 75)

