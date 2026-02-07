/**
 * Jarvis Chat UI — self-contained HTML served from the server.
 *
 * No React. No build step. No node_modules in the browser.
 * One function returns the entire UI as a string.
 *
 * Features:
 *   - Streaming responses (SSE)
 *   - Tool call visibility (collapsible)
 *   - Canvas/generative UI rendered inline as iframes
 *   - Markdown rendering (basic)
 *   - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
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
    --bg: #09090b; --surface: #18181b; --border: #27272a;
    --text: #fafafa; --text-muted: #a1a1aa; --text-dim: #71717a;
    --accent: #3b82f6; --accent-dim: #1e3a5f;
    --green: #22c55e; --yellow: #eab308; --red: #ef4444;
    --radius: 12px; --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); }
  body { display: flex; flex-direction: column; }

  /* Header */
  header {
    padding: 16px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }
  header .logo {
    width: 36px; height: 36px; border-radius: 50%; background: var(--accent);
    display: grid; place-items: center; font-weight: 700; font-size: 14px; color: #fff;
  }
  header h1 { font-size: 18px; font-weight: 600; letter-spacing: 0.04em; }
  header .status { margin-left: auto; font-size: 12px; color: var(--text-dim); display: flex; align-items: center; gap: 6px; }
  header .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }

  /* Messages */
  #messages {
    flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px;
  }
  .msg { max-width: 720px; width: 100%; line-height: 1.6; }
  .msg.user { align-self: flex-end; }
  .msg.assistant { align-self: flex-start; }
  .msg .bubble {
    padding: 14px 18px; border-radius: var(--radius); font-size: 15px; white-space: pre-wrap; word-break: break-word;
  }
  .msg.user .bubble { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
  .msg.assistant .bubble { background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .msg .label { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .msg.user .label { text-align: right; }
  .msg .bubble strong { font-weight: 600; }
  .msg .bubble em { font-style: italic; }
  .msg .bubble code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: var(--mono); font-size: 0.9em; }
  .msg .bubble pre { background: #0d0d0d; border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin: 8px 0; overflow-x: auto; }
  .msg .bubble pre code { background: none; padding: 0; font-size: 13px; }
  .msg .bubble h1, .msg .bubble h2, .msg .bubble h3 { margin: 12px 0 4px; }
  .msg .bubble h1 { font-size: 1.3em; } .msg .bubble h2 { font-size: 1.15em; } .msg .bubble h3 { font-size: 1.05em; }
  .msg .bubble ul, .msg .bubble ol { padding-left: 20px; margin: 4px 0; }
  .msg .bubble a { color: var(--accent); text-decoration: underline; }

  /* Tool calls */
  .tool-call {
    margin-top: 8px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; font-size: 13px;
  }
  .tool-call summary {
    padding: 8px 12px; background: rgba(255,255,255,0.03); cursor: pointer; display: flex; align-items: center; gap: 8px;
    color: var(--text-muted); font-family: var(--mono); list-style: none;
  }
  .tool-call summary::before { content: "\\25B6"; font-size: 9px; transition: transform 0.15s; }
  .tool-call[open] summary::before { transform: rotate(90deg); }
  .tool-call .tool-icon { font-size: 14px; }
  .tool-call .tool-body { padding: 10px 12px; font-family: var(--mono); color: var(--text-dim); white-space: pre-wrap; max-height: 300px; overflow: auto; font-size: 12px; line-height: 1.5; }

  /* Canvas iframe */
  .canvas-frame {
    margin-top: 10px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
    width: 100%; height: 400px; background: #000;
  }
  .canvas-frame iframe { width: 100%; height: 100%; border: none; }

  /* Typing indicator */
  .typing { display: flex; gap: 4px; padding: 4px 0; }
  .typing span { width: 6px; height: 6px; background: var(--text-dim); border-radius: 50%; animation: blink 1.2s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }

  /* Input */
  #input-area {
    padding: 16px 24px; border-top: 1px solid var(--border); flex-shrink: 0;
    display: flex; gap: 10px; align-items: flex-end; max-width: 100%;
  }
  #input-area textarea {
    flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 12px 16px; color: var(--text); font-family: var(--font); font-size: 15px;
    resize: none; min-height: 48px; max-height: 160px; outline: none; line-height: 1.5;
  }
  #input-area textarea:focus { border-color: var(--accent); }
  #input-area textarea::placeholder { color: var(--text-dim); }
  #input-area button {
    background: var(--accent); color: #fff; border: none; border-radius: var(--radius);
    padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer; white-space: nowrap;
    transition: opacity 0.15s;
  }
  #input-area button:disabled { opacity: 0.4; cursor: not-allowed; }
  #input-area button:hover:not(:disabled) { opacity: 0.9; }

  /* Empty state */
  .empty {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; color: var(--text-dim); text-align: center; padding: 40px;
  }
  .empty .icon { font-size: 48px; opacity: 0.3; }
  .empty p { max-width: 420px; line-height: 1.6; font-size: 14px; }
  .empty .examples { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; justify-content: center; }
  .empty .examples button {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 8px 16px; color: var(--text-muted); font-size: 13px; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .empty .examples button:hover { border-color: var(--accent); color: var(--text); }
</style>
</head>
<body>

<header>
  <div class="logo">J</div>
  <h1>J.A.R.V.I.S.</h1>
  <div class="status"><div class="dot"></div> Online</div>
</header>

<div id="messages">
  <div class="empty">
    <div class="icon">&#9878;</div>
    <p>Good evening. I'm Jarvis, your AI assistant. I can search the web, analyze images, generate dashboards, monitor systems, and run research workflows. How can I help?</p>
    <div class="examples">
      <button onclick="sendExample(this)">Check system status</button>
      <button onclick="sendExample(this)">Search the web for Mastra AI</button>
      <button onclick="sendExample(this)">Show me a dashboard</button>
      <button onclick="sendExample(this)">Write a note for later</button>
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

// Auto-resize textarea
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
});

