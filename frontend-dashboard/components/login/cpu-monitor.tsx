"use client";

import { Cpu } from "lucide-react";

interface CpuMonitorProps {
  cpuUsage: number[];
}

export function CpuMonitor({ cpuUsage }: CpuMonitorProps) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1">
        <Cpu className="size-3 text-indigo-400" /> CPU Core Activity
      </span>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[9px]">
        {cpuUsage.map((usage, idx) => (
          <div key={idx} className="space-y-0.5 animate-in fade-in duration-300">
            <div className="flex justify-between text-zinc-400">
              <span>Core {idx}</span>
              <span className={usage > 80 ? "text-amber-500 font-bold" : ""}>{usage}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${usage > 80
                    ? "bg-gradient-to-r from-amber-500 to-red-500 animate-pulse"
                    : "bg-indigo-500"
                  }`}
                style={{ width: `${usage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
