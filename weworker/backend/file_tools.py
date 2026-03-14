"""File management tools for WeWork.

Manages files in ~/.wework/files/ and provides access to ~/Downloads.
All paths are restricted to these two directories for safety.
"""
import os
import shutil
from datetime import datetime
from pathlib import Path

DOWNLOADS_DIR = Path.home() / "Downloads"
WEWORK_FILES_DIR = Path.home() / ".wework" / "files"


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _file_info(p: Path) -> dict:
    stat = p.stat()
    return {
        "name": p.name,
        "path": str(p),
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
    }


def list_downloads(keyword: str = "", limit: int = 50) -> dict:
    """List files in ~/Downloads, optionally filtered by keyword."""
    if not DOWNLOADS_DIR.exists():
        return {"files": [], "dir": str(DOWNLOADS_DIR)}
    files = sorted(
        [f for f in DOWNLOADS_DIR.iterdir() if f.is_file()],
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    if keyword:
        files = [f for f in files if keyword.lower() in f.name.lower()]
    return {
        "dir": str(DOWNLOADS_DIR),
        "files": [_file_info(f) for f in files[:limit]],
        "total": len(files),
    }


def list_wework_files(category: str = "") -> dict:
    """List files in ~/.wework/files/ or a specific category subdirectory."""
    base = _ensure_dir(WEWORK_FILES_DIR)
    target = base / category if category else base
    if not target.exists():
        return {"files": [], "dir": str(target), "categories": []}

    files = sorted(
        [f for f in target.rglob("*") if f.is_file()],
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    categories = [d.name for d in base.iterdir() if d.is_dir()]
    return {
        "dir": str(target),
        "files": [_file_info(f) for f in files],
        "categories": categories,
    }


def move_to_wework(filename: str, category: str = "") -> dict:
    """Move a file from ~/Downloads to ~/.wework/files/{category}/."""
    src = DOWNLOADS_DIR / filename
    if not src.exists():
        # Try as absolute path but only allow Downloads
        src = Path(filename)
        if not str(src).startswith(str(DOWNLOADS_DIR)):
            return {"ok": False, "error": f"File not found in Downloads: {filename}"}
        if not src.exists():
            return {"ok": False, "error": f"File not found: {filename}"}

    dest_dir = _ensure_dir(WEWORK_FILES_DIR / category if category else WEWORK_FILES_DIR)
    dest = dest_dir / src.name

    # Avoid overwrite — append suffix if exists
    if dest.exists():
        stem, suffix = src.stem, src.suffix
        i = 1
        while dest.exists():
            dest = dest_dir / f"{stem}_{i}{suffix}"
            i += 1

    shutil.move(str(src), str(dest))
    return {"ok": True, "moved_to": str(dest), "filename": dest.name}


def read_file_text(path: str, max_chars: int = 8000) -> dict:
    """Read text content of a file. Supports .txt, .md, .csv, .json, .pdf (basic)."""
    p = Path(path)
    # Safety: only allow files inside Downloads or wework files dir
    allowed = [str(DOWNLOADS_DIR), str(WEWORK_FILES_DIR)]
    if not any(str(p).startswith(a) for a in allowed):
        return {"ok": False, "error": "Access denied: path outside allowed directories"}
    if not p.exists():
        return {"ok": False, "error": f"File not found: {path}"}

    suffix = p.suffix.lower()
    try:
        if suffix == ".pdf":
            try:
                import pdfplumber
                with pdfplumber.open(p) as pdf:
                    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            except ImportError:
                return {"ok": False, "error": "PDF reading requires pdfplumber: pip install pdfplumber"}
        else:
            text = p.read_text(encoding="utf-8", errors="replace")

        truncated = len(text) > max_chars
        return {
            "ok": True,
            "path": str(p),
            "content": text[:max_chars],
            "truncated": truncated,
            "total_chars": len(text),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def delete_wework_file(path: str) -> dict:
    """Delete a file from ~/.wework/files/."""
    p = Path(path)
    if not str(p).startswith(str(WEWORK_FILES_DIR)):
        return {"ok": False, "error": "Can only delete files inside ~/.wework/files/"}
    if not p.exists():
        return {"ok": False, "error": f"File not found: {path}"}
    p.unlink()
    return {"ok": True, "deleted": str(p)}
