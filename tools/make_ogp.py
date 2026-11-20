"""集中力テストのリンクカード画像（1200×630）を作る。黄色い地に黒い題名、かたむけた迷路、青いシール。ドッキリだと分かる絵・言葉は入れない。
使い方: python tools/make_ogp.py ogp.png ["作った人の表示（入れるときだけ）"]
文字は Noto Sans JP（SIL Open Font License）を使う。フォントは Windows の場所（C:/Windows/Fonts）を見にいく。
Xは画像の左下に題名のラベルを重ねるので、作った人は右下に置く（そのぶん、迷路を少し小さくして上げる）。左下には文字を置かない。"""
import sys
from PIL import Image, ImageDraw, ImageFont

if len(sys.argv) < 2:
    sys.exit('使い方: python tools/make_ogp.py ogp.png ["作った人の表示（入れるときだけ）"]')
out = sys.argv[1]
credit = sys.argv[2] if len(sys.argv) > 2 else ""
# 置き場所（たての位置は文字のまん中）。作った人を入れるときは、右下に1行で置き、迷路とシールを少し小さくして上げる
if credit:
    LAY = dict(pill=36, t1=185, t2=348, sub_y=466, card=0.9, card_xy=(905, 268), seal=200, seal_xy=(1068, 452), seal_f=33, seal_dy=24)
else:
    LAY = dict(pill=56, t1=205, t2=368, sub_y=486, card=1, card_xy=(905, 292), seal=214, seal_xy=(1072, 506), seal_f=35, seal_dy=25)
K = 2                      # 2倍で描いて、最後に半分にする（ふちをなめらかに）
W, H = 1200 * K, 630 * K
YEL, INK, PATH, DOT, WHITE = "#FFD23F", "#15162B", "#E3E6FD", "#2F3BDB", "#FFFFFF"
NOTO = "C:/Windows/Fonts/NotoSansJP-VF.ttf"

def font(size, weight=900):
    f = ImageFont.truetype(NOTO, int(size * K))
    f.set_variation_by_axes([weight])
    return f

im = Image.new("RGB", (W, H), YEL)
d = ImageDraw.Draw(im)
s = lambda v: int(round(v * K))

# ---- 左：題名 ----
f_pill = font(30, 800)
pill = "タイムアタック｜全3レベル"
pw = d.textlength(pill, font=f_pill)
d.rounded_rectangle([s(64), s(LAY["pill"]), s(64) + pw + s(56), s(LAY["pill"] + 58)], radius=s(29), fill=INK)
d.text((s(64 + 28), s(LAY["pill"] + 29)), pill, font=f_pill, fill=YEL, anchor="lm")
f_title = font(158)
d.text((s(56), s(LAY["t1"])), "集中力", font=f_title, fill=INK, anchor="lm")
d.text((s(56), s(LAY["t2"])), "テスト", font=f_title, fill=INK, anchor="lm")
f_sub = font(50, 900)
d.text((s(64), s(LAY["sub_y"])), "あなたは、何秒？", font=f_sub, fill=INK, anchor="lm")

# ---- 右：かたむけた迷路のカード ----
C = 440                                   # カードの1辺
PAD = 110                                 # まわりの余白（持ち手と回転のため）
L = Image.new("RGBA", (s(C + PAD * 2), s(C + PAD * 2)), (0, 0, 0, 0))
ld = ImageDraw.Draw(L)
o = PAD
R = lambda x, y, w, h: [s(o + x), s(o + y), s(o + x + w), s(o + y + h)]
ld.rounded_rectangle(R(0, 0, C, C), radius=s(34), fill=INK)
pw_ = 62
for r in [(40, 338, 360, pw_), (338, 190, pw_, 210), (40, 190, 360, pw_), (40, 40, pw_, 212), (40, 40, 360, pw_)]:
    ld.rectangle(R(*r), fill=PATH)
ld.rectangle(R(338, 40, pw_, pw_), fill=YEL)
ld.text((s(o + 369), s(o + 71)), "ゴール", font=font(17, 800), fill=INK, anchor="mm")
# 点 → ワイヤー → 三角の持ち手（ハンマー投げの見た目）
bx, by = o + 178, o + 369
gx, gy = bx + 40, by + 96
ld.line([s(bx), s(by), s(gx), s(gy)], fill=WHITE, width=s(9))
ld.line([s(bx), s(by), s(gx), s(gy)], fill="#4B5080", width=s(3))
tri = [(gx, gy - 6), (gx + 30, gy + 44), (gx - 30, gy + 44)]
tri = [(s(x), s(y)) for x, y in tri]
ld.polygon(tri, fill=WHITE)
ld.line(tri + [tri[0]], fill=WHITE, width=s(13), joint="curve")
ld.line(tri + [tri[0]], fill=INK, width=s(6), joint="curve")
ld.ellipse([s(bx - 15), s(by - 15), s(bx + 15), s(by + 15)], fill=DOT)
# 影（ずらした黒い板）→ カード
ANG = -6
card = L.rotate(ANG, resample=Image.BICUBIC, expand=True)
sh = Image.new("RGBA", L.size, (0, 0, 0, 0))
ImageDraw.Draw(sh).rounded_rectangle(R(0, 0, C, C), radius=s(34), fill=(0, 0, 0, 70))
sh = sh.rotate(ANG, resample=Image.BICUBIC, expand=True)
if LAY["card"] != 1:
    size = (round(card.width * LAY["card"]), round(card.height * LAY["card"]))
    card, sh = card.resize(size, Image.LANCZOS), sh.resize(size, Image.LANCZOS)
cx, cy = s(LAY["card_xy"][0]), s(LAY["card_xy"][1])
im.paste(sh, (cx - sh.width // 2 + s(16), cy - sh.height // 2 + s(18)), sh)
im.paste(card, (cx - card.width // 2, cy - card.height // 2), card)

# ---- 右下：青いシール ----
D = LAY["seal"]
st = Image.new("RGBA", (s(D + 20), s(D + 20)), (0, 0, 0, 0))
sd = ImageDraw.Draw(st)
sd.ellipse([s(10), s(10), s(10 + D), s(10 + D)], fill=DOT, outline=WHITE, width=s(7))
f_st = font(LAY["seal_f"], 900)
sd.text((s(10 + D / 2), s(10 + D / 2 - LAY["seal_dy"])), "レベル3が", font=f_st, fill=WHITE, anchor="mm")
sd.text((s(10 + D / 2), s(10 + D / 2 + LAY["seal_dy"])), "むずかしい", font=f_st, fill=WHITE, anchor="mm")
st = st.rotate(9, resample=Image.BICUBIC, expand=True)
im.paste(st, (s(LAY["seal_xy"][0]) - st.width // 2, s(LAY["seal_xy"][1]) - st.height // 2), st)

# ---- 右下：作った人（左下はXのラベルにかくれるので、右に寄せる） ----
if credit:
    d.text((s(1150), s(592)), credit, font=font(32, 800), fill=INK, anchor="rm")

im = im.resize((1200, 630), Image.LANCZOS)
im.save(out, "PNG", optimize=True)
print("saved", out, im.size)
