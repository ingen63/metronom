const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// ---------- Tempo ----------
test('Startwerte: 120 BPM, 4/4, nicht spielend', () => {
  const m = load();
  assert.equal(m.bpm(), 120);
  assert.equal(m.$('sigTop').textContent, '4');
  assert.equal(m.$('sigBot').textContent, '4');
  assert.equal(m.isPlaying(), false);
});

test('Pfeiltasten ändern das Tempo um 1, mit Shift um 10', () => {
  const m = load();
  m.press('ArrowUp'); assert.equal(m.bpm(), 121);
  m.press('ArrowDown'); m.press('ArrowDown'); assert.equal(m.bpm(), 119);
  m.press('ArrowUp', { shiftKey: true }); assert.equal(m.bpm(), 129);
  m.press('ArrowDown', { shiftKey: true }); assert.equal(m.bpm(), 119);
});

test('Tempo ist auf 20..300 BPM begrenzt', () => {
  const m = load();
  for (let i = 0; i < 40; i++) m.press('ArrowDown', { shiftKey: true });
  assert.equal(m.bpm(), 20);
  for (let i = 0; i < 40; i++) m.press('ArrowUp', { shiftKey: true });
  assert.equal(m.bpm(), 300);
});

// ---------- Start/Stop ----------
test('Leertaste und Play-Button starten und stoppen', () => {
  const m = load();
  m.press('Space'); assert.equal(m.isPlaying(), true);
  m.press('Space'); assert.equal(m.isPlaying(), false);
  m.play(); assert.equal(m.isPlaying(), true);
  m.play(); assert.equal(m.isPlaying(), false);
});

test('Stop setzt die Taktanzeige zurück', () => {
  const m = load();
  m.play(); m.advance(5); m.play();
  assert.equal(m.$('barPill').textContent, 'TAKT 1');
});

// ---------- Klick-Scheduling ----------
test('120 BPM: Klicks im Abstand von 0,5 s', () => {
  const m = load();
  m.play(); m.advance(3);
  const t = m.clicks.map(c => c.time);
  assert.ok(t.length >= 5);
  for (let i = 1; i < t.length; i++) assert.ok(Math.abs(t[i] - t[i - 1] - 0.5) < 1e-6, `Abstand ${i}`);
});

test('4/4: Betonung auf Schlag 1, danach drei normale Klicks', () => {
  const m = load();
  m.play(); m.advance(4.2);
  assert.deepEqual(m.clicks.slice(0, 8).map(c => c.freq), [1600, 1000, 1000, 1000, 1600, 1000, 1000, 1000]);
});

test('Taktartwechsel: 3/4, 2/4 und 6/8 mit Nebenakzent', () => {
  const m = load();
  const click = () => m.$('sig').click();
  click(); assert.equal(m.$('sigTop').textContent, '3');
  click(); assert.equal(m.$('sigTop').textContent, '2');
  click(); assert.equal(m.$('sigTop').textContent, '6');
  assert.equal(m.$('sigBot').textContent, '8');
  assert.equal(m.document.querySelectorAll('.dot').length, 6);
  m.play(); m.advance(3.2);
  assert.deepEqual(m.clicks.slice(0, 6).map(c => c.freq), [1600, 1000, 1000, 1250, 1000, 1000]);
  click(); assert.equal(m.$('sigTop').textContent, '4');
});

test('Unterteilung: Achtel liefern doppelt so viele Klicks, leiser Zwischenton', () => {
  const m = load();
  m.document.querySelector('.sub[data-sub="2"]').click();
  m.play(); m.advance(2.1);
  const t = m.clicks.map(c => c.time);
  assert.ok(Math.abs(t[1] - t[0] - 0.25) < 1e-6);
  assert.deepEqual(m.clicks.slice(0, 4).map(c => c.freq), [1600, 700, 1000, 700]);
});

test('Taktzähler zählt hoch', () => {
  const m = load();
  m.play(); m.advance(4.1);
  assert.equal(m.downbeats().length, 3);
});

