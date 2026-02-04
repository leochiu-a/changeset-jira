import { describe, expect, it } from "vitest";

import { formatSummary, isValidDescription, normalizeTicketId } from "../src/lib/ticket";

describe("ticket helpers", () => {
  it("normalizes ticket IDs", () => {
    expect(normalizeTicketId("feature/gt-421-improve")).toBe("GT-421");
    expect(normalizeTicketId("GT-1 something")).toBe("GT-1");
    expect(normalizeTicketId("no-ticket-here")).toBeNull();
  });

  it("formats summary into a single line", () => {
    expect(formatSummary("  hello\nworld\t  ")).toBe("hello world");
  });

  it("validates description format and matching ticket ID", () => {
    const ticketId = "GT-421";

    expect(
      isValidDescription(
        "[GT-421] Improve image transfer efficiency",
        ticketId
      )
    ).toBe(true);

    expect(isValidDescription("[GT-999] Something", ticketId)).toBe(false);
    expect(isValidDescription("[GT-421] multi\nline", ticketId)).toBe(false);
    expect(isValidDescription("GT-421 Something", ticketId)).toBe(false);
  });
});
