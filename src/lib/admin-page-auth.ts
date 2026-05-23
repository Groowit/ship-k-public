import { redirect } from "next/navigation";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath, isAdminProfile } from "@/lib/authz";

export async function requireAdminPageAccess(nextPath = "/admin") {
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath(nextPath));
  }

  return isAdminProfile(profile);
}
