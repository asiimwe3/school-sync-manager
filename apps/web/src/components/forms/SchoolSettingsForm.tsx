/**
 * SchoolSettingsForm
 * - React Hook Form + shared Zod schema (@ssm/validation)
 * - District Combobox with all Ugandan districts
 * - Ugandan phone validation
 * - Submits via useSyncManager (works offline)
 * - Raw UGX integer in edit form (formatted compact only in dashboard cards)
 */
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  schoolSettingsSchema,
  UGANDAN_DISTRICTS,
  type SchoolSettingsInput,
} from "@ssm/validation";
import { formatUGXRaw } from "@ssm/utils";
import { useSyncManager } from "../../providers/SyncProvider";
import { Combobox } from "../ui/Combobox";

interface SchoolSettingsFormProps {
  defaultValues?: Partial<SchoolSettingsInput>;
  schoolId: string;
  onSuccess?: () => void;
}

export function SchoolSettingsForm({
  defaultValues,
  schoolId,
  onSuccess,
}: SchoolSettingsFormProps) {
  const { mutate, isOnline } = useSyncManager();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SchoolSettingsInput>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: {
      schoolName:   "",
      address:      "",
      contactPhone: "",
      email:        "",
      termFee:      0,
      logoUrl:      "",
      ...defaultValues,
    },
  });

  const termFee = watch("termFee");

  const onSubmit = async (data: SchoolSettingsInput) => {
    await mutate("school", "update", { id: schoolId, ...data });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "grid", gap: 20 }}>

      {/* Offline notice */}
      {!isOnline && (
        <div style={{
          background: "#fffbeb", border: "1px solid #d69e2e",
          borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#744210",
        }}>
          ⚠️ You&apos;re offline. Changes will sync automatically when you reconnect.
        </div>
      )}

      {/* School Name */}
      <Field label="School Name" error={errors.schoolName?.message}>
        <input
          {...register("schoolName")}
          placeholder="e.g. Kyenjojo Primary School"
          style={inputStyle(!!errors.schoolName)}
        />
      </Field>

      {/* District — searchable Combobox */}
      <Field label="District" error={errors.district?.message}>
        <Controller
          name="district"
          control={control}
          render={({ field }) => (
            <Combobox
              id="district"
              options={UGANDAN_DISTRICTS}
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Search district…"
              error={errors.district?.message}
            />
          )}
        />
      </Field>

      {/* Address */}
      <Field label="Address" error={errors.address?.message}>
        <input
          {...register("address")}
          placeholder="e.g. Plot 12, Kyenjojo Town"
          style={inputStyle(!!errors.address)}
        />
      </Field>

      {/* Contact Phone — Ugandan format hint */}
      <Field
        label="Contact Phone"
        error={errors.contactPhone?.message}
        hint="Ugandan format: +256772002326 or 0772002326"
      >
        <input
          {...register("contactPhone")}
          type="tel"
          placeholder="+256 77 200 2326"
          style={inputStyle(!!errors.contactPhone)}
        />
      </Field>

      {/* Email */}
      <Field label="School Email" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          placeholder="info@school.ac.ug"
          style={inputStyle(!!errors.email)}
        />
      </Field>

      {/* Term Fee — raw integer in form */}
      <Field
        label="Term Fee (UGX)"
        error={errors.termFee?.message}
        hint={termFee > 0 ? `Displays as ${formatUGXRaw(termFee)} UGX on invoices` : undefined}
      >
        <input
          {...register("termFee", { valueAsNumber: true })}
          type="number"
          min={0}
          step={1000}
          placeholder="750000"
          style={inputStyle(!!errors.termFee)}
        />
      </Field>

      {/* Logo URL (optional) */}
      <Field label="Logo URL (optional)" error={errors.logoUrl?.message}>
        <input
          {...register("logoUrl")}
          type="url"
          placeholder="https://..."
          style={inputStyle(!!errors.logoUrl)}
        />
      </Field>

      {/* Year Established (optional) */}
      <Field label="Year Established (optional)" error={errors.established?.message}>
        <input
          {...register("established", { valueAsNumber: true })}
          type="number"
          min={1900}
          max={new Date().getFullYear()}
          placeholder="2005"
          style={inputStyle(!!errors.established)}
        />
      </Field>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        style={{
          padding: "12px 28px", borderRadius: 8, border: "none",
          background: isDirty ? "#4f46e5" : "#a0aec0",
          color: "#fff", fontWeight: 700, fontSize: 15,
          cursor: isDirty ? "pointer" : "default",
          transition: "background 0.2s",
        }}
      >
        {isSubmitting ? "Saving…" : isOnline ? "Save Settings" : "Save (will sync later)"}
      </button>

    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({
  label, error, hint, children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontWeight: 600, fontSize: 14 }}>{label}</label>
      {children}
      {hint  && <span style={{ fontSize: 12, color: "#718096" }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: "#e53e3e" }}>{error}</span>}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    padding: "10px 12px", borderRadius: 8, fontSize: 14,
    border: `1.5px solid ${hasError ? "#e53e3e" : "#cbd5e0"}`,
    outline: "none", width: "100%", boxSizing: "border-box",
  };
}
