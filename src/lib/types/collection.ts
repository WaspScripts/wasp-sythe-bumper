import type { Database } from "$lib/types/supabase"

type ScriptRow = Database["scripts"]["Tables"]["scripts"]["Row"]
export type ScriptStats = Database["stats"]["Tables"]["values"]["Row"]

export interface Script extends Pick<ScriptRow, "id" | "url" | "title" | "description"> {
	stats: ScriptStats | undefined
}

export interface TotalStats {
	experience: number
	gold: number
	levels: number
	runtime: number
}
