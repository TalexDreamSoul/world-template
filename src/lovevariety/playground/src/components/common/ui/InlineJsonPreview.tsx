import React from "react";

// Inline JSON preview component + helper
// Thresholds & defaults - exported for reuse
export const DEFAULT_MAX_ARRAY_ITEMS = 5;
export const DEFAULT_MAX_OBJECT_KEYS = 4;
export const DEFAULT_MAX_PREVIEW_CHARS = 60;
export const DEFAULT_MAX_STRING_CHARS = 30;
export const DEFAULT_MAX_DEPTH = 2;

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

function formatPrimitive(value: unknown): React.ReactNode {
  if (value === null) return <span className="text-ctp-overlay1">null</span>;
  if (value === undefined)
    return <span className="text-ctp-overlay1">undefined</span>;
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-ctp-green" : "text-ctp-red"}>
        {value ? "true" : "false"}
      </span>
    );
  }
  if (typeof value === "number")
    return <span className="text-ctp-peach">{value}</span>;
  if (typeof value === "string")
    return <span className="text-ctp-green">"{value}"</span>;
  return String(value);
}

function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Render an inline preview for a value if it meets size and content constraints.
 * Returns a ReactNode if an inline preview can be shown, otherwise null.
 */
export function renderInlinePreview(
  value: unknown,
  opts?: Partial<{
    maxArrayItems: number;
    maxObjectKeys: number;
    maxPreviewChars: number;
    maxStringChars: number;
    depthLimit: number;
  }>,
): React.ReactNode | null {
  const {
    maxArrayItems = DEFAULT_MAX_ARRAY_ITEMS,
    maxObjectKeys = DEFAULT_MAX_OBJECT_KEYS,
    maxPreviewChars = DEFAULT_MAX_PREVIEW_CHARS,
    maxStringChars = DEFAULT_MAX_STRING_CHARS,
    depthLimit = DEFAULT_MAX_DEPTH,
  } = opts ?? {};

  function helper(
    v: unknown,
    depth: number,
  ): { node: React.ReactNode; chars: number } | null {
    if (depth > depthLimit) return null;

    if (isPrimitive(v)) {
      // For strings, truncate
      if (typeof v === "string") {
        const truncated = truncateString(v, maxStringChars);
        const node = <span className="text-ctp-green">"{truncated}"</span>;
        return { node, chars: String(truncated).length + 2 };
      }
      const node = formatPrimitive(v);
      return { node, chars: String(v ?? "").length };
    }

    if (Array.isArray(v)) {
      const len = v.length;
      if (len === 0) {
        return {
          node: <span className="text-ctp-overlay1">[]</span>,
          chars: 2,
        };
      }

      const displayCount = Math.min(len, maxArrayItems);

      // Check children
      const items: React.ReactNode[] = [];
      let totalChars = 2; // []
      for (let i = 0; i < displayCount; i++) {
        const child = v[i];
        if (!isPrimitive(child)) return null; // only allow primitives for inline
        // For string, we will truncate
        if (typeof child === "string") {
          const t = truncateString(child, maxStringChars);
          items.push(
            <span key={i} className="text-ctp-green">
              "{t}"
            </span>,
          );
          totalChars += t.length + 2;
        } else if (typeof child === "number") {
          items.push(
            <span key={i} className="text-ctp-peach">
              {String(child)}
            </span>,
          );
          totalChars += String(child).length;
        } else if (typeof child === "boolean") {
          items.push(
            <span key={i} className={child ? "text-ctp-green" : "text-ctp-red"}>
              {String(child)}
            </span>,
          );
          totalChars += String(child).length;
        } else if (child === null) {
          items.push(
            <span key={i} className="text-ctp-overlay1">
              null
            </span>,
          );
          totalChars += 4;
        } else {
          return null;
        }
        if (i < displayCount - 1) totalChars += 2; // comma + space
        if (totalChars > maxPreviewChars) return null;
      }

      // Build the inline node
      const node = (
        <span className="text-ctp-subtext1 font-mono text-xs">
          [
          {items.map((it, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-ctp-subtext0">, </span>}
              {it}
            </React.Fragment>
          ))}
          {len > maxArrayItems && prevAndMore(len - maxArrayItems)}]
        </span>
      );
      return { node, chars: totalChars };
    }

    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return {
          node: <span className="text-ctp-overlay1">{"{}"}</span>,
          chars: 2,
        };
      }

      const displayCount = Math.min(keys.length, maxObjectKeys);

      let totalChars = 2; // {}
      const items: React.ReactNode[] = [];
      for (let i = 0; i < displayCount; i++) {
        const k = keys[i] as string;
        const val = obj[k];
        if (!isPrimitive(val)) return null; // only primitives inline
        // key display
        const tKey = k ?? "";
        // value display similar to array
        if (typeof val === "string") {
          const t = truncateString(val, maxStringChars);
          items.push(
            <span key={k}>
              <span className="text-ctp-subtext0">{tKey}</span>:{" "}
              <span className="text-ctp-green">"{t}"</span>
            </span>,
          );
          totalChars += tKey.length + 2 + t.length + 2;
        } else if (typeof val === "number") {
          items.push(
            <span key={k}>
              <span className="text-ctp-subtext0">{tKey}</span>:{" "}
              <span className="text-ctp-peach">{String(val)}</span>
            </span>,
          );
          totalChars += tKey.length + 2 + String(val).length;
        } else if (typeof val === "boolean") {
          items.push(
            <span key={k}>
              <span className="text-ctp-subtext0">{tKey}</span>:{" "}
              <span className={val ? "text-ctp-green" : "text-ctp-red"}>
                {String(val)}
              </span>
            </span>,
          );
          totalChars += tKey.length + 2 + String(val).length;
        } else if (val === null) {
          items.push(
            <span key={k}>
              <span className="text-ctp-subtext0">{tKey}</span>:{" "}
              <span className="text-ctp-overlay1">null</span>
            </span>,
          );
          totalChars += tKey.length + 2 + 4;
        } else {
          return null;
        }
        if (i < displayCount - 1) totalChars += 2;
        if (totalChars > maxPreviewChars) return null;
      }

      const node = (
        <span className="text-ctp-subtext1 font-mono text-xs">
          {"{"}
          {items.map((it, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-ctp-subtext0">, </span>}
              {it}
            </React.Fragment>
          ))}
          {keys.length > displayCount &&
            prevAndMore(keys.length - displayCount)}
          {"}"}
        </span>
      );
      return { node, chars: totalChars };
    }

    return null;
  }

  // Helpers used in JSX above - we define them outside to avoid referencing undefined
  function prevAndMore(moreCount: number) {
    return <span className="text-ctp-subtext0">… +{moreCount}</span>;
  }

  const res = helper(value, 0);
  return res ? res.node : null;
}

// InlineJsonPreview component - returns null if can't inline
export default function InlineJsonPreview({
  value,
  maxArrayItems,
  maxObjectKeys,
  maxPreviewChars,
  maxStringChars,
  depthLimit,
}: {
  value: unknown;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxPreviewChars?: number;
  maxStringChars?: number;
  depthLimit?: number;
}) {
  const node = renderInlinePreview(value, {
    maxArrayItems,
    maxObjectKeys,
    maxPreviewChars,
    maxStringChars,
    depthLimit,
  });
  if (!node) return null;
  return <>{node}</>;
}
