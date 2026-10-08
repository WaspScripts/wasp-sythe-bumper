export function generateRandomIndices(maxIndex: number, count: number): number[] {
	const indices: number[] = []
	while (indices.length < count) {
		const randomIndex = Math.floor(Math.random() * maxIndex)
		if (!indices.includes(randomIndex)) {
			indices.push(randomIndex)
		}
	}
	return indices
}

export function convertTime(t: number): string {
	let result: string = ""

	const total_seconds = Math.floor(t / 1000)
	const total_minutes = Math.floor(total_seconds / 60)
	const total_hours = Math.floor(total_minutes / 60)
	const total_days = Math.floor(total_hours / 24)

	const years = Math.floor(total_days / 365)

	const seconds = total_seconds % 60
	const minutes = total_minutes % 60
	const hours = total_hours % 24
	const days = total_days % 365

	if (years > 0) result += years.toString() + "y "
	if (days > 0) result += days.toString() + "d "
	if (hours > 0) result += hours.toString() + "h "
	if (minutes > 15 && result !== "") result += minutes.toString() + "m"

	if (days === 0 && seconds > 0) result += " " + seconds.toString() + "s"

	return result
}

export function formatRSNumber(n: number): string {
	let i: number = 0
	let f: number = n
	const arr: string[] = ["", "K", "M", "B", "T"]

	while (Math.abs(f) >= 1000) {
		i++
		f = f / 1000
	}

	return parseFloat(f.toFixed(2)).toString() + " " + arr[i]
}

export function log(...args: unknown[]) {
	const timestamp = new Date().toISOString().replace("T", " ").replace("Z", "")
	console.log(`[${timestamp}]:`, ...args)
}

export function logError(...args: unknown[]) {
	const timestamp = new Date().toISOString().replace("T", " ").replace("Z", "")
	console.error(`[${timestamp}]:`, ...args)
}
