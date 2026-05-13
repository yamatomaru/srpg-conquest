/**
 * Web Audio API を使ったシンプルな効果音エンジン
 * 外部ファイル不要 — プログラマティックに音を生成
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.18,
  delay = 0,
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);
    gain.gain.setValueAtTime(volume, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  } catch {
    // AudioContext blocked (e.g. test env)
  }
}

/** 攻撃 SE */
export function seAttack() {
  playTone(220, 0.08, 'sawtooth', 0.12);
  playTone(180, 0.12, 'sawtooth', 0.08, 0.06);
}

/** 撃破 SE */
export function seDefeat() {
  playTone(440, 0.06, 'square', 0.14);
  playTone(330, 0.08, 'square', 0.12, 0.07);
  playTone(220, 0.15, 'square', 0.10, 0.15);
}

/** レベルアップ SE */
export function seLevelUp() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => playTone(freq, 0.15, 'sine', 0.20, i * 0.12));
}

/** 侵攻開始 SE */
export function seInvade() {
  playTone(150, 0.25, 'sawtooth', 0.15);
  playTone(200, 0.20, 'sawtooth', 0.12, 0.1);
}

/** 勝利 SE */
export function seVictory() {
  const melody = [523, 659, 784, 659, 1047];
  melody.forEach((freq, i) => playTone(freq, 0.2, 'sine', 0.22, i * 0.15));
}

/** 敗北 SE */
export function seDefeat2() {
  playTone(400, 0.3, 'sine', 0.18);
  playTone(300, 0.4, 'sine', 0.15, 0.2);
  playTone(200, 0.5, 'sine', 0.12, 0.45);
}

/** ボタンクリック SE */
export function seClick() {
  playTone(880, 0.05, 'sine', 0.08);
}

/** セーブ SE */
export function seSave() {
  playTone(660, 0.07, 'sine', 0.10);
  playTone(880, 0.10, 'sine', 0.10, 0.08);
}

/** スキル発動 SE */
export function seSkill() {
  playTone(600, 0.06, 'square', 0.12);
  playTone(800, 0.06, 'square', 0.10, 0.06);
  playTone(1000, 0.10, 'sine', 0.14, 0.12);
}
