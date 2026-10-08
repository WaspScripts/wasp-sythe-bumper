const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

interface Page {
	token: string
	loggedIn: boolean
	title: string
}

/**
 * Minimal XenForo client: a cookie jar, CSRF token scraping and form posts.
 * XenForo answers successful form submissions with a 303 redirect.
 */
export class XenForo {
	readonly #baseUrl: string
	readonly #username: string
	readonly #password: string
	readonly #timeout: number
	readonly #cookies = new Map<string, string>()

	constructor(baseUrl: string, username: string, password: string, timeout = 15_000) {
		this.#baseUrl = baseUrl
		this.#username = username
		this.#password = password
		this.#timeout = timeout
	}

	async login() {
		this.#cookies.clear()
		const { token } = await this.#getPage()

		const response = await this.#post("index.php?login/login", {
			login: this.#username,
			password: this.#password,
			remember: "1",
			_xfToken: token
		})
		if (response.status !== 303) throw await requestError("Login failed", response)
		await response.body?.cancel()

		const page = await this.#getPage()
		if (!page.loggedIn) throw new Error("Login failed: session is not logged in after login")
	}

	async reply(threadId: string, message: string) {
		const token = await this.#ensureSession()
		await this.#submit(`index.php?threads/${threadId}/add-reply`, { message, _xfToken: token })
	}

	async editPost(postId: string, message: string) {
		const token = await this.#ensureSession()
		await this.#submit(`index.php?posts/${postId}/save`, { message, _xfToken: token })
	}

	/** Returns a fresh CSRF token, logging in again if the session expired. */
	async #ensureSession() {
		let page = await this.#getPage()
		if (!page.loggedIn) {
			await this.login()
			page = await this.#getPage()
		}
		return page.token
	}

	async #submit(path: string, data: Record<string, string>) {
		const response = await this.#post(path, data)
		if (response.status !== 303) throw await requestError(`POST ${path} failed`, response)
		await response.body?.cancel()
	}

	async #getPage(path = ""): Promise<Page> {
		const response = await this.#request(path)
		if (!response.ok) throw await requestError(`GET ${path || "/"} failed`, response)
		return parsePage(response)
	}

	#post(path: string, data: Record<string, string>) {
		return this.#request(path, { method: "POST", body: new URLSearchParams(data) })
	}

	async #request(path: string, init: RequestInit = {}) {
		const headers = new Headers(init.headers)
		headers.set("User-Agent", USER_AGENT)
		if (this.#cookies.size > 0) {
			const cookies = Array.from(this.#cookies, ([name, value]) => `${name}=${value}`)
			headers.set("Cookie", cookies.join("; "))
		}

		const response = await fetch(new URL(path, this.#baseUrl), {
			...init,
			headers,
			redirect: "manual",
			signal: AbortSignal.timeout(this.#timeout)
		})

		for (const header of response.headers.getSetCookie()) {
			const cookie = Bun.Cookie.parse(header)
			if (cookie.isExpired()) this.#cookies.delete(cookie.name)
			else this.#cookies.set(cookie.name, cookie.value)
		}

		return response
	}
}

/** Reads the CSRF token, login state and title of a XenForo 1.x or 2.x page. */
async function parsePage(response: Response) {
	const page: Page = { token: "", loggedIn: false, title: "" }

	await new HTMLRewriter()
		.on("html", {
			element(el) {
				const classes = (el.getAttribute("class") ?? "").split(/\s+/)
				page.loggedIn = classes.includes("LoggedIn") || el.getAttribute("data-logged-in") === "true"
				page.token = el.getAttribute("data-csrf") ?? ""
			}
		})
		.on('input[name="_xfToken"]', {
			element(el) {
				page.token ||= el.getAttribute("value") ?? ""
			}
		})
		.on("title", {
			text(chunk) {
				page.title += chunk.text
			}
		})
		.transform(response)
		.text()

	page.title = page.title.trim()
	return page
}

async function requestError(message: string, response: Response) {
	let details = `status ${response.status}`
	const location = response.headers.get("location")
	if (location) details += `, redirected to ${location}`
	else {
		const { title } = await parsePage(response)
		if (title) details += `, page: "${title}"`
	}
	return new Error(`${message} (${details})`)
}
