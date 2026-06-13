import { NextResponse } from "next/server";

const SERVICES = {
  auth: "http://127.0.0.1:3002/health",
  item: "http://127.0.0.1:3001/health",
  order: "http://127.0.0.1:3003/health",
  vault: "http://127.0.0.1:8200/v1/sys/health",
};

export async function GET() {
  const statuses: Record<string, { status: "UP" | "DOWN"; latency: number; details?: any }> = {};

  const checkService = async (name: string, url: string) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(id);
      const latency = Date.now() - start;

      if (res.ok) {
        let details = null;
        try {
          details = await res.json();
        } catch {
          // ignore parsing error for non-json
        }
        statuses[name] = { status: "UP", latency, details };
      } else {
        statuses[name] = { status: "DOWN", latency };
      }
    } catch (err) {
      const latency = Date.now() - start;
      statuses[name] = { status: "DOWN", latency };
    }
  };

  await Promise.all(
    Object.entries(SERVICES).map(([name, url]) => checkService(name, url))
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: statuses,
  });
}
