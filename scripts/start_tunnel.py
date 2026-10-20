#!/usr/bin/env python3
"""University LAN: forward local PostgreSQL through the group 2 VM.
SSH prompts for its password and verifies the host key normally.
"""
import os

os.execvp("ssh", [
    "ssh", "-N", "-L", "127.0.0.1:5432:127.0.0.1:5432",
    "-p", "2202", "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=30", "root@172.16.10.200",
])
