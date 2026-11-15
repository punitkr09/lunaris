/**
 * LUNARIS — Shareable Scenario Permalinks
 *
 * Encodes the full trade-study configuration (Alpha + Bravo sites, epochs, durations,
 * elapsed time, Bravo relay flag, experience mode) into the URL hash so a mission
 * planner can send a reproducible link. Only primitive, validated values are accepted
 * when decoding; anything malformed falls back to the app defaults.
 */

import { LunarCoordinates, UserExperienceMode } from '../types/navigation';

export interface ScenarioPermalinkState {
  alphaCoords: LunarCoordinates;
  alphaEpochUtc: string;
  alphaDurationDays: number;
  bravoCoords: LunarCoordinates;
  bravoEpochUtc: string;
  bravoDurationDays: number;
  bravoRelayEnabled: boolean;
  elapsedHours: number;
  uxMode: UserExperienceMode;
}

const UX_MODES: UserExperienceMode[] = ['EDUCATOR', 'EXPLORER', 'MISSION_PLANNER'];
const DURATION_OPTIONS = [7, 14, 28, 30];

function formatCoords(c: LunarCoordinates): string {
  return `${c.latitudeDeg.toFixed(4)},${c.longitudeDeg.toFixed(4)}`;
}

function parseCoords(raw: string | null): LunarCoordinates | null {
  if (!raw) return null;
  const [latRaw, lonRaw] = raw.split(',');
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitudeDeg: Number(lat.toFixed(4)), longitudeDeg: Number(lon.toFixed(4)) };
}

function parseIsoUtc(raw: string | null): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  // Keep epochs inside a sane planning horizon (1950–2100) to avoid absurd ephemeris extrapolation.
  const year = new Date(ms).getUTCFullYear();
  if (year < 1950 || year > 2100) return null;
  return new Date(ms).toISOString().slice(0, 19) + 'Z';
}

function parseDuration(raw: string | null): number | null {
  if (!raw) return null;
  const d = Number(raw);
  return DURATION_OPTIONS.includes(d) ? d : null;
}

export function encodeScenarioPermalink(state: ScenarioPermalinkState): string {
  const p = new URLSearchParams();
  p.set('a', formatCoords(state.alphaCoords));
  p.set('ae', state.alphaEpochUtc);
  p.set('ad', String(state.alphaDurationDays));
  p.set('b', formatCoords(state.bravoCoords));
  p.set('be', state.bravoEpochUtc);
  p.set('bd', String(state.bravoDurationDays));
  p.set('br', state.bravoRelayEnabled ? '1' : '0');
  p.set('t', String(Math.round(state.elapsedHours)));
  p.set('m', state.uxMode);
  return p.toString();
}

/**
 * Decodes a permalink hash (with or without the leading '#'). Returns only the fields
 * that parsed successfully so callers can merge them over defaults.
 */
export function decodeScenarioPermalink(hash: string): Partial<ScenarioPermalinkState> {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return {};
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(raw);
  } catch {
    return {};
  }

  const out: Partial<ScenarioPermalinkState> = {};
  const a = parseCoords(p.get('a'));
  if (a) out.alphaCoords = a;
  const ae = parseIsoUtc(p.get('ae'));
  if (ae) out.alphaEpochUtc = ae;
  const ad = parseDuration(p.get('ad'));
  if (ad) out.alphaDurationDays = ad;
  const b = parseCoords(p.get('b'));
  if (b) out.bravoCoords = b;
  const be = parseIsoUtc(p.get('be'));
  if (be) out.bravoEpochUtc = be;
  const bd = parseDuration(p.get('bd'));
  if (bd) out.bravoDurationDays = bd;
  const br = p.get('br');
  if (br === '0' || br === '1') out.bravoRelayEnabled = br === '1';
  const t = Number(p.get('t'));
  if (p.get('t') !== null && Number.isFinite(t) && t >= 0 && t <= 24 * 31) {
    out.elapsedHours = Math.round(t);
  }
  const m = p.get('m') as UserExperienceMode | null;
  if (m && UX_MODES.includes(m)) out.uxMode = m;
  return out;
}

export function buildShareUrl(state: ScenarioPermalinkState): string {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return `${base}#${encodeScenarioPermalink(state)}`;
}
