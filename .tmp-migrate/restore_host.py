"""Restore pg_dump plain SQL on Windows host (COPY + dollar-quoted functions)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import psycopg

DUMP = Path(r"d:\CODE\N8N\n8n\.tmp-migrate\n8n.sql")
DSN = {
    "host": "172.19.18.46",
    "port": 5432,
    "dbname": "rm_workflow",
    "user": "rm_workflow",
    "password": "123qwe***",
}

DOLLAR = re.compile(r"\$([A-Za-z0-9_]*)\$")


def iter_statements(text: str):
    """Yield SQL statements; yield ('copy', header, body) for COPY FROM stdin blocks."""
    lines = text.splitlines(keepends=True)
    buf: list[str] = []
    i = 0
    in_dollar: str | None = None

    while i < len(lines):
        line = lines[i]

        # psql meta-commands
        if not buf and not in_dollar and line.startswith("\\"):
            i += 1
            continue

        # COPY ... FROM stdin;
        if (
            not buf
            and not in_dollar
            and line.upper().startswith("COPY ")
            and "FROM stdin" in line
        ):
            header = line.strip()
            i += 1
            body_lines: list[str] = []
            while i < len(lines):
                row = lines[i]
                i += 1
                if row.strip() == "\\.":
                    break
                body_lines.append(row)
            yield ("copy", header, "".join(body_lines))
            continue

        # track dollar-quotes across the line
        pos = 0
        while True:
            m = DOLLAR.search(line, pos)
            if not m:
                break
            tag = m.group(0)
            if in_dollar is None:
                in_dollar = tag
            elif in_dollar == tag:
                in_dollar = None
            pos = m.end()

        buf.append(line)
        if in_dollar is None and line.rstrip().endswith(";"):
            sql = "".join(buf).strip()
            buf = []
            if sql:
                yield ("sql", sql, "")
        i += 1

    tail = "".join(buf).strip()
    if tail:
        yield ("sql", tail, "")


def restore(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    statements = copies = errors = 0

    with psycopg.connect(**DSN, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA IF EXISTS public CASCADE")
            cur.execute("CREATE SCHEMA public")
            cur.execute("GRANT ALL ON SCHEMA public TO CURRENT_USER")
            cur.execute("GRANT ALL ON SCHEMA public TO public")

        for kind, a, b in iter_statements(text):
            try:
                if kind == "sql":
                    with conn.cursor() as cur:
                        cur.execute(a)
                    statements += 1
                else:
                    with conn.cursor() as cur:
                        with cur.copy(a) as copy:
                            if b:
                                copy.write(b)
                    copies += 1
                    if copies % 25 == 0:
                        print(f"... copies={copies} sql={statements}", flush=True)
            except Exception as e:
                errors += 1
                preview = (a[:120] + "...") if len(a) > 120 else a
                print(f"WARN [{kind}] {type(e).__name__}: {e}\n  {preview}", flush=True)
                if errors > 30:
                    raise RuntimeError("Too many errors, aborting") from e

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema='public' AND table_type='BASE TABLE'
                """
            )
            tables = cur.fetchone()[0]

    print(f"DONE sql={statements} copies={copies} errors={errors} tables={tables}", flush=True)


if __name__ == "__main__":
    print(f"Restoring {DUMP} ({DUMP.stat().st_size} bytes) -> {DSN['host']}/{DSN['dbname']}")
    restore(DUMP)
