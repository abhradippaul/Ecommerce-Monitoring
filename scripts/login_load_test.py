import requests
import threading
import time
import urllib3
import statistics
import os
import random

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TARGET_URL = os.getenv("TARGET_URL", "http://localhost:3002/api/v1/auth/login")
DURATION_SECONDS = int(os.getenv("DURATION", "60"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "8"))

PAYLOAD = {
    "email": "testseller@gmail.com",
    "password": "Test@1234"
}

stats = {
    "total": 0,
    "success": 0,
    "failure": 0,
    "latencies": [],
    "status_codes": {}
}
stats_lock = threading.Lock()
stop_event = threading.Event()

def worker(worker_id):
    headers = {
        "Content-Type": "application/json",
        "X-Forwarded-For": f"10.0.{worker_id % 250}.{random.randint(1, 250)}"
    }
    session = requests.Session()
    
    while not stop_event.is_set():
        req_start = time.time()
        try:
            resp = session.post(
                TARGET_URL,
                json=PAYLOAD,
                headers=headers,
                timeout=10
            )
            latency = (time.time() - req_start) * 1000 # ms
            
            with stats_lock:
                stats["total"] += 1
                stats["status_codes"][resp.status_code] = stats["status_codes"].get(resp.status_code, 0) + 1
                if 200 <= resp.status_code < 300:
                    stats["success"] += 1
                else:
                    stats["failure"] += 1
                stats["latencies"].append(latency)
        except Exception as e:
            latency = (time.time() - req_start) * 1000
            with stats_lock:
                stats["total"] += 1
                stats["failure"] += 1
                stats["status_codes"]["error"] = stats["status_codes"].get("error", 0) + 1
        
        # Small delay between requests per worker
        time.sleep(random.uniform(0.05, 0.15))

if __name__ == "__main__":
    print(f"🚀 Starting 1-Minute Load Test on {TARGET_URL}")
    print(f"   Credentials: {PAYLOAD['email']}")
    print(f"   Duration:    {DURATION_SECONDS}s")
    print(f"   Workers:     {CONCURRENCY}")
    print("=" * 55)

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
            remaining = max(0, DURATION_SECONDS - int(elapsed))
            with stats_lock:
                tot = stats["total"]
                suc = stats["success"]
                fail = stats["failure"]
                recent_lat = stats["latencies"][-10:] if stats["latencies"] else []
                avg_recent = sum(recent_lat) / len(recent_lat) if recent_lat else 0
            
            progress = int((elapsed / DURATION_SECONDS) * 30)
            bar = "█" * progress + "░" * (30 - progress)
            print(f"\r[{bar}] {int(elapsed):2d}s/{DURATION_SECONDS}s | Sent: {tot:4d} | OK: {suc:4d} | Err: {fail:2d} | Curr Lat: {avg_recent:6.1f}ms", end="", flush=True)
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping load test early...")

    stop_event.set()
    for t in threads:
        t.join(timeout=2)

    total_time = time.time() - start_time
    print(f"\n\n🏁 Load Test Completed in {total_time:.2f} seconds")
    print("=" * 55)
    print(f"Total Requests:      {stats['total']}")
    print(f"Successful (2xx):    {stats['success']}")
    print(f"Failed:              {stats['failure']}")
    print(f"Status Breakdown:    {dict(stats['status_codes'])}")
    print(f"Throughput:          {stats['total'] / total_time:.2f} req/s")
    
    if stats["latencies"]:
        lats = sorted(stats["latencies"])
        p50 = statistics.median(lats)
        p90 = statistics.quantiles(lats, n=100)[89] if len(lats) >= 100 else statistics.quantiles(lats, n=10)[8] if len(lats) >= 10 else max(lats)
        p99 = statistics.quantiles(lats, n=100)[98] if len(lats) >= 100 else max(lats)
        
        print("-" * 55)
        print(f"Min Latency:         {min(lats):.2f} ms")
        print(f"Average Latency:     {sum(lats) / len(lats):.2f} ms")
        print(f"p50 (Median):        {p50:.2f} ms")
        print(f"p90 Latency:         {p90:.2f} ms")
        print(f"p99 Latency:         {p99:.2f} ms")
        print(f"Max Latency:         {max(lats):.2f} ms")
    print("=" * 55)
