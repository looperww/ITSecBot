import { requireCurrentUser, signOutPath } from "./app-auth";
import SecurityWorkbench from "./components/security-workbench";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireCurrentUser("/");

  return (
    <SecurityWorkbench
      signInPath="/auth/sign-in"
      signOutPath={signOutPath("/")}
      user={user}
    />
  );
}
