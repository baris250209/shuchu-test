// 称号の決め方を確かめる：全部の称号が出せるか、優先順が合っているか、ネタバレの言葉がないか
// 使い方: node tests/test_titles.mjs index.html
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
const { TITLES, RARE, RARE_RATE, decideTitle } = globalThis.__maze;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

// ふつうの1回：ミスなし・30秒・細い道の地点で終了・まれな称号は引かない
const base = { rec: 30000, recMiss: 0, missBy: [0, 0, 1], scareBy: 'narrow', newBest: false, plays: 1, l1: 10000, l2: 20000 };
const d = (over, rnd = 0.5) => decideTitle({ ...base, ...over }, rnd);

const cases = [
  ['legend', d({ rec: 9000, l1: 3000, l2: 6000 })],
  ['perfect', d({ missBy: [0, 0, 0], scareBy: 'point' })],
  ['wall', d({ recMiss: 10, missBy: [6, 4, 0], rec: 70000, l1: 30000, l2: 40000 })],
  ['stuck', d({ missBy: [0, 0, 5], scareBy: 'safety' })],
  ['best', d({ newBest: true })],
  ['regular', d({ plays: 5 })],
  ['morning', d({ recMiss: 3, missBy: [3, 0, 1], rec: 40000, l1: 19000, l2: 21000 })],
  ['afternoon', d({ recMiss: 3, missBy: [0, 3, 1], rec: 45000, l1: 10000, l2: 35000 })],
  ['late', d({ recMiss: 2, missBy: [2, 0, 1], rec: 36000, l1: 20000, l2: 16000 })],
  ['slow', d({ rec: 130000, l1: 50000, l2: 80000 })],
  ['r1', d({}, 0.001)], ['r2', d({}, 0.013)], ['r3', d({}, 0.026)], ['r4', d({}, 0.049)],
  ['f0', d({ rec: 18000, l1: 6000, l2: 12000 })],
  ['f1', d({ rec: 18000, l1: 8000, l2: 10000, recMiss: 1, missBy: [1, 0, 1] })],
  ['f2', d({ rec: 20000, l1: 9000, l2: 11000, recMiss: 3, missBy: [1, 2, 1] })],
  ['g0', d({})],
  ['g1', d({ recMiss: 2, missBy: [1, 1, 1] })],
  ['g2', d({ recMiss: 4, missBy: [2, 2, 1] })],
  ['m0', d({ rec: 50000, l1: 20000, l2: 30000 })],
  ['m1', d({ rec: 50000, l1: 20000, l2: 30000, recMiss: 1, missBy: [0, 1, 1] })],
  ['m2', d({ rec: 60000, l1: 25000, l2: 35000, recMiss: 3, missBy: [2, 1, 1] })],
  ['s0', d({ rec: 90000, l1: 40000, l2: 50000 })],
  ['s1', d({ rec: 90000, l1: 40000, l2: 50000, recMiss: 2, missBy: [1, 1, 1] })],
  ['s2', d({ rec: 90000, l1: 40000, l2: 50000, recMiss: 4, missBy: [2, 2, 1] })]
];
for (const [want, got] of cases) ok(want === got, `「${TITLES[want] ? TITLES[want][0] : want}」が出る条件 → ${got}`);

const ids = Object.keys(TITLES);
ok(ids.length === 26, '称号は26個: ' + ids.length);
ok(ids.every(id => cases.some(c => c[0] === id)), 'すべての称号に、出せる条件がある');
ok(new Set(ids.map(id => TITLES[id][0])).size === ids.length, '同じ名前の称号がない');

// 優先順
ok(d({ rec: 9000, newBest: true, plays: 5, l1: 3000, l2: 6000 }, 0.001) === 'legend', '伝説は、自己ベスト・常連・まれな称号より先');
ok(d({ newBest: true }, 0.001) === 'best', '特別な条件に当てはまるときは、まれな称号を引かない');
ok(d({ rec: 9000, recMiss: 1, missBy: [1, 0, 1], l1: 5000, l2: 4000 }) === 'late', '10秒以内でもミスがあれば伝説ではない');
ok(d({ plays: 10 }) === 'regular' && d({ plays: 4 }) === 'g0' && d({ plays: 6 }) === 'g0', '常連は5回目・10回目だけ');
ok(d({}, RARE_RATE) === 'g0' && d({}, RARE_RATE - 0.0001) === 'r4', 'まれな称号は ' + RARE_RATE * 100 + '% の範囲だけ');
ok(d({ rec: 20000, l1: 8000, l2: 12000 }) === 'f0' && d({ rec: 20001, l1: 8000, l2: 12001 }) === 'g0', 'タイムの境目：20秒ちょうどは速い側');
ok(d({ rec: 35000 }) === 'g0' && d({ rec: 60000, l1: 20000, l2: 40000 }) === 'm0' && d({ rec: 60001, l1: 20000, l2: 40001 }) === 's0', 'タイムの境目：35秒・60秒');

// ことば：ポスト文に出るので、ドッキリだと分かる言葉を入れない。悪口になる言葉も入れない
const NG = ['ドッキリ', '絶叫', 'ビビ', 'びび', '怖', 'こわ', '顔', '驚', 'おどろ', '叫', '悲鳴', 'ホラー', 'お化け', '幽霊', 'バカ', 'ばか', '無能', '窓ぎわ', '窓際', 'お局'];
for (const id of ids) {
  const [name, desc] = TITLES[id];
  const hit = NG.filter(w => (name + desc).includes(w));
  if (hit.length) ok(false, `「${name}」にNGの言葉: ${hit.join('・')}`);
}
ok(ids.every(id => !NG.some(w => (TITLES[id][0] + TITLES[id][1]).includes(w))), 'ネタバレ・悪口の言葉が入っていない');
ok(ids.every(id => /[。か]$/.test(TITLES[id][1])), 'ひとことが文で終わっている');
ok(RARE.every(id => TITLES[id][1].startsWith('まれに出る称号。')), 'まれな称号は、ひとことでそう分かる');
ok(Math.max(...ids.map(id => Array.from(TITLES[id][0]).length)) <= 12, 'いちばん長い名前でも12文字以内: ' + Math.max(...ids.map(id => Array.from(TITLES[id][0]).length)));

console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
