"""Restore INSERT-style pg_dump plain SQL via host psycopg."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import psycopg

DUMP = Path(r"d:\CODE\N8N\n8n\.tmp-migrate\n8n_inserts.sql")
DSN = {
    "host": "172.19.18.46",
    "port": 5432,
    "dbname": "rm_workflow",
    "user": "rm_workflow",
    "password": "123qwe***",
}

DOLLAR = re.compile(r"\$([A-Za-z0-9_]*)\$")


def iter_statements(text: str):
    buf: list[str] = []
    in_dollar: str | None = None
    for line in text.splitlines(keepends=True):
        if line.startswith("\\"):
            continue
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
                yield sql
    tail = "".join(buf).strip()
    if tail:
        yield tail


def restore(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    ok = err = 0
    with psycopg.connect(**DSN, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA IF EXISTS public CASCADE")
            cur.execute("CREATE SCHEMA public")
            cur.execute("GRANT ALL ON SCHEMA public TO CURRENT_USER")
            cur.execute("GRANT ALL ON SCHEMA public TO public")

        for sql in iter_statements(text):
            try:
                with conn.cursor() as cur:
                    cur.execute(sql)
                ok += 1
                if ok % 500 == 0:
                    print(f"... ok={ok}", flush=True)
            except Exception as e:
                err += 1
                preview = sql.replace("\n", " ")[:140]
                print(f"WARN {type(e).__name__}: {e} | {preview}", flush=True)
                if err > 50:
                    raise RuntimeError("Too many errors") from e

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema='public' AND table_type='BASE TABLE'
                """
            )
            tables = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM public.workflow_entity")
            workflows = cur.fetchone()[0]

    print(f"DONE ok={ok} err={err} tables={tables} workflows={workflows}", flush=True)


if __name__ == "__main__":
    print(f"Restoring {DUMP} ({DUMP.stat().st_size} bytes) -> {DSN['host']}/{DSN['dbname']}")
    restore(DUMP)
