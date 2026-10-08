declare module "bun" {
	interface Env {
		SYTHE_USER: string
		SYTHE_PASS: string
		SYTHE_THREAD: string
		SYTHE_POST: string
		BUMP_HOUR_INTERVAL: string
		EDIT_MINUTE_INTERVAL: string
		SUPABASE_URL: string
		SUPABASE_ANON_KEY: string
		ENVIRONMENT: "development" | "production"
	}
}
