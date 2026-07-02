import { requireCurrentUser, signOutPath } from "../app-auth";
import SettingsPanel from "../components/settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireCurrentUser("/settings");

  return (
    <SettingsPanel
      signInPath="/auth/sign-in"
      signOutPath={signOutPath("/settings")}
      user={user}
    />
  );
}
