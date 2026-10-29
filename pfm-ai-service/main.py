from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from agent import run_chat

app = FastAPI(
    title="PFM AI Service",
    description="Dịch vụ AI phân tích tài chính và Trợ lý ảo cho dự án PFM",
    version="1.0.0"
)

HTML_CHAT_UI = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PFM AI Assistant - Trợ lý Tài chính</title>
    <style>
        :root {
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-hover: #334155;
            --primary: #38bdf8;
            --primary-dark: #0284c7;
            --text: #f8fafc;
            --muted: #94a3b8;
            --border: #334155;
            --bot-bubble: #1e293b;
            --user-bubble: #0284c7;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 900px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            border-left: 1px solid var(--border);
            border-right: 1px solid var(--border);
        }
        header {
            padding: 16px 24px;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .logo-area { display: flex; align-items: center; gap: 12px; }
        .logo-badge {
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            color: #0f172a;
            font-weight: 700;
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 1.1rem;
        }
        header h1 { font-size: 1.1rem; font-weight: 600; }
        header p { font-size: 0.8rem; color: var(--muted); }
        .chat-box {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .msg {
            max-width: 80%;
            padding: 14px 18px;
            border-radius: 16px;
            line-height: 1.6;
            font-size: 0.95rem;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .msg.bot {
            align-self: flex-start;
            background: var(--bot-bubble);
            border: 1px solid var(--border);
            color: var(--text);
            border-bottom-left-radius: 4px;
        }
        .msg.user {
            align-self: flex-end;
            background: var(--user-bubble);
            color: #ffffff;
            border-bottom-right-radius: 4px;
        }
        .suggestions {
            padding: 10px 24px;
            display: flex;
            gap: 8px;
            overflow-x: auto;
            background: rgba(30, 41, 59, 0.5);
            border-top: 1px solid var(--border);
        }
        .suggestions::-webkit-scrollbar { height: 4px; }
        .suggestions::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .chip {
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.82rem;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }
        .chip:hover {
            background: var(--surface-hover);
            border-color: var(--primary);
            color: var(--primary);
        }
        .input-bar {
            padding: 16px 24px;
            background: var(--surface);
            display: flex;
            gap: 12px;
            border-top: 1px solid var(--border);
        }
        .input-bar input {
            flex: 1;
            padding: 12px 18px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text);
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .input-bar input:focus { border-color: var(--primary); }
        .input-bar button {
            padding: 12px 24px;
            background: var(--primary);
            color: #0f172a;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        .input-bar button:hover { background: var(--primary-dark); color: #fff; }
        .loading-dots { display: inline-block; }
        .loading-dots::after {
            content: '.';
            animation: dots 1.5s steps(5, end) infinite;
        }
        @keyframes dots {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 100% { content: '...'; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo-area">
                <div class="logo-badge">PFM</div>
                <div>
                    <h1>Hệ thống Trợ lý Tài chính Cá nhân (PFM AI)</h1>
                    <p>AI 6 Chatbot &bull; AI 3 Prophet &bull; AI 4 Anomaly &bull; AI 2 Profiling &bull; AI 5 Advisory</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <button onclick="openRecModal()" style="background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #0f172a; border: none; padding: 7px 12px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 700; transition: transform 0.1s;">💡 Gợi ý AI 5</button>
                <button onclick="openProfileModal()" style="background: linear-gradient(135deg, #10b981, #34d399); color: #0f172a; border: none; padding: 7px 12px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 700; transition: transform 0.1s;">👤 Hồ sơ AI 2</button>
                <button onclick="openForecastModal()" style="background: linear-gradient(135deg, #0284c7, #38bdf8); color: #0f172a; border: none; padding: 7px 12px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 700; transition: transform 0.1s;">📈 Biểu đồ AI 3</button>
                <a href="/docs" target="_blank" style="color: var(--primary); font-size: 0.85rem; text-decoration: none;">API Docs ↗</a>
            </div>
        </header>

        <div class="chat-box" id="chatBox">
            <div class="msg bot">👋 Xin chào! Mình là Trợ lý tài chính cá nhân PFM.

Mình có thể giúp bạn kiểm tra số dư ví, phân tích thói quen chi tiêu (AI 2), dự báo tương lai (AI 3), phát hiện bất thường (AI 4) hoặc trả lời thắc mắc (AI 6). Bạn muốn mình hỗ trợ gì hôm nay?</div>
        </div>

        <div class="suggestions">
            <button class="chip" onclick="ask(this.innerText)">💡 Tôi nên cắt giảm khoản chi nào để tiết kiệm?</button>
            <button class="chip" onclick="ask(this.innerText)">👤 Phân tích thói quen chi tiêu của tôi?</button>
            <button class="chip" onclick="ask(this.innerText)">💰 Số dư tài khoản hiện tại của tôi là bao nhiêu?</button>
            <button class="chip" onclick="ask(this.innerText)">🔮 Nếu giữ mức chi tiêu hiện tại thì cuối tháng còn bao nhiêu?</button>
            <button class="chip" onclick="ask(this.innerText)">🚨 Gần đây tôi có khoản chi tiêu nào bất thường không?</button>
            <button class="chip" onclick="ask(this.innerText)">🍔 Dự kiến tháng này tiền ăn uống hết bao nhiêu?</button>
            <button class="chip" onclick="ask(this.innerText)">🎯 Bao lâu nữa tôi mua được laptop mới?</button>
            <button class="chip" onclick="ask(this.innerText)">📊 Tháng trước tôi tiêu nhiều nhất vào đâu?</button>
            <button class="chip" onclick="ask(this.innerText)">🔍 Tìm cho tôi các khoản chi trên 500k?</button>
            <button class="chip" onclick="ask(this.innerText)">📈 So sánh chi tiêu tháng 10 với tháng 9?</button>
            <button class="chip" onclick="ask(this.innerText)">💡 Quy tắc 50/30/20 là gì?</button>
        </div>

        <div class="input-bar">
            <input type="text" id="userInput" placeholder="Nhập câu hỏi tài chính của bạn..." onkeydown="if(event.key==='Enter') sendMsg()">
            <button id="sendBtn" onclick="sendMsg()">Gửi</button>
        </div>
    </div>

    <script>
        const chatBox = document.getElementById('chatBox');
        const userInput = document.getElementById('userInput');
        const sendBtn = document.getElementById('sendBtn');

        function appendMsg(text, sender) {
            const div = document.createElement('div');
            div.className = `msg ${sender}`;
            div.textContent = text;
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
            return div;
        }

        async function sendMsg() {
            const text = userInput.value.trim();
            if (!text) return;
            appendMsg(text, 'user');
            userInput.value = '';

            const botLoading = appendMsg('Đang phân tích dữ liệu tài chính...', 'bot');
            botLoading.classList.add('loading-dots');
            sendBtn.disabled = true;

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: text, user_id: 'test_user_01' })
                });
                const data = await res.json();
                botLoading.classList.remove('loading-dots');
                botLoading.textContent = data.answer || 'Không nhận được phản hồi từ hệ thống.';
            } catch (err) {
                botLoading.classList.remove('loading-dots');
                botLoading.textContent = '❌ Lỗi kết nối đến máy chủ: ' + err.message;
            } finally {
                sendBtn.disabled = false;
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }

        function ask(text) {
            userInput.value = text.replace(/^[^\w\s\u00C0-\u1EF9]+/i, '').trim();
            sendMsg();
        }

        // --- LOGIC MODAL BIỂU ĐỒ AI 3 (PROPHET) ---
        async function openForecastModal() {
            document.getElementById('forecastModal').style.display = 'flex';
            await loadForecastChart();
        }
        function closeForecastModal() {
            document.getElementById('forecastModal').style.display = 'none';
        }

        async function loadForecastChart() {
            const chartStatus = document.getElementById('chartStatus');
            chartStatus.textContent = 'Đang chạy mô hình Prophet tính toán chuỗi thời gian...';
            try {
                const res = await fetch('/api/forecast/balance?user_id=test_user_01&days=30');
                const data = await res.json();
                if (data.status !== 'success') {
                    chartStatus.textContent = data.message || 'Lỗi khi dự báo';
                    return;
                }
                const subtitle = document.getElementById('forecastModalSubtitle');
                if (subtitle && data.historical_days) {
                    subtitle.innerHTML = `Dữ liệu: ${data.historical_days} ngày lịch sử &bull; Khoảng tin cậy: 80% &bull; Chu kỳ: Tuần/Tháng`;
                }
                chartStatus.textContent = data.summary;
                renderCanvasChart(data);
            } catch (e) {
                chartStatus.textContent = 'Lỗi kết nối API: ' + e.message;
            }
        }

        function renderCanvasChart(data) {
            const canvas = document.getElementById('forecastCanvas');
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const hist = data.historical_points || [];
            const fut = data.forecast_points || [];
            const allPoints = [...hist.map(p => ({ d: p.date, val: p.actual_balance, isFut: false })),
                               ...fut.map(p => ({ d: p.date, val: p.predicted_balance, isFut: true, low: p.lower_bound, up: p.upper_bound }))];

            if (allPoints.length < 2) return;

            const vals = allPoints.map(p => p.val);
            const minVal = Math.min(...vals, ...fut.map(p => p.lower_bound || p.predicted_balance)) * 0.95;
            const maxVal = Math.max(...vals, ...fut.map(p => p.upper_bound || p.predicted_balance)) * 1.05;

            const padX = 70;
            const padY = 40;
            const plotW = w - padX * 2;
            const plotH = h - padY * 2;

            function getX(i) { return padX + (i / (allPoints.length - 1)) * plotW; }
            function getY(v) { return h - padY - ((v - minVal) / (maxVal - minVal)) * plotH; }

            // Vẽ lưới ngang
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';

            for (let step = 0; step <= 4; step++) {
                const v = minVal + (step / 4) * (maxVal - minVal);
                const y = getY(v);
                ctx.beginPath();
                ctx.moveTo(padX, y);
                ctx.lineTo(w - padX, y);
                ctx.stroke();
                ctx.fillText((v / 1e6).toFixed(1) + 'M', padX - 8, y + 4);
            }

            // Vẽ dải tin cậy tương lai (shaded confidence interval)
            const histLen = hist.length;
            if (fut.length > 0) {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
                ctx.beginPath();
                for (let i = 0; i < fut.length; i++) {
                    const idx = histLen + i;
                    const x = getX(idx);
                    const yUp = getY(fut[i].upper_bound);
                    if (i === 0) ctx.moveTo(x, yUp);
                    else ctx.lineTo(x, yUp);
                }
                for (let i = fut.length - 1; i >= 0; i--) {
                    const idx = histLen + i;
                    const x = getX(idx);
                    const yLow = getY(fut[i].lower_bound);
                    ctx.lineTo(x, yLow);
                }
                ctx.closePath();
                ctx.fill();
            }

            // Vẽ đường lịch sử (nét liền xanh dương)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);
            ctx.beginPath();
            for (let i = 0; i < histLen; i++) {
                const x = getX(i);
                const y = getY(hist[i].actual_balance);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Vẽ đường tương lai (nét đứt xanh lá)
            if (fut.length > 0) {
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                const lastHistX = getX(histLen - 1);
                const lastHistY = getY(hist[histLen - 1].actual_balance);
                ctx.moveTo(lastHistX, lastHistY);
                for (let i = 0; i < fut.length; i++) {
                    const idx = histLen + i;
                    ctx.lineTo(getX(idx), getY(fut[i].predicted_balance));
                }
                ctx.stroke();
            }

            // Vẽ nhãn phân cách Hôm nay (tự động theo ngày giao dịch mới nhất)
            const todayX = getX(histLen - 1);
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(todayX, padY);
            ctx.lineTo(todayX, h - padY);
            ctx.stroke();
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            const lastHistDate = hist[histLen - 1] && hist[histLen - 1].date ? hist[histLen - 1].date : '';
            let dateLabel = 'Hôm nay';
            if (lastHistDate) {
                const parts = lastHistDate.split('-');
                if (parts.length === 3) {
                    dateLabel = `Hôm nay (${parts[2]}/${parts[1]})`;
                }
            }
            ctx.fillText(dateLabel, todayX, padY - 10);
        }

        // --- LOGIC MODAL HỒ SƠ HÀNH VI AI 2 ---
        async function openProfileModal() {
            document.getElementById('profileModal').style.display = 'flex';
            const container = document.getElementById('profileContent');
            container.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 24px;">Đang tải hồ sơ từ AI 2...</div>';
            try {
                const res = await fetch('/api/behavior/profile?user_id=test_user_01');
                const data = await res.json();
                if (data.status !== 'SUCCESS') {
                    container.innerHTML = `<div style="color: #ef4444; padding: 16px;">${data.message || 'Lỗi tải hồ sơ'}</div>`;
                    return;
                }
                const p = data.persona;
                const s = data.summary;
                const r = data.rule_50_30_20;
                const scores = data.radar_scores;
                const findings = data.findings || [];

                container.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid ${p.color}; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 2.8rem;">${p.icon}</div>
                        <div>
                            <div style="font-size: 1.15rem; font-weight: 700; color: ${p.color};">${p.title}</div>
                            <div style="font-size: 0.85rem; color: #f8fafc; font-weight: 500; margin-top: 2px;">${p.tagline}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px; line-height: 1.4;">${p.description}</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div style="background: #0f172a; padding: 12px; border-radius: 10px; border: 1px solid #334155; text-align: center;">
                            <div style="font-size: 0.75rem; color: #94a3b8;">Tổng thu nhập</div>
                            <div style="font-size: 1rem; font-weight: 700; color: #38bdf8;">${(s.total_income/1e6).toFixed(1)}M VND</div>
                        </div>
                        <div style="background: #0f172a; padding: 12px; border-radius: 10px; border: 1px solid #334155; text-align: center;">
                            <div style="font-size: 0.75rem; color: #94a3b8;">Tổng chi tiêu</div>
                            <div style="font-size: 1rem; font-weight: 700; color: #f43f5e;">${(s.total_expense/1e6).toFixed(1)}M VND</div>
                        </div>
                        <div style="background: #0f172a; padding: 12px; border-radius: 10px; border: 1px solid #334155; text-align: center;">
                            <div style="font-size: 0.75rem; color: #94a3b8;">Tỷ lệ tiết kiệm</div>
                            <div style="font-size: 1rem; font-weight: 700; color: #10b981;">${s.savings_rate}% (${s.savings_label})</div>
                        </div>
                    </div>

                    <div style="background: #0f172a; padding: 14px; border-radius: 10px; border: 1px solid #334155;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-bottom: 8px;">Quy tắc 50/30/20 thực tế:</div>
                        <div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #334155; margin-bottom: 8px;">
                            <div style="width: ${r.needs_pct}%; background: #38bdf8;" title="Thiết yếu"></div>
                            <div style="width: ${r.wants_pct}%; background: #f59e0b;" title="Hưởng thụ"></div>
                            <div style="width: ${r.savings_pct}%; background: #10b981;" title="Tiết kiệm"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8;">
                            <span style="color: #38bdf8;">● Thiết yếu: ${r.needs_pct}% (Chuẩn 50%)</span>
                            <span style="color: #f59e0b;">● Hưởng thụ: ${r.wants_pct}% (Chuẩn 30%)</span>
                            <span style="color: #10b981;">● Tích lũy: ${r.savings_pct}% (Chuẩn 20%)</span>
                        </div>
                    </div>

                    <div style="background: #0f172a; padding: 14px; border-radius: 10px; border: 1px solid #334155;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-bottom: 10px;">Thang điểm hành vi (Radar Traits):</div>
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>Kỷ luật tích lũy</span><span style="font-weight: 600; color: #10b981;">${scores.savings_discipline}/100</span>
                                </div>
                                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${scores.savings_discipline}%; background: #10b981; height: 100%;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>Cân đối ăn uống</span><span style="font-weight: 600; color: #f59e0b;">${scores.food_moderation}/100</span>
                                </div>
                                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${scores.food_moderation}%; background: #f59e0b; height: 100%;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>Tiết chế hưởng thụ / mua sắm</span><span style="font-weight: 600; color: #38bdf8;">${scores.lifestyle_moderation}/100</span>
                                </div>
                                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${scores.lifestyle_moderation}%; background: #38bdf8; height: 100%;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>Ổn định thời gian (Không dồn cuối tháng/đêm)</span><span style="font-weight: 600; color: #a78bfa;">${scores.temporal_stability}/100</span>
                                </div>
                                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${scores.temporal_stability}%; background: #a78bfa; height: 100%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; padding: 12px 14px; border-radius: 8px;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #38bdf8; margin-bottom: 6px;">💡 Phát hiện hành vi từ dữ liệu:</div>
                        <ul style="padding-left: 18px; font-size: 0.8rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 4px;">
                            ${findings.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } catch (err) {
                container.innerHTML = `<div style="color: #ef4444; padding: 16px;">Lỗi: ${err.message}</div>`;
            }
        }
        function closeProfileModal() {
            document.getElementById('profileModal').style.display = 'none';
        }

        // --- LOGIC MODAL GỢI Ý TÀI CHÍNH AI 5 ---
        async function openRecModal() {
            document.getElementById('recModal').style.display = 'flex';
            const container = document.getElementById('recContent');
            container.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 24px;">Đang sinh khuyến nghị tài chính từ AI 5...</div>';
            try {
                const res = await fetch('/api/recommendations?user_id=test_user_01');
                const data = await res.json();
                if (data.status !== 'SUCCESS') {
                    container.innerHTML = `<div style="color: #ef4444; padding: 16px;">${data.message || 'Lỗi tải gợi ý'}</div>`;
                    return;
                }
                const recs = data.recommendations || [];
                const cardsHtml = recs.map((r, idx) => `
                    <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid ${r.badge_color}; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.4rem;">${r.icon}</span>
                                <div>
                                    <div style="font-size: 0.95rem; font-weight: 700; color: #f8fafc;">${idx + 1}. ${r.title}</div>
                                    <div style="font-size: 0.75rem; color: #94a3b8;">Danh mục: ${r.category} &bull; Tác động: <strong style="color: #10b981;">+${Number(r.impact_monthly_vnd).toLocaleString()} đ/tháng</strong></div>
                                </div>
                            </div>
                            <span style="font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: ${r.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${r.priority === 'HIGH' ? '#f87171' : '#fbbf24'}; border: 1px solid ${r.priority === 'HIGH' ? '#ef4444' : '#f59e0b'};">
                                ${r.priority === 'HIGH' ? 'ƯU TIÊN CAO' : 'ƯU TIÊN VỪA'}
                            </span>
                        </div>
                        <div style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5; background: rgba(30, 41, 59, 0.5); padding: 8px 12px; border-radius: 8px;">
                            ${r.explanation}
                        </div>
                        <div style="margin-top: 4px;">
                            <div style="font-size: 0.78rem; font-weight: 600; color: #38bdf8; margin-bottom: 4px;">🎯 Các bước hành động:</div>
                            <ul style="padding-left: 18px; font-size: 0.78rem; color: #94a3b8; display: flex; flex-direction: column; gap: 3px;">
                                ${(r.action_steps || []).map(act => `<li>${act}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('');

                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid #0284c7; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px;">
                            <div style="font-size: 2rem; font-weight: 800; color: ${data.health_badge_color};">${data.health_score}</div>
                            <div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">Điểm sức khỏe tài chính</div>
                                <div style="font-size: 0.9rem; font-weight: 700; color: ${data.health_badge_color};">${data.health_rating}</div>
                            </div>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid #059669; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px;">
                            <div style="font-size: 1.8rem; font-weight: 800; color: #10b981;">+${(data.total_monthly_potential_savings / 1000).toFixed(0)}k</div>
                            <div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">Tiết kiệm thêm mỗi tháng</div>
                                <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc;">Từ việc cắt giảm 15% ăn uống</div>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; color: #fcd34d; line-height: 1.5;">
                        💬 <strong>Cố vấn tài chính AI:</strong> ${data.overall_advice}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
                        ${cardsHtml}
                    </div>
                `;
            } catch (err) {
                container.innerHTML = `<div style="color: #ef4444; padding: 16px;">Lỗi: ${err.message}</div>`;
            }
        }
        function closeRecModal() {
            document.getElementById('recModal').style.display = 'none';
        }
    </script>

    <!-- MODAL BIỂU ĐỒ AI 3 -->
    <div id="forecastModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); justify-content: center; align-items: center; z-index: 100;">
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 90%; max-width: 820px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="font-size: 1.15rem; font-weight: 700; color: #f8fafc;">📈 Biểu đồ Dự báo Tài chính (AI 3 - Facebook Prophet)</h2>
                    <p id="forecastModalSubtitle" style="font-size: 0.8rem; color: #94a3b8;">Dữ liệu: Đang tính toán chuỗi thời gian &bull; Khoảng tin cậy: 80% &bull; Chu kỳ: Tuần/Tháng</p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button onclick="loadForecastChart()" style="background: var(--surface-hover); border: 1px solid var(--border); color: var(--primary); padding: 5px 12px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 600;">🔄 Làm mới</button>
                    <button onclick="closeForecastModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 4px 8px;">&times;</button>
                </div>
            </div>

            <div style="display: flex; gap: 16px; font-size: 0.82rem; justify-content: center;">
                <span style="color: #38bdf8;">━━ Quá khứ (Lịch sử số dư)</span>
                <span style="color: #34d399;">┄┄ Tương lai (Prophet dự báo)</span>
                <span style="color: rgba(56, 189, 248, 0.7); background: rgba(56, 189, 248, 0.15); padding: 2px 6px; border-radius: 4px;">Dải tin cậy 80%</span>
            </div>

            <canvas id="forecastCanvas" width="760" height="320" style="width: 100%; height: 320px; background: #0f172a; border-radius: 10px; border: 1px solid #334155;"></canvas>

            <div id="chartStatus" style="font-size: 0.9rem; color: #38bdf8; background: #0f172a; padding: 12px 16px; border-radius: 10px; border-left: 4px solid #38bdf8; line-height: 1.5;">
                Đang tải dữ liệu...
            </div>
        </div>
    </div>

    <!-- MODAL HỒ SƠ HÀNH VI AI 2 -->
    <div id="profileModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); justify-content: center; align-items: center; z-index: 100;">
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 90%; max-width: 720px; max-height: 85vh; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="font-size: 1.15rem; font-weight: 700; color: #f8fafc;">👤 Hồ Sơ Hành Vi Chi Tiêu (AI 2 Profiling)</h2>
                    <p style="font-size: 0.8rem; color: #94a3b8;">Phân cụm Persona &bull; Quy tắc 50/30/20 &bull; Phân tích thói quen thời gian</p>
                </div>
                <button onclick="closeProfileModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 4px 8px;">&times;</button>
            </div>

            <div id="profileContent" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="color: #94a3b8; text-align: center; padding: 24px;">Đang phân tích hồ sơ người dùng...</div>
            </div>
        </div>
    </div>

    <!-- MODAL GỢI Ý TÀI CHÍNH AI 5 -->
    <div id="recModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); justify-content: center; align-items: center; z-index: 100;">
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 90%; max-width: 760px; max-height: 85vh; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="font-size: 1.15rem; font-weight: 700; color: #f8fafc;">💡 Gợi Ý & Tư Vấn Tài Chính Cá Nhân Hóa (AI 5)</h2>
                    <p style="font-size: 0.8rem; color: #94a3b8;">Tối ưu hóa ngân sách &bull; Xây dựng quỹ khẩn cấp &bull; Hành động cụ thể</p>
                </div>
                <button onclick="closeRecModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 4px 8px;">&times;</button>
            </div>

            <div id="recContent" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="color: #94a3b8; text-align: center; padding: 24px;">Đang tính toán khuyến nghị tài chính...</div>
            </div>
        </div>
    </div>
</body>
</html>
"""

@app.on_event("startup")
def on_startup():
    """Tự động kiểm tra seed data và đồng bộ giao dịch tới ngày hôm nay khi khởi động máy chủ"""
    try:
        from seed_data import seed
        seed()
    except Exception as e:
        print(f"[Startup Warning] Seed sync failed: {e}")

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Giao diện Web Chat trực quan để test và demo trực tiếp"""
    return HTMLResponse(
        content=HTML_CHAT_UI,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

class ChatRequest(BaseModel):
    question: str
    user_id: Optional[str] = "test_user_01"

class ChatResponse(BaseModel):
    answer: str
    status: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Endpoint Chatbot AI: Nhận câu hỏi ngôn ngữ tự nhiên từ người dùng,
    tự động gọi tools truy vấn dữ liệu chi tiêu / ngân sách / số dư và trả lời.
    """
    answer = run_chat(question=request.question, user_id=request.user_id)
    return ChatResponse(
        answer=answer,
        status="success"
    )

# --- CÁC ENDPOINT AI 3 (DỰ BÁO TÀI CHÍNH) ---
from forecaster import (
    forecast_balance,
    forecast_spending,
    forecast_category_spending,
    forecast_goal_completion
)

@app.get("/api/forecast/balance")
def api_forecast_balance(user_id: str = "test_user_01", days: int = 30):
    """
    API Dự báo số dư tài khoản bằng mô hình chuỗi thời gian Facebook Prophet.
    Trả về dữ liệu lịch sử và các điểm dự báo tương lai để Frontend vẽ Line Chart.
    """
    return forecast_balance(user_id=user_id, horizon_days=days)

@app.get("/api/forecast/spending")
def api_forecast_spending(user_id: str = "test_user_01", days: int = 30):
    """
    API Dự báo mức chi tiêu trung bình mỗi ngày trong N ngày tới.
    """
    return forecast_spending(user_id=user_id, horizon_days=days)

@app.get("/api/forecast/category")
def api_forecast_category(user_id: str = "test_user_01", category: str = "Ăn uống"):
    """
    API Dự báo tổng chi tiêu cho một danh mục đến cuối tháng và đối chiếu ngân sách.
    """
    return forecast_category_spending(user_id=user_id, category_name=category)

@app.get("/api/forecast/goals")
def api_forecast_goals(user_id: str = "test_user_01", goal_name: Optional[str] = None):
    """
    API Ước lượng thời gian và dự đoán khi nào đạt mục tiêu tài chính.
    """
    return forecast_goal_completion(user_id=user_id, goal_name=goal_name)

# --- CÁC ENDPOINT AI 4 (PHÁT HIỆN BẤT THƯỜNG - ISOLATION FOREST) ---
from anomaly_detector import detector

class AnomalyCheckRequest(BaseModel):
    amount: float
    category_id: Optional[str] = "cat_food"
    hour: Optional[int] = 12

@app.get("/api/anomalies")
def api_get_anomalies(user_id: str = "test_user_01"):
    """
    API Quét toàn bộ lịch sử giao dịch và trả về các giao dịch bị đánh dấu bất thường.
    """
    return detector.scan_historical_anomalies(user_id=user_id)

@app.post("/api/anomalies/check")
def api_check_anomaly(req: AnomalyCheckRequest):
    """
    API Kiểm tra một giao dịch mới xem có dấu hiệu bất thường không (Isolation Forest).
    """
    from datetime import datetime
    dummy_dt = datetime.now().replace(hour=req.hour or 12)
    return detector.inspect_transaction(
        amount=req.amount,
        category_id=req.category_id,
        occurred_at=dummy_dt
    )

# --- CÁC ENDPOINT AI 2 (PHÂN TÍCH HÀNH VI CHI TIÊU - BEHAVIOR PROFILING) ---
from behavior_profiler import profiler

@app.get("/api/behavior/profile")
def api_get_behavior_profile(user_id: str = "test_user_01"):
    """
    API Phân tích hồ sơ hành vi chi tiêu (AI 2):
    - Đánh giá tỷ lệ tiết kiệm & phân bổ quy tắc 50/30/20.
    - Phát hiện thói quen: chi tiêu nhiều vào ăn uống, dồn tiền cuối tháng, chi tiêu đêm.
    - Phân cụm hình mẫu tài chính (Persona Archetype) kèm thang điểm Radar Chart (0 - 100).
    """
    return profiler.analyze_user(user_id=user_id)

# --- CÁC ENDPOINT AI 5 (GỢI Ý VÀ TƯ VẤN TÀI CHÍNH CÁ NHÂN HÓA) ---
from recommender import recommender

@app.get("/api/recommendations")
def api_get_recommendations(user_id: str = "test_user_01"):
    """
    API Gợi ý và tư vấn tài chính cá nhân hóa (AI 5):
    - Đề xuất cắt giảm chi tiêu ăn uống khoảng 15%.
    - Tăng mức tiết kiệm hàng tháng theo chuẩn 50/30/20.
    - Xây dựng quỹ dự phòng khẩn cấp trước khi đầu tư.
    - Điều chỉnh ngân sách phù hợp thu nhập.
    - Chấm điểm sức khỏe tài chính tổng hợp.
    """
    return recommender.generate_recommendations(user_id=user_id)





