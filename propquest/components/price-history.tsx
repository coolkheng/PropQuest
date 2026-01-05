"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceHistoryProps {
  priceHistory: Array<{
    date: string;
    price: number;
  }>;
  currentPrice?: string | number;
}

export function PriceHistory({
  priceHistory,
  currentPrice,
}: PriceHistoryProps) {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Image
              src="/chiikawa_crying.png"
              alt="No price history available"
              width={140}
              height={140}
              className="opacity-80"
            />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                No Price History Available
              </h3>
              <p className="text-sm text-gray-600 max-w-md">
                Price history data is not available for this property yet. Check
                back later for pricing trends and changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Avoid potential SSR/hydration issues with Recharts by rendering after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Early no-data UI
  const hasData = Array.isArray(priceHistory) && priceHistory.length > 0;

  // Calculate price change
  const firstPrice = hasData ? priceHistory[0]?.price ?? 0 : 0;
  const lastPrice = hasData
    ? priceHistory[priceHistory.length - 1]?.price ?? 0
    : 0;
  // Parse current property price (e.g., "RM 650,000") and fallback to last historical price if invalid
  const parsePriceToNumber = (
    value: string | number | undefined,
    fallback: number
  ) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };
  const currentParsed = parsePriceToNumber(currentPrice, lastPrice);
  const priceChange = currentParsed - firstPrice;
  const priceChangePercent: string =
    firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : "0.0";
  const isPriceIncreasing = priceChange >= 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString()}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">
            {payload[0].payload.date}
          </p>
          <p className="text-sm font-semibold bg-clip-text text-transparent bg-blue-gradient">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Unique id for gradient to avoid collisions across multiple charts
  const gradId = `priceGradient-${useId()}`;

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded-lg bg-gray-100" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            No price history available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
            Price History
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isPriceIncreasing ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`text-sm font-semibold ${
                isPriceIncreasing ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPriceIncreasing ? "+" : ""}
              {priceChangePercent}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Price Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600">Starting Price</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(firstPrice)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Current Price</p>
              <p className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">
                {formatCurrency(currentParsed)}
              </p>
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={priceHistory}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value: number) => `${value / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Horizontal marker for current property price */}
                <ReferenceLine
                  y={currentParsed}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                  label={{
                    value: "Current Price",
                    position: "right",
                    fill: "#10b981",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={`url(#${gradId})`}
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Price Change Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Price change over time:</span>
            <span
              className={`font-semibold ${
                isPriceIncreasing ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPriceIncreasing ? "+" : ""}
              {formatCurrency(Math.abs(priceChange))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
