// Google ile giriş + bulut kayıt (Firestore: kb_users/{uid}). Sadece telefonda çalışır.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { KbNative } from './purchases.js';

const native = Capacitor.isNativePlatform();
let user = null;          // { uid, name, email }
let getData = () => null; // oyunun güncel kaydı
let timer = 0;
let busy = false;

export const available = () => native;
export const signedIn = () => !!(user && user.uid);
export const currentUser = () => user;

export async function init(getter) {
  getData = getter;
  if (!native) return null;
  try { const u = await KbNative.user(); user = u && u.uid ? u : null; } catch { user = null; }
  App.addListener('pause', () => { pushNow(); });
  if (user) pushSoon();
  return user;
}

const starsOf = (d) => Object.values((d && d.stars) || {}).reduce((a, b) => a + b, 0);
export const summary = (d) => ({ stars: starsOf(d), coins: (d && d.coins) || 0, levels: Object.keys((d && d.stars) || {}).length, pro: !!(d && d.pro && d.pro.lifetime) });

/** Satın alımlar her iki kayıtta da korunur: Pro, kullanılmış jetonlar, başlangıç paketi, satın alınan kostümler */
export function mergePurchases(into, other) {
  if (!other) return into;
  if (other.pro && other.pro.lifetime) into.pro = { ...(into.pro || {}), active: true, lifetime: true, until: 0 };
  into.iapTokens = [...new Set([...(into.iapTokens || []), ...(other.iapTokens || [])])].slice(-200);
  if (other.starterBought) into.starterBought = true;
  into.owned = [...new Set([...(into.owned || []), ...(other.owned || [])])];
  return into;
}

export async function pushNow() {
  clearTimeout(timer); timer = 0;
  if (!native || !user || busy) return false;
  const d = getData(); if (!d) return false;
  busy = true;
  try { await KbNative.cloudSave({ data: JSON.stringify(d), stars: starsOf(d) }); return true; } catch { return false; } finally { busy = false; }
}
/** Kayıt değişti: kısa süre sonra buluta yaz (force: 2 sn, normal: 20 sn) */
export function pushSoon(force = false) {
  if (!native || !user) return;
  if (timer && !force) return;
  clearTimeout(timer);
  timer = setTimeout(pushNow, force ? 2000 : 20000);
}

export async function signIn() {
  if (!native) throw new Error('web');
  const u = await KbNative.signIn();
  user = u && u.uid ? u : null;
  return user;
}
export async function loadCloud() {
  if (!user) return null;
  const r = await KbNative.cloudLoad();
  if (!r || !r.data) return null;
  try { return JSON.parse(r.data); } catch { return null; }
}
export async function signOut() {
  await pushNow();
  try { await KbNative.signOut(); } catch { /* yok say */ }
  user = null;
}
export async function deleteAccount() {
  await KbNative.deleteAccount();
  user = null;
}
