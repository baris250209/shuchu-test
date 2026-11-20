// 指とマウスの合図のつなぎ込みを確かめる：にせの画面を作り、ページが登録した処理に合図を送る
// （ボタンの上・ゲーム以外の画面・別の指・指をはなす・画面の固定・迷路の位置のずれ・マウス）
// 使い方: node tests/test_touch.mjs index.html
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const stub = () => new Proxy(function () {}, { get(t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; return stub(); }, set() { return true; }, apply() { return stub(); } });

// にせの画面。迷路は画面の (10, 100) から 360×520（迷路の1＝1px）。ゲームの画面の下端は gameRect.bottom
const L = { doc: {}, cv: {} };
const rect = { left: 10, top: 100, width: 360, height: 520, right: 370, bottom: 620 };
const gameRect = { left: 0, top: 0, width: 380, height: 640, right: 380, bottom: 640 };
const HIDDEN = ['#s-game', '#s-end', '#ov', '#scare', '#msg', '#best'];
const els = {};
function makeEl(id) {
  const data = { hidden: HIDDEN.includes(id), textContent: '', style: {}, offsetHeight: 0 };
  return new Proxy(data, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'addEventListener') return (type, fn) => { if (id === '#cv') (L.cv[type] ||= []).push(fn); };
      if (p === 'getBoundingClientRect') return () => (id === '#cv' ? rect : id === '#s-game' ? gameRect : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 });
      if (p === 'closest') return () => null;
      if (p === 'getContext') return () => stub();
      if (p === 'classList') return { toggle() {}, add() {}, remove() {}, contains: () => false };
      return stub();
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}
const cls = new Set();
globalThis.document = {
  querySelector: s => els[s] || (els[s] = makeEl(s)),
  addEventListener: (type, fn) => { (L.doc[type] ||= []).push(fn); },
  documentElement: { classList: { toggle(n, on) { if (on) cls.add(n); else cls.delete(n); }, contains: n => cls.has(n) } },
  createElement: () => stub(), hidden: false
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.scrollTo = () => {};
globalThis.innerHeight = 800; globalThis.scrollY = 0;
globalThis.location = { href: 'file:///x' };
globalThis.Image = class { set src(v) {} };
globalThis.localStorage = { getItem: () => null, setItem() {} };
new Function(src)();
const M = globalThis.__maze, S = M.S;
const cv = els['#cv'];
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const body = { closest: () => null };
const button = { closest: () => ({}) };
const fire = (where, type, props) => {
  const e = { pointerType: 'touch', pointerId: 1, clientX: 0, clientY: 0, cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, target: body, ...props };
  for (const fn of (L[where][type] || [])) fn(e);
  return e;
};
const ball = () => ({ x: rect.left + S.pos.x, y: rect.top + S.pos.y });   // 点の、画面上の位置
const handle = () => ({ clientX: ball().x, clientY: ball().y + 76 });      // 点の真下76px（持ち手の場所）
const reset = () => { rect.top = 100; rect.bottom = 620; gameRect.bottom = 640; M.newGame(); };

// 1. 最初の画面では、さわっても何も起きない
{
  const e = fire('doc', 'pointerdown', { clientX: 100, clientY: 300 });
  ok(S.state === 'title' && !S.dragging && !e.prevented, '最初の画面：さわっても、つかまない');
  ok(!cls.has('game'), '最初の画面：画面を固定していない');
  ok(!fire('doc', 'touchmove', {}).prevented, '最初の画面：スクロールを止めていない');
}

// 2. ゲームの画面（1画面におさまる）：迷路の外をさわっても動かせる。ボタンの上は除く
{
  reset();
  ok(cls.has('game'), 'ゲームの画面：1画面におさまるので、画面を固定する');
  fire('doc', 'pointerdown', { target: button, clientX: 200, clientY: 20 });
  ok(S.state === 'ready' && !S.dragging, 'ボタンの上をさわっても、つかまない（タイムも始まらない）');
  const p0 = { ...S.pos };
  const e = fire('doc', 'pointerdown', handle());
  ok(S.state === 'play' && S.dragging && !S.slack && S.touchUser && e.prevented, '迷路の下（持ち手の場所）をさわると、つかんで始まる');
  fire('doc', 'pointermove', { pointerId: 9, clientX: handle().clientX + 200, clientY: handle().clientY });
  ok(near(S.pos.x, p0.x), '別の指の動きでは、点は動かない');
  fire('doc', 'pointermove', { pointerType: 'mouse', clientX: 300, clientY: 300 });
  ok(near(S.pos.x, p0.x), 'マウスの動きでは、つかんだ点は動かない');
  const h = handle();
  fire('doc', 'pointermove', { clientX: h.clientX + 25, clientY: h.clientY });
  ok(near(S.pos.x, p0.x + 25) && near(S.pos.y, p0.y), 'つかんだ指を右に25px動かすと、点も25動く');
  ok(fire('doc', 'touchmove', {}).prevented, 'つかんでいる間は、画面のスクロールを止める');
  fire('doc', 'pointerup', { pointerId: 9 });
  ok(S.dragging, '別の指をはなしても、つかんだまま');
  fire('doc', 'pointerup', {});
  ok(!S.dragging && S.grip === null, 'つかんだ指をはなすと、はなれる');
  ok(!fire('doc', 'touchmove', {}).prevented, 'はなしたあとは、スクロールを止めない');
  fire('doc', 'pointermove', { clientX: h.clientX + 90, clientY: h.clientY });
  ok(near(S.pos.x, p0.x + 25), 'はなしたあとは、指を動かしても点は動かない');
}

// 3. 2本目の指が、持ち手を引きつぐ
{
  reset();
  fire('doc', 'pointerdown', { pointerId: 1, ...handle() });
  fire('doc', 'pointerdown', { pointerId: 2, clientX: 300, clientY: 700 });
  const x0 = S.pos.x;
  fire('doc', 'pointermove', { pointerId: 1, clientX: handle().clientX + 40, clientY: handle().clientY });
  ok(near(S.pos.x, x0), '2本目の指を置いたあとは、1本目の動きでは動かない');
  fire('doc', 'pointerup', { pointerId: 1 });
  ok(S.dragging, '1本目をはなしても、2本目がつかんでいる');
  fire('doc', 'pointermove', { pointerId: 2, clientX: 310, clientY: 700 });
  ok(near(S.pos.x, x0 + 10), '2本目を10px動かすと、点も10動く');
  fire('doc', 'pointerup', { pointerId: 2 });
  ok(!S.dragging, '2本目をはなすと、はなれる');
}

// 4. さわった直後に迷路の位置がずれても、点は飛ばない（案内の文が縮んで、迷路が22px上がった場合）
{
  reset();
  const p0 = { ...S.pos }, h = handle();
  fire('doc', 'pointerdown', h);
  rect.top -= 22; rect.bottom -= 22;
  fire('doc', 'pointermove', { clientX: h.clientX + 1, clientY: h.clientY });
  ok(near(S.pos.x, p0.x + 1) && near(S.pos.y, p0.y) && S.missBy[0] === 0 && S.state === 'play', '迷路が22pxずれても、点は指が動いたぶん（1）しか動かない');
  fire('doc', 'pointerup', {});
}

// 5. 点の上をさわる：タイムは始まるが、ワイヤーがのびるまで点は動かない
{
  reset();
  const p0 = { ...S.pos }, b = ball();
  fire('doc', 'pointerdown', { clientX: b.x, clientY: b.y, target: cv });
  ok(S.state === 'play' && S.slack, '点の上をさわると、始まって、先にワイヤーをのばす');
  fire('doc', 'pointermove', { clientX: b.x + 40, clientY: b.y, target: cv });
  ok(near(S.pos.x, p0.x), '40px動かしても、点は動かない');
  fire('doc', 'pointermove', { clientX: b.x + 56, clientY: b.y, target: cv });
  fire('doc', 'pointermove', { clientX: b.x + 66, clientY: b.y, target: cv });
  ok(near(S.pos.x, p0.x + 10), 'ワイヤーがのびきったあとは、指が動いたぶん（10）だけ動く');
  fire('doc', 'pointerup', {});
}

// 6. かべに当たってやり直しになると、指を置いたままでも、つかんだ状態が消える
{
  reset();
  const h = handle();
  fire('doc', 'pointerdown', h);
  fire('doc', 'pointermove', { clientX: h.clientX, clientY: h.clientY - 60 });
  ok(S.state === 'fail' && S.missBy[0] === 1, 'かべに入れると、ミスになる');
  const x0 = S.pos.x;
  fire('doc', 'pointerdown', { clientX: 200, clientY: 700 });
  ok(S.state === 'fail' && near(S.pos.x, x0), '「かべにふれました」の間は、さわってもつかまない');
  M.loadLevel(0);
  ok(S.state === 'ready' && !S.dragging && S.grip === null, 'やり直しで、つかんだ状態が消える');
  fire('doc', 'pointermove', { clientX: h.clientX + 50, clientY: h.clientY });
  ok(S.state === 'ready' && near(S.pos.x, M.LEVELS[0].start[0]), '置いたままの指を動かしても、始まらない（置き直すと始まる）');
  fire('doc', 'pointerup', {});
}

// 7. 1画面におさまらない端末（横向きなど）：画面を固定しない。迷路の中だけでつかめる
{
  reset();
  gameRect.bottom = 900; M.loadLevel(0);
  ok(!cls.has('game'), 'おさまらないときは、画面を固定しない（外はスクロールに使える）');
  fire('doc', 'pointerdown', handle());
  ok(S.state === 'ready' && !S.dragging, '迷路の外をさわっても、つかまない');
  const b = ball();
  const e = fire('doc', 'pointerdown', { clientX: b.x + 80, clientY: b.y, target: cv });
  ok(S.state === 'play' && S.dragging && e.prevented, '迷路の中をさわると、つかんで始まる');
  fire('doc', 'pointerup', {});
}

// 8. マウスは、これまでどおり（迷路の上だけ。点をクリックするとついてくる）
{
  reset();
  S.touchUser = true;
  const b = ball();
  fire('cv', 'pointermove', { pointerType: 'mouse', clientX: b.x + 100, clientY: b.y });
  ok(!S.touchUser && S.state === 'ready', 'マウスが動いたら、マウス向けの案内に切りかえる（まだ始まらない）');
  fire('cv', 'pointerdown', { pointerType: 'mouse', clientX: b.x + 60, clientY: b.y });
  ok(S.state === 'ready', '点から離れた所をクリックしても、始まらない');
  fire('doc', 'pointerdown', { pointerType: 'mouse', clientX: b.x, clientY: b.y + 76 });
  ok(S.state === 'ready' && !S.dragging, 'マウスで持ち手の場所を押しても、つかまない');
  fire('cv', 'pointerdown', { pointerType: 'mouse', clientX: b.x + 3, clientY: b.y + 2 });
  ok(S.state === 'play' && S.mouseFollow && !S.dragging, '点をクリックすると、始まる');
  fire('cv', 'pointermove', { pointerType: 'mouse', clientX: b.x + 80, clientY: b.y });
  ok(near(S.pos.x, M.LEVELS[0].start[0] + 80), 'ボタンを押していなくても、マウスの位置に点がついてくる');
}

// 9. 指をはなした合図が届かないままドッキリ → 終わりの画面になっても、スクロールできる
{
  reset();
  fire('doc', 'pointerdown', handle());
  ok(S.dragging, '（準備）つかんでいる');
  M.scare('goal');
  ok(!fire('doc', 'touchmove', {}).prevented, 'ドッキリの間は、スクロールを止める処理をしない');
  fire('doc', 'pointerdown', { clientX: 100, clientY: 300 });
  ok(S.state === 'scare', 'ドッキリの間は、さわってもつかまない');
  await new Promise(r => setTimeout(r, 2800));
  ok(S.state === 'end' && !els['#s-end'].hidden && els['#s-game'].hidden, '（準備）終わりの画面になった');
  ok(!S.dragging && S.grip === null, '終わりの画面：つかんだ状態が消えている');
  ok(!cls.has('game'), '終わりの画面：画面の固定を外している');
  ok(!fire('doc', 'touchmove', {}).prevented, '終わりの画面：スクロールを止めていない');
  fire('doc', 'pointerdown', { clientX: 100, clientY: 300 });
  ok(S.state === 'end' && !S.dragging, '終わりの画面：さわっても、つかまない');
}

console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
