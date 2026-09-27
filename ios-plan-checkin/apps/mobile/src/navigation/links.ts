import { parseBusinessDate } from "@plan-checkin/domain";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AppLink =
  | { screen: "PlanDetail"; planId: string }
  | { screen: "Checkin"; planId: string; businessDate: string };

/** Only allow links to owner-scoped resources; navigation verifies ownership online. */
export function parseAppLink(raw: string): AppLink | null {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "plancheckin:" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.hostname === "plan" &&
      segments.length === 1 &&
      uuid.test(segments[0]!)
    )
      return { screen: "PlanDetail", planId: segments[0]! };
    if (
      url.hostname === "checkin" &&
      segments.length === 2 &&
      uuid.test(segments[0]!)
    ) {
      parseBusinessDate(segments[1]!);
      return {
        screen: "Checkin",
        planId: segments[0]!,
        businessDate: segments[1]!,
      };
    }
    return null;
  } catch {
    return null;
  }
}
