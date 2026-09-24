import { customAlert, customConfirm } from "../components/CustomAlert";
import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, User, RefreshCw, Trash2, Mic, CheckCircle, Loader2 } from "lucide-react";
import { AIOptions, FinanceItem, CardExpense, LoanEntry, EmiPayment } from "../types";
import { askVault, AIResponse } from "../lib/ai";
import { executeAITool } from "../lib/ai-tools";
import { loadUserProfile } from "../lib/storage";

interface Props {
  aiOpts: AIOptions;
  contextData: { 
    items: FinanceItem[]; 
    expenses: CardExpense[];
    loans?: LoanEntry[];
    emiPayments?: EmiPayment[];
  };
  onClose: () => void;
  onDataChanged: () => void;
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  loading?: boolean;
}

interface ThinkingStep {
  label: string;
  done: boolean;
}

function formatAiMessage(rawText: string): string {
  if (!rawText) return "";
  const escaped = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const withBullets = withBold.replace(/^[\*\-]\s+/gm, "• ");
  return withBullets.replace(/\n/g, "<br/>");
}

function getFirstName(profile: { name: string } | null): string {
  if (!profile || !profile.name) return "";
  return profile.name.split(/\s+/)[0];
}

// Random thinking step sequences for the progress indicator
function getRandomThinkingSteps(firstName: string): string[] {
  const sequences = [
    ["Sending your query...", `Understanding your request${firstName ? ", " + firstName : ""}...`, "Retrieving the best answer for you..."],
    [`Hold on${firstName ? " " + firstName : ""}...`, "Analyzing your financial data...", "Generating response..."],
    ["Processing your message...", "Crunching the numbers...", `Finding the best insight for you${firstName ? ", " + firstName : ""}...`],
    ["Sending your query...", `Working on it${firstName ? ", " + firstName : ""}...`, "Almost there..."],
    [`Got it${firstName ? ", " + firstName : ""}!`, "Reviewing your finances...", "Preparing your answer..."],
  ];
  return sequences[Math.floor(Math.random() * sequences.length)];
}

