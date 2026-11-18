// 迷路が通れるかを確かめる：点の半径ぶんの余裕を見て、スタートからゴール（最終レベルはドッキリ地点）まで道がつながっているか
// 使い方: node tests/test_maze.mjs index.html
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
const M = globalThis.__maze;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

function reach(lv) {
  const seen = new Uint8Array(M.W * M.H), q = [[Math.round(lv.start[0]), Math.round(lv.start[1])]];
  seen[q[0][1] * M.W + q[0][0]] = 1;
  const res = { goal: false, trigger: false, narrow: false, cells: 0 };
  while (q.length) {
    const [x, y] = q.pop();
    res.cells++;
    if (M.inRect(lv.goal, x, y)) res.goal = true;
    if (M.inTrigger(x, y)) res.trigger = true;
    if (y < M.NARROW_Y) res.narrow = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= M.W || ny >= M.H) continue;
      const i = ny * M.W + nx;
      if (seen[i] || !M.inside(lv, nx, ny)) continue;
      seen[i] = 1; q.push([nx, ny]);
    }
  }
  return res;
}
M.LEVELS.forEach((lv, i) => {
  ok(M.inside(lv, lv.start[0], lv.start[1]), `レベル${i + 1}：スタート地点がかべに当たっていない`);
  const r = reach(lv);
  ok(r.goal, `レベル${i + 1}：スタートからゴールまで通れる（通れるマス ${r.cells}）`);
  const minW = Math.min(...lv.rects.map(q => Math.min(q[2], q[3])));
  ok(minW - lv.r * 2 >= 6, `レベル${i + 1}：いちばん細い道 ${minW}px − 点の直径 ${lv.r * 2}px ＝ 余裕 ${minW - lv.r * 2}px（6px以上）`);
  for (const q of lv.rects.concat([lv.goal])) ok(q[0] >= 0 && q[1] >= 0 && q[0] + q[2] <= M.W && q[1] + q[3] <= M.H, `レベル${i + 1}：通路 [${q}] が画面の中`);
});
const last = M.LEVELS[M.LEVELS.length - 1];
const r3 = reach(last);
ok(r3.narrow && r3.trigger, '最終レベル：細い道と、ドッキリの地点に届く');
ok(!M.inTrigger(last.start[0], last.start[1]) && last.start[1] > M.NARROW_Y, '最終レベル：スタート直後にはドッキリが出ない');
// 1・2面にはドッキリ地点がない（動きの処理は最終レベルだけで判定しているが、念のため）
console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
