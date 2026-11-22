import { json } from "../../../lib/http.ts";
import { listSamples } from "../../../lib/samples.ts";

export function GET() {
  return json({ samples: listSamples(), synthetic: true });
}
