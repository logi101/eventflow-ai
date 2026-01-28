// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - AI Assistant Page
// ═══════════════════════════════════════════════════════════════════════════

export function AIAssistantPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6" data-testid="ai-title">עוזר AI</h1>
      <div className="card" data-testid="ai-chat">
        <div className="h-[400px] border border-gray-200 rounded-lg mb-4 p-4 overflow-y-auto" data-testid="chat-history">
          <p className="text-gray-500 text-center">התחל שיחה עם העוזר החכם</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="שאל שאלה..."
            data-testid="ai-input"
          />
          <button className="btn-primary" data-testid="ai-send-btn">
            שלח
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIAssistantPage
