#!/usr/bin/env python3
"""Deploy sms-proxy to AlmaLinux VPS via SSH/SFTP."""
from __future__ import annotations

import argparse
import os
import stat
import subprocess
import sys
import textwrap


def ensure_paramiko():
    try:
        import paramiko  # noqa: F401
        return
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])


def main() -> int:
    ensure_paramiko()
    import paramiko

    p = argparse.ArgumentParser()
    p.add_argument("--host", required=True)
    p.add_argument("--user", default="root")
    p.add_argument("--password", required=True)
    p.add_argument("--domain", default="sms.crewplay.tw")
    p.add_argument("--sms-dir", required=True)
    args = p.parse_args()

    app_dir = "/opt/crewplay-sms-proxy"
    sms_dir = os.path.abspath(args.sms_dir)
    env_path = os.path.join(sms_dir, ".env")
    if not os.path.isfile(env_path):
        print(f"Missing {env_path}", file=sys.stderr)
        return 1

    files = [
        ("server.mjs", "server.mjs"),
        (".env", ".env"),
        ("deploy/crewplay-sms-proxy.service", "deploy/crewplay-sms-proxy.service"),
        ("deploy/nginx-sms.conf.example", "deploy/nginx-sms.conf.example"),
        ("deploy/install-remote.sh", "deploy/install-remote.sh"),
    ]

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {args.user}@{args.host}...")
    client.connect(args.host, username=args.user, password=args.password, timeout=30)

    sftp = client.open_sftp()

    def mkdir_p(remote: str) -> None:
        parts = remote.strip("/").split("/")
        cur = ""
        for part in parts:
            cur += "/" + part
            try:
                sftp.mkdir(cur)
            except OSError:
                pass

    mkdir_p(app_dir)
    mkdir_p(f"{app_dir}/deploy")

    for local_rel, remote_rel in files:
        local = os.path.join(sms_dir, local_rel.replace("/", os.sep))
        remote = f"{app_dir}/{remote_rel}"
        print(f"Upload {local_rel} -> {remote}")
        sftp.put(local, remote)
        if local_rel == ".env" or local_rel.endswith(".sh"):
            sftp.chmod(remote, stat.S_IRUSR | stat.S_IWUSR)

    sftp.chmod(f"{app_dir}/deploy/install-remote.sh", stat.S_IRWXU)

    cmd = textwrap.dedent(
        f"""
        set -e
        export SMS_DOMAIN={args.domain}
        export CERTBOT_EMAIL=crew.matchplay@gmail.com
        bash {app_dir}/deploy/install-remote.sh
        """
    ).strip()
    print("Running remote install...")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=900)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(out)
    if err.strip():
        print(err, file=sys.stderr)
    client.close()
    if code != 0:
        print(f"Remote install failed (exit {code})", file=sys.stderr)
        return code
    print("Deploy complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
