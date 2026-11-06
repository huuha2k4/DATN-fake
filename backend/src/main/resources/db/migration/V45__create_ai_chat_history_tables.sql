-- V45: Tạo bảng lưu lịch sử hội thoại AI (FinAI Chat Sessions & Messages)
CREATE TABLE IF NOT EXISTS core.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Cuộc trò chuyện mới',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chat_sessions_user FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS core.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    author VARCHAR(20) NOT NULL, -- 'user' hoặc 'assistant'
    text TEXT NOT NULL,
    kind VARCHAR(50) DEFAULT 'normal', -- 'normal', 'analysis', 'success', 'warning'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chat_messages_session FOREIGN KEY (session_id) REFERENCES core.ai_chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON core.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON core.ai_chat_messages(session_id);

