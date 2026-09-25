"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/own";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// The business removes a pet from its list (the owner can share again).
export async function removeSharedPet(petId: string): Promise<{ error?: string }> {
  await requireUser();
  const business = await getOwnBusiness();
  if (!business || !isUuid(petId)) return { error: "לא נמצא" };
  const supabase = await createClient();
  const { error } = await supabase.from("pet_shares").delete().eq("pet_id", petId).eq("business_id", business.id);
  if (error) return { error: "הפעולה נכשלה. נסו שוב." };
  revalidatePath("/business/pets");
  redirect("/business/pets");
}
