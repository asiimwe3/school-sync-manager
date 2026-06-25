import { describe, it, expect } from "vitest";
import { schoolSettingsSchema, ugandaPhoneSchema } from "@ssm/validation";

describe("ugandaPhoneSchema", () => {
  it("accepts +256772002326",   () => expect(ugandaPhoneSchema.safeParse("+256772002326").success).toBe(true));
  it("accepts 0772002326",      () => expect(ugandaPhoneSchema.safeParse("0772002326").success).toBe(true));
  it("accepts 0701234567",      () => expect(ugandaPhoneSchema.safeParse("0701234567").success).toBe(true));
  it("rejects Kenyan +254...",  () => expect(ugandaPhoneSchema.safeParse("+254712345678").success).toBe(false));
  it("rejects short number",    () => expect(ugandaPhoneSchema.safeParse("077123").success).toBe(false));
});

describe("schoolSettingsSchema", () => {
  const valid = {
    schoolName:   "Kyenjojo Primary School",
    district:     "Kyenjojo",
    address:      "Plot 12, Kyenjojo Town",
    contactPhone: "+256772002326",
    email:        "info@school.ac.ug",
    termFee:      750_000,
  } as const;

  it("accepts valid input",           () => expect(schoolSettingsSchema.safeParse(valid).success).toBe(true));
  it("rejects invalid district",      () => expect(schoolSettingsSchema.safeParse({ ...valid, district: "Mars" }).success).toBe(false));
  it("rejects bad phone",             () => expect(schoolSettingsSchema.safeParse({ ...valid, contactPhone: "123" }).success).toBe(false));
  it("rejects negative fee",          () => expect(schoolSettingsSchema.safeParse({ ...valid, termFee: -1000 }).success).toBe(false));
  it("rejects short school name",     () => expect(schoolSettingsSchema.safeParse({ ...valid, schoolName: "AB" }).success).toBe(false));
});
