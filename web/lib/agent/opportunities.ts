import { createClient } from "@supabase/supabase-js";
import type { Opportunity } from "./types";
import demo from "../data/opportunities.demo.json";

/** Lee convocatorias curadas de Supabase; sin config cae a datos demo (siempre is_demo: true). */
export async function listOpportunities(): Promise<Opportunity[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return demo as Opportunity[];

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("opportunities").select("*").limit(200);
  if (error || !data?.length) return demo as Opportunity[];
  return data as Opportunity[];
}
