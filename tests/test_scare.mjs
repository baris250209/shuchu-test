// 顔の出し方（安全にかかわる所）が、確かめた組み合わせのままかを見る：速いゆれ＋暗め、予備の顔はゆらさない、
// 「動きを減らす」設定では止まる、注意書きに書いてある、顔の画像が確かめた9枚のまま。ファイルを読むだけ（動かさない）
// 使い方: node tests/test_scare.mjs index.html README.md
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const html = fs.readFileSync(process.argv[2], 'utf8');
const readme = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : null;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const rule = sel => { const i = css.indexOf('\n' + sel + '{'); return i < 0 ? null : css.slice(i + 1 + sel.length + 1, css.indexOf('}', i)); };

const img = rule('.scare img');
ok(img !== null && /animation:shake \.09s linear infinite, zoom 2\.6s ease-out forwards/.test(img), '顔は、出ている間ずっと速くゆれる（0.09秒周期）');
ok(img !== null && /(^|;)opacity:\.55(;|$)/.test(img), '顔は暗め（55%）に出す。速いゆれと組みで確かめた値');
const keys = css.match(/@keyframes shake\{([^@]*)\}\n/);
const amps = keys ? [...keys[1].matchAll(/translate:(-?[\d.]+)vmin (-?[\d.]+)%/g)].flatMap(m => [Math.abs(+m[1]), Math.abs(+m[2])]) : [];
ok(amps.length === 10 && Math.max(...amps) <= 1.2, 'ゆれ幅は、確かめた大きさをこえない（横は画面の短い辺の1.2%まで、たては1.2%まで）');
ok(keys !== null && !/translate:-?[\d.]+%/.test(keys[1]), '横のゆれ幅は vmin で書く（横長の画面で大きくなりすぎないように）');
const drawn = rule('.scare img.drawn');
ok(drawn !== null && !/shake/.test(drawn) && /animation:zoom 2\.6s ease-out forwards/.test(drawn), '予備の顔（描いた絵）は、ゆらさない（拡大だけ）');
ok(/face\.classList\.toggle\('drawn', src === drawn\)/.test(html), '予備の顔のときだけ、ゆらさない印を付ける');
ok(/@media \(prefers-reduced-motion: reduce\)\{\.scare img,\.scare img\.drawn\{animation:none;opacity:1\}\}/.test(css), '「動きを減らす」設定では、ゆれも拡大も止める');
ok(/\.scare\{[^}]*background:#000000/.test(css), '顔のうしろは黒（暗めにする前提）');

const caution = (html.match(/<p class="caution strong">(.*?)<\/p>/) || [])[1] || '';
ok(/急に大きな音が出て、画面が速くゆれることがあります/.test(caution), '注意書き：大きな音と、速いゆれ');
ok(/光の刺激で具合が悪くなったことのある方/.test(caution) && /心臓の弱い方/.test(caution) && /小さなお子さま/.test(caution), '注意書き：遊ばないでほしい人');
ok(/明るい場所で、画面から顔をはなして/.test(caution) && /イヤホンの方は音量をひかえめに/.test(caution), '注意書き：遊び方（明るい場所・顔をはなす・イヤホン）');
// 顔の画像：明滅の面積は、この9枚で確かめてある。足す・差し替えるときは、計算し直してから、この一覧を直す
const FACES = { 'face.jpg': '241510b49a2e8501', 'face2.jpg': 'dbe31b5a52d5d54e', 'face3.jpg': '9b7efcae9228766d', 'face4.jpg': 'd4050066454637e6', 'face5.jpg': '07eafddd9470a66e',
  'face6.jpg': 'dfedd288ed8ec4eb', 'face7.jpg': '47d121c4e262f0a7', 'face8.jpg': '7ad6ac4b78adcc3f', 'face9.jpg': '75bae8b5aadba6b9' };
const dir = path.dirname(process.argv[2]);
ok(new RegExp('const FACE_COUNT = ' + Object.keys(FACES).length + ';').test(html), '顔の枚数は、確かめた9枚のまま');
const changed = Object.entries(FACES).filter(([f, h]) => { try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex').slice(0, 16) !== h; } catch (e) { return true; } }).map(([f]) => f);
ok(changed.length === 0, '顔の画像は、確かめたものと同じ' + (changed.length ? '（ちがう: ' + changed.join(', ') + '）' : ''));
const extra = fs.readdirSync(dir).filter(f => /^face\d*\.jpg$/.test(f) && !(f in FACES));
ok(extra.length === 0, '確かめていない顔の画像が置かれていない' + (extra.length ? '（' + extra.join(', ') + '）' : ''));

if (readme) {
  const text = caution.replace(/<[^>]+>/g, '').replace(/^ご注意\s*/, '');
  ok(readme.includes('「' + text + '」'), 'README の注意書きの写しが、最初の画面と同じ');
  ok(!/激しい点滅は使っていません/.test(readme) && /ずっと速くゆれます/.test(readme), 'README が、いまのゆれ方と合っている');
}
console.log(fail ? `\n${fail} 件 失敗` : '\nすべて成功');
process.exit(fail ? 1 : 0);
