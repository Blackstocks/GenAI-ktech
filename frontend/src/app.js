import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

// ─── Icons ────────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
);

const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    <circle cx="9" cy="16" r="1" fill="currentColor"/>
    <circle cx="15" cy="16" r="1" fill="currentColor"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} .sp{transform-origin:center;animation:spin 0.7s linear infinite}`}</style>
    <path className="sp" d="M12 2a10 10 0 0 1 10 10"/>
  </svg>
);

// ─── Typing dots ──────────────────────────────────────────────────────────────
const TypingDots = () => (
  <span className="typing-dots">
    <span /><span /><span />
  </span>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [pdfs, setPdfs] = useState([]);           // { name, chunks }
  const [activePdf, setActivePdf] = useState(null);
  const [messages, setMessages] = useState({});   // { filename: [ {role, text} ] }
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const activeMessages = activePdf ? (messages[activePdf] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, thinking]);

  useEffect(() => {
    if (activePdf) inputRef.current?.focus();
  }, [activePdf]);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setUploadError("Please upload a valid PDF file.");
      return;
    }
    if (pdfs.find(p => p.name === file.name)) {
      setUploadError(`"${file.name}" is already uploaded.`);
      return;
    }

    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      const newPdf = { name: data.filename, chunks: data.chunks };

      setPdfs(prev => [...prev, newPdf]);
      setActivePdf(data.filename);
      setMessages(prev => ({ ...prev, [data.filename]: [] }));
    } catch (err) {
      setUploadError("Upload failed. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const onFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // ── Remove PDF ──────────────────────────────────────────────────────────────
  const removePdf = (name, e) => {
    e.stopPropagation();
    setPdfs(prev => prev.filter(p => p.name !== name));
    setMessages(prev => { const m = { ...prev }; delete m[name]; return m; });
    if (activePdf === name) {
      const remaining = pdfs.filter(p => p.name !== name);
      setActivePdf(remaining.length > 0 ? remaining[remaining.length - 1].name : null);
    }
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const question = input.trim();
    if (!question || !activePdf || thinking) return;

    const userMsg = { role: "user", text: question };
    setMessages(prev => ({
      ...prev,
      [activePdf]: [...(prev[activePdf] || []), userMsg],
    }));
    setInput("");
    setThinking(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: activePdf, question }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      const botMsg = { role: "bot", text: data.answer };

      setMessages(prev => ({
        ...prev,
        [activePdf]: [...(prev[activePdf] || []), botMsg],
      }));
    } catch {
      const errMsg = { role: "bot", text: "Something went wrong. Please try again.", error: true };
      setMessages(prev => ({
        ...prev,
        [activePdf]: [...(prev[activePdf] || []), errMsg],
      }));
    } finally {
      setThinking(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0f0f13;
          color: #e8e8f0;
          height: 100vh;
          overflow: hidden;
        }

        .layout {
          display: flex;
          height: 100vh;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background: #16161d;
          border-right: 1px solid #242430;
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }

        .sidebar-header {
          padding: 0 20px 20px;
          border-bottom: 1px solid #242430;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .logo-mark {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #7c6af7, #a78bfa);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }

        .logo-text {
          font-size: 15px;
          font-weight: 600;
          color: #e8e8f0;
          letter-spacing: -0.3px;
        }

        .upload-btn {
          width: 100%;
          padding: 9px 14px;
          background: #7c6af7;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s;
        }

        .upload-btn:hover { background: #6b59e6; }
        .upload-btn:disabled { background: #3a3a50; color: #666; cursor: not-allowed; }

        .error-msg {
          margin-top: 8px;
          font-size: 11.5px;
          color: #f87171;
          line-height: 1.4;
        }

        .pdf-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px 12px 0;
        }

        .pdf-list-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555568;
          padding: 0 8px;
          margin-bottom: 6px;
        }

        .pdf-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 7px;
          cursor: pointer;
          transition: background 0.12s;
          position: relative;
          group: true;
        }

        .pdf-item:hover { background: #1e1e2a; }
        .pdf-item.active { background: #25253a; }

        .pdf-icon {
          color: #7c6af7;
          flex-shrink: 0;
        }

        .pdf-info { flex: 1; min-width: 0; }

        .pdf-name {
          font-size: 12.5px;
          font-weight: 500;
          color: #d0d0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pdf-item.active .pdf-name { color: #e8e8f0; }

        .pdf-chunks {
          font-size: 10.5px;
          color: #555568;
          margin-top: 1px;
        }

        .pdf-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #444458;
          padding: 3px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          opacity: 0;
          transition: opacity 0.12s, color 0.12s;
          flex-shrink: 0;
        }

        .pdf-item:hover .pdf-remove { opacity: 1; }
        .pdf-remove:hover { color: #f87171; }

        .sidebar-empty {
          padding: 20px 20px 0;
          font-size: 12px;
          color: #404055;
          line-height: 1.6;
        }

        /* ── Main ── */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .topbar {
          padding: 16px 24px;
          border-bottom: 1px solid #1e1e2a;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0f0f13;
          min-height: 57px;
        }

        .topbar-file {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topbar-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #7c6af7;
          flex-shrink: 0;
        }

        .topbar-name {
          font-size: 14px;
          font-weight: 500;
          color: #c0c0d8;
        }

        .topbar-hint {
          font-size: 13px;
          color: #404055;
        }

        /* ── Drop zone ── */
        .drop-zone {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border: 2px dashed #242430;
          margin: 24px;
          border-radius: 16px;
          transition: border-color 0.2s, background 0.2s;
          cursor: pointer;
        }

        .drop-zone.drag-over {
          border-color: #7c6af7;
          background: #16143a22;
        }

        .drop-zone-icon {
          width: 52px;
          height: 52px;
          background: #1a1a24;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7c6af7;
        }

        .drop-zone h2 {
          font-size: 17px;
          font-weight: 600;
          color: #c0c0d8;
          letter-spacing: -0.3px;
        }

        .drop-zone p {
          font-size: 13px;
          color: #404055;
          text-align: center;
          line-height: 1.6;
        }

        .drop-zone-btn {
          padding: 9px 20px;
          background: #7c6af7;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .drop-zone-btn:hover { background: #6b59e6; }

        /* ── Chat ── */
        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chat-area::-webkit-scrollbar { width: 4px; }
        .chat-area::-webkit-scrollbar-track { background: transparent; }
        .chat-area::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }

        .message {
          display: flex;
          gap: 12px;
          max-width: 760px;
          animation: fadeUp 0.2s ease;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.user { align-self: flex-end; flex-direction: row-reverse; }
        .message.bot  { align-self: flex-start; }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .avatar.user { background: #25253a; color: #a78bfa; }
        .avatar.bot  { background: #1e2535; color: #60a5fa; }

        .bubble {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.65;
          max-width: calc(100% - 42px);
        }

        .bubble.user {
          background: #25253a;
          color: #d8d8f0;
          border-bottom-right-radius: 4px;
        }

        .bubble.bot {
          background: #161624;
          color: #c8c8e0;
          border: 1px solid #242430;
          border-bottom-left-radius: 4px;
        }

        .bubble.error { border-color: #3a1f1f; color: #f87171; }

        /* ── Typing ── */
        .typing-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          height: 18px;
        }

        .typing-dots span {
          width: 5px;
          height: 5px;
          background: #7c6af7;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Empty chat ── */
        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #404055;
        }

        .chat-empty p { font-size: 13px; }

        /* ── Input bar ── */
        .input-bar {
          padding: 16px 24px 20px;
          border-top: 1px solid #1e1e2a;
          display: flex;
          gap: 10px;
          align-items: flex-end;
          background: #0f0f13;
        }

        .input-wrap {
          flex: 1;
          background: #16161d;
          border: 1px solid #2a2a3a;
          border-radius: 10px;
          display: flex;
          align-items: flex-end;
          padding: 10px 14px;
          transition: border-color 0.15s;
        }

        .input-wrap:focus-within { border-color: #7c6af7; }

        textarea {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: #e0e0f0;
          font-size: 14px;
          font-family: inherit;
          resize: none;
          line-height: 1.5;
          max-height: 140px;
          overflow-y: auto;
        }

        textarea::placeholder { color: #404055; }

        .send-btn {
          width: 38px;
          height: 38px;
          background: #7c6af7;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, opacity 0.15s;
        }

        .send-btn:hover:not(:disabled) { background: #6b59e6; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .input-hint {
          font-size: 11px;
          color: #2e2e42;
          padding: 0 2px;
          margin-top: 4px;
        }

        /* ── Hidden file input ── */
        input[type="file"] { display: none; }

        @media (max-width: 640px) {
          .sidebar { width: 220px; min-width: 220px; }
        }
      `}</style>

      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={onFileInput}
      />

      <div className="layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-mark">P</div>
              <span className="logo-text">PDF Chat</span>
            </div>
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Spinner size={14} /> : <UploadIcon />}
              {uploading ? "Uploading…" : "Upload PDF"}
            </button>
            {uploadError && <p className="error-msg">{uploadError}</p>}
          </div>

          <div className="pdf-list">
            {pdfs.length === 0 ? (
              <p className="sidebar-empty">Upload a PDF to start chatting with it.</p>
            ) : (
              <>
                <p className="pdf-list-label">Your PDFs</p>
                {pdfs.map(pdf => (
                  <div
                    key={pdf.name}
                    className={`pdf-item ${activePdf === pdf.name ? "active" : ""}`}
                    onClick={() => setActivePdf(pdf.name)}
                  >
                    <span className="pdf-icon"><FileIcon /></span>
                    <div className="pdf-info">
                      <div className="pdf-name" title={pdf.name}>{pdf.name}</div>
                      <div className="pdf-chunks">{pdf.chunks} chunks indexed</div>
                    </div>
                    <button
                      className="pdf-remove"
                      onClick={(e) => removePdf(pdf.name, e)}
                      title="Remove"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main className="main">
          {/* Topbar */}
          <div className="topbar">
            {activePdf ? (
              <div className="topbar-file">
                <div className="topbar-dot" />
                <span className="topbar-name">{activePdf}</span>
              </div>
            ) : (
              <span className="topbar-hint">No PDF selected</span>
            )}
          </div>

          {/* Drop zone (no PDFs yet) */}
          {pdfs.length === 0 ? (
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-zone-icon"><UploadIcon /></div>
              <h2>Drop your PDF here</h2>
              <p>Upload a PDF and ask anything about its contents.<br />Your document is indexed locally.</p>
              <button className="drop-zone-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Choose file
              </button>
            </div>
          ) : (
            <>
              {/* Chat messages */}
              <div className="chat-area">
                {activeMessages.length === 0 ? (
                  <div className="chat-empty">
                    <p>Ask anything about <strong style={{ color: "#7c6af7" }}>{activePdf}</strong></p>
                  </div>
                ) : (
                  activeMessages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                      <div className={`avatar ${msg.role}`}>
                        {msg.role === "user" ? <UserIcon /> : <BotIcon />}
                      </div>
                      <div className={`bubble ${msg.role} ${msg.error ? "error" : ""}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}

                {/* Thinking indicator */}
                {thinking && (
                  <div className="message bot">
                    <div className="avatar bot"><BotIcon /></div>
                    <div className="bubble bot"><TypingDots /></div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="input-bar">
                <div>
                  <div className="input-wrap">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      placeholder={activePdf ? `Ask about ${activePdf}…` : "Select a PDF first"}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onKeyDown={onKeyDown}
                      disabled={!activePdf || thinking}
                    />
                  </div>
                  <p className="input-hint">Enter to send · Shift+Enter for new line</p>
                </div>
                <button
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || !activePdf || thinking}
                  title="Send"
                >
                  {thinking ? <Spinner size={16} /> : <SendIcon />}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}