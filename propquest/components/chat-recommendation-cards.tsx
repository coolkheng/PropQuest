"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";

// One recommended listing, as returned by POST /api/chat/message (`cards`).
export interface ChatCard {
  id: string;
  title: string;
  image: string | null;
  price: number | null;
  psf: number | null;
  beds: string | number | null;
  baths: string | number | null;
  sqft: number | null;
  badge: string;
  highlights: string[];
}

function factLine(card: ChatCard) {
  const parts: string[] = [];
  if (card.price) parts.push(formatPrice(card.price));
  if (card.psf) parts.push(`RM ${card.psf.toLocaleString()} psf`);
  if (card.beds) parts.push(`${card.beds} bd`);
  if (card.baths) parts.push(`${card.baths} ba`);
  if (card.sqft) parts.push(`${card.sqft.toLocaleString()} sqft`);
  return parts.join(" · ");
}

interface ChatRecommendationCardsProps {
  cards: ChatCard[];
  onCardClick?: (id: string) => void;
}

// Preview cards for the listings the AI recommends, shown under its reply.
export function ChatRecommendationCards({ cards, onCardClick }: ChatRecommendationCardsProps) {
  if (!cards.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white">
      <p className="px-5 pt-4 text-base font-semibold text-gray-900">Recommended listings</p>
      <ul className="divide-y divide-gray-100">
        {cards.map((card, i) => (
          <li key={card.id}>
            <Link
              href={`/property/${card.id}`}
              onClick={() => onCardClick?.(card.id)}
              className="group flex gap-4 p-5 hover:bg-gray-50"
            >
              <img
                src={card.image || "/placeholder.svg"}
                alt={card.title}
                className="h-32 w-32 flex-shrink-0 rounded-xl object-cover bg-gray-100"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900 line-clamp-2">
                  {i + 1}.{" "}
                  <span className="underline decoration-dotted underline-offset-4 group-hover:text-blue-600">
                    {card.title}
                  </span>
                </p>
                {card.badge && (
                  <span className="mt-2 inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-700">
                    {card.badge}
                  </span>
                )}
                <p className="mt-2 text-sm text-gray-500">{factLine(card)}</p>
                {card.highlights.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {card.highlights.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
