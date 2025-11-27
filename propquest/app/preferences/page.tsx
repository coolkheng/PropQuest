"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { useSession } from "@/lib/useSession";

type Preferences = {
  preferred_locations: string[];
  budget_range: { min: number | null; max: number | null };
  preferred_types: string[];
  keywords: string[];
  min_size_sqft: number | null;
  size_tolerance_pct: number;
  radius_km: number | null;
  // optional fields that may come from the backend (legacy name or metadata)
  ideal_size_sqft?: number | null;
  updated_at?: string;
  // new fields: rooms and toilets (single numeric values)
  rooms?: number | null;
  toilets?: number | null;
};

export default function PreferencesPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [locationsRaw, setLocationsRaw] = useState<string>("");
  const [keywordsRaw, setKeywordsRaw] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // wizard state
  const steps = [
    "Locations",
    "Budget",
    "Property Types",
    "Facilities",
    "Size",
    "Finish",
  ];
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5001/api/users/me/preferences",
          {
            withCredentials: true,
          }
        );
        setPrefs(res.data.preferences);
        setLocationsRaw(
          (res.data.preferences?.preferred_locations || []).join(", ")
        );
        setKeywordsRaw((res.data.preferences?.keywords || []).join(", "));
      } catch (err) {
        setPrefs({
          preferred_locations: [],
          budget_range: { min: null, max: null },
          preferred_types: [],
          keywords: [],
          min_size_sqft: null,
          rooms: null,
          toilets: null,
          size_tolerance_pct: 10,
          radius_km: null,
        });
      }
    };
    fetchPrefs();
  }, [user]);

  // keep the raw locations input synced when prefs change externally
  useEffect(() => {
    if (!prefs) return;
    setLocationsRaw((prefs.preferred_locations || []).join(", "));
  }, [prefs?.preferred_locations]);

  // keep the raw keywords input synced when prefs change externally
  useEffect(() => {
    if (!prefs) return;
    setKeywordsRaw((prefs.keywords || []).join(", "));
  }, [prefs?.keywords]);

  // helper to update nested fields
  const updateField = (key: keyof Preferences, value: any) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
  };

  const toggleType = (type: string) => {
    if (!prefs) return;
    const exists = prefs.preferred_types.includes(type);
    const next = exists
      ? prefs.preferred_types.filter((t) => t !== type)
      : [...prefs.preferred_types, type];
    updateField("preferred_types", next);
  };

  const savePreferences = async () => {
    if (!prefs) return;
    setSaving(true);
    setMessage(null);
    try {
      // Ensure we send a stable numeric min_size_sqft (fall back to legacy ideal_size_sqft if present)
      const outgoing = {
        ...prefs,
        min_size_sqft:
          prefs.min_size_sqft != null
            ? Number(prefs.min_size_sqft)
            : prefs.ideal_size_sqft != null
            ? Number(prefs.ideal_size_sqft)
            : null,
      };

      const res = await axios.post(
        "http://localhost:5001/api/users/me/preferences",
        { preferences: outgoing },
        { withCredentials: true }
      );
      setPrefs(res.data.preferences);
      setMessage("Preferences saved successfully");
      // redirect to home after successful save
      router.push("/");
    } catch (err: any) {
      setMessage(err?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = (stepIndex: number) => {
    if (!prefs) return false;
    switch (stepIndex) {
      case 0:
        return prefs.preferred_locations.length > 0;
      case 1:
        return prefs.budget_range.min != null && prefs.budget_range.max != null;
      case 2:
        return prefs.preferred_types.length > 0;
      case 3:
        // Keywords step: optional, allow proceed even if empty
        return true;
      case 4:
        // Size step: require minimum size
        return prefs.min_size_sqft != null;
      default:
        return true;
    }
  };

  if (!user && !loading) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">Preferences</h2>
        <p className="mb-4">You must be signed in to set preferences.</p>
        <Link href="/login" className="text-blue-600">
          Sign in
        </Link>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-500">Loading preferences…</div>
      </div>
    );
  }

  return (
    <>
      <TopBar />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Find Your Perfect Home
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Tell us what you like and we'll rank results for you.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: step indicator */}
            <div className="lg:col-span-1">
              <StepIndicator
                steps={steps}
                current={currentStep}
                onJump={(i) => setCurrentStep(i)}
              />
            </div>

            {/* Right: content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <StepWrapper current={currentStep}>
                    {/* Step 1: Locations */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Where do you want to search?
                      </h2>
                      <p className="text-sm text-gray-600">
                        Enter one or more locations (comma separated). We’ll
                        prioritize listings in these areas.
                      </p>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g., Kuala Lumpur, Petaling Jaya"
                        value={locationsRaw}
                        onChange={(e) => setLocationsRaw(e.target.value)}
                        onBlur={() => {
                          const arr = locationsRaw
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          updateField("preferred_locations", arr);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const arr = locationsRaw
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            updateField("preferred_locations", arr);
                          }
                        }}
                      />
                    </div>

                    {/* Step 2: Budget */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        What's your budget?
                      </h2>
                      <p className="text-sm text-gray-600">
                        Set a minimum and maximum budget to narrow results.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          className="rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="Min (MYR)"
                          value={prefs.budget_range.min ?? ""}
                          onChange={(e) =>
                            updateField("budget_range", {
                              ...prefs.budget_range,
                              min: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                        <input
                          type="number"
                          className="rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="Max (MYR)"
                          value={prefs.budget_range.max ?? ""}
                          onChange={(e) =>
                            updateField("budget_range", {
                              ...prefs.budget_range,
                              max: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Step 3: Types */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        What property types?
                      </h2>
                      <p className="text-sm text-gray-600">
                        Select the types you’re interested in.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {[
                          "Terrace",
                          "Apartment",
                          "Bungalow",
                          "Condominium",
                          "Link Bungalow",
                          "Residential Land",
                          "Semi-Detached House",
                          "Service Residence",
                          "Townhouse",
                        ].map((t) => (
                          <button
                            key={t}
                            onClick={() => toggleType(t)}
                            className={`px-4 py-2 rounded-lg border transition-all duration-150 font-medium ${
                              prefs.preferred_types.includes(t)
                                ? "bg-blue-600 border-blue-600 text-white shadow"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 4: Keywords */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Facilities
                      </h2>
                      <p className="text-sm text-gray-600">
                        Optional facilites you'd like to include (comma
                        separated).
                      </p>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g., pool, gym, pet-friendly"
                        value={keywordsRaw}
                        onChange={(e) => setKeywordsRaw(e.target.value)}
                        onBlur={() => {
                          const arr = keywordsRaw
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          updateField("keywords", arr);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const arr = keywordsRaw
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            updateField("keywords", arr);
                          }
                        }}
                      />
                    </div>

                    {/* Step 5: Size */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Size & Rooms
                      </h2>
                      <p className="text-sm text-gray-600">
                        Preferred minimum size and room/toilet counts.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          className="rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="Minimum size (sqft)"
                          value={prefs.min_size_sqft ?? ""}
                          onChange={(e) =>
                            updateField(
                              "min_size_sqft",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                        <input
                          type="number"
                          className="rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="Size tolerance (%)"
                          value={prefs.size_tolerance_pct ?? 10}
                          onChange={(e) =>
                            updateField(
                              "size_tolerance_pct",
                              e.target.value ? Number(e.target.value) : 10
                            )
                          }
                        />
                      </div>

                      {/* Rooms & Toilets (single numeric values) */}
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <input
                          type="number"
                          className="rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="Rooms (e.g., 3)"
                          value={prefs.rooms ?? ""}
                          onChange={(e) =>
                            updateField(
                              "rooms",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                        <input
                          type="number"
                          className="rounded-lg border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="Toilets (e.g., 2)"
                          value={prefs.toilets ?? ""}
                          onChange={(e) =>
                            updateField(
                              "toilets",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Step 5: Finish */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        All set — review & save
                      </h2>
                      <p className="text-sm text-gray-600">
                        Preview the preferences we will save for your account.
                      </p>

                      {/* Friendly summary */}
                      <div className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <dt className="text-xs text-gray-500">
                              Preferred locations
                            </dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.preferred_locations.length > 0
                                ? prefs.preferred_locations.join(", ")
                                : "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-gray-500">
                              Budget range
                            </dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.budget_range.min == null &&
                              prefs.budget_range.max == null
                                ? "—"
                                : `${
                                    prefs.budget_range.min?.toLocaleString() ??
                                    "—"
                                  } — ${
                                    prefs.budget_range.max?.toLocaleString() ??
                                    "—"
                                  } MYR`}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-gray-500">
                              Property types
                            </dt>
                            <dd className="mt-1">
                              {prefs.preferred_types.length > 0 ? (
                                prefs.preferred_types.map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center mr-2 mb-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-800"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-gray-500">Keywords</dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.keywords.length > 0
                                ? prefs.keywords.join(", ")
                                : "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-gray-500">
                              Preferred minimum size
                            </dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {(prefs.min_size_sqft ??
                                prefs.ideal_size_sqft ??
                                null) != null
                                ? `${(
                                    prefs.min_size_sqft ?? prefs.ideal_size_sqft
                                  )?.toLocaleString()} sqft`
                                : "—"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-gray-500">
                              Size tolerance
                            </dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.size_tolerance_pct ?? 10}%
                            </dd>
                          </div>

                          {/* Search radius removed from Finish summary (not relevant) */}

                          <div>
                            <dt className="text-xs text-gray-500">Rooms</dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.rooms == null ? "—" : String(prefs.rooms)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-gray-500">Toilets</dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.toilets == null
                                ? "—"
                                : String(prefs.toilets)}
                            </dd>
                          </div>

                          <div className="sm:col-span-2">
                            <dt className="text-xs text-gray-500">
                              Last updated
                            </dt>
                            <dd className="mt-1 font-medium text-gray-800">
                              {prefs.updated_at
                                ? new Date(prefs.updated_at).toLocaleString()
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </StepWrapper>

                  <div className="mt-6 flex items-center justify-between">
                    <ActionButtons
                      current={currentStep}
                      max={steps.length - 1}
                      onBack={() => setCurrentStep((s) => Math.max(0, s - 1))}
                      onNext={() => {
                        if (
                          currentStep < steps.length - 1 &&
                          canProceed(currentStep)
                        )
                          setCurrentStep((s) => s + 1);
                      }}
                      onSave={savePreferences}
                      saving={saving}
                      canProceed={canProceed(currentStep)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* Reusable components below: StepIndicator, StepWrapper, ActionButtons */

function StepIndicator({
  steps,
  current,
  onJump,
}: {
  steps: string[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="sticky top-6">
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="mb-4 text-sm font-medium text-gray-600">Progress</div>
        <ol className="space-y-3">
          {steps.map((s, i) => {
            const status =
              i < current ? "done" : i === current ? "active" : "pending";
            return (
              <li key={s} className="flex items-start gap-3">
                <button
                  onClick={() => onJump(i)}
                  className="flex items-center gap-3 text-left w-full"
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                      status === "done"
                        ? "bg-green-500 text-white"
                        : status === "active"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {status === "done" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        status === "active" ? "text-gray-900" : "text-gray-600"
                      }`}
                    >
                      {s}
                    </div>
                    <div className="text-xs text-gray-400">
                      {status === "active"
                        ? "In progress"
                        : status === "done"
                        ? "Completed"
                        : "Pending"}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StepWrapper({
  current,
  children,
}: {
  current: number;
  children: React.ReactNode;
}) {
  // children is expected to be a sequence of step panels (divs)
  const panes = React.Children.toArray(children) as React.ReactNode[];
  return (
    <div>
      {panes.map((pane, i) => (
        <div
          key={i}
          className={`transition-all duration-500 ${
            i === current
              ? "opacity-100 max-h-[2000px] translate-y-0"
              : "opacity-0 max-h-0 -translate-y-4 pointer-events-none"
          }`}
        >
          {pane}
        </div>
      ))}
    </div>
  );
}

function ActionButtons({
  current,
  max,
  onBack,
  onNext,
  onSave,
  saving,
  canProceed,
}: {
  current: number;
  max: number;
  onBack: () => void;
  onNext: () => void;
  onSave: () => Promise<void> | void;
  saving: boolean;
  canProceed: boolean;
}) {
  return (
    <div className="flex items-center justify-between w-full">
      <div>
        <button
          onClick={onBack}
          disabled={current === 0}
          className={`px-4 py-2 rounded-lg border ${
            current === 0
              ? "border-gray-200 text-gray-400"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Back
        </button>
      </div>

      <div className="flex items-center gap-3">
        {current < max && (
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`px-5 py-2 rounded-lg font-semibold ${
              canProceed
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            Next
          </button>
        )}

        {current === max && (
          <button
            onClick={() => onSave()}
            disabled={saving}
            className={`px-5 py-2 rounded-lg font-semibold flex items-center gap-2 ${
              saving
                ? "bg-gray-200 text-gray-500"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {saving ? "Saving…" : "Save Preferences"}
            {!saving && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M3 3h14v2H3V3zM3 7h14v10H3V7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
