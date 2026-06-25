/**
 * Vitest unit tests for @ssm/utils
 * Run: vitest run
 */
import { describe, it, expect } from "vitest";
import { formatUGX, formatUGXRaw, formatUgandaPhone, currentAcademicTerm } from "@ssm/utils";

describe("formatUGX", () => {
  it("formats millions compactly",  () => expect(formatUGX(5_000_000)).toBe("UGX 5M"));
  it("formats fractional millions", () => expect(formatUGX(1_200_000)).toBe("UGX 1.2M"));
  it("formats thousands",           () => expect(formatUGX(750_000)).toBe("UGX 750K"));
  it("formats sub-thousand",        () => expect(formatUGX(500)).toBe("UGX 500"));
  it("formats billions",            () => expect(formatUGX(2_000_000_000)).toBe("UGX 2B"));
});

describe("formatUGXRaw", () => {
  it("adds commas",  () => expect(formatUGXRaw(5_000_000)).toBe("5,000,000"));
  it("small number", () => expect(formatUGXRaw(500)).toBe("500"));
});

describe("formatUgandaPhone", () => {
  it("formats local 0772...", () =>
    expect(formatUgandaPhone("0772002326")).toBe("+256 77 200 2326")
  );
  it("formats intl 256772...", () =>
    expect(formatUgandaPhone("256772002326")).toBe("+256 77 200 2326")
  );
});

describe("currentAcademicTerm", () => {
  it("returns a string", () => expect(typeof currentAcademicTerm()).toBe("string"));
});
