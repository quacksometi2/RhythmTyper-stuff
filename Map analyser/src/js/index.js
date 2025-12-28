// Containers / Sections
const controls = document.getElementById('controls')
const results = document.getElementById('results')
const diffContainer = document.getElementById('difficultyButtons')
const bgDiv = document.getElementById('background')

// Song Info
const songNameEl = document.getElementById('songName')
const songAuthorEl = document.getElementById('songAuthor')
const chartMapperEl = document.getElementById('chartMapper')
const starRatingBadge = document.getElementById('starRatingBadge')

// Inputs
const perfectInput = document.getElementById('perfect')
const goodInput = document.getElementById('good')
const okInput = document.getElementById('ok')
const missInput = document.getElementById('miss')
const comboInput = document.getElementById('Combo')

// Mod Buttons
const modNoneBtn = document.getElementById('modNone')
const modNCBtn = document.getElementById('modNC')
const modHTBtn = document.getElementById('modHT')

// Totals / Results
const totalNotesElement = document.getElementById('totalNotes')
const totalHoldsElement = document.getElementById('totalHolds')
const totalTypingElement = document.getElementById('totalTyping')
const remainingElement = document.getElementById('remaining')
const calculatedAccElement = document.getElementById('calculatedAcc')

diffContainer.innerHTML = ""

let mapData = null
let selectedDifficulty = null
let firstButton = null
let currentMod = 'none'

const MOD_MULTIPLIERS = {
    'none': 1.0,
    'nc': 1.12,
    'ht': 0.3
}

async function processFile(file) {
    let zip
    try {
        zip = await JSZip.loadAsync(file)
    } catch {
        alert("Invalid .rtm file")
        return
    }

    const { meta, files } = await extractMetaAndFiles(zip)
    if (!meta) return

    mapData = { meta, files }
    controls.classList.remove('hidden')
    results.classList.remove('hidden')

    createDifficultyButtons(meta.difficulties)
    setBackground(meta, files)
    setSongName(meta)
    setAristName(meta)
    setChartMapper(meta)
    updateResults()
}

async function extractMetaAndFiles(zip) {
    let meta = null
    const files = []

    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue

        if (name.toLowerCase().endsWith("meta.json")) {
            try {
                const text = await entry.async("text")
                meta = JSON.parse(text)
            } catch {
                alert("Invalid meta.json")
                return {}
            }
            continue
        }

        const isBinary = /\.(png|jpg|jpeg|gif|mp3|ogg|wav)$/i.test(name)
        const content = await entry.async(isBinary ? "blob" : "text")

        files.push({ name, type: isBinary ? "binary" : "text", content })
    }

    if (!meta) {
        alert("meta.json missing")
        return {}
    }
    if (typeof meta.mapper !== "string" || typeof meta.songName !== "string") {
        alert("meta.json missing required fields")
        return {}
    }

    return { meta, files }
}

function createDifficultyButtons(difficulties) {
    diffContainer.innerHTML = ""
    firstButton = null
    selectedDifficulty = null

    for (const diff of difficulties) {
        const btn = document.createElement("button")
        btn.textContent = diff.name
        btn.className =
            "diff-button px-4 py-2 rounded-lg font-medium transition-all " +
            "bg-white/10 text-white border border-white/30 " +
            "hover:scale-105 active:scale-95"

        btn.onclick = () => {
            document.querySelectorAll(".diff-button").forEach(b => {
                b.classList.remove("bg-green-500")
                b.classList.add("bg-white/10")
            })
            btn.classList.remove("bg-white/10")
            btn.classList.add("bg-green-500")
            selectedDifficulty = diff
            updateResults()
            updateStarRating(currentMod)
        }

        diffContainer.appendChild(btn)
        if (!firstButton) firstButton = btn
    }

    if (firstButton) firstButton.click()
}

function getSelectedDifficultyFile() {
    if (!mapData || !selectedDifficulty) return null

    return mapData.files.find(
        f => f.name === selectedDifficulty.filename && f.type === "text"
    ) || null
}

function getParsedDifficultyData() {
    const file = getSelectedDifficultyFile()
    if (!file) return null

    try {
        return JSON.parse(file.content)
    } catch {
        return null
    }
}

function getTotalObjects() {
    const diffData = getParsedDifficultyData()
    if (!diffData?.notes) {
        return { notes: 0, holds: 0, typing: 0, total: 0}
    }

    let notes = 0
    let holds = 0
    let typing = diffData.typingSections?.length ?? 0

    for (const note of diffData.notes) {
        if (note.type === "tap") notes++
        else if (note.type === "hold") holds++
    }

    return {
        notes,
        holds,
        typing,
        total: notes + holds + typing
    }
}

