// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("otpSmsConfigured / sendOtpSms - כשה-URL לא מוגדר", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../src/config", async () => {
      const actual = await vi.importActual<typeof import("../src/config")>("../src/config");
      return { ...actual, MAKE_OTP_WEBHOOK_URL: "" };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/config");
  });

  it("otpSmsConfigured מחזיר false", async () => {
    const { otpSmsConfigured } = await import("../src/integrations/otp");
    expect(otpSmsConfigured()).toBe(false);
  });

  it("sendOtpSms לא שולח שום בקשת רשת ומחזיר false", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOtpSms } = await import("../src/integrations/otp");
    const ok = await sendOtpSms("0501234567", "1234");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});

describe("otpSmsConfigured / sendOtpSms - כשה-URL מוגדר (Make webhook מדומה)", () => {
  const FAKE_URL = "https://hook.make.com/fake-otp-webhook";

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../src/config", async () => {
      const actual = await vi.importActual<typeof import("../src/config")>("../src/config");
      return { ...actual, MAKE_OTP_WEBHOOK_URL: FAKE_URL };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../src/config");
  });

  it("otpSmsConfigured מחזיר true", async () => {
    const { otpSmsConfigured } = await import("../src/integrations/otp");
    expect(otpSmsConfigured()).toBe(true);
  });

  it("שולח POST עם phone ו-code, ומחזיר true כשהתגובה תקינה", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOtpSms } = await import("../src/integrations/otp");

    const ok = await sendOtpSms("0501234567", "5678");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(FAKE_URL);
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.phone).toBe("0501234567");
    expect(body.code).toBe("5678");
    expect(typeof body.sentAt).toBe("string");
    expect(ok).toBe(true);
  });

  it("מחזיר false כשהתגובה לא תקינה (res.ok === false)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOtpSms } = await import("../src/integrations/otp");
    const ok = await sendOtpSms("0501234567", "5678");
    expect(ok).toBe(false);
  });

  it("כשל רשת לא זורק שגיאה ומחזיר false", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOtpSms } = await import("../src/integrations/otp");
    const ok = await sendOtpSms("0501234567", "5678");
    expect(ok).toBe(false);
  });
});
