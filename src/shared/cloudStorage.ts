import type { AppData } from "../entities";
import { normalizeAppData } from "./storage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const APP_STATE_ID = import.meta.env.VITE_APP_STATE_ID ?? "default";

interface CloudStateRow {
  id: string;
  data: AppData;
  updated_at?: string;
}

const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const headers = {
  apikey: SUPABASE_ANON_KEY ?? "",
  Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ""}`,
  "Content-Type": "application/json",
};

function endpoint(query = "") {
  return `${SUPABASE_URL}/rest/v1/app_state${query}`;
}

export const cloudRepository = {
  enabled,

  async load(): Promise<AppData | null> {
    if (!enabled) return null;

    const response = await fetch(endpoint(`?id=eq.${encodeURIComponent(APP_STATE_ID)}&select=id,data,updated_at`), {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Cloud load failed: ${response.status}`);
    }

    const rows = (await response.json()) as CloudStateRow[];
    return rows[0]?.data ? normalizeAppData(rows[0].data) : null;
  },

  async save(data: AppData): Promise<void> {
    if (!enabled) return;

    const response = await fetch(endpoint("?on_conflict=id"), {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: APP_STATE_ID,
        data,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloud save failed: ${response.status}`);
    }
  },
};
