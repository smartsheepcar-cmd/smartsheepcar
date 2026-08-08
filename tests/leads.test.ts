// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendLeadToWebhook - כשה-URL לא מוגדר", () => {
  beforeEach(() => {
    vi.resetModules();
    // ממקום מפורש URL ריק, ללא תלות בערך האמיתי הנוכחי ב-config.ts
    vi.doMock("../src/config", async () => {
      const actual = await vi.importActual<typeof import("../src/config")>("../src/config");
      return { ...actual, MAKE_LEAD_WEBHOOK_URL: "" };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/config");
  });

  it("לא שולח שום בקשת רשת (מדלג בשקט)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendLeadToWebhook } = await import("../src/integrations/leads");
    sendLeadToWebhook({ name: "א", phone: "0501234567", email: "a@b.com", marketingConsent: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("sendLeadToWebhook - כשה-URL מוגדר (Make webhook מדומה)", () => {
  const FAKE_URL = "https://hook.make.com/fake-test-webhook";

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../src/config", async () => {
      const actual = await vi.importActual<typeof import("../src/config")>("../src/config");
      return { ...actual, MAKE_LEAD_WEBHOOK_URL: FAKE_URL };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/config");
  });

  it("שולח POST עם payload תקין הכולל את שדות הליד ומקור", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    const { sendLeadToWebhook } = await import("../src/integrations/leads");

    sendLeadToWebhook({ name: "ישראל ישראלי", phone: "0501234567", email: "israel@test.com", marketingConsent: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(FAKE_URL);
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.name).toBe("ישראל ישראלי");
    expect(body.phone).toBe("0501234567");
    expect(body.email).toBe("israel@test.com");
    expect(body.marketingConsent).toBe(true);
    expect(body.source).toBe("car-cost-calculator");
    expect(typeof body.sentAt).toBe("string");
  });

  it("כשל ברשת לא זורק שגיאה (ירי-וסיום)", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendLeadToWebhook } = await import("../src/integrations/leads");
    expect(() =>
      sendLeadToWebhook({ name: "א", phone: "0501234567", email: "a@b.com", marketingConsent: false })
    ).not.toThrow();
  });
});
