import React, { useState } from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { View } from "@/src/tw";

type Point = { x: number; kg: number };

type LineChartProps = {
  points: Point[];
  /** total x steps (points may be sparse within them) */
  steps: number;
  height?: number;
  lineColor: string;
  areaColor: string;
  gridColor: string;
  dotStrokeColor: string;
};

// Weight trend line: gridlines + smooth-ish polyline + tinted area + a marker
// on the last point. Width tracks the container via onLayout.
export function LineChart({
  points,
  steps,
  height = 104,
  lineColor,
  areaColor,
  gridColor,
  dotStrokeColor,
}: LineChartProps) {
  const [width, setWidth] = useState(0);

  const pad = 6;
  const min = Math.min(...points.map((p) => p.kg));
  const max = Math.max(...points.map((p) => p.kg));
  const span = Math.max(max - min, 0.5);

  const toXY = (p: Point): [number, number] => [
    pad + (p.x / Math.max(steps - 1, 1)) * (width - pad * 2),
    pad + (1 - (p.kg - min) / span) * (height - pad * 2),
  ];

  const coords = points.map(toXY);
  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`
      : "";
  const last = coords[coords.length - 1];

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && coords.length > 1 && (
        <Svg width={width} height={height}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line
              key={f}
              x1={0}
              y1={height * f}
              x2={width}
              y2={height * f}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}
          <Path d={areaPath} fill={areaColor} />
          <Path
            d={linePath}
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx={last[0]}
            cy={last[1]}
            r={4.5}
            fill={lineColor}
            stroke={dotStrokeColor}
            strokeWidth={2.5}
          />
        </Svg>
      )}
    </View>
  );
}
