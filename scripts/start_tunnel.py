#!/usr/bin/env python3
"""
SSH Tunnel Helper Script for CE Database Admin (Group 2)
Forwards localhost:5432 -> 192.168.100.102:5432 via SSH (172.16.10.200:2202)
"""

import os
import pty
import select
import sys
import time

SSH_HOST = "172.16.10.200"
SSH_PORT = "2202"
SSH_USER = "root"
SSH_PASS = "admince04"
LOCAL_PORT = "5432"
REMOTE_HOST = "127.0.0.1"
REMOTE_PORT = "5432"

print(f"Connecting to {SSH_HOST}:{SSH_PORT} to forward port {LOCAL_PORT} -> {REMOTE_HOST}:{REMOTE_PORT}...")

pid, fd = pty.fork()
if pid == 0:
    os.execlp(
        "ssh",
        "ssh",
        "-N",
        "-L",
        f"{LOCAL_PORT}:{REMOTE_HOST}:{REMOTE_PORT}",
        "-p",
        SSH_PORT,
        "-o",
        "StrictHostKeyChecking=no",
        f"{SSH_USER}@{SSH_HOST}",
    )
else:
    sent = False
    try:
        while True:
            r, _, _ = select.select([fd, sys.stdin.fileno()], [], [], 1)
            if fd in r:
                chunk = os.read(fd, 1024)
                if not chunk:
                    break
                sys.stdout.write(chunk.decode("utf-8", errors="ignore"))
                sys.stdout.flush()
                if b"password:" in chunk.lower() and not sent:
                    time.sleep(0.5)
                    os.write(fd, (SSH_PASS + "\n").encode())
                    sent = True
                    print(f"\n[+] SSH Tunnel established on localhost:{LOCAL_PORT}!")
    except KeyboardInterrupt:
        print("\nStopping SSH tunnel...")
