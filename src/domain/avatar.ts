import { z } from "zod";
import { userId } from "./ids";

/** Parametric avatar: body proportions are sliders, never free-form per-user meshes. */
export const avatar = z.object({
  id: z.uuid(),
  userId,
  heightCm: z.number().min(100).max(230),
  build: z.number().min(0).max(1),
  skinTone: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hairStyleKey: z.string(),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type Avatar = z.infer<typeof avatar>;
