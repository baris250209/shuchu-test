// 持ち手（スマホの操作）の中身を確かめる：指が動いたぶんだけ点が動くか、点の近くをさわったときにワイヤーが先にのびるか、
// 迷路の位置が途中でずれても点が飛ばないか
// 使い方: node tests/test_grip.mjs index.html
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const stub = () => new Proxy(function () {}, { get(t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; return stub(); }, set() { return true; }, apply() { return stub(); } });
globalThis.document = stub(); globalThis.window = globalThis;
globalThis.addEventListener = () => {}; globalThis.requestAnimationFrame = () => 0;
globalThis.location = { href: 'file:///x' };
globalThis.Image = class { set src(v) {} };
globalThis.localStorage = { getItem: () => null, setItem() {} };
new Function(src)();
const M = globalThis.__maze, S = M.S;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const start = n => { M.newGame(); M.loadLevel(n); S.state = 'play'; return { x: S.pos.x, y: S.pos.y }; };
// v = 迷路の見え方（左上が画面の (x, y)、迷路の1が画面で k px）。at = 迷路の座標 → 画面上の位置
const V1 = { x: 10, y: 100, k: 1 };
const at = (v, mx, my) => ({ x: v.x + mx * v.k, y: v.y + my * v.k });

// 1. 点から離れた所をつかむ：すぐに、指が動いたぶんだけ点が動く
{
  const p0 = start(0);
  const f = at(V1, p0.x, p0.y + 80);
  M.gripDown(f, V1);
  ok(S.dragging && !S.slack, '離れた所をつかむと、ワイヤーをのばす待ちは入らない');
  M.gripMove({ x: f.x + 30, y: f.y }, V1);
  ok(near(S.pos.x, p0.x + 30) && near(S.pos.y, p0.y), '指を右に30px動かすと、点も右に30動く');
  ok(near(S.grip.x, f.x + 30) && near(S.grip.y, f.y), '持ち手は、指の位置にある');
  M.gripUp();
  ok(!S.dragging && S.grip === null && S.last === null, '指をはなすと、つかんだ状態が消える');
  M.gripMove({ x: f.x + 90, y: f.y }, V1);
  ok(near(S.pos.x, p0.x + 30), '指をはなしたあとは、点は動かない');
}

// 2. 点の上をさわる：ワイヤーが MIN_WIRE の長さになるまで、点は動かない
{
  const p0 = start(0);
  const f = at(V1, p0.x, p0.y);
  M.gripDown(f, V1);
  ok(S.slack, '点の上をさわると、先にワイヤーをのばす');
  M.gripMove({ x: f.x + 30, y: f.y }, V1);
  ok(near(S.pos.x, p0.x) && S.slack, `指を30px動かしても、点は動かない（${M.MIN_WIRE}pxより短い）`);
  M.gripMove({ x: f.x + 60, y: f.y }, V1);
  ok(near(S.pos.x, p0.x) && !S.slack, '60pxまで動かすと、ワイヤーがのびきる（点はまだ同じ場所）');
  M.gripMove({ x: f.x + 80, y: f.y }, V1);
  ok(near(S.pos.x, p0.x + 20), 'そこから20px動かすと、点も20動く');
  ok(S.grip.x - at(V1, S.pos.x, S.pos.y).x >= M.MIN_WIRE, `指と点の間が ${M.MIN_WIRE}px 以上はなれている（点が指にかくれない）`);
  M.gripUp();
}

// 3. 迷路が小さく映る端末（迷路の1が画面で0.6px）：画面上の長さで判定し、動きは倍率で直す
{
  const v = { x: 60, y: 120, k: 0.6 };
  const p0 = start(0);
  M.gripDown(at(v, p0.x + 60, p0.y), v);
  ok(S.slack, '迷路の60は、画面では36px。近いので、先にワイヤーをのばす');
  M.gripUp();
  const f = at(v, p0.x + 100, p0.y);
  M.gripDown(f, v);
  ok(!S.slack, '迷路の100は、画面では60px。離れているので、すぐ動く');
  M.gripMove({ x: f.x + 30, y: f.y }, v);
  ok(near(S.pos.x, p0.x + 50), '指を画面で30px動かすと、点は迷路の50ぶん動く（30 ÷ 0.6）');
  M.gripUp();
}

// 4. 持ち手で動かしても、かべの判定は同じ
{
  const p0 = start(0);
  const before = S.missBy[0];
  const f = at(V1, p0.x, p0.y + 80);
  M.gripDown(f, V1);
  M.gripMove({ x: f.x, y: f.y - 60 }, V1); // 上に60＝かべの中
  ok(S.missBy[0] === before + 1 && S.state === 'fail', '持ち手で点をかべに入れると、ミスになる');
}

// 5. さわったあとに迷路の位置がずれても、点は飛ばない（案内の文が縮んで、迷路が上に22pxずれた場合）
{
  const p0 = start(0);
  const before = S.missBy[0];
  const f = at(V1, p0.x, p0.y + 76);
  M.gripDown(f, V1);
  const shifted = { x: V1.x, y: V1.y - 22, k: 1 };
  M.gripMove({ x: f.x + 1, y: f.y }, shifted);
  ok(near(S.pos.x, p0.x + 1) && near(S.pos.y, p0.y), '指を1px動かしただけなら、点も1だけ動く（下へ飛ばない）');
  ok(S.missBy[0] === before && S.state === 'play', 'ミスにならない');
  M.gripUp();
}

// 6. 指をはなしているときの持ち手の場所（box＝置いていい範囲の右端 r と下端 b）
{
  const a = M.restGrip(100, 300, { r: 390, b: 750 });
  ok(a.x === 100 && a.y === 300 + M.REST_WIRE, '下が空いていれば、点の真下に置く');
  const b = M.restGrip(100, 700, { r: 390, b: 750 });
  ok(b.x === 100 + M.REST_WIRE && b.y === 700, '下に置けないときは、右に置く');
  const c = M.restGrip(360, 700, { r: 390, b: 750 });
  ok(c.x === 360 - M.REST_WIRE && c.y === 700, '右にも置けないときは、左に置く');
  const d = M.restGrip(100, 660, { r: 390, b: 750 });
  ok(d.x === 100 && d.y === 720 && d.y - 660 >= M.MIN_WIRE, '下が少しせまいときは、範囲の中におさめて真下に置く');
}

// 7. レベルを読み直すと、つかんだ状態が消える
{
  start(1);
  M.gripDown(at(V1, S.pos.x, S.pos.y), V1);
  M.loadLevel(1);
  ok(!S.dragging && S.grip === null && !S.slack, 'レベルの最初に戻ると、つかんだ状態が消える');
}

console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
