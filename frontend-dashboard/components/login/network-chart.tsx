"use client";

interface NetworkChartProps {
  points: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
}

export function NetworkChart({
  points,
  width = 360,
  height = 75,
  strokeColor = "rgb(99, 102, 241)",
  fillColor = "rgb(99, 102, 241)",
}: NetworkChartProps) {
  // Generate SVG path for line chart
  const getPathData = () => {
    if (points.length === 0) return "";
    const step = width / (points.length - 1);
    return points
      .map((point, index) => {
        const x = index * step;
        const y = height - (point / 100) * height;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <div className="relative w-full overflow-hidden flex items-end" style={{ height: `${height}px` }}>
      <svg className="w-full h-full overflow-visible">
        {/* SVG Gradients for filling area under sparkline */}
        <defs>
          <linearGradient id="network-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        <line x1="0" y1={height * 0.25} x2="100%" y2={height * 0.25} stroke="#1f1f23" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.5} x2="100%" y2={height * 0.5} stroke="#1f1f23" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.75} x2="100%" y2={height * 0.75} stroke="#1f1f23" strokeDasharray="3,3" />

        {/* Shadow Path */}
        <path
          d={getPathData()}
          fill="none"
          stroke="url(#network-grad)"
          strokeWidth="24"
          className="opacity-10"
        />

        {/* Line Path */}
        <path
          d={getPathData()}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
    </div>
  );
}
