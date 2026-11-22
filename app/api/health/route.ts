import { ENGINE_VERSION } from "../../../lib/analysis.ts";
import { json } from "../../../lib/http.ts";

// Describes the persistence boundary honestly: the server keeps nothing.
export function GET() {
  return json({ status: "ok", persistence: "browser-local", retention: "none", engine: ENGINE_VERSION });
}
