import { createClient } from "@supabase/supabase-js"
import type { Database } from "$lib/types/supabase"
import type { Script, TotalStats } from "$lib/types/collection"
import { XenForo } from "$lib/xenforo"
import { convertTime, formatRSNumber, generateRandomIndices, log, logError } from "$lib/utils"

interface Data {
	freeItems: Script[]
	premiumItems: Script[]
	totalStatData: TotalStats
}

const supabase = createClient<Database>(Bun.env.SUPABASE_URL, Bun.env.SUPABASE_ANON_KEY, {
	auth: { autoRefreshToken: true, persistSession: false }
})

const sythe = new XenForo("https://www.sythe.org/", Bun.env.SYTHE_USER, Bun.env.SYTHE_PASS)

const initialData = await getData()
if (!initialData) {
	logError("Failed to load the initial script data.")
	process.exit(1)
}
let data: Data = initialData

log("Logging in.")
await sythe.login()
log("Logged in as", Bun.env.SYTHE_USER)

if (Bun.env.ENVIRONMENT === "development") {
	await editMainPost(Bun.env.SYTHE_POST, data)
	await bumpThread(Bun.env.SYTHE_THREAD, data)
} else {
	const bumpInterval = Number(Bun.env.BUMP_HOUR_INTERVAL) * 60 * 60 * 1000
	const editInterval = Number(Bun.env.EDIT_MINUTE_INTERVAL) * 60 * 1000

	setInterval(async () => {
		data = (await getData()) ?? data
		await editMainPost(Bun.env.SYTHE_POST, data)
	}, editInterval)

	setInterval(() => bumpThread(Bun.env.SYTHE_THREAD, data), bumpInterval)
}

async function getData(): Promise<Data | undefined> {
	const [scripts, stats, totals] = await Promise.all([
		supabase
			.schema("scripts")
			.from("scripts")
			.select("id, url, title, description, metadata!inner (type, stage)")
			.eq("published", true)
			.neq("metadata.stage", "archived"),
		supabase.schema("stats").from("values").select("*"),
		supabase.schema("stats").from("totals").select("*").single()
	])

	for (const { error } of [scripts, stats, totals]) {
		if (error) {
			logError(error)
			return
		}
	}

	const statsById = new Map(stats.data!.map((row) => [row.id, row]))

	//Lists of Items filterd by type
	const freeItems: Script[] = []
	const premiumItems: Script[] = []
	for (const { metadata, ...script } of scripts.data!) {
		// metadata is one-to-one, but the generated types lack isOneToOne and type it as an array
		const type = Array.isArray(metadata) ? metadata[0]?.type : (metadata as { type: string }).type
		const item: Script = { ...script, stats: statsById.get(script.id) }
		if (type === "free") freeItems.push(item)
		else if (type === "premium") premiumItems.push(item)
	}

	const totalStatData: TotalStats = {
		experience: totals.data!.experience ?? 0,
		gold: totals.data!.gold ?? 0,
		levels: totals.data!.levels ?? 0,
		runtime: totals.data!.runtime ?? 0
	}

	return { freeItems, premiumItems, totalStatData }
}

function scriptLink(script: Script) {
	let description = script.description.trim()
	if (!description.endsWith(".") && !description.endsWith("!")) description += "."
	return `[URL='https://waspscripts.com/scripts/${script.url}'][B]${script.title}[/B][/URL] - ${description}`
}

function scriptStats(script: Script) {
	if (!script.stats) return ""
	const runtime = convertTime(script.stats.runtime)
	if (runtime === "") return ""
	const experience = formatRSNumber(script.stats.experience)
	const gold = script.stats.gold
	return `[INDENT][SIZE=3]- [B]experience[/B]: ${experience} , [B]gold[/B]: ${gold} , [B]runtime[/B]: ${runtime}[/SIZE][/INDENT]`
}

async function editMainPost(postID: string, { premiumItems, freeItems, totalStatData }: Data) {
	const intro: string = `[CENTER][b]I'm here to invite you guys to the[/b] [URL='https://waspscripts.com/']WaspScripts[/URL].\n\n
	WaspScripts is a botting website that hosts a collection of scripts for Simba.\n\n
	All scripts are [color=#FF0000]C[/color][color=#FF9900]o[/color][color=#CBFF00]l[/color][color=#32FF00]o[/color][color=#00FF66]r[/color] [color=#0065FF]o[/color][color=#3200FF]n[/color][color=#CC00FF]l[/color][color=#FF0098]y[/color] and [b]OSRS exclusive[/b].\n\n
	Being [b]Simba[/b] scripts they are also [b]open source[/b].\n\n
	There's [color=#a6ff4d]Free[/color] and [color=#ff8000]Premium[/color] scripts available for several things.\n\n
	You need to use [b]Simba 1400[/b] and install [b]SRL-Development[/b] and [b]WaspLib[/b].\n\n
	You can find several guides on the server including a setup guide.\n\n
	Everything is quite high quality and it's probably among the best color bots your will find publicly available (as in, that's not kept for private use).\n\n
	Scripts have a lot of antiban features that can easily be tweaked to your taste and if you need some really heavy tweaking you can always modify the source code.\n\n
	It's also possible to minimize and use your mouse or bot on multiple accounts thanks to remote input included in SRL.\n\n
	[b]If you need any help with anything just let me know in discord![/b]\n\n
	See you guys there!\n\n[/CENTER]`

	const listItem = (script: Script) => `\n\n - ${scriptLink(script)} ${scriptStats(script)}`
	const premium = "[SIZE=7][b]Premium:[/b][/SIZE]" + premiumItems.map(listItem).join("")
	const free = "[SIZE=7][b]Free:[/b][/SIZE]" + freeItems.map(listItem).join("")

	//totalStats
	const totalStats: string = `[CENTER][size=7]
	[color=#f97316]Total Experience Earned:[/color] ${formatRSNumber(totalStatData.experience)}
	[color=#f97316]Total Gold Earned:[/color] ${formatRSNumber(totalStatData.gold)}
	[color=#f97316]Total Levels Earned:[/color] ${totalStatData.levels}
	[color=#f97316]Total Runtime:[/color] ${convertTime(totalStatData.runtime)}
	[/size][/CENTER]`

	const message = `${intro} \n\n ${totalStats} \n\n ${premium} \n\n ${free}`

	log("Editing the post:", postID)

	if (Bun.env.ENVIRONMENT === "development") {
		console.log(message)
		return
	}

	try {
		await sythe.editPost(postID, message)
		log("Edited the post:", postID)
	} catch (error) {
		logError(error)
	}
}

//Bump a thread
async function bumpThread(threadID: string, { premiumItems, freeItems }: Data) {
	const listItem = (script: Script) => ` \n - ${scriptLink(script)}`
	const pick = (items: Script[]) => generateRandomIndices(items.length, 3).map((i) => items[i])

	const premium = "[b]Premium:[/b]" + pick(premiumItems).map(listItem).join("")
	const free = "[b]Free:[/b]" + pick(freeItems).map(listItem).join("")

	const message = `Bump, check out [URL='https://waspscripts.com/'][B]WaspScripts[/B][/URL]. \n\nCheck out some of the scripts we have to offer: \n\n ${premium} \n\n ${free}`

	log("Posting on thread:", threadID)

	if (Bun.env.ENVIRONMENT === "development") {
		console.log(message)
		return
	}

	try {
		await sythe.reply(threadID, message)
		log("Posted on thread:", threadID)
	} catch (error) {
		logError(error)
	}
}
