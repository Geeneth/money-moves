import { redirect } from "next/navigation";
import { getSettings } from "@/lib/repositories/settings";

export const dynamic = "force-dynamic";

export default function RootPage(): void {
  const settings = getSettings();
  if (!settings) {
    redirect("/onboarding");
  }
  redirect("/dashboard");
}