function calculateAccuracy() {
    const n300 = parseInt(perfectInput.value) || 0
    const n100 = parseInt(goodInput.value) || 0
    const n50 = parseInt(okInput.value) || 0
    const nmiss = parseInt(missInput.value) || 0

    const totalHits = n300 + n100 + n50 + nmiss
    const { notes, holds, typing, total } = getTotalObjects()
    const remaining = Math.max(0, (total + holds) - totalHits)

    const accuracy = totalHits === 0 
        ? 100 
        : (300 * n300 + 100 * n100 + 50 * n50) / (300 * totalHits) * 100

    totalNotesElement.textContent = notes
    totalHoldsElement.textContent = holds
    totalTypingElement.textContent = typing
    remainingElement.textContent = remaining
    calculatedAccElement.textContent = accuracy.toFixed(2) + '%'

    return { accuracy, misses: nmiss }
}

function calculatePP() {
    const diffData = getParsedDifficultyData()
    if (!diffData?.notes) return 0

    const { accuracy } = calculateAccuracy()
    
    // Get base OD
    let od = diffData.overallDifficulty || 5
    
    // Build notes array with start times
    const notes = []
    for (const note of diffData.notes) {
        if (note.type === "tap") {
            notes.push({ startTime: note.time, key: note.key })
        } else if (note.type === "hold") {
            notes.push({ startTime: note.startTime, key: note.key })
            notes.push({ startTime: note.endTime, key: note.key })
        }
    }

    if (notes.length === 0) return 0

    // Apply mod speed multipliers to note times FIRST
    let modifiedNotes = [...notes]
    let modifiedOD = od
    
    if (currentMod === 'nc') {
        modifiedNotes = notes.map(n => ({ ...n, startTime: n.startTime / 1.5 }))
        modifiedOD = Math.min(10, od * 1.4)
    } else if (currentMod === 'ht') {
        modifiedNotes = notes.map(n => ({ ...n, startTime: n.startTime / 0.75 }))
        modifiedOD = Math.max(0, od * 0.5)
    }

    const MIN_DT = 0.04
    const ALPHA = 0.85
    const HALF_LIFE = 0.25
    const TAIL_FRAC = 0.10
    const PP_PER_UNIT = 10
    const OD_SLOPE = 0.08
    const MAX_LEN_NOTES = 500
    const MAX_LEN_BONUS = 1.25

    const chordBonus = k => 1 + 1.6 * (1 - Math.exp(-0.6 * Math.max(0, k - 1)))
    const reusePenalty = d => 0.55 * Math.exp(-0.7 * (d - 1))

    // Build events from modified notes
    const byTime = {}
    for (const n of modifiedNotes) {
        (byTime[n.startTime] ??= []).push(n.key)
    }

    const times = Object.keys(byTime).map(Number).sort((a, b) => a - b)
    const events = times.map(t => {
        const keys = [...new Set(byTime[t])]
        return { t, keys }
    })

    if (events.length === 0) return 0

    // Calculate strain with EMA
    let ema = 0
    let lastT = times[0]
    const emaVals = []
    const history = []

    for (const e of events) {
        const dt = Math.max(MIN_DT, (e.t - lastT) / 1000) // Convert ms to seconds
        let strain = Math.pow(1 / dt, ALPHA)

        let reuse = 0
        for (let d = 1; d <= history.length; d++) {
            if (e.keys.some(k => history[history.length - d].has(k))) {
                reuse += reusePenalty(d)
            }
        }

        strain *= Math.max(0.2, 1 - reuse)
        strain *= chordBonus(e.keys.length)

        const decay = Math.pow(0.5, dt / HALF_LIFE)
        ema = ema * decay + strain * (1 - decay)
        emaVals.push(ema)

        history.push(new Set(e.keys))
        if (history.length > 6) history.shift()

        lastT = e.t
    }

    // Aggregate difficulty
    emaVals.sort((a, b) => b - a)
    const take = Math.max(1, Math.floor(emaVals.length * TAIL_FRAC))
    const core = emaVals.slice(0, take).reduce((s, v) => s + v, 0) / take

    // Final scaling - use ORIGINAL note count, not modified
    const x = Math.min(notes.length, MAX_LEN_NOTES)
    const lenBonus = 1 + (MAX_LEN_BONUS - 1) * Math.log(1 + x) / Math.log(1 + MAX_LEN_NOTES)

    const odBonus = 1 + OD_SLOPE * (modifiedOD - 5)
    const accBonus = Math.pow(accuracy / 100, 5)

    const pp = core * lenBonus * PP_PER_UNIT * odBonus * accBonus

    return Math.round(pp * 100) / 100
}


