import React, { useEffect, useRef } from "react";
// Helper to render chat message formatting (actions/expressions/thoughts)
function renderFormattedMessage(text, isUser) {
  // *action* or **action** to <em>
  // For user, use a different class for <em>
  // Robustly match both *action* and **action** (not followed by colon), hide asterisks
  // Handles overlapping and nested asterisks, and does not match inside words
  const emoteRegex = /(^|\s)(\*\*([^*][^*]*?)\*\*|\*([^*][^*]*?)\*)(?!:)/g;
  text = text.replace(emoteRegex, (match, pre, _all, double, single) => {
    const emoteText = double || single;
    const cls = isUser ? 'user-action' : 'ai-action';
    return `${pre}<em class=\"${cls}\">${emoteText}</em>`;
  });

  // Remove all [TAG: ...] tags (including multimodal and custom tags) but keep the content, rendered in italics
  text = text.replace(/\[\s*([A-Z]+)\s*:(.*?)\]/g, (match, tag, content) => {
    return content.trim() ? `<em>${content.trim()}</em>` : '';
  });

  // Remove any [TAG] (no colon/content) tags entirely
  text = text.replace(/\[\s*([A-Z]+)\s*\]/g, '');

  // _inner thoughts_ to <em class="ai-action">"..."</em> for AI, or user-action for user
  // Only if not already inside *...* or **...**
  // This will match _..._ (not inside words)
  text = text.replace(/(^|\s)_([^_]+)_($|\s|[.!?,;:])/g, (match, pre, inner, post) => {
    const cls = isUser ? 'user-action' : 'ai-action';
    // Wrap inner thought in real double quotes
    return `${pre}<em class=\"${cls}\">\"${inner.trim()}\"</em>${post}`;
  });

  // *action* or **action** to <em> (already handled above)
  // [brackets] to <span class="action">[...]]</span> (fallback for non-sensory brackets)
  text = text.replace(/\[(.+?)\]/g, '<span class="action">[$1]</span>');
  return { __html: text };
}

const Chat = ({
  user = { characters: [] },
  activeCharacter,
  setActiveCharacter,
  messages,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isTyping,
  pendingAI,
  chatSessions = [],
  allCharacters = [],
}) => {
  // Ref for the message list container
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const aiTypewriterRef = useRef(null);

  // Auto-scroll the AI typewriter bubble when AI is typing out the response
  useEffect(() => {
    if (pendingAI && !pendingAI.thinking && aiTypewriterRef.current) {
      aiTypewriterRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [pendingAI]);

  return (
    <section>
      <h2 className="text-3xl font-bold mb-6">Your Chats</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character List */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-semibold mb-4">Characters</h3>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-2">
            {chatSessions.length === 0 ? (
              <div className="text-gray-400 text-center py-8">You have no chats yet.</div>
            ) : (
              chatSessions.map((session) => {
                const character = allCharacters.find(c => c.id === session.characterId);
                if (!character) return null;
                return (
                  <div
                    key={character.id}
                    onClick={() => setActiveCharacter(character)}
                    className={`relative bg-gray-900 p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-all duration-150 border-2 ${
                      activeCharacter?.id === character.id
                        ? "border-pink-400 shadow-lg ring-2 ring-pink-400"
                        : "border-transparent hover:bg-gray-800"
                    }`}
                    style={{ boxSizing: 'border-box' }}
                  >
                    <img
                      src={character.image}
                      alt={character.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{character.name}</h4>
                      <p className="text-xs text-gray-400 truncate">{character.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        {/* Chat Interface */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-4 min-h-[600px] flex flex-col">
          {!activeCharacter ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a character to start chatting.
            </div>
          ) : (
            <>
              <div className="flex items-center p-2 border-b border-gray-700 mb-2">
                <img
                  src={activeCharacter.image}
                  alt={activeCharacter.name}
                  className="w-10 h-10 rounded-full object-cover mr-3"
                />
                <h4 className="font-semibold">{activeCharacter.name}</h4>
              </div>
              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 max-h-[420px]"
                ref={messagesContainerRef}
              >
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar/profile: always same size for user and character */}
                    {msg.isUser ? (
                      <>
                        <div className="flex items-center">
                          <div className="order-2 flex-shrink-0 ml-2">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold border border-blue-400">
                              U
                            </div>
                          </div>
                          <div
                            className="max-w-md px-4 py-2 rounded-lg order-1 ml-3"
                            style={{ background: '#23272f', color: '#fff' }}
                          >
                            <p className="text-sm" dangerouslySetInnerHTML={renderFormattedMessage(msg.text, true)} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          src={activeCharacter.image}
                          alt={activeCharacter.name}
                          className="w-12 h-12 rounded-full object-cover mr-2 border border-purple-600 bg-gray-900 flex-shrink-0"
                        />
                        <div
                          className="max-w-md px-4 py-2 rounded-lg"
                          style={{ background: '#23272f', color: '#fff' }}
                        >
                          <p className="text-sm" dangerouslySetInnerHTML={renderFormattedMessage(msg.text, false)} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {/* AI is typing bubble ("..."), only if not animating reply */}
                {isTyping && pendingAI && pendingAI.thinking && (
                  <div className="flex items-start space-x-3">
                    <img
                      src={activeCharacter.image}
                      alt={activeCharacter.name}
                      className="w-12 h-12 rounded-full object-cover mr-2 border border-purple-600 bg-gray-900 flex-shrink-0"
                    />
                    <div className="bg-gray-800 p-3 rounded-lg max-w-md flex items-center">
                      <span className="dots">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                    </div>
                  </div>
                )}
                {/* AI typewriter bubble */}
                {pendingAI && !pendingAI.thinking && (
                  <div className="flex items-start space-x-3" ref={aiTypewriterRef}>
                    <img
                      src={activeCharacter.image}
                      alt={activeCharacter.name}
                      className="w-12 h-12 rounded-full object-cover mr-2 border border-purple-600 bg-gray-900 flex-shrink-0"
                    />
                    <div className="bg-gray-700 p-3 rounded-lg max-w-md flex items-center">
                      <span className="typewriter">{pendingAI.text}</span>
                    </div>
                  </div>
                )}
                {/* Always keep this at the bottom for auto-scroll */}
                <div ref={messagesEndRef} />
              </div>
              {/* Message Input */}
              <form onSubmit={(e) => handleSendMessage(e, activeCharacter?.id)} className="flex space-x-2 mt-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-4 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 text-base min-h-[3rem]"
                  disabled={!activeCharacter || isTyping}
                  style={{ minHeight: '3rem' }}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || !activeCharacter || isTyping}
                  className={`px-6 py-2 rounded-lg transition-colors text-base font-semibold ${
                    isTyping || !inputMessage.trim() || !activeCharacter
                      ? "bg-gray-800 cursor-not-allowed text-gray-400"
                      : "bg-pink-500 hover:bg-pink-600 text-white"
                  }`}
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Chat;
