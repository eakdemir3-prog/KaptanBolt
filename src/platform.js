// Android (Capacitor) entegrasyonu: geri tuşu, titreşim, arka plan. Tarayıcıda sessizce devre dışı.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();
let vibrationOn = true;
export const setVibration = (on) => { vibrationOn = on; };

export function vibrate(kind = 'light') {
  if (!vibrationOn) return;
  if (native) {
    const style = kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
    Haptics.impact({ style }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(kind === 'heavy' ? 60 : kind === 'medium' ? 30 : 12);
  }
}

export function onBack(handler) {
  if (native) App.addListener('backButton', () => handler());
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') handler(); });
}
export function exitApp() { if (native) App.exitApp(); }

export function onPause(pause, resume) {
  if (native) App.addListener('appStateChange', ({ isActive }) => (isActive ? resume() : pause()));
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
}
