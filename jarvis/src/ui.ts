/**
 * Jarvis Chat UI — self-contained HTML.
 *
 * No React. No build step. One function returns the entire UI.
 *
 * Features:
 *   - Streaming SSE responses
 *   - Tool calls shown as collapsible cards with status badges
 *   - Canvas/generative UI rendered inline as sandboxed iframes
 *   - Voice: speak button reads Jarvis's response aloud via /api/voice/speak
 *   - Conversation threads with memory (threadId per session)
 *   - Markdown rendering
 */

export function chatUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>J.A.R.V.I.S.</title>
<style>
  :root {
    --bg: #09090b; --surface: #18181b; --surface2: #1f1f23; --border: #27272a;
    --text: #fafafa; --text-muted: #a1a1aa; --text-dim: #71717a;
    --accent: #3b82f6; --accent-hover: #2563eb;
    --green: #22c55e; --yellow: #eab308; --red: #ef4444; --purple: #a855f7;
    --radius: 12px;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); }
  body { display: flex; flex-direction: column; }

  header {
    padding: 14px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0; background: var(--bg);
  }
  header .logo {
    width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--purple));
    display: grid; place-items: center; font-weight: 700; font-size: 13px; color: #fff;
  }
  header h1 { font-size: 16px; font-weight: 600; letter-spacing: 0.06em; }
  header .meta { margin-left: auto; display: flex; align-items: center; gap: 12px; }
  header .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
  header .status-text { font-size: 11px; color: var(--text-dim); }
  header .thread-label { font-size: 11px; color: var(--text-dim); font-family: var(--mono); }

  #messages {
    flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 12px;
    scroll-behavior: smooth;
  }
  .msg { max-width: 760px; width: 100%; line-height: 1.6; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .msg.user { align-self: flex-end; }
  .msg.assistant { align-self: flex-start; }

  .msg .bubble {
    padding: 12px 16px; border-radius: var(--radius); font-size: 14px;
    white-space: pre-wrap; word-break: break-word;
  }
  .msg.user .bubble { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
  .msg.assistant .bubble { background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .msg .label { font-size: 10px; color: var(--text-dim); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .msg.user .label { justify-content: flex-end; }

  /* Markdown in bubbles */
  .msg .bubble strong { font-weight: 600; }
  .msg .bubble em { font-style: italic; }
  .msg .bubble code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; font-family: var(--mono); font-size: 0.88em; }
  .msg .bubble pre { background: #0d0d0f; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin: 6px 0; overflow-x: auto; }
  .msg .bubble pre code { background: none; padding: 0; font-size: 12px; }
  .msg .bubble h1 { font-size: 1.2em; margin: 10px 0 4px; } .msg .bubble h2 { font-size: 1.1em; margin: 8px 0 4px; } .msg .bubble h3 { font-size: 1.02em; margin: 6px 0 3px; }
  .msg .bubble ul, .msg .bubble ol { padding-left: 18px; margin: 3px 0; }
  .msg .bubble p { margin: 4px 0; }

  /* Tool calls */
  .tool-call {
    margin-top: 8px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; font-size: 12px;
  }
  .tool-call summary {
    padding: 7px 10px; background: var(--surface2); cursor: pointer; display: flex; align-items: center; gap: 6px;
    color: var(--text-muted); font-family: var(--mono); list-style: none; font-size: 12px;
  }
  .tool-call summary::before { content: "\\25B6"; font-size: 8px; transition: transform 0.15s; }
  .tool-call[open] summary::before { transform: rotate(90deg); }
  .tool-badge {
    display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;
    background: rgba(59,130,246,0.15); color: var(--accent);
  }
  .tool-call .tool-body {
    padding: 8px 10px; font-family: var(--mono); color: var(--text-dim); white-space: pre-wrap;
    max-height: 250px; overflow: auto; font-size: 11px; line-height: 1.5; border-top: 1px solid var(--border);
  }

  /* Canvas */
  .canvas-frame {
    margin-top: 8px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
    width: 100%; height: 420px; background: #000;
  }
  .canvas-frame iframe { width: 100%; height: 100%; border: none; }

  /* Voice button on assistant messages */
  .speak-btn {
    background: none; border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px;
    color: var(--text-dim); cursor: pointer; font-size: 12px; margin-top: 6px; transition: all 0.15s;
  }
  .speak-btn:hover { border-color: var(--accent); color: var(--accent); }
  .speak-btn.playing { border-color: var(--green); color: var(--green); }

  /* Typing */
  .typing { display: inline-flex; gap: 3px; padding: 2px 0; }
  .typing span { width: 5px; height: 5px; background: var(--text-dim); border-radius: 50%; animation: blink 1.2s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%, 60%, 100% { opacity: 0.2; } 30% { opacity: 1; } }

  /* Input */
  #input-area {
    padding: 14px 24px; border-top: 1px solid var(--border); flex-shrink: 0;
    display: flex; gap: 8px; align-items: flex-end;
  }
  #input-area textarea {
    flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 10px 14px; color: var(--text); font-family: var(--font); font-size: 14px;
    resize: none; min-height: 44px; max-height: 140px; outline: none; line-height: 1.4;
  }
  #input-area textarea:focus { border-color: var(--accent); }
  #input-area textarea::placeholder { color: var(--text-dim); }
  #input-area button {
    background: var(--accent); color: #fff; border: none; border-radius: var(--radius);
    padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
  }
  #input-area button:disabled { opacity: 0.35; cursor: not-allowed; }
  #input-area button:hover:not(:disabled) { background: var(--accent-hover); }

  /* Empty state */
  .empty {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; color: var(--text-dim); text-align: center; padding: 40px;
  }
  .empty .icon { font-size: 40px; opacity: 0.25; }
  .empty p { max-width: 440px; line-height: 1.6; font-size: 13px; }
  .empty .examples { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; justify-content: center; }
  .empty .examples button {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 7px 14px; color: var(--text-muted); font-size: 12px; cursor: pointer;
  }
  .empty .examples button:hover { border-color: var(--accent); color: var(--text); }
</style>
</head>
<body>

<header>
  <div class="logo">J</div>
  <h1>J.A.R.V.I.S.</h1>
  <div class="meta">
    <div class="dot"></div>
    <span class="status-text">Online</span>
  </div>
</header>

<div id="messages">
  <div class="empty">
    <div class="icon">&#9878;</div>
    <p>Good evening. I'm Jarvis. I can search the web, analyze images, generate dashboards, monitor systems, and remember our conversations. How may I assist you?</p>
    <div class="examples">
      <button onclick="sendExample(this)">Check system status</button>
      <button onclick="sendExample(this)">Search the web for Mastra AI framework</button>
      <button onclick="sendExample(this)">Show me a dashboard of system metrics</button>
      <button onclick="sendExample(this)">Write a note reminding me to review the project</button>
    </div>
  </div>
</div>

<div id="input-area">
  <textarea id="input" placeholder="Message Jarvis..." rows="1"></textarea>
  <button id="send" onclick="send()">Send</button>
</div>

<script>
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
let busy = false;
const threadId = "thread-" + crypto.randomUUID();
const chatHistory = [];

inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + "px";
});
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});