// ---------- Tap-Tempo ----------
test('Tap-Tempo: Abstand 500 ms ergibt etwa 120 BPM', () => {
  const m = load();
  m.press('ArrowDown', { shiftKey: true }); // 110, damit eine Änderung sichtbar ist
  let now = 1000;
  m.window.performance.now = () => now;
  m.press('KeyT'); now += 400; m.press('KeyT'); now += 400; m.press('KeyT');
  assert.equal(m.bpm(), 150);
});

// ---------- Automatische Steigerung ----------
test('Auto aus: Tempo bleibt konstant', () => {
  const m = load();
  m.play();
  assert.deepEqual(m.bpmTrace(30), [120]);
});

test('Auto an (nicht spielend): Tempo springt auf Start-BPM', () => {
  const m = load();
  m.toggleAuto();
  assert.equal(m.bpm(), 80);
});

test('Auto: steigt alle 4 Takte um 5 BPM', () => {
  const m = load();
  m.toggleAuto(); m.play();
  assert.deepEqual(m.bpmTrace(35).slice(0, 3), [80, 85, 90]);
});

test('Auto: Intervall "alle N Takte" wird eingehalten', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ every: 2 });
  m.play();
  const bars = []; // Takt-Nummer bei jeder BPM-Änderung
  let last = m.bpm();
  m.advance(40, () => {
    if (m.bpm() !== last) { bars.push(m.downbeats().length); last = m.bpm(); }
  });
  assert.ok(bars.length >= 3);
  for (let i = 1; i < bars.length; i++) assert.equal(bars[i] - bars[i - 1], 2);
});

test('Auto: erreicht Ziel-BPM genau (kein Überschießen)', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 108, stepIdx: 2, every: 1 }); // Schritt +5
  m.play();
  const trace = m.bpmTrace(10);
  assert.deepEqual(trace.slice(0, 3), [100, 105, 108]);
  assert.ok(Math.max(...trace) <= 108);
});

test('Auto: Endlosschleife – nach dem Ziel zurück auf Start-BPM', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 110, stepIdx: 2, every: 1 });
  m.play();
  const trace = m.bpmTrace(30);
  assert.deepEqual(trace.slice(0, 4), [100, 105, 110, 100]);
});

test('Auto: Schleife wiederholt sich mehrfach', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 110, stepIdx: 2, every: 1 });
  m.play();
  const trace = m.bpmTrace(60);
  assert.deepEqual(trace.slice(0, 10), [100, 105, 110, 100, 105, 110, 100, 105, 110, 100]);
});

test('Auto: Schleife auch bei nicht aufgehender Schrittweite', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 108, stepIdx: 2, every: 1 });
  m.play();
  const trace = m.bpmTrace(40);
  assert.deepEqual(trace.slice(0, 7), [100, 105, 108, 100, 105, 108, 100]);
});

test('Auto: absteigend (Ziel < Start) läuft ebenfalls als Schleife', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 120, end: 110, stepIdx: 2, every: 1 });
  m.play();
  const trace = m.bpmTrace(30);
  assert.deepEqual(trace.slice(0, 5), [120, 115, 110, 120, 115]);
});

test('Auto: Start = Ziel hält das Tempo', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 100, stepIdx: 2, every: 1 });
  m.play();
  assert.deepEqual(m.bpmTrace(20), [100]);
});

test('Auto: Start-BPM wird bei jedem Play neu gesetzt', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 140, every: 1 });
  m.play(); m.advance(8);
  assert.ok(m.bpm() > 100);
  m.play(); m.play(); // stop, start
  assert.equal(m.bpm(), 100);
});

test('Auto: nach dem Ausschalten bleibt das Tempo stehen', () => {
  const m = load();
  m.toggleAuto(); m.configureAuto({ start: 100, end: 140, every: 1 });
  m.play(); m.advance(6);
  m.toggleAuto();
  const frozen = m.bpm();
  assert.deepEqual(m.bpmTrace(20), [frozen]);
});

test('Auto: Schleife auch mit Unterteilung und 6/8', () => {
  const m = load();
  m.document.querySelector('.sub[data-sub="2"]').click();
  m.$('sig').click(); m.$('sig').click(); m.$('sig').click(); // 6/8
  m.toggleAuto(); m.configureAuto({ start: 100, end: 110, stepIdx: 2, every: 1 });
  m.play();
  assert.deepEqual(m.bpmTrace(40).slice(0, 4), [100, 105, 110, 100]);
});
