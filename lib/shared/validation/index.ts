/**
 * @ssm/validation
 * Shared Zod schemas — single source of truth for all forms and API payloads.
 * UI components import from here; they never define their own validation.
 */
import { z } from "zod";

// ─── Ugandan Districts ────────────────────────────────────────────────────────
export const UGANDAN_DISTRICTS = [
  "Abim","Adjumani","Agago","Alebtong","Amolatar","Amudat","Amuria","Amuru",
  "Apac","Arua","Budaka","Bududa","Bugiri","Buhweju","Buikwe","Bukedea",
  "Bukomansimbi","Bukwa","Bulambuli","Buliisa","Bundibugyo","Bunyangabu",
  "Bushenyi","Busia","Butaleja","Butebo","Buvuma","Buyende","Dokolo",
  "Gomba","Gulu","Hoima","Ibanda","Iganga","Isingiro","Jinja","Kaabong",
  "Kabale","Kabarole","Kaberamaido","Kagadi","Kakumiro","Kalangala","Kaliro",
  "Kalungu","Kampala","Kamuli","Kamwenge","Kanungu","Kapchorwa","Kapelebyong",
  "Karenga","Kasanda","Kasese","Katakwi","Kayunga","Kazo","Kibale","Kiboga",
  "Kibuku","Kikuube","Kiruhura","Kiryandongo","Kisoro","Kitgum","Koboko",
  "Kole","Kotido","Kumi","Kwania","Kween","Kyankwanzi","Kyegegwa","Kyenjojo",
  "Kyotera","Lamwo","Lira","Luuka","Luwero","Lwengo","Lyantonde","Madi-Okollo",
  "Manafwa","Maracha","Masaka","Masindi","Mayuge","Mbale","Mbarara","Mitooma",
  "Mityana","Moroto","Moyo","Mpigi","Mubende","Mukono","Nabilatuk","Nakapiripirit",
  "Nakaseke","Nakasongola","Namayingo","Namisindwa","Namutumba","Napak","Nebbi",
  "Ngora","Ntoroko","Ntungamo","Nwoya","Obongi","Omoro","Otuke","Oyam","Pader",
  "Pakwach","Pallisa","Rakai","Rubanda","Rubirizi","Rukiga","Rukungiri",
  "Rwampara","Sembabule","Serere","Sheema","Sironko","Soroti","Tororo",
  "Wakiso","Yumbe","Zombo",
] as const;

export type UgandanDistrict = typeof UGANDAN_DISTRICTS[number];

// ─── Phone validation (Ugandan networks) ─────────────────────────────────────
/**
 * Accepts:
 *  +2567XXXXXXXX  (international)
 *   07XXXXXXXXX   (local MTN/Airtel/Lyca)
 *   07XXXXXXXXX   (070 Airtel, 075 Africell, 077 MTN, 078 Airtel, 079 MTN)
 */
const UGANDA_PHONE_REGEX =
  /^(\+256|0)(7[0-9])\d{7}$/;

export const ugandaPhoneSchema = z
  .string()
  .trim()
  .regex(UGANDA_PHONE_REGEX, {
    message:
      "Enter a valid Ugandan number (e.g. +256772002326, 0772002326)",
  });

// ─── School Settings Schema ───────────────────────────────────────────────────
export const schoolSettingsSchema = z.object({
  schoolName:   z.string().min(3, "School name must be at least 3 characters"),
  district:     z.enum(UGANDAN_DISTRICTS, {
                  errorMap: () => ({ message: "Select a valid Ugandan district" }),
                }),
  address:      z.string().min(5, "Enter a full address"),
  contactPhone: ugandaPhoneSchema,
  email:        z.email("Enter a valid email address"),
  termFee:      z.number().int().positive("Fee must be a positive integer (UGX)"),
  logoUrl:      z.url().optional().or(z.literal("")),
  established:  z.number()
                  .int()
                  .min(1900)
                  .max(new Date().getFullYear(), "Year cannot be in the future")
                  .optional(),
});

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>;

// ─── Student Schema ───────────────────────────────────────────────────────────
export const studentSchema = z.object({
  id:          z.string().uuid(),
  fullName:    z.string().min(2),
  dob:         z.coerce.date(),
  classId:     z.string().uuid(),
  guardianPhone: ugandaPhoneSchema,
  feesPaid:    z.number().int().nonnegative(),
  feesOwed:    z.number().int().nonnegative(),
  enrolledAt:  z.coerce.date().default(() => new Date()),
});

export type StudentInput = z.infer<typeof studentSchema>;

// ─── Fee Payment Schema ───────────────────────────────────────────────────────
export const feePaymentSchema = z.object({
  studentId:   z.string().uuid(),
  amount:      z.number().int().positive("Amount must be positive"),
  method:      z.enum(["CASH", "MTN_MOMO", "AIRTEL_MONEY", "BANK"]),
  reference:   z.string().optional(),
  paidAt:      z.coerce.date().default(() => new Date()),
});

export type FeePaymentInput = z.infer<typeof feePaymentSchema>;
