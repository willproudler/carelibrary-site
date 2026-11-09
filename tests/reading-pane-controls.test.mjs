import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const asset = name => readFileSync(new URL('../native/' + name + '.mjs', import.meta.url), 'utf8');
const desk = asset('study-desk');
const field = asset('study-field');

test('Wide and Full visibly change the active pane even when both readings do not fit side by side', () => {
  for (const [source, count] of [[desk, 1], [field, 2]]) {
    const implementations = [...source.matchAll(/function fitPaneSize\(pane\)\{[\s\S]*?\n\}/g)];
    assert.equal(implementations.length, count);
    for (const [implementation] of implementations) {
      const fit = new Function(implementation + '\nreturn fitPaneSize;')();
      const widths = new Map();
      const neighbour = {offsetWidth:560, dataset:{}, matches:()=>true, classList:{contains:()=>false}};
      const strip = {clientWidth:1120, matches:()=>true};
      const view = {getComputedStyle:()=>({paddingLeft:'12px', paddingRight:'12px', columnGap:'16px'})};
      const pane = {
        dataset:{paneSize:'wide', paneStandardWidth:'560'}, parentElement:strip, nextElementSibling:neighbour,
        ownerDocument:{defaultView:view},
        style:{getPropertyValue:key=>widths.get(key), setProperty:(key,value)=>widths.set(key,value)},
      };
      strip.children = [pane, neighbour];
      const width = () => parseFloat(widths.get('--care-pane-sized-width'));
      fit(pane);
      assert.ok(width() > 560 && width() < 1096);
      assert.deepEqual(neighbour.dataset, {});
      pane.dataset.paneSize = 'full';
      fit(pane);
      assert.equal(width(), 1096);
      strip.clientWidth = 610;
      pane.dataset.paneSize = 'wide';
      fit(pane);
      assert.ok(width() > 560 && width() < 586);
      strip.clientWidth = 1488;
      fit(pane);
      assert.equal(width(), 888, 'A roomy track keeps the neighbouring reading completely in view');
    }
  }
});

test('fixed-width corpus sheets hide the width control only in their fixed-width layouts', () => {
  assert.match(field, /:host\(\[data-corpus-depth=WB\]\) \.desk-window\[data-layer=WB\] \[data-pane-control="size"\]\{display:none\}/);
  assert.match(field, /max-width:none!important;height:100%!important;--care-pane-text-factor:1\}\n\.desk-window \[data-pane-control="size"\]\{display:none\}/);
  assert.doesNotMatch(field, /\[data-pane-control="reading"\]\{display:none\}/);
});

test('reading pane arrows select across panes and never move the chapter slider', () => {
  const helpers = desk.slice(desk.indexOf('const readingKeyControl='), desk.indexOf('function readingPaneSlider('));
  const sliderKey = desk.slice(desk.indexOf('  runtime.onSliderKey='), desk.indexOf('  runtime.onSliderWheel='));
  const runtime = {};
  const move = new Function('runtime', helpers + sliderKey + '\nreturn moveReadingSelection;')(runtime);
  const card = (top, bottom) => ({getAttribute:()=>null, getBoundingClientRect:()=>({top,bottom}), scrollIntoView(){this.scrolled=true;}});
  const pane = (cards, folded=false) => ({cards, classList:{contains:name=>name==='folded'&&folded}, matches:()=>true,
    querySelector:()=>null, getBoundingClientRect:()=>({top:100,bottom:500})});
  const current = card(240, 300), visible = card(245, 290);
  const left = pane([current]), folded = pane([card(240, 290)], true), right = pane([card(110, 200), visible]);
  const strip = {children:[left, folded, right]};
  for (const reading of strip.children) reading.parentElement = strip;
  const key = (key, target) => ({key, target, preventDefault(){this.defaultPrevented=true;}});
  const next = key('ArrowRight'), selected = [];
  assert.equal(move(next, left, current, pane=>pane.cards, item=>selected.push(item)), true);
  assert.equal(next.defaultPrevented, true);
  assert.deepEqual(selected, [visible]);
  assert.equal(visible.scrolled, true);
  assert.equal(move(key('ArrowRight'), right, visible, pane=>pane.cards, item=>selected.push(item)), true);
  assert.deepEqual(selected, [visible], 'The reading strip does not wrap');
  const slider = {value:'2', closest:()=>slider};
  const arrow = key('ArrowRight', slider);
  assert.equal(runtime.onSliderKey(arrow), true);
  assert.equal(arrow.defaultPrevented, true);
  assert.equal(slider.value, '2');
});
