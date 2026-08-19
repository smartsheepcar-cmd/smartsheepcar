// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sampleCars = [
  {
    name: "מזדה 3",
    purchasePrice: 100000,
    economicTotal: 150000,
    economicMonthly: 2500,
    holdingYears: 5,
    categories: [{ label: "דלק / חשמל", total: 20000, monthly: 333 }],
  },
];

describe("resultsEmailConfigured / sendResultsEmail - כשה-URL לא מוגדר", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../src/config", async () => {
      const actual = await vi.importActual<typeof import("../src/config")>("../src/config");
      return { ...actual, MAKE_RESULTS_EMAIL_WEBHOOK_URL: "" };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/config");
  });

  it("resultsEmailConfigured מחזיר false", async () => {
    const { resultsEmailConfigured } = await import("../src/integrations/resultsEmail");
    expect(resultsEmailConfigured()).toBe(false);
  });

  it("sendResultsEmail לא שולח שום בקשת רשת ומחזיר false", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendResultsEmail } = await import("../src/integrations/resultsEmail");
    const ok = await sendResultsEmail({ email: "a@b.com", name: "א", cars: sampleCars });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});

describe("resultsEmailConfigured / sendResultsEmail - כשה-URL מוגדר (Make webhook מדומה)", () => {
  const FAKE_URL = "https://hook.make.com/fake-results-webhook";

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../src/config", async () => {
      const actual = await vi.importActual<typeof import("../src/config")>("../src/config");
      return { ...actual, MAKE_RESULTS_EMAIL_WEBHOOK_URL: FAKE_URL };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/config");
  });

  it("resultsEmailConfigured מחזיר true", async () => {
    const { resultsEmailConfigured } = await import("../src/integrations/resultsEmail");
    expect(resultsEmailConfigured()).toBe(true);
  });

  it("שולח POST עם payload תקין (email/name/cars) ומחזיר true כשהתגובה תקינה", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    const { sendResultsEmail } = await import("../src/integrations/resultsEmail");

    const ok = await sendResultsEmail({ email: "israel@test.com", name: "ישראל", cars: sampleCars });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(FAKE_URL);
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.email).toBe("israel@test.com");
    expect(body.name).toBe("ישראל");
    expect(body.cars).toEqual(sampleCars);
    expect(body.source).toBe("car-cost-calculator");
    expect(typeof body.sentAt).toBe("string");
    expect(ok).toBe(true);
  });

  it("מחזיר false כשהתגובה לא תקינה (res.ok === false)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchSpy);
    const { sendResultsEmail } = await import("../src/integrations/resultsEmail");
    const ok = await sendResultsEmail({ email: "a@b.com", name: "א", cars: sampleCars });
    expect(ok).toBe(false);
  });

  it("כשל רשת לא זורק שגיאה ומחזיר false", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendResultsEmail } = await import("../src/integrations/resultsEmail");
    const ok = await sendResultsEmail({ email: "a@b.com", name: "א", cars: sampleCars });
    expect(ok).toBe(false);
  });
});
