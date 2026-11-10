"use client";

import React, { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2, AlertCircle } from "lucide-react";

export type CustomizableLicenseType = "limited" | "premium-unlimited";

export interface LicenseFormItem {
  id: string;
  type: CustomizableLicenseType;
  price: string;
  streamCap: string;
}

export const DEFAULT_STREAM_CAP = 50000;

export function createDefaultLicenseItems(): LicenseFormItem[] {
  return [
    {
      id: "license-limited",
      type: "limited",
      price: "",
      streamCap: String(DEFAULT_STREAM_CAP),
    },
  ];
}

export interface ValidatedLicensePayload {
  type: CustomizableLicenseType;
  price: number;
  streamCap?: number;
}

export interface LicenseValidationResult {
  valid: boolean;
  globalError: string | null;
  itemErrors: Record<string, { price?: string; streamCap?: string }>;
  sortedLicenses: ValidatedLicensePayload[];
}

/**
 * Validates the current license items according to Tape Garden rules:
 * - Minimum 1 license, maximum 2 licenses
 * - Valid positive price for each license
 * - Valid positive integer streamCap for limited licenses (defaults to 50,000)
 * - Limited license must have a strictly lower price than Premium-Unlimited license
 * - Returned licenses are ordered in ascending price
 */
export function validateLicenseItems(items: LicenseFormItem[]): LicenseValidationResult {
  const itemErrors: Record<string, { price?: string; streamCap?: string }> = {};
  let globalError: string | null = null;

  if (!items || items.length < 1) {
    return {
      valid: false,
      globalError: "At least 1 license is required.",
      itemErrors,
      sortedLicenses: [],
    };
  }

  if (items.length > 2) {
    return {
      valid: false,
      globalError: "A maximum of 2 licenses is allowed.",
      itemErrors,
      sortedLicenses: [],
    };
  }

  const seenTypes = new Set<CustomizableLicenseType>();
  for (const item of items) {
    if (seenTypes.has(item.type)) {
      globalError = "Each license type can only be added once.";
    }
    seenTypes.add(item.type);

    const parsedPrice = Number.parseFloat(item.price);
    if (!item.price.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      itemErrors[item.id] = {
        ...itemErrors[item.id],
        price: "Enter a valid price greater than $0.",
      };
    }

    if (item.type === "limited") {
      const capStr = item.streamCap.trim();
      const parsedCap = Number.parseInt(capStr, 10);
      if (!capStr || Number.isNaN(parsedCap) || parsedCap < 1 || !Number.isInteger(Number(capStr))) {
        itemErrors[item.id] = {
          ...itemErrors[item.id],
          streamCap: "Enter a whole number stream cap of at least 1.",
        };
      }
    }
  }

  const limitedItem = items.find((i) => i.type === "limited");
  const unlimitedItem = items.find((i) => i.type === "premium-unlimited");

  if (limitedItem && unlimitedItem) {
    const limitedPrice = Number.parseFloat(limitedItem.price);
    const unlimitedPrice = Number.parseFloat(unlimitedItem.price);

    if (
      !Number.isNaN(limitedPrice) &&
      limitedPrice > 0 &&
      !Number.isNaN(unlimitedPrice) &&
      unlimitedPrice > 0
    ) {
      if (limitedPrice >= unlimitedPrice) {
        globalError =
          "Limited license price must be lower than the Premium-Unlimited license price.";
      }
    }
  }

  // Check ascending price order if 2 licenses have valid prices
  if (items.length === 2 && !globalError) {
    const firstPrice = Number.parseFloat(items[0].price);
    const secondPrice = Number.parseFloat(items[1].price);
    if (
      !Number.isNaN(firstPrice) &&
      !Number.isNaN(secondPrice) &&
      firstPrice > secondPrice
    ) {
      globalError = "Licenses must be ordered in ascending price.";
    }
  }

  const hasItemErrors = Object.keys(itemErrors).length > 0;
  const valid = !globalError && !hasItemErrors;

  const sortedLicenses: ValidatedLicensePayload[] = valid
    ? [...items]
        .map((item) => {
          const price = Number.parseFloat(item.price);
          const payload: ValidatedLicensePayload = {
            type: item.type,
            price: Math.round(price * 100) / 100,
          };
          if (item.type === "limited") {
            const parsedCap = Number.parseInt(item.streamCap, 10);
            payload.streamCap =
              !Number.isNaN(parsedCap) && parsedCap >= 1 ? parsedCap : DEFAULT_STREAM_CAP;
          }
          return payload;
        })
        .sort((a, b) => a.price - b.price)
    : [];

  return {
    valid,
    globalError,
    itemErrors,
    sortedLicenses,
  };
}

interface LicenseSelectorProps {
  licenses: LicenseFormItem[];
  onChange: (licenses: LicenseFormItem[]) => void;
  disabled?: boolean;
  showAllErrors?: boolean;
}

