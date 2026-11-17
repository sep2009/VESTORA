import { z } from "zod";
import { userId } from "./ids";

export const userPreferences = z.object({
  userId,
  preferredDepartmentIds: z.array(z.uuid()).default([]),
  preferredSizeCodes: z.array(z.string()).default([]),
  styleQuizResult: z.record(z.string(), z.string()).default({}),
  currency: z.string().length(3).default("USD"),
});
export type UserPreferences = z.infer<typeof userPreferences>;

export const userProfile = z.object({
  id: userId,
  displayName: z.string().min(1),
  role: z.enum(["customer", "admin"]).default("customer"),
});
export type UserProfile = z.infer<typeof userProfile>;
