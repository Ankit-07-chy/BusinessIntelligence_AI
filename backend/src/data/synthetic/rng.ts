/** Deterministic mulberry32 PRNG so a given seed always reproduces the same dataset. */
export function createRng(seed: number): () => number {
  let state = seed;
  return function rng() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Standard normal sample via the Marsaglia polar method (no sin/cos — avoids
 * any trig-based periodicity in the output). Returns one value per call,
 * caching the second value the underlying rejection sampler always produces.
 */
export function createGaussianSampler(rng: () => number): () => number {
  let spare: number | null = null;
  return function gaussian(): number {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

type MarketRegimeName = "uptrend" | "downtrend" | "sideways" | "volatile";

interface MarketRegime {
  name: MarketRegimeName;
  driftRange: [number, number];
  volScale: number;
  durationRange: [number, number];
  weight: number;
}

// Duration and drift ranges are calibrated in trading-day terms and shaped
// after real index behavior ("up the stairs, down the elevator"): long,
// gradual climbs are the dominant regime; corrections are real but sharper
// and shorter-lived, so the series nets out with a visible long-run upward
// bias instead of oscillating around flat.
const MARKET_REGIMES: MarketRegime[] = [
  { name: "uptrend", driftRange: [0.0007, 0.0022], volScale: 1.0, durationRange: [25, 60], weight: 0.38 },
  { name: "downtrend", driftRange: [-0.0028, -0.001], volScale: 1.2, durationRange: [10, 30], weight: 0.22 },
  { name: "sideways", driftRange: [-0.0003, 0.0003], volScale: 0.55, durationRange: [10, 25], weight: 0.3 },
  { name: "volatile", driftRange: [-0.0006, 0.0006], volScale: 1.7, durationRange: [5, 12], weight: 0.1 },
];

function pickRegime(rng: () => number): MarketRegime {
  const totalWeight = MARKET_REGIMES.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng() * totalWeight;
  for (const regime of MARKET_REGIMES) {
    roll -= regime.weight;
    if (roll <= 0) return regime;
  }
  return MARKET_REGIMES[MARKET_REGIMES.length - 1];
}

export interface MarketFactorPoint {
  factor: number;
  return: number;
  regime: MarketRegimeName;
}

/**
 * A day-indexed series shared across many entities (all products, regions,
 * ...) so their independent per-cell noise doesn't cancel out under
 * aggregation — see the module-level notes in facts.ts for why that matters.
 *
 * Modeled as a GARCH(1,1) return-generating process with regime-switching
 * drift/volatility, in the spirit of real equity price behavior rather than
 * any periodic function:
 *   - Returns are generated first, then compounded into a price series
 *     starting at 100 (price[t] = price[t-1] * (1 + return[t])); the
 *     returned array is that price path normalized to start at 1.0, so it
 *     can be used as a multiplier the same way a flat 1.0 factor would be.
 *   - Conditional variance follows sigma_t^2 = omega + alpha*eps_{t-1}^2 +
 *     beta*sigma_{t-1}^2 (volatility clustering / autocorrelated volatility
 *     — a quiet stretch tends to stay quiet, a choppy stretch tends to stay
 *     choppy, instead of every day being an independent dice roll).
 *   - The market cycles through randomly-durationed regimes (uptrend /
 *     downtrend / sideways / volatile cluster), each with its own drift and
 *     a volatility multiplier on top of the GARCH baseline, so trends,
 *     consolidations, and volatility clusters emerge from the process
 *     itself rather than a fixed schedule.
 *   - Each day's shock is standard-normal (via Marsaglia polar, not
 *     sin/cos) scaled by the current conditional volatility, with a small
 *     independent chance of an extra idiosyncratic jump (a news-style
 *     event), and the total return is clamped to a wide safety band so nothing
 *     can produce an unrealistic single-day crash.
 */
export function generateMarketFactor(
  rng: () => number,
  length: number,
  options: {
    omega?: number;
    alpha?: number;
    beta?: number;
    jumpProbability?: number;
    jumpVolMultiplier?: number;
    maxAbsReturn?: number;
  } = {},
): number[] {
  const {
    omega = 0.00001,
    alpha = 0.08,
    beta = 0.85,
    jumpProbability = 0.012,
    jumpVolMultiplier = 1.4,
    maxAbsReturn = 0.08,
  } = options;

  const gaussian = createGaussianSampler(rng);
  const longRunVariance = omega / (1 - alpha - beta);

  let sigma2 = longRunVariance;
  let prevEpsilon2 = longRunVariance;
  let regime = pickRegime(rng);
  let regimeDaysLeft = randInt(rng, regime.durationRange[0], regime.durationRange[1]);
  let regimeDrift = randRange(rng, regime.driftRange[0], regime.driftRange[1]);

  let price = 100;
  const factors: number[] = [];

  for (let i = 0; i < length; i++) {
    if (regimeDaysLeft <= 0) {
      regime = pickRegime(rng);
      regimeDaysLeft = randInt(rng, regime.durationRange[0], regime.durationRange[1]);
      regimeDrift = randRange(rng, regime.driftRange[0], regime.driftRange[1]);
    }
    regimeDaysLeft -= 1;

    // sigma2 tracks a regime-agnostic baseline so the "volatile" regime's
    // multiplier can widen a single day's move without ever feeding an
    // amplified shock back into the persistent variance state — otherwise a
    // volatile stretch compounds into a runaway feedback loop (verified via
    // scripts/tmp_check_market_factor.mjs: without this split, p95 |return|
    // came out at 7%+ with sustained 40%+ multi-week runs).
    sigma2 = omega + alpha * prevEpsilon2 + beta * sigma2;
    const baseVol = Math.sqrt(sigma2);

    let baseEpsilon = baseVol * gaussian();
    if (rng() < jumpProbability) {
      baseEpsilon += gaussian() * baseVol * jumpVolMultiplier;
    }
    prevEpsilon2 = baseEpsilon * baseEpsilon;

    let dailyReturn = regimeDrift + baseEpsilon * regime.volScale;
    dailyReturn = Math.max(-maxAbsReturn, Math.min(maxAbsReturn, dailyReturn));

    price *= 1 + dailyReturn;
    factors.push(price / 100);
  }

  return factors;
}
