// Lädt index.html in jsdom mit gefälschtem Web Audio und manueller Zeitsteuerung.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function load() {
  const clicks = [];            // { time, freq } je geplanter Klick
  const audio = { currentTime: 0 };
  let tick = null;              // Scheduler-Callback (setInterval der App)

  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: false,
    url: 'http://localhost/',
    beforeParse(w) {
      const param = () => ({
        value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {},
      });
      w.AudioContext = class {
        constructor() { this.state = 'running'; this.destination = {}; }
        get currentTime() { return audio.currentTime; }
        resume() {}
        createGain() { return { gain: param(), connect: n => n }; }
        createOscillator() {
          const o = { frequency: { value: 0 }, connect: n => n, start(t) { clicks.push({ time: t, freq: o.frequency.value }); }, stop() {} };
          return o;
        }
      };
      w.Audio = class { play() { return Promise.resolve(); } pause() {} setAttribute() {} };
      w.URL.createObjectURL = () => 'blob:stub';
      w.requestAnimationFrame = () => 0;
      w.setInterval = fn => { tick = fn; return 1; };
      w.clearInterval = () => { tick = null; };
    },
  });
  const { document } = dom.window;
  const $ = id => document.getElementById(id);

  const app = {
    window: dom.window, document, clicks, $,
    bpm: () => Number($('bpm').textContent),
    isPlaying: () => tick !== null,
    play: () => $('play').click(),
    press(code, extra = {}) {
      document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { code, bubbles: true, ...extra }));
    },
    // Zeit in 25-ms-Schritten vorspulen, Scheduler jeweils aufrufen
    advance(seconds, onTick) {
      const end = audio.currentTime + seconds;
      while (audio.currentTime < end - 1e-9) {
        audio.currentTime += 0.025;
        if (tick) tick();
        if (onTick) onTick();
      }
    },
    // Anzahl abgeschlossener Takte = Takt-Eins-Klicks (1600 Hz), erster Takt zählt mit
    downbeats: () => clicks.filter(c => c.freq === 1600),
    // BPM-Werte in der Reihenfolge ihrer Änderung
    bpmTrace(seconds) {
      const trace = [app.bpm()];
      app.advance(seconds, () => { const b = app.bpm(); if (b !== trace[trace.length - 1]) trace.push(b); });
      return trace;
    },
    // Auto-Steigerung über die Oberfläche konfigurieren
    configureAuto({ start, end, stepIdx, every }) {
      const clickStep = (key, d) => document.querySelector(`.field[data-key="${key}"] .step[data-d="${d}"]`);
      const cur = { start: 100, end: 150, step: 2, every: 4 };
      const set = (key, from, to) => {
        const b = clickStep(key, to > from ? 1 : -1);
        for (let i = 0; i < Math.abs(to - from); i++) b.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true, cancelable: true }));
        b.dispatchEvent(new dom.window.Event('pointerup', { bubbles: true }));
      };
      if (start !== undefined) set('start', cur.start, start);
      if (end !== undefined) set('end', cur.end, end);
      if (stepIdx !== undefined) set('step', cur.step, stepIdx);
      if (every !== undefined) set('every', cur.every, every);
    },
    toggleAuto: () => $('autoToggle').click(),
  };
  return app;
}

module.exports = { load };
