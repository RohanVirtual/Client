import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("https://server-fggr.onrender.com"); //io("http://localhost:5000"); // Replace with your server address

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [username, setUsername] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);

  useEffect(() => {
    const onMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("message", onMessage);

    const onTypingStart = ({ username: otherUsername, senderId } = {}) => {
      if (!otherUsername) return;
      if (senderId && senderId === socket.id) return;
      setTypingUsers((prev) =>
        prev.includes(otherUsername) ? prev : [...prev, otherUsername]
      );
    };

    const onTypingStop = ({ username: otherUsername, senderId } = {}) => {
      if (!otherUsername) return;
      if (senderId && senderId === socket.id) return;
      setTypingUsers((prev) => prev.filter((u) => u !== otherUsername));
    };

    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      // Cleanup on component unmount
      socket.off("message", onMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, []);

  useEffect(() => {
    const onConnect = () => {
      if (username) socket.emit("join", { username });
    };

    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [username]);

  const joinChat = () => {
    const next = nameInput.trim();
    if (!next) return;
    setUsername(next);
    socket.emit("join", { username: next });
  };

  const sendMessage = () => {
    if (messageInput.trim() !== "" && username) {
      if (isTyping) {
        socket.emit("typing:stop", { username });
        setIsTyping(false);
      }
      const message = {
        type: "text",
        text: messageInput,
        timestamp: new Date(),
        username,
      };
      socket.emit("message", message);
      setMessageInput("");
    }
  };

  const sendFile = (file) => {
    if (!file || !username) return;

    const MAX_FILE_BYTES = 2 * 1024 * 1024; // keep in sync with server
    if (file.size > MAX_FILE_BYTES) {
      alert("File too large (max 2MB).");
      return;
    }

    setSendingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      socket.emit("file", {
        username,
        timestamp: new Date(),
        file: {
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        },
      });
      setSendingFile(false);
    };
    reader.onerror = () => {
      setSendingFile(false);
      alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!username) return;

    if (!messageInput.trim()) {
      if (isTyping) {
        socket.emit("typing:stop", { username });
        setIsTyping(false);
      }
      return;
    }

    if (!isTyping) {
      socket.emit("typing:start", { username });
      setIsTyping(true);
    }

    const t = setTimeout(() => {
      socket.emit("typing:stop", { username });
      setIsTyping(false);
    }, 900);

    return () => clearTimeout(t);
  }, [messageInput, username, isTyping]);

  if (!username) {
    return (
      <div className="flex justify-center items-center w-full h-screen bg-gradient-to-b from-blue-300 to-blue-200">
        <div className="bg-white rounded-lg w-96 p-6 shadow-md">
          <div className="text-xl font-semibold mb-4">Join chat</div>
          <div className="flex">
            <input
              type="text"
              className="w-full px-2 py-2 border rounded-l-md outline-none"
              placeholder="Enter your name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") joinChat();
              }}
            />
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
              onClick={joinChat}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full h-screen bg-gradient-to-b from-blue-300 to-blue-200">
      <div className="bg-white rounded-lg w-96 h-96 p-4 shadow-md">
        <div className="flex flex-col h-full">
          <div className="flex-1 p-2 overflow-y-auto bg-gray-100 rounded-md">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.senderId && msg.senderId === socket.id
                    ? "items-end"
                    : "items-start"
                }`}
              >
                <div
                  className={`text-white p-2 rounded-md max-w-[85%] break-words ${
                    msg.senderId && msg.senderId === socket.id
                      ? "bg-blue-600"
                      : "bg-gray-700"
                  }`}
                >
                  <div className="text-[11px] opacity-80 mb-1">
                    {msg.senderId && msg.senderId === socket.id
                      ? "You"
                      : msg.username || "Anonymous"}
                  </div>
                  {msg.type === "file" && msg.file ? (
                    <div className="space-y-2">
                      <div className="text-sm opacity-90">{msg.file.name}</div>
                      {typeof msg.file.mime === "string" &&
                      msg.file.mime.startsWith("image/") ? (
                        <a href={msg.file.dataUrl} target="_blank" rel="noreferrer">
                          <img
                            src={msg.file.dataUrl}
                            alt={msg.file.name}
                            className="max-h-40 rounded border border-white/20"
                          />
                        </a>
                      ) : (
                        <a
                          className="underline text-sm"
                          href={msg.file.dataUrl}
                          download={msg.file.name}
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <div className="h-5 px-2 text-xs text-gray-600">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : typingUsers.length > 1
              ? `${typingUsers.join(", ")} are typing...`
              : ""}
          </div>
          <div className="p-2 border-t border-gray-300">
            {showEmojis ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {["😀","😂","😍","🥳","😎","😭","😡","👍","🙏","❤️","🔥","🎉"].map((e) => (
                  <button
                    key={e}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    onClick={() => {
                      setMessageInput((prev) => prev + e);
                      setShowEmojis(false);
                    }}
                    type="button"
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2 items-center">
              <button
                type="button"
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setShowEmojis((v) => !v)}
                title="Emojis"
              >
                🙂
              </button>
              <label
                className={`px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer ${
                  sendingFile ? "opacity-60 pointer-events-none" : ""
                }`}
                title="Send file (max 2MB)"
              >
                📎
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) sendFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <input
                type="text"
                className="w-full px-2 py-1 border rounded-l-md outline-none"
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
                onClick={sendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
