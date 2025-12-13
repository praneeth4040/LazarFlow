const normalizePlayerName = (input) => {
  const name = typeof input === 'object' && input !== null ? input.name || '' : input
  if (typeof name !== 'string') return ''
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const levenshtein = (a, b) => {
  const s = normalizePlayerName(a)
  const t = normalizePlayerName(b)
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

const nameSimilarity = (a, b) => {
  const an = normalizePlayerName(a)
  const bn = normalizePlayerName(b)
  if (!an && !bn) return 1
  if (!an || !bn) return 0
  const dist = levenshtein(an, bn)
  const maxLen = Math.max(an.length, bn.length)
  if (maxLen === 0) return 1
  return 1 - dist / maxLen
}

const fuzzyMatchName = (name, members, threshold = 0.8) => {
  const target = typeof name === 'object' && name !== null ? name.name || '' : name
  let best = null
  let bestScore = 0
  for (const member of members || []) {
    const candidate = typeof member === 'object' && member !== null ? member.name || member : member
    const score = nameSimilarity(target, candidate)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return bestScore >= threshold ? { name: best, score: bestScore } : null
}

const args = process.argv.slice(2)
const log = (...x) => process.stdout.write(x.join(' ') + '\n')

if (args.length === 0) {
  const pairs = [
    ['RBG Vaibhav', 'RBG Rohit'],
    ['4XE-Remo!!', '4XE-Remol!'],
    ['Alpha', 'Alph4'],
    ['Alpha7', 'alpha7'],
    ['Bravo', 'brav0'],
    ['Charlie', 'char lie'],
    ['delta', 'delt@'],
    ['omega', '0mega'],
  ]
  log('Pair Similarities (threshold=0.8):')
  for (const [a, b] of pairs) {
    const sim = nameSimilarity(a, b)
    log(`${a} ~ ${b} => ${sim.toFixed(3)} ${sim >= 0.8 ? '(match)' : ''}`)
  }
  const members = ['alpha', 'alpha7', 'bravo', 'charlie']
  const tests = ['alph@', 'brav0', 'char lie', 'omega']
  log('\nFuzzy Match Against Members:', members.join(', '))
  for (const t of tests) {
    const m = fuzzyMatchName(t, members, 0.8)
    log(`${t} => ${m ? `match=${m.name} score=${m.score.toFixed(3)}` : 'no-match'}`)
  }
  process.exit(0)
}

if (args[0] === '--match') {
  const name = args[1] || ''
  const list = (args[2] || '').split(',').map(s => s.trim()).filter(Boolean)
  const threshold = args[3] ? parseFloat(args[3]) : 0.8
  const res = fuzzyMatchName(name, list, threshold)
  log(JSON.stringify({ name, list, threshold, result: res }, null, 2))
  process.exit(0)
}

if (args.length >= 2) {
  const a = args[0]
  const b = args[1]
  const sim = nameSimilarity(a, b)
  log(JSON.stringify({ a, b, similarity: sim }, null, 2))
  process.exit(0)
}
