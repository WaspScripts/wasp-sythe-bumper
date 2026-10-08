import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import tseslint from "typescript-eslint"

export default tseslint.config(
	{ ignores: ["node_modules", "supabase", "src/lib/types/supabase.ts"] },
	js.configs.recommended,
	tseslint.configs.recommended,
	prettier
)
