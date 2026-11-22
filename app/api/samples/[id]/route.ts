import { json, problem } from "../../../../lib/http.ts";
import { getSample } from "../../../../lib/samples.ts";

export async function GET(_request: Request, context: RouteContext<"/api/samples/[id]">) {
  const { id } = await context.params;
  const bill = getSample(id);
  return bill ? json({ bill, synthetic: true }) : problem(404, "sample_not_found", "That example bill doesn't exist.");
}
