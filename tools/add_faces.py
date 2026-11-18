"""_inbox に入れた画像（png / jpg / webp）を、ゲーム用の face2.jpg〜face10.jpg に変換して入れる。

使い方（shuchu-test フォルダで）:
    python -I tools/add_faces.py            # _inbox の画像を取り込む
    python -I tools/add_faces.py 画像1 画像2  # 指定した画像を取り込む

- 空いているいちばん小さい番号から順に入れる（face.jpg は1枚目として残す）。
- 長い辺が 1536px を超える画像は縮める。JPEG（品質 85）で保存する。
- _inbox から取り込んだ元の画像は、消さずに _inbox/done に移す。
"""
import re
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "_inbox"
NAMES = ["face.jpg"] + [f"face{i}.jpg" for i in range(2, 11)]
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows でも文字化けしないように
    except Exception:
        pass
    args = [Path(a) for a in sys.argv[1:]]
    from_inbox = not args
    if from_inbox:
        INBOX.mkdir(exist_ok=True)
        args = sorted(p for p in INBOX.iterdir() if p.is_file() and p.suffix.lower() in EXTS)
    if not args:
        print("取り込む画像がありません。_inbox に画像を入れてください。")
        return 0
    free = [n for n in NAMES if not (ROOT / n).exists()]
    added = 0
    for src in args:
        if not free:
            print(f"10枚そろっているので入れません: {src.name}")
            continue
        name = free.pop(0)
        im = Image.open(src).convert("RGB")
        im.thumbnail((1536, 1536))
        im.save(ROOT / name, "JPEG", quality=85, optimize=True)
        print(f"{src.name} → {name}（{im.size[0]}×{im.size[1]}）")
        added += 1
        if from_inbox:
            done = INBOX / "done"
            done.mkdir(exist_ok=True)
            src.rename(done / src.name)
    have = [n for n in NAMES if (ROOT / n).exists()]
    print(f"\n{added}枚 追加。いま {len(have)}枚 / 10枚: {', '.join(have)}")
    # ゲームが使う枚数（FACE_COUNT）を、face.jpg から続けて並んでいる枚数に合わせる
    count = 0
    for n in NAMES:
        if not (ROOT / n).exists():
            break
        count += 1
    page = ROOT / "index.html"
    text = page.read_text(encoding="utf-8")
    new = re.sub(r"const FACE_COUNT = \d+;", f"const FACE_COUNT = {count};", text, count=1)
    if new != text:
        page.write_text(new, encoding="utf-8", newline="\n")
        print(f"index.html の FACE_COUNT を {count} にしました。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
