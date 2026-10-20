from typing import Any

import psycopg

from app.config import Settings


class DatabaseConnectionError(Exception):
    """Database is unreachable or query failed."""


ROLE_MAP = {
    "STUDENT": "student",
    "PROFESSOR": "teacher",
    "ADMIN": "admin",
    "STAFF": "staff",
}


def normalize_role(role_code: str | None) -> str:
    if not role_code:
        return "student"
    return ROLE_MAP.get(role_code.upper(), role_code.lower())


def get_user_profile(username: str, settings: Settings) -> dict[str, Any] | None:
    """Fetch user profile and role from Group 2 PostgreSQL database.

    Returns None if db_host is not configured.
    """
    if not settings.db_host:
        return None

    # ponytail: connect per request is sufficient for auth-api load; add connection pool if concurrency exceeds 50
    try:
        with psycopg.connect(
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password.get_secret_value(),
            connect_timeout=int(settings.db_timeout),
        ) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        u.user_id::text,
                        u.username,
                        r.role_code,
                        u.is_active,
                        u.prefix_th,
                        u.first_name_th,
                        u.last_name_th
                    FROM public.users AS u
                    JOIN public.roles AS r ON r.role_id = u.role_id
                    WHERE u.username = %s;
                    """,
                    (username,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return {
                    "user_id": row[0],
                    "username": row[1],
                    "role": normalize_role(row[2]),
                    "raw_role": row[2],
                    "is_active": bool(row[3]),
                    "prefix_th": row[4],
                    "first_name_th": row[5],
                    "last_name_th": row[6],
                }
    except psycopg.Error as exc:
        raise DatabaseConnectionError(f"Database error: {exc}") from exc
