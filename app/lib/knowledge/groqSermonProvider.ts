/** Keep Groq's constrained-decoding schema in its portable subset.
 * The full schema remains the source of truth for local validation.
 */
export function groqSermonWireSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (["minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum"].includes(key)) continue;
    if (key === "enum" && Array.isArray(value) && value.some(item => typeof item !== "string")) continue;
    if (key === "properties" && value && typeof value === "object") {
      result[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, groqSermonWireSchema(child as Record<string, unknown>)]));
    } else if (key === "items" && value && typeof value === "object") {
      result[key] = groqSermonWireSchema(value as Record<string, unknown>);
    } else result[key] = value;
  }
  return result;
}
