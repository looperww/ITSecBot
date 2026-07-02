import { getCurrentUser } from "../../app-auth";
import { getAnalysisRuns, MaxUsersError } from "../../server/sqlite-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    return Response.json({ runs: await getAnalysisRuns(user) });
  } catch (error) {
    if (error instanceof MaxUsersError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json({ error: "SQLite storage failed." }, { status: 500 });
  }
}
