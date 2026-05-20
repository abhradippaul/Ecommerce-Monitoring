"use client";

import { Terminal } from "lucide-react";

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  message: string;
}

interface LogConsoleProps {
  logs: LogEntry[];
}

export function LogConsole({ logs }: LogConsoleProps) {
  return (
    <div className="bg-black/90 border border-zinc-800/80 rounded-xl p-4 font-mono text-[10px] shadow-inner space-y-2.5">
      <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-900 pb-1.5">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[9px]">
          <Terminal className="size-3 text-emerald-400" /> Active Log Stream
        </span>
        <span className="text-[8px] bg-zinc-900 px-1 py-0.5 rounded text-emerald-400/80 animate-pulse">
          LIVE POLLING
        </span>
      </div>

      <div className="space-y-1.5 max-h-[140px] overflow-hidden">
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-1 duration-300">
            <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
            <span
              className={`font-semibold shrink-0 select-none ${log.level === "SUCCESS"
                  ? "text-emerald-400"
                  : log.level === "WARN"
                    ? "text-amber-500"
                    : log.level === "ERROR"
                      ? "text-red-500"
                      : "text-indigo-400"
                }`}
            >
              {log.level}
            </span>
            <span className="text-zinc-300 leading-normal break-all">
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
