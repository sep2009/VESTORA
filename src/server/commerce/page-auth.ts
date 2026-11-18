import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CUSTOMER_COOKIE, verifyCustomerToken } from "./customer-session";
import type { User } from "@/modules/commerce/types";

export async function currentCustomer(): Promise<User | null> {
  if (!process.env.SESSION_SECRET) return null;
  return verifyCustomerToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
}
/** For account pages: signed-out visitors go to the sign-in page. */
export async function requireCustomer(next: string): Promise<User> {
  const u = await currentCustomer();
  if (!u) redirect(`/account?next=${encodeURIComponent(next)}`);
  return u;
}
