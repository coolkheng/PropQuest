"use client";

import { useEffect, useId, useState } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";

interface PriceHistoryProps {
  priceHistory: Array<{
    date: string;
    price: number;
  }>;
  currentPrice?: string | number;
  beds?: string;
  sqft?: string;
}

export function PriceHistory({
  priceHistory,
  currentPrice,
  beds,
  sqft,
}: PriceHistoryProps) {
  const [showInsights, setShowInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // All hooks MUST be at the top before any conditional logic
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const gradId = `priceGradient-${useId()}`;

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

  // Early no-data UI
  const hasData = Array.isArray(priceHistory) && priceHistory.length > 0;

  // Calculate price change
  const firstPrice = hasData ? (priceHistory[0]?.price ?? 0) : 0;
  const lastPrice = hasData
    ? (priceHistory[priceHistory.length - 1]?.price ?? 0)
    : 0;
  // Parse current property price (e.g., "RM 650,000") and fallback to last historical price if invalid
  const parsePriceToNumber = (
    value: string | number | undefined,
    fallback: number,
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
  const monthlyChanges: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    monthlyChanges.push(priceHistory[i].price - priceHistory[i - 1].price);
  }

  const variance =
    monthlyChanges.length > 0
      ? monthlyChanges.reduce(
          (sum, change) =>
            sum +
            Math.pow(
              change -
                monthlyChanges.reduce((a, b) => a + b, 0) /
                  monthlyChanges.length,
              2,
            ),
          0,
        ) / monthlyChanges.length
      : 0;
  const volatility = Math.sqrt(variance);
  const volatilityLevel =
    volatility < 50 ? "Low" : volatility < 100 ? "Moderate" : "High";

  // Format currency
  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString()}`;
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { date: string }; value: number }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {payload[0].payload.date}
          </p>
          <p className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 mb-2">
            {formatCurrency(payload[0].value)}
          </p>
          <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
            {beds && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Bedrooms:</span> {beds}
              </p>
            )}
            {sqft && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Built-up:</span> {sqft}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleInsightsClick = () => {
    if (!showInsights) {
      setIsAnalyzing(true);
      // Simulate AI analysis time
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowInsights(true);
      }, 2000);
    } else {
      setShowInsights(false);
    }
  };

  const getMarketTrend = () => {
    const avgMonthlyChange =
      monthlyChanges.length > 0
        ? monthlyChanges.reduce((a, b) => a + b, 0) / monthlyChanges.length
        : 0;
    const recentChanges = monthlyChanges.slice(-3);
    const recentAvg =
      recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;

    if (recentAvg > avgMonthlyChange * 1.2) {
      return "Price growth is accelerating in recent months, indicating increasing demand.";
    } else if (recentAvg < avgMonthlyChange * 0.8) {
      return "Price growth is slowing down, which might indicate market cooling.";
    } else {
      return "Price changes are consistent with the overall trend, showing stable market conditions.";
    }
  };

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

          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={handleInsightsClick}
              variant="outline"
              disabled={isAnalyzing}
              className="w-full gap-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-70 bg-transparent"
            >
              <div className="p-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded">
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-white" />
                )}
              </div>
              <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                {isAnalyzing ? "Analyzing Price Data..." : "AI Insights"}
              </span>
              {!isAnalyzing &&
                (showInsights ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                ))}
            </Button>

            {isAnalyzing && (
              <div className="mt-6 p-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100 animate-pulse">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                      Analyzing Price History
                    </p>
                    <p className="text-sm text-gray-600">
                      Our AI is examining the data to provide you with valuable
                      insights...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showInsights && !isAnalyzing && (
              <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Price Trend
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        isPriceIncreasing ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPriceIncreasing ? "+" : ""}
                      {priceChangePercent}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Over {priceHistory.length} months
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Price Volatility
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {volatilityLevel}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Market stability indicator
                    </p>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <span>Market Trend Analysis</span>
                    </h3>
                    <p className="text-s text-gray-700">{getMarketTrend()}</p>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-s text-gray-600">
                    <strong>Disclaimer:</strong> These insights are generated by
                    AI based on historical price data and should not be
                    considered as financial advice. Always conduct thorough
                    research and consult with real estate professionals before
                    making investment decisions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
