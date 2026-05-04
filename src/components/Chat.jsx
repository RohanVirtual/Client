import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("https://server-fggr.onrender.com"); //io("http://localhost:5000"); // Replace with your server address

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const onMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("message", onMessage);

    return () => {
      // Cleanup on component unmount
      socket.off("message", onMessage);
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
      const message = { text: messageInput, timestamp: new Date(), username };
      socket.emit("message", message);
      setMessageInput("");
    }
  };

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
                  {msg.text}
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-300">
            <div className="flex">
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