function sendExample(btn) { inputEl.value = btn.textContent; send(); }
function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }
function escapeHtml(t) { return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function formatMarkdown(text) {
  return text
    .replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>')
    .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
    .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
    .replace(/\\*(.+?)\\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[\\-\\*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\\/li>\\n?)+/g, "<ul>$&</ul>")
    .replace(/\\n/g, "<br>");
}

function addMessage(role, html) {
  const empty = messagesEl.querySelector(".empty");
  if (empty) empty.remove();
  const div = document.createElement("div");
  div.className = "msg " + role;
  const label = role === "user" ? "You" : "Jarvis";
  div.innerHTML = '<div class="label">' + label + '</div><div class="bubble">' + html + "</div>";
  messagesEl.appendChild(div);
  scrollBottom();
  return div;
}

function addToolCall(bubble, name, result) {
  const d = document.createElement("details");
  d.className = "tool-call";
  const displayName = name.replace(/Tool$/, "").replace(/([A-Z])/g, " $1").trim();
  d.innerHTML =
    '<summary><span class="tool-badge">' + escapeHtml(displayName) + '</span></summary>' +
    '<div class="tool-body">' + escapeHtml(JSON.stringify(result, null, 2).slice(0, 2000)) + '</div>';
  bubble.appendChild(d);
  scrollBottom();
}

function addCanvas(bubble, html) {
  const frame = document.createElement("div");
  frame.className = "canvas-frame";
  const iframe = document.createElement("iframe");
  iframe.srcdoc = html;
  iframe.sandbox = "allow-scripts";
  frame.appendChild(iframe);
  bubble.appendChild(frame);
  scrollBottom();
}

function addSpeakButton(bubble, text) {
  const btn = document.createElement("button");
  btn.className = "speak-btn";
  btn.innerHTML = "&#9834; Speak";
  btn.onclick = async () => {
    if (btn.classList.contains("playing")) return;
    btn.classList.add("playing");
    btn.innerHTML = "&#9834; Speaking...";
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1000) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => { btn.classList.remove("playing"); btn.innerHTML = "&#9834; Speak"; URL.revokeObjectURL(url); };
      audio.onerror = () => { btn.classList.remove("playing"); btn.innerHTML = "&#9834; Speak"; };
      audio.play();
    } catch (err) {
      btn.classList.remove("playing");
      btn.innerHTML = "&#9834; Speak";
      console.warn("TTS error:", err);
    }
  };
  bubble.appendChild(btn);
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || busy) return;
  busy = true;
  sendBtn.disabled = true;
  inputEl.value = "";
  inputEl.style.height = "auto";

  addMessage("user", escapeHtml(text));
  chatHistory.push({ role: "user", content: text });

  const assistantDiv = addMessage("assistant", '<div class="typing"><span></span><span></span><span></span></div>');
  const bubble = assistantDiv.querySelector(".bubble");
  let fullText = "";
  let hasContent = false;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory, threadId }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      while (buffer.includes("\\n\\n")) {
        const idx = buffer.indexOf("\\n\\n");
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        let event = "message";
        let data = "";
        for (const line of block.split("\\n")) {
          if (line.startsWith("event: ")) event = line.slice(7);
          else if (line.startsWith("data: ")) data = line.slice(6);
        }

        if (!data) continue;
        try {
          const parsed = JSON.parse(data);

          if (event === "text" && parsed.text) {
            if (!hasContent) { bubble.innerHTML = ""; hasContent = true; }
            fullText += parsed.text;
            bubble.innerHTML = formatMarkdown(fullText);
            scrollBottom();
          }

          if (event === "tool") {
            if (!hasContent) { bubble.innerHTML = ""; hasContent = true; }
            addToolCall(bubble, parsed.name || "tool", parsed.result || parsed.args || {});
          }

          if (event === "canvas" && parsed.html) {
            if (!hasContent) { bubble.innerHTML = ""; hasContent = true; }
            addCanvas(bubble, parsed.html);
          }

          if (event === "error") {
            bubble.innerHTML = '<span style="color:var(--red)">Error: ' + escapeHtml(parsed.error || "Unknown") + '</span>';
            hasContent = true;
          }

          if (event === "done") {
            chatHistory.push({ role: "assistant", content: fullText || "[tool use]" });
          }
        } catch {}
      }
    }

    if (!hasContent) {
      bubble.innerHTML = '<span style="color:var(--text-dim)">No response. Check your LLM API key in .env</span>';
    }

    // Add speak button if there's text
    if (fullText.length > 10) {
      addSpeakButton(bubble, fullText);
    }

  } catch (err) {
    bubble.innerHTML = '<span style="color:var(--red)">Connection error: ' + escapeHtml(err.message || String(err)) + '</span>';
  }

  busy = false;
  sendBtn.disabled = false;
  inputEl.focus();
}

inputEl.focus();
</script>
</body>
</html>`;
}
