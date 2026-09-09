import psycopg

DSN = dict(host="172.19.18.46", port=5432, dbname="rm_workflow", user="rm_workflow", password="123qwe***")

with psycopg.connect(**DSN) as c:
    with c.cursor() as cur:
        cur.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name='execution_entity' ORDER BY ordinal_position
            """
        )
        print("execution_entity cols:", [r[0] for r in cur.fetchall()])

        cur.execute('SELECT id, status, finished, mode, "workflowId" FROM execution_entity WHERE id = %s', ("317962",))
        print("execution 317962:", cur.fetchone())

        cur.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name='execution_data' ORDER BY ordinal_position
            """
        )
        cols = [r[0] for r in cur.fetchall()]
        print("execution_data cols:", cols)

        cur.execute('SELECT count(*) FROM execution_data WHERE "executionId" = %s', ("317962",))
        print("execution_data for 317962:", cur.fetchone()[0])

        cur.execute(
            """
            SELECT id, status, mode FROM execution_entity
            WHERE status IN ('new','running','waiting')
            ORDER BY id DESC LIMIT 20
            """
        )
        print("active-ish executions:", cur.fetchall())

        cur.execute("SELECT max(id::bigint), count(*) FROM execution_entity")
        print("max/count executions:", cur.fetchone())
