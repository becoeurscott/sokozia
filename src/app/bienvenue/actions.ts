"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function later() {
  (await cookies()).set("sz_onboarded", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/studio");
}
