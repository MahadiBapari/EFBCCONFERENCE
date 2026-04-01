import { Event, Registration } from '../types';
import { getActivityNames } from './eventUtils';

/**
 * Maps the registrant's Wednesday activity selection to an event "activity tab" name
 * (same labels used on the admin Groups page).
 */
export function resolvePairingActivityLabel(
  reg: Pick<Registration, 'wednesdayActivity'>,
  event: Event | undefined
): string | null {
  const wa = String(reg.wednesdayActivity || '').trim();
  if (!wa || wa.toLowerCase() === 'none') return null;

  const names = getActivityNames(event?.activities);
  if (!names.length) return null;

  const exact = names.find((n) => n === wa);
  if (exact) return exact;

  const wl = wa.toLowerCase();
  const firstToken = wl.split(/\s+/)[0] || wl;
  for (const name of names) {
    const n = name.toLowerCase();
    if (wl.includes(n) || n.includes(firstToken)) return name;
  }
  return null;
}

export function maxPartnerNameFields(activityLabel: string): number {
  const l = activityLabel.toLowerCase();
  if (l.includes('golf')) return 3;
  if (l.includes('fish')) return 4;
  return 4;
}

export function needsBoatPreference(activityLabel: string): boolean {
  return activityLabel.toLowerCase().includes('fish');
}
