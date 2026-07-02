import { getCurrentUser } from "../../app-auth";
import {
  AuthorizationError,
  getStoredSettings,
  MaxUsersError,
  saveStoredSettings,
} from "../../server/sqlite-store";
import {
  parseWorkbenchSettingsSnapshot,
  type WorkbenchSettings,
} from "../../workbench-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    return Response.json({ settings: await getStoredSettings() });
  } catch (error) {
    return handleStorageError(error);
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  let settings: WorkbenchSettings;
  try {
    const payload = (await request.json()) as { settings?: WorkbenchSettings };
    if (!payload.settings) {
      return Response.json({ error: "Settings are required." }, { status: 400 });
    }
    settings = parseWorkbenchSettingsSnapshot(JSON.stringify(payload.settings));
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    return Response.json({
      settings: await saveStoredSettings(user, settings),
    });
  } catch (error) {
    return handleStorageError(error);
  }
}

function handleStorageError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof MaxUsersError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  return Response.json({ error: "SQLite storage failed." }, { status: 500 });
}
