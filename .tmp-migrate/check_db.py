import psycopg

old = dict(host="localhost", port=5432, dbname="n8n_db", user="ktuser", password="kt123qwe***")
new = dict(host="172.19.18.46", port=5432, dbname="rm_workflow", user="rm_workflow", password="123qwe***")

for name, cfg in [("OLD", old), ("NEW", new)]:
    try:
        with psycopg.connect(**cfg, connect_timeout=8) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database(), current_user")
                row = cur.fetchone()
                cur.execute(
                    """
                    SELECT count(*) FROM information_schema.tables
                    WHERE table_schema='public' AND table_type='BASE TABLE'
                    """
                )
                n = cur.fetchone()[0]
                print(f"{name}: OK db={row[0]} user={row[1]} tables={n}")
    except Exception as e:
        print(f"{name}: FAIL {type(e).__name__}: {e}")
