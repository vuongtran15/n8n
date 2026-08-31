#!/usr/bin/env python3
"""Machine-translate en.json → vi.json (deep-translator / Google). Resume-safe."""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator, MyMemoryTranslator

ROOT = Path(__file__).resolve().parents[2]
LOCALES = ROOT / "packages/frontend/@n8n/i18n/src/locales"
EN_PATH = LOCALES / "en.json"
VI_PATH = LOCALES / "vi.json"
LOG_PATH = Path(__file__).resolve().parent / "translate-vi.log"

BATCH_SIZE = 8
DELAY_SEC = 0.8
SAVE_EVERY = 50
MAX_RETRIES = 2


def make_translators() -> list:
    return [
        MyMemoryTranslator(source="en-GB", target="vi-VN"),
        GoogleTranslator(source="en", target="vi"),
    ]

PLACEHOLDER_RE = re.compile(r"\{[^}]+\}")


def log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def walk_leaves(root: dict) -> list[tuple[list[str], str]]:
    out: list[tuple[list[str], str]] = []

    def walk(node: dict, prefix: list[str]) -> None:
        for key, value in node.items():
            if isinstance(value, str):
                out.append((prefix + [key], value))
            elif isinstance(value, dict):
                walk(value, prefix + [key])

    walk(root, [])
    return out


def get_by_path(obj: dict, path: list[str]) -> object:
    cur: object = obj
    for part in path:
        if not isinstance(cur, dict):
            raise KeyError(".".join(path))
        cur = cur[part]
    return cur


def set_by_path(obj: dict, path: list[str], value: str) -> None:
    cur = obj
    for part in path[:-1]:
        cur = cur[part]
    cur[path[-1]] = value


def path_label(path: list[str]) -> str:
    return ".".join(path)


def should_skip(text: str) -> bool:
    if not text:
        return True
    if len(text) > 3500:
        return True
    if text.strip().startswith(("http://", "https://")):
        return True
    return False


def protect_placeholders(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        token = f"__PH{len(mapping)}__"
        mapping[token] = match.group(0)
        return token

    return PLACEHOLDER_RE.sub(repl, text), mapping


def restore_placeholders(text: str, mapping: dict[str, str]) -> str:
    for token, original in mapping.items():
        text = text.replace(token, original)
    return text


def translate_batch(translators: list, texts: list[str]) -> list[str]:
    last_exc: Exception | None = None
    for translator in translators:
        for attempt in range(MAX_RETRIES):
            try:
                return translator.translate_batch(texts)
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                wait = DELAY_SEC * (2**attempt)
                log(f"{translator.__class__.__name__} batch error ({exc!r}) — wait {wait:.1f}s")
                time.sleep(wait)

    results: list[str] = []
    for text in texts:
        translated = text
        for translator in translators:
            for attempt in range(2):
                try:
                    translated = translator.translate(text)
                    break
                except Exception as exc:  # noqa: BLE001
                    last_exc = exc
                    time.sleep(DELAY_SEC * (2**attempt))
            if translated != text:
                break
        results.append(translated)
        time.sleep(0.25)
    if last_exc:
        log(f"Some strings kept in English after errors ({last_exc!r})")
    return results


def main() -> int:
    if LOG_PATH.exists() and LOG_PATH.stat().st_size > 0:
        log("--- resume ---")
    else:
        LOG_PATH.write_text("", encoding="utf-8")
    en = json.loads(EN_PATH.read_text(encoding="utf-8"))
    vi = json.loads(VI_PATH.read_text(encoding="utf-8")) if VI_PATH.exists() else json.loads(
        EN_PATH.read_text(encoding="utf-8")
    )

    pending: list[tuple[list[str], str]] = []
    for path, en_val in walk_leaves(en):
        try:
            vi_val = get_by_path(vi, path)
        except KeyError:
            vi_val = None
        if vi_val is None or vi_val == en_val:
            pending.append((path, en_val))

    log(f"Total strings: {len(walk_leaves(en))}, pending: {len(pending)}")
    translators = make_translators()

    done = 0
    i = 0
    while i < len(pending):
        chunk = pending[i : i + BATCH_SIZE]
        batch_paths: list[list[str]] = []
        batch_texts: list[str] = []
        batch_maps: list[dict[str, str]] = []

        for path, raw in chunk:
            if should_skip(raw):
                set_by_path(vi, path, raw)
                done += 1
                continue
            protected, mapping = protect_placeholders(raw)
            batch_paths.append(path)
            batch_texts.append(protected)
            batch_maps.append(mapping)

        if batch_texts:
            results = translate_batch(translators, batch_texts)
            for path, result, mapping in zip(batch_paths, results, batch_maps, strict=True):
                en_val = get_by_path(en, path)
                translated = restore_placeholders(result or en_val, mapping)
                set_by_path(vi, path, translated)
            done += len(batch_paths)

        i += len(chunk)
        if done % SAVE_EVERY < BATCH_SIZE or i >= len(pending):
            VI_PATH.write_text(json.dumps(vi, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
            log(f"Progress: {done}/{len(pending)}")
        time.sleep(DELAY_SEC)

    # Language selector labels
    override_keys = {
        "settings.personal.language": "Ngôn ngữ",
        "settings.personal.language.en": "English",
        "settings.personal.language.zh": "中文",
        "settings.personal.language.vi": "Tiếng Việt",
    }
    top_level_keys = set(en.keys())
    for key, value in override_keys.items():
        if key in top_level_keys:
            vi[key] = value

    VI_PATH.write_text(json.dumps(vi, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
    log("vi.json complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
