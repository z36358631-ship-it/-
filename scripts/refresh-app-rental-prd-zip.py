from __future__ import annotations

import hashlib
import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
SOURCE_PRD = ROOT / "prd" / "【盖世游戏APP】游戏租号需求" / "【Prd】《盖世游戏APP》游戏租号需求.md"
TARGET_ZIP = ROOT / "prd" / "最终文档" / "【Prd】《盖世游戏APP》游戏租号需求.zip"
NEXT_ZIP = TARGET_ZIP.with_suffix(".zip.next")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    prd_bytes = SOURCE_PRD.read_bytes()
    if NEXT_ZIP.exists():
        NEXT_ZIP.unlink()

    with ZipFile(TARGET_ZIP, "r") as source:
        source_infos = source.infolist()
        markdown_entries = [info for info in source_infos if info.filename.lower().endswith(".md")]
        if len(markdown_entries) != 1:
            raise RuntimeError(f"ZIP内Markdown数量异常：{len(markdown_entries)}")
        markdown_name = markdown_entries[0].filename

        with ZipFile(NEXT_ZIP, "w", compression=ZIP_DEFLATED, compresslevel=9, allowZip64=True) as target:
            for info in source_infos:
                payload = prd_bytes if info.filename == markdown_name else source.read(info.filename)
                target.writestr(info, payload)

    with ZipFile(NEXT_ZIP, "r") as refreshed:
        refreshed_infos = refreshed.infolist()
        if [info.filename for info in refreshed_infos] != [info.filename for info in source_infos]:
            raise RuntimeError("ZIP条目名称或顺序发生变化")
        embedded_prd = refreshed.read(markdown_name)
        if embedded_prd != prd_bytes:
            raise RuntimeError("ZIP内PRD与源PRD不一致")

    os.replace(NEXT_ZIP, TARGET_ZIP)
    print(
        f"ZIP_REFRESH PASS entries={len(source_infos)} "
        f"prd_sha256={sha256(prd_bytes)} bytes={TARGET_ZIP.stat().st_size}"
    )


if __name__ == "__main__":
    try:
        main()
    finally:
        if NEXT_ZIP.exists():
            NEXT_ZIP.unlink()