function calculateMaxScore() {
    const { holds, total } = getTotalObjects()
    const totalNotes = total + holds

    const modMultiplier = MOD_MULTIPLIERS[currentMod] || 1.0
    
    let maxScore = 0
    for (let i = 0; i < totalNotes; i++) {
        maxScore += 300 * (1 + i * 0.001);
    }
    
    maxScore *= modMultiplier

    console.log('Max Score:', Math.floor(maxScore))

    return { maxScore: Math.round(maxScore) }
}

function updateResults() {
    if (!mapData) return

    const { accuracy } = calculateAccuracy()
    const { maxScore } = calculateMaxScore()

    const pp = calculatePP()

    console.log(pp)
}

function setBackground(meta, files) {
    if (!meta.backgroundFiles?.length) return

    const bgFile = meta.backgroundFiles[0]
    const bgBlob = files.find(f => f.name === bgFile)?.content
    if (!bgBlob) return

    const bgUrl = URL.createObjectURL(bgBlob)
    bgDiv.style.backgroundImage = `url('${bgUrl}')`
}

function setSongName(meta) {
    if (meta?.songName) songNameEl.textContent = meta.songName
}

function setAristName(meta) {
    if (meta?.artistName) songAuthorEl.textContent = `By ${meta.artistName}`
}

function setChartMapper(meta) {
    if (meta?.mapper) chartMapperEl.textContent = `Mapped by: ${meta.mapper}`
}

function getStarColor(stars) {
    if (stars < 1) return 'var(--color-gray-400)'
    if (stars < 2) return 'var(--color-green-500)'
    if (stars < 3) return 'var(--color-blue-500)'
    if (stars < 4) return 'var(--color-orange-500)'
    if (stars < 5) return 'var(--color-red-500)'
    if (stars < 6) return 'var(--color-pink-500)'
    if (stars < 7) return 'var(--color-purple-500)'
    if (stars < 8) return 'var(--color-violet-500)'
    if (stars < 9) return 'var(--color-indigo-500)'
    return '#000000'
}

function updateStarRating(mod = 'none') {
    if (!selectedDifficulty) return

    const diffData = getParsedDifficultyData()
    if (!diffData) {
        starRatingBadge.textContent = '★ 0.00'
        starRatingBadge.className = `inline-flex items-center justify-center py-1 text-xs font-bold text-white`
        starRatingBadge.style.backgroundColor = getStarColor(0)
        starRatingBadge.style.borderRadius = '9999px'
        starRatingBadge.style.paddingLeft = '14px'
        starRatingBadge.style.paddingRight = '14px'
        return
    }

    let stars = diffData.starRating ?? 0

    if (mod === 'nc') stars = diffData.starRatingNC ?? stars
    if (mod === 'ht') stars = diffData.starRatingHT ?? stars

    stars = Math.round((stars + Number.EPSILON) * 100) / 100
    
    starRatingBadge.textContent = '★ ' + stars.toFixed(2)
    const bgColor = getStarColor(stars)
    const textColor = stars >= 9 ? '#FBBF24' : '#FFFFFF'
    
    starRatingBadge.className = `inline-flex items-center justify-center py-1 text-xs font-bold`
    starRatingBadge.style.backgroundColor = bgColor
    starRatingBadge.style.color = textColor
    starRatingBadge.style.borderRadius = '9999px'
    starRatingBadge.style.paddingLeft = '14px'
    starRatingBadge.style.paddingRight = '14px'
}

document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return

    controls.classList.add('hidden')
    results.classList.add('hidden')
    await processFile(file)
})

function setMod(mod) {
    currentMod = mod
            
    const buttons = [modNoneBtn, modNCBtn, modHTBtn]
    buttons.forEach(btn => {
        btn.classList.remove('bg-green-500', 'bg-purple-500', 'bg-orange-500')
        btn.classList.add('bg-white/10', 'border', 'border-white/30')
    })
            
    if (mod === 'none') {
        modNoneBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        modNoneBtn.classList.add('bg-green-500')
    } else if (mod === 'nc') {
        modNCBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        modNCBtn.classList.add('bg-purple-500')
    } else if (mod === 'ht') {
        modHTBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        modHTBtn.classList.add('bg-orange-500')
    }

    updateResults()
    updateStarRating(mod)
}

modNoneBtn.addEventListener('click', () => setMod('none'))
modNCBtn.addEventListener('click', () => setMod('nc'))
modHTBtn.addEventListener('click', () => setMod('ht'))

perfectInput.addEventListener('input', updateResults)
goodInput.addEventListener('input', updateResults)
okInput.addEventListener('input', updateResults)
missInput.addEventListener('input', updateResults)
comboInput.addEventListener('input', updateResults)