export default function AIAssistant({ aiOpts, contextData, onClose, onDataChanged }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem("finaura_ai_chat");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thinkingIntervalRef = useRef<number | null>(null);

  const userProfile = loadUserProfile();
  const firstName = getFirstName(userProfile);
  const userPhoto = userProfile?.photo || "";
  const blankUserAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

  const isEmptyChat = messages.length === 0;

  useEffect(() => {
    sessionStorage.setItem("finaura_ai_chat", JSON.stringify(messages));
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: "smooth"
      });
      chatHistoryRef.current.scrollLeft = 0;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    }
  }, [messages]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
      chatHistoryRef.current.scrollLeft = 0;
    }
  }, []);

  // Cleanup thinking interval on unmount
  useEffect(() => {
    return () => {
      if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
    };
  }, []);

  function startThinkingAnimation() {
    const steps = getRandomThinkingSteps(firstName);
    setThinkingSteps([{ label: steps[0], done: false }]);
    
    let stepIndex = 0;
    thinkingIntervalRef.current = window.setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setThinkingSteps(prev => {
          const updated = prev.map(s => ({ ...s, done: true }));
          return [...updated, { label: steps[stepIndex], done: false }];
        });
      } else {
        // Loop: keep the last step animating
        if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
      }
    }, 1800);
  }

  function stopThinkingAnimation() {
    if (thinkingIntervalRef.current) {
      clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
    setThinkingSteps([]);
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput("");
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: userText };
    
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setIsTyping(true);
    startThinkingAnimation();

    let apiMessages = currentMessages
      .filter(m => m.id !== "welcome" && !m.loading)
      .map(m => ({ role: m.role, content: m.text }));

    let response: AIResponse = await askVault(aiOpts, apiMessages, contextData);

    while (response.success && response.data?.type === "tool_call") {
      const toolCall = response.data;
      const toolResult = await executeAITool(toolCall.tool_call, toolCall.arguments);
      onDataChanged();

      apiMessages.push({ role: "ai", content: response.text || "" });
      apiMessages.push({ role: "user", content: `SYSTEM: Tool execution result: ${toolResult}` });

      response = await askVault(aiOpts, apiMessages, contextData);
    }

    stopThinkingAnimation();

    const aiMsg: Message = {
      id: Date.now().toString() + "-ai",
      role: "ai",
      text: response.success && response.text ? response.text.replace(/```json[\s\S]*?```/g, "").trim() : (response.error || "Sorry, I couldn't process that.")
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  }

  function handleSuggestionClick(text: string) {
    setInput(text);
    // Use a small timeout to ensure state updates before sending
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      // Directly trigger send with the suggestion text
      if (isTyping) return;

      const userMsg: Message = { id: Date.now().toString(), role: "user", text };
      const currentMessages = [...messages, userMsg];
      setMessages(currentMessages);
      setIsTyping(true);
      startThinkingAnimation();

      let apiMessages = currentMessages
        .filter(m => m.id !== "welcome" && !m.loading)
        .map(m => ({ role: m.role, content: m.text }));

      askVault(aiOpts, apiMessages, contextData).then(async (response) => {
        while (response.success && response.data?.type === "tool_call") {
          const toolCall = response.data;
          const toolResult = await executeAITool(toolCall.tool_call, toolCall.arguments);
          onDataChanged();
          apiMessages.push({ role: "ai", content: response.text || "" });
          apiMessages.push({ role: "user", content: `SYSTEM: Tool execution result: ${toolResult}` });
          response = await askVault(aiOpts, apiMessages, contextData);
        }
        stopThinkingAnimation();
        const aiMsg: Message = {
          id: Date.now().toString() + "-ai",
          role: "ai",
          text: response.success && response.text ? response.text.replace(/```json[\s\S]*?```/g, "").trim() : (response.error || "Sorry, I couldn't process that.")
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
      });
    }, 50);
  }

  function handleMic() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      customAlert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  }

  function handleClearChat() {
    setMessages([]);
    sessionStorage.removeItem("finaura_ai_chat");
  }

  const promptSuggestions = [
    "How much did I spend this month?",
    "What is my total remaining EMI & loan balance?",
    "When is my next upcoming due date or EMI?",
    "What is my highest credit card bill?"
  ];

  return (
    <div className="ai-assistant-overlay">
      <div className="ai-assistant-panel">
        {/* Header */}
        <div className="ai-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img 
              src="/FinAura-AI.png" 
              alt="FinAura AI" 
              className="ai-header-avatar" 
              style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain" }} 
            />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>FinAura Assistant</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ai-close-btn" onClick={handleClearChat} title="Clear Chat"><Trash2 size={18} /></button>
            <button className="ai-close-btn" onClick={onClose} title="Close"><X size={20} /></button>
          </div>
        </div>
        
        {/* Chat History */}
        <div 
          className="ai-chat-history" 
          ref={chatHistoryRef}
          onScroll={(e) => {
            if (e.currentTarget.scrollLeft !== 0) {
              e.currentTarget.scrollLeft = 0;
            }
          }}
        >
          {/* Empty state with greeting + suggestions */}
          {isEmptyChat && !isTyping && (
            <div className="velo-empty-state">
              <p className="velo-greeting">
                {firstName ? `Hi ${firstName}, How can I assist you today?` : "Hello! How can I assist you today?"}
              </p>
              <div className="velo-suggestions-vertical">
                {promptSuggestions.map((s, i) => (
                  <button key={i} className="velo-suggestion-pill" onClick={() => handleSuggestionClick(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actual messages */}
          {messages.map(m => (
            <div key={m.id} className={`ai-msg-row ${m.role}`}>
              <div className="ai-msg-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.role === "ai" ? (
                  <img 
                    src="/FinAura_AI_Assistant.png" 
                    alt="FinAura AI" 
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                  />
                ) : (
                  <img 
                    src={userPhoto || blankUserAvatar} 
                    alt="User" 
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                  />
                )}
              </div>
              <div className={`ai-msg-bubble`}>
                <div dangerouslySetInnerHTML={{ __html: formatAiMessage(m.text) }} />
              </div>
            </div>
          ))}

          {/* Thinking Progress Steps */}
          {isTyping && thinkingSteps.length > 0 && (
            <div className="velo-thinking-steps">
              {thinkingSteps.map((step, i) => (
                <div key={i} className={`velo-thinking-step ${step.done ? "done" : "active"}`}>
                  <div className="velo-step-icon">
                    {step.done ? (
                      <CheckCircle size={22} />
                    ) : (
                      <div className="velo-step-pulse" />
                    )}
                  </div>
                  {i < thinkingSteps.length - 1 && <div className="velo-step-connector" />}
                  <span className={`velo-step-label ${step.done ? "" : "active-label"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="velo-input-area">
          <form className="velo-input-form" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask your fellow Velo AI" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              className="velo-chat-input"
            />
            <button type="button" onClick={handleMic} disabled={isTyping} className="velo-mic-btn" title="Voice Input">
              <Mic size={20} style={{ animation: isListening ? "pulse 1.5s infinite" : "none" }} />
            </button>
            <button type="submit" className="velo-send-btn" disabled={!input.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
          <p className="velo-disclaimer">AI-generated responses may not always be correct</p>
        </div>
      </div>
    </div>
  );
}
