/**
 * Ported AI utility functions for team and player name matching
 */

export const normalizeName = (name) => {
    if (typeof name !== 'string') return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const levenshtein = (a, b) => {
    const s = a || '';
    const t = b || '';
    const m = s.length;
    const n = t.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[m][n];
};

export const nameSimilarity = (a, b) => {
    const an = normalizeName(a);
    const bn = normalizeName(b);
    if (!an && !bn) return 1;
    if (!an || !bn) return 0;
    const dist = levenshtein(an, bn);
    const maxLen = Math.max(an.length, bn.length);
    if (maxLen === 0) return 1;
    return 1 - dist / maxLen;
};

export const fuzzyMatch = (name, list, threshold = 0.8) => {
    let best = null;
    let bestScore = 0;
    for (const item of list) {
        const target = typeof item === 'object' ? (item.name || item.team_name || item.player_name) : item;
        const score = nameSimilarity(name, target);
        if (score > bestScore) {
            best = item;
            bestScore = score;
        }
    }
    return bestScore >= threshold ? { item: best, score: bestScore } : null;
};
