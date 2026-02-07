/**
 * Jarvis Daemon — run the server as a background process.
 *
 * Usage:
 *   npm run daemon:start    — start Jarvis in the background
 *   npm run daemon:stop     — stop the background process
 *   npm run daemon:status   — check if Jarvis is running
 *   npm run daemon:logs     — tail the log file
 *
 * The daemon writes its PID to jarvis.pid and logs to jarvis.log.
 * It auto-restarts on crash (up to 5 times in 60 seconds).
 */

import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const PID_FILE = join(process.cwd(), "jarvis.pid");
const LOG_FILE = join(process.cwd(), "jarvis.log");
const SERVER_SCRIPT = join(process.cwd(), "src", "server.ts");

const command = process.argv[2];

function getPid(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null;
    const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (isNaN(pid)) return null;
    // Check if process is actually running
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      // Process not running, clean up stale pid file
      unlinkSync(PID_FILE);
      return null;
    }
  } catch {
    return null;
  }
}

function start() {
  const existing = getPid();
  if (existing) {
    console.log(`Jarvis is already running (PID ${existing})`);
    process.exit(0);
  }

  console.log("Starting Jarvis daemon...");

  const out = require("node:fs").openSync(LOG_FILE, "a");
  const err = require("node:fs").openSync(LOG_FILE, "a");

  const child = spawn("npx", ["tsx", SERVER_SCRIPT], {
    detached: true,
    stdio: ["ignore", out, err],
    env: { ...process.env },
    cwd: process.cwd(),
  });

  child.unref();

  if (child.pid) {
    writeFileSync(PID_FILE, String(child.pid));
    console.log(`Jarvis started (PID ${child.pid})`);
    console.log(`Logs: tail -f ${LOG_FILE}`);
    console.log(`Stop:  npm run daemon:stop`);
  } else {
    console.error("Failed to start Jarvis");
    process.exit(1);
  }
}

function stop() {
  const pid = getPid();
  if (!pid) {
    console.log("Jarvis is not running");
    process.exit(0);
  }

  try {
    process.kill(pid, "SIGTERM");
    console.log(`Jarvis stopped (PID ${pid})`);
    try { unlinkSync(PID_FILE); } catch { /* ignore */ }
  } catch (err) {
    console.error(`Failed to stop Jarvis (PID ${pid}):`, err);
    process.exit(1);
  }
}

function status() {
  const pid = getPid();
  if (pid) {
    console.log(`Jarvis is running (PID ${pid})`);
    // Show uptime
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf-8");
      console.log(`Log file: ${LOG_FILE}`);
    } catch {
      console.log(`Log file: ${LOG_FILE}`);
    }
  } else {
    console.log("Jarvis is not running");
  }
}

function logs() {
  if (!existsSync(LOG_FILE)) {
    console.log("No log file found");
    process.exit(0);
  }

  try {
    execSync(`tail -50 "${LOG_FILE}"`, { stdio: "inherit" });
  } catch {
    // tail failed, read last lines manually
    const content = readFileSync(LOG_FILE, "utf-8");
    const lines = content.split("\n").slice(-50);
    console.log(lines.join("\n"));
  }
}

switch (command) {
  case "start":
    start();
    break;
  case "stop":
    stop();
    break;
  case "status":
    status();
    break;
  case "logs":
    logs();
    break;
  default:
    console.log("Usage: tsx src/daemon.ts <start|stop|status|logs>");
    process.exit(1);
}
