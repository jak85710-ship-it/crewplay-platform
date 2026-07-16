/**
 * Deploy sms-proxy to VPS via SSH/SFTP (Node.js + ssh2)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "ssh2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    host: "103.144.33.38",
    user: "root",
    password: "",
    domain: "sms.crewplay.tw",
    smsDir: path.join(__dirname, "../sms-proxy"),
  };
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i]?.replace(/^--/, "");
    const v = args[i + 1];
    if (k && v) opts[k === "sms-dir" ? "smsDir" : k] = v;
  }
  return opts;
}

function exec(conn, cmd, timeout = 900000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: true }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream
        .on("data", (d) => {
          const s = d.toString();
          out += s;
          process.stdout.write(s);
        })
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
      stream.on("close", (code) => {
        if (code === 0) resolve(out);
        else reject(new Error(`Command failed (${code}): ${cmd}`));
      });
    });
    setTimeout(() => reject(new Error("Timeout")), timeout);
  });
}

function put(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

function mkdir(sftp, remote) {
  return new Promise((resolve) => {
    sftp.mkdir(remote, () => resolve());
  });
}

async function main() {
  const opts = parseArgs();
  if (!opts.password) {
    console.error("Missing --password");
    process.exit(1);
  }

  const appDir = "/opt/crewplay-sms-proxy";
  const files = [
    ["server.mjs", "server.mjs"],
    [".env", ".env"],
    ["deploy/crewplay-sms-proxy.service", "deploy/crewplay-sms-proxy.service"],
    ["deploy/nginx-sms.conf.example", "deploy/nginx-sms.conf.example"],
    ["deploy/install-remote.sh", "deploy/install-remote.sh"],
  ];

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({
        host: opts.host,
        port: 22,
        username: opts.user,
        password: opts.password,
        readyTimeout: 30000,
      });
  });

  console.log(`Connected to ${opts.host}`);

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });

  await mkdir(sftp, appDir);
  await mkdir(sftp, `${appDir}/deploy`);

  for (const [rel, remoteRel] of files) {
    const local = path.join(opts.smsDir, rel);
    const remote = `${appDir}/${remoteRel}`;
    console.log(`Upload ${rel} -> ${remote}`);
    await put(sftp, local, remote);
  }

  await exec(
    conn,
    `sed -i 's/\\r$//' ${appDir}/deploy/install-remote.sh && chmod 600 ${appDir}/.env && chmod +x ${appDir}/deploy/install-remote.sh && SMS_DOMAIN=${opts.domain} CERTBOT_EMAIL=crew.matchplay@gmail.com bash ${appDir}/deploy/install-remote.sh`
  );

  conn.end();
  console.log("\nDeploy complete.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
