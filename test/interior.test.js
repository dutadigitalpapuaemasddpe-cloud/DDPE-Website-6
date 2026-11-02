'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/interior.js'), 'utf8');

function fixture(hash = '', interior = true) {
  const handlers = {};
  const frames = [];
  const links = ['profil', 'nilai', 'jangkauan'].map(id => ({
    hash: '#' + id, attrs: {}, handlers: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(k, v) { this.handlers[k] = v; }
  }));
  const sections = Object.fromEntries(links.map((link, i) => [link.hash.slice(1), {
    top: 300 + i * 500,
    getBoundingClientRect() { return { top: this.top }; }
  }]));
  const navigation = { dataset: {}, querySelectorAll: () => links };
  const window = { location: { hash }, addEventListener: (k, v) => handlers[k] = v, requestAnimationFrame: f => frames.push(f) };
  const document = { body: { classList: { contains: () => interior } }, querySelector: () => navigation, getElementById: id => sections[id] };
  const context = { window, document, Array, Boolean, decodeURIComponent };
  vm.runInNewContext(source, context);
  return { links, sections, handlers, frames, context, window, navigation,
    current: () => links.filter(link => link.attrs['aria-current'] === 'location').map(link => link.hash) };
}

test('interior index initializes the existing deep link without rewriting the URL', () => {
  const f = fixture('#nilai');
  assert.deepEqual(f.current(), ['#nilai']);
  assert.equal(f.window.location.hash, '#nilai');
});

test('scroll and resize update one active section and coalesce animation frames', () => {
  const f = fixture();
  assert.deepEqual(f.current(), ['#profil']);
  f.sections.profil.top = -500;
  f.sections.nilai.top = 80;
  f.handlers.scroll(); f.handlers.scroll(); f.handlers.resize();
  assert.equal(f.frames.length, 1);
  f.frames.shift()();
  assert.deepEqual(f.current(), ['#nilai']);
  f.sections.jangkauan.top = 40;
  f.handlers.scroll(); f.frames.shift()();
  assert.deepEqual(f.current(), ['#jangkauan']);
});

test('native anchor click, hash history and page restoration retain a single indicator', () => {
  const f = fixture();
  f.links[2].handlers.click();
  assert.deepEqual(f.current(), ['#jangkauan']);
  f.window.location.hash = '#nilai';
  f.handlers.hashchange();
  assert.deepEqual(f.current(), ['#nilai']);
  f.window.location.hash = '#jangkauan';
  f.handlers.pageshow();
  assert.deepEqual(f.current(), ['#jangkauan']);
});

test('enhancement is idempotent and absent outside interior pages', () => {
  const f = fixture();
  const originalClick = f.links[0].handlers.click;
  vm.runInNewContext(source, f.context);
  assert.equal(f.links[0].handlers.click, originalClick);
  const home = fixture('', false);
  assert.equal(home.navigation.dataset.ipIndexReady, undefined);
  assert.deepEqual(home.current(), []);
});
