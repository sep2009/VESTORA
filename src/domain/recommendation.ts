import { z } from "zod";
import { productId, userId } from "./ids";

export const recommendation = z.object({
  userId,
  productId,
  score: z.number().min(0).max(1),
  source: z.enum(["style-quiz", "browsing", "outfit", "assistant"]),
});
export type Recommendation = z.infer<typeof recommendation>;
