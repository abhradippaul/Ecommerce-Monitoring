"use client";

import { useEffect, useState } from "react";
import { Activity, HardDrive, RefreshCw, Server, Network } from "lucide-react";
import { CpuMonitor } from "./cpu-monitor";
import { NetworkChart } from "./network-chart";
import { LogConsole, type LogEntry } from "./log-console";

export function ClusterMonitor() {
  // Live Dashboard Simulator States
  const [uptime, setUptime] = useState({ days: 24, hours: 12, mins: 4, secs: 32 });
  const [cpuUsage, setCpuUsage] = useState([42, 28, 65, 35]); // usage per core
  const [memUsage, setMemUsage] = useState(5.42); // GB
  const [networkPoints, setNetworkPoints] = useState<number[]>([
    30, 45, 35, 60, 50, 40, 75, 80, 55, 65, 45, 70, 85, 90, 80
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: "21:10:05", level: "INFO", message: "Node-Agent-1 initialized monitoring agent." },
    { timestamp: "21:11:12", level: "SUCCESS", message: "Database connection pool established successfully." },
    { timestamp: "21:12:30", level: "INFO", message: "Garbage collection completed (took 104ms)." },
    { timestamp: "21:13:02", level: "WARN", message: "High memory utilization warning triggered: > 80%." },
    { timestamp: "21:13:45", level: "INFO", message: "Syncing server cluster heartbeat with master node." }
  ]);

  // Simulator Effect: Ticks, CPU, Network, Memory, and Logs
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Tick Uptime
      setUptime((prev) => {
        let s = prev.secs + 1;
        let m = prev.mins;
        let h = prev.hours;
        let d = prev.days;
        if (s >= 60) {
          s = 0;
          m += 1;
        }
        if (m >= 60) {
          m = 0;
          h += 1;
        }
        if (h >= 24) {
          h = 0;
          d += 1;
        }
        return { days: d, hours: h, mins: m, secs: s };
      });

      // 2. Randomize CPU usage per core
      setCpuUsage((prev) =>
        prev.map((val) => {
          const delta = Math.floor(Math.random() * 15) - 7;
          return Math.min(Math.max(val + delta, 5), 98);
        })
      );

      // 3. Randomize Memory load
      setMemUsage((prev) => {
        const delta = (Math.random() * 0.1 - 0.05);
        return Math.min(Math.max(Number((prev + delta).toFixed(2)), 3.5), 14.5);
      });

      // 4. Update Network Sparkline Points
      setNetworkPoints((prev) => {
        const nextVal = Math.min(Math.max(prev[prev.length - 1] + (Math.floor(Math.random() * 30) - 15), 10), 95);
        return [...prev.slice(1), nextVal];
      });
    }, 1000);

    // 5. Dynamic logs insertion
    const logInterval = setInterval(() => {
      const logTemplates: { level: LogEntry["level"]; message: string }[] = [
        { level: "INFO", message: "Garbage collection completed." },
        { level: "SUCCESS", message: "Health check passed for route /api/health." },
        { level: "INFO", message: "Incoming HTTP request: GET /api/v1/metrics (latency: 32ms)." },
        { level: "WARN", message: "API Gateway rate limit reached for IP 198.51.100.42." },
        { level: "INFO", message: "Cluster synced. Running nodes: 3/3." },
        { level: "SUCCESS", message: "Configuration reload triggered on all active instances." },
        { level: "ERROR", message: "Connection reset by peer at Node-Agent-2:3001." },
        { level: "INFO", message: "Process usage: Heap limit 4.2GB, RSS 2.1GB." }
      ];

      const chosen = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setLogs((prev) => {
        const updated = [...prev, { timestamp: timeStr, level: chosen.level, message: chosen.message }];
        return updated.length > 7 ? updated.slice(1) : updated;
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(logInterval);
    };
  }, []);

  return (
    <div className="hidden md:flex w-[55%] flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-zinc-900 via-[#0e0e11] to-black text-zinc-400 relative overflow-hidden h-full">
      {/* Radial grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

      {/* Ambient abstract color glows */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute top-1/2 right-10 w-[200px] h-[200px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

      {/* Dynamic decorative server lines */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-800/30" />

      {/* Top bar header */}
      <div className="flex justify-between items-center relative z-10 pl-6">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs uppercase font-mono tracking-widest text-zinc-500">
            Agent Node Connected
          </span>
        </div>
        <div className="font-mono text-[10px] text-zinc-600 bg-zinc-950 border border-zinc-800/80 px-2 py-0.5 rounded">
          REGION: US-EAST-1
        </div>
      </div>

      {/* Main Display Area */}
      <div className="my-auto space-y-6 relative z-10 pl-6">

        {/* Stats Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Server className="size-5 text-indigo-400" />
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              CLUSTER MONITOR <span className="text-indigo-400">v2.4.1</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            Live status representation of NodeJS performance agent.
          </p>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 backdrop-blur-md space-y-1 hover:border-zinc-700/60 transition-colors">
            <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1.5">
              <Activity className="size-3 text-indigo-400" /> Latency (Ping)
            </span>
            <div className="text-lg font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
              14.2 <span className="text-xs font-normal text-zinc-500">ms</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-0.5">
              ● Optimal
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 backdrop-blur-md space-y-1 hover:border-zinc-700/60 transition-colors">
            <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1.5">
              <Network className="size-3 text-purple-400" /> Active Requests
            </span>
            <div className="text-lg font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
              1,424 <span className="text-xs font-normal text-zinc-500">req/s</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">
              Avg load: 38%
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 backdrop-blur-md space-y-1 hover:border-zinc-700/60 transition-colors">
            <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1.5">
              <RefreshCw className="size-3 text-zinc-400" /> Cluster Uptime
            </span>
            <div className="text-xs font-bold font-mono text-white tracking-tight leading-6">
              {uptime.days}d {uptime.hours}h {uptime.mins.toString().padStart(2, "0")}m {uptime.secs.toString().padStart(2, "0")}s
            </div>
            <span className="text-[9px] font-mono text-zinc-500">
              Nodes online: 3/3
            </span>
          </div>
        </div>

        {/* Center Graphic: CPU & Network live activity */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md space-y-4">

          {/* Live Chart Header */}
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] uppercase font-mono font-semibold text-zinc-300">
                Network Throughput (Real-Time)
              </span>
            </div>
            <span className="text-[9px] font-mono text-indigo-400">
              1.42 GB/s Transferred
            </span>
          </div>

          {/* Sparkline Chart */}
          <NetworkChart points={networkPoints} />

          {/* CPU Cores & Memory bars */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
            {/* CPU Monitor Core Bars */}
            <CpuMonitor cpuUsage={cpuUsage} />

            {/* Memory Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1">
                  <HardDrive className="size-3 text-purple-400" /> RSS Memory Usage
                </span>
                <span className="font-mono text-[10px] text-zinc-300">
                  {memUsage.toFixed(2)} GB / 16.0 GB
                </span>
              </div>
              <div className="space-y-1 pt-1 font-mono text-[9px]">
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000"
                    style={{ width: `${(memUsage / 16) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-zinc-500 text-[8px]">
                  <span>Heap Used: 3.42 GB</span>
                  <span>Buffer: 1.20 GB</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Terminal Console Logs */}
        <LogConsole logs={logs} />

      </div>

      {/* Footer info */}
      <div className="flex justify-between items-center relative z-10 pl-6 text-zinc-600 text-[10px] font-mono">
        <span>Client System: Unix (Linux-x64)</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          SHA-256 Validated Node
        </span>
      </div>
    </div>
  );
}