export function LicenseSelector({
  licenses,
  onChange,
  disabled = false,
  showAllErrors = false,
}: LicenseSelectorProps) {
  const baseId = useId();
  // Track which license IDs have their stream cap customization expanded
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  // Track which fields have been blurred/interacted with to avoid premature validation errors while typing
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const validation = validateLicenseItems(licenses);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const markTouched = (key: string) => {
    setTouchedFields((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  /**
   * Orders licenses so that "limited" comes before "premium-unlimited" (and ascending by price when both prices exist).
   */
  const sortLicensesAscending = (list: LicenseFormItem[]): LicenseFormItem[] => {
    if (list.length <= 1) return list;
    return [...list].sort((a, b) => {
      // Since limited must be cheaper than premium-unlimited, limited naturally precedes premium-unlimited.
      // If both have valid prices and are of different types, sort by ascending price if valid, otherwise limited first.
      const priceA = Number.parseFloat(a.price);
      const priceB = Number.parseFloat(b.price);
      if (a.type !== b.type) {
        return a.type === "limited" ? -1 : 1;
      }
      if (!Number.isNaN(priceA) && !Number.isNaN(priceB)) {
        return priceA - priceB;
      }
      return 0;
    });
  };

  const handleTypeChange = (index: number, newType: CustomizableLicenseType) => {
    const current = licenses[index];
    if (!current || current.type === newType) return;

    if (licenses.length === 1) {
      const updated: LicenseFormItem = {
        ...current,
        type: newType,
        streamCap: current.streamCap || String(DEFAULT_STREAM_CAP),
      };
      onChange([updated]);
      return;
    }

    // When 2 licenses exist and the user switches one to the other type, swap their types
    // and keep them ordered in ascending tier/price order.
    const otherIndex = index === 0 ? 1 : 0;
    const other = licenses[otherIndex];
    const nextLicenses = licenses.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          type: newType,
          streamCap: item.streamCap || String(DEFAULT_STREAM_CAP),
        };
      }
      return {
        ...other,
        type: current.type,
        streamCap: other.streamCap || String(DEFAULT_STREAM_CAP),
      };
    });

    onChange(sortLicensesAscending(nextLicenses));
  };

  const handlePriceChange = (id: string, value: string) => {
    const next = licenses.map((item) =>
      item.id === id ? { ...item, price: value } : item
    );
    onChange(next);
  };

  const handlePriceBlur = (id: string) => {
    markTouched(`${id}-price`);
    if (licenses.length === 2) {
      const sorted = sortLicensesAscending(licenses);
      const changedOrder = sorted.some((item, idx) => item.id !== licenses[idx]?.id);
      if (changedOrder) {
        onChange(sorted);
      }
    }
  };

  const handleStreamCapChange = (id: string, value: string) => {
    const next = licenses.map((item) =>
      item.id === id ? { ...item, streamCap: value } : item
    );
    onChange(next);
  };

  const handleAddLicense = () => {
    if (licenses.length >= 2) return;
    const existingType = licenses[0]?.type;
    const newType: CustomizableLicenseType =
      existingType === "limited" ? "premium-unlimited" : "limited";

    const newItem: LicenseFormItem = {
      id: `license-${newType}-${Date.now()}`,
      type: newType,
      price: "",
      streamCap: String(DEFAULT_STREAM_CAP),
    };

    onChange(sortLicensesAscending([...licenses, newItem]));
  };

  const handleRemoveLicense = (id: string) => {
    if (licenses.length <= 1) return;
    onChange(licenses.filter((item) => item.id !== id));
  };

  const bothPricesTouched =
    licenses.length === 2 &&
    licenses.every((item) => touchedFields[`${item.id}-price`]);

  const showCrossLicenseError =
    Boolean(validation.globalError) && (showAllErrors || bothPricesTouched);
  const crossLicenseErrorId = `${baseId}-cross-license-error`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {licenses.map((license, index) => {
          const isLimited = license.type === "limited";
          const isExpanded = Boolean(expandedIds[license.id]);
          const typeSelectId = `${baseId}-${license.id}-type`;
          const priceInputId = `${baseId}-${license.id}-price`;
          const streamCapInputId = `${baseId}-${license.id}-stream-cap`;
          const streamCapPanelId = `${baseId}-${license.id}-stream-cap-panel`;

          const itemError = validation.itemErrors[license.id];
          const showPriceError =
            Boolean(itemError?.price) &&
            (showAllErrors || Boolean(touchedFields[`${license.id}-price`]));
          const showStreamCapError =
            Boolean(itemError?.streamCap) &&
            (showAllErrors || Boolean(touchedFields[`${license.id}-streamCap`]));

          const priceErrorId = `${baseId}-${license.id}-price-error`;
          const streamCapErrorId = `${baseId}-${license.id}-stream-cap-error`;
          const isPriceInvalid = showPriceError || showCrossLicenseError;
          const describedByIds = [
            showPriceError ? priceErrorId : null,
            showCrossLicenseError ? crossLicenseErrorId : null,
          ]
            .filter(Boolean)
            .join(" ");

          const formattedCap = Number.parseInt(license.streamCap, 10);
          const capDisplay =
            !Number.isNaN(formattedCap) && formattedCap > 0
              ? `${formattedCap.toLocaleString()} stream cap`
              : "Custom stream cap";

          return (
            <div
              key={license.id}
              className="rounded-lg border border-border bg-background/60 p-3.5 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                {/* License Type Select */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={typeSelectId}
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      License Tier {licenses.length > 1 ? `#${index + 1}` : ""} *
                    </label>
                    {isLimited && (
                      <span className="text-xs text-muted-foreground">
                        {capDisplay}
                      </span>
                    )}
                  </div>
                  <select
                    id={typeSelectId}
                    name={`license-type-${index}`}
                    value={license.type}
                    onChange={(e) =>
                      handleTypeChange(
                        index,
                        e.target.value as CustomizableLicenseType
                      )
                    }
                    disabled={disabled}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="limited">Limited</option>
                    <option value="premium-unlimited">Premium-Unlimited</option>
                  </select>
                </div>

                {/* License Price Input */}
                <div className="w-full sm:w-44 space-y-1.5">
                  <label
                    htmlFor={priceInputId}
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider block"
                  >
                    Price (USD) *
                  </label>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                    >
                      $
                    </span>
                    <input
                      id={priceInputId}
                      name={`license-price-${index}`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder={isLimited ? "29.99" : "79.99"}
                      value={license.price}
                      onChange={(e) =>
                        handlePriceChange(license.id, e.target.value)
                      }
                      onBlur={() => handlePriceBlur(license.id)}
                      disabled={disabled}
                      aria-invalid={isPriceInvalid ? "true" : "false"}
                      aria-describedby={describedByIds || undefined}
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
                    />
                  </div>
                </div>

                {/* Compact Action Buttons: Edit Stream Cap (Limited only) & Remove License */}
                <div className="flex items-center gap-1.5 self-end sm:pb-0.5">
                  {isLimited && (
                    <Button
                      type="button"
                      variant={isExpanded || showStreamCapError ? "secondary" : "outline"}
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => toggleExpanded(license.id)}
                      disabled={disabled}
                      aria-expanded={isExpanded || showStreamCapError}
                      aria-controls={streamCapPanelId}
                      aria-label="Customize stream cap"
                      title="Customize stream cap"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}

                  {licenses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveLicense(license.id)}
                      disabled={disabled}
                      aria-label={`Remove ${isLimited ? "Limited" : "Premium-Unlimited"} license`}
                      title="Remove license"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Price Error Message */}
              {showPriceError && itemError?.price && (
                <p
                  id={priceErrorId}
                  className="text-xs text-destructive flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{itemError.price}</span>
                </p>
              )}

              {/* Expandable Stream Cap Customization (Limited License Only) */}
              {isLimited && (isExpanded || showStreamCapError) && (
                <div
                  id={streamCapPanelId}
                  className="pt-2.5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <label
                      htmlFor={streamCapInputId}
                      className="text-xs font-medium text-foreground block"
                    >
                      Stream Cap
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Maximum number of monetized audio streams allowed under this limited license.
                    </p>
                  </div>
                  <div className="w-full sm:w-44 space-y-1">
                    <input
                      id={streamCapInputId}
                      name={`license-stream-cap-${index}`}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={license.streamCap}
                      onChange={(e) =>
                        handleStreamCapChange(license.id, e.target.value)
                      }
                      onBlur={() => markTouched(`${license.id}-streamCap`)}
                      disabled={disabled}
                      aria-invalid={showStreamCapError ? "true" : "false"}
                      aria-describedby={
                        showStreamCapError ? streamCapErrorId : undefined
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
                    />
                    {showStreamCapError && itemError?.streamCap && (
                      <p
                        id={streamCapErrorId}
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <AlertCircle
                          className="w-3 h-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{itemError.streamCap}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Cross-License Validation Feedback */}
      {showCrossLicenseError && validation.globalError && (
        <div
          id={crossLicenseErrorId}
          role="status"
          aria-live="polite"
          className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{validation.globalError}</span>
        </div>
      )}

      {/* Add Second License Button (shown when only 1 license is present) */}
      {licenses.length < 2 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLicense}
            disabled={disabled}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add License Tier
          </Button>
          <span className="text-xs text-muted-foreground">
            {licenses.length} of 2 licenses added
          </span>
        </div>
      )}
    </div>
  );
}
