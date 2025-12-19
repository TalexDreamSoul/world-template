import type { ScriptMetadata } from "@miehoukingdom/world-interface";

function isWorldMetadata(obj: unknown): obj is ScriptMetadata {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  // name and description are required and must be strings
  if (typeof o.name !== "string") return false;
  if (typeof o.description !== "string") return false;
  // plugins is required and must be an array (we do not deep-validate plugin items)
  if (!Array.isArray(o.plugins)) return false;
  return true;
}

export function parseScriptMetadata(text: string): ScriptMetadata {
  if (typeof text !== "string" || text.length === 0)
    throw new Error("parseScriptMetadata: expected non-empty string input");
  const firstLine = (text.split(/\r?\n/)[0] ?? "").trim();
  if (!firstLine || !firstLine.startsWith("//"))
    throw new Error(
      "parseScriptMetadata: first line must be JSON comment (e.g. //{...})",
    );
  const jsonText = firstLine.replace(/^\/\/\s*/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "parseScriptMetadata: failed to parse JSON metadata on first line",
    );
  }
  if (!isWorldMetadata(parsed))
    throw new Error(
      "parseScriptMetadata: JSON metadata does not satisfy WorldMetadata shape",
    );
  return parsed as ScriptMetadata;
}