// Keyboard
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});

function sendExample(btn) { inputEl.value = btn.textContent; send(); }

function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

function formatMarkdown(text) {
  return text
    .replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
    .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
    .replace(/\\*(.+?)\\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\\/li>\\n?)+/g, "<ul>$&</ul>")
    .replace(/\\n/g, "<br>");
}

function addMessage(role, content) {
  // Remove empty state
  const empty = messagesEl.querySelector(".empty");
  if (empty) empty.remove();

  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = '<div class="label">' + (role === "user" ? "You" : "Jarvis") + '</div><div class="bubble">' + (role === "user" ? escapeHtml(content) : content) + "</div>";
  messagesEl.appendChild(div);
  scrollBottom();
  return div;
}

function escapeHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || busy) return;
  busy = true;
  sendBtn.disabled = true;
  inputEl.value = "";
  inputEl.style.height = "auto";

  addMessage("user", text);
  chatHistory.push({ role: "user", content: text });

  // Add assistant message with typing indicator
  const assistantDiv = addMessage("assistant", '<div class="typing"><span></span><span></span><span></span></div>');
  const bubble = assistantDiv.querySelector(".bubble");

  let fullText = "";

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
      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const eventLine = lines[lines.indexOf(line) - 1] || "";
          const eventType = eventLine.startsWith("event: ") ? eventLine.slice(7) : "text";
          const raw = line.slice(6);

          try {
            const data = JSON.parse(raw);

            if (eventType === "text" || (!eventLine.startsWith("event:") && data.text)) {
              fullText += data.text || "";
              bubble.innerHTML = formatMarkdown(fullText);
              scrollBottom();
            }

            if (eventType === "tool" || data.name) {
              const toolName = data.name || "tool";
              const details = document.createElement("details");
              details.className = "tool-call";
              details.innerHTML =
                '<summary><span class="tool-icon">&#9881;</span> ' + escapeHtml(toolName) + "</summary>" +
                '<div class="tool-body">' + escapeHtml(JSON.stringify(data.result || data.args || data, null, 2)) + "</div>";
              bubble.appendChild(details);
              scrollBottom();
            }

            if (eventType === "canvas" && data.html) {
              const frame = document.createElement("div");
              frame.className = "canvas-frame";
              const iframe = document.createElement("iframe");
              iframe.srcdoc = data.html;
              iframe.sandbox = "allow-scripts";
              frame.appendChild(iframe);
              bubble.appendChild(frame);
              scrollBottom();
            }

            if (eventType === "error") {
              bubble.innerHTML = '<span style="color:var(--red)">Error: ' + escapeHtml(data.error || "Unknown error") + "</span>";
            }
          } catch {}
        }
      }
    }

    // Final cleanup — if no text streamed, show a fallback
    if (!fullText && !bubble.querySelector(".tool-call") && !bubble.querySelector(".canvas-frame")) {
      bubble.innerHTML = '<span style="color:var(--text-dim)">No response received. Check that an LLM API key is set in .env</span>';
    } else if (fullText) {
      bubble.innerHTML = formatMarkdown(fullText);
      // Re-append tool calls and canvases
    }

  } catch (err) {
    bubble.innerHTML = '<span style="color:var(--red)">Connection error: ' + escapeHtml(err.message || String(err)) + "</span>";
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
