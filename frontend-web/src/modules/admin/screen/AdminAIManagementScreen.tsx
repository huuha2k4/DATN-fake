import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface AlgorithmInfo {
  name: string;
  type: string;
  engine: string;
  status: string;
  desc: string;
}

interface RecentSession {
  id: string;
  title: string;
  userId: string;
  userName: string;
  userEmail: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AIAdminStats {
  status: string;
  provider: string;
  activeModel: string;
  temperature: number;
  totalSessions: number;
  totalMessages: number;
  algorithms: AlgorithmInfo[];
  recentSessions: RecentSession[];
}

export const AdminAIManagementScreen: React.FC = () => {
  const [data, setData] = useState<AIAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get<AIAdminStats>('/api/ai/admin/stats');
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể kết nối đến FinAI Service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            FinAI Engine · Giám sát & Quản trị AI
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Trung tâm Điều hành Trí tuệ Nhân tạo
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi trạng thái 4 mô hình học máy (Gemini, Prophet, Isolation Forest, Persona 50/30/20) và lịch sử hội thoại toàn hệ thống.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <FinanceIcon name="refresh" size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Đang làm mới...' : 'Làm mới số liệu'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={fetchStats} className="underline font-semibold ml-2">Thử lại</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Model đang chạy */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Mô hình LLM Hiện tại</span>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">🤖</span>
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 dark:text-white truncate" title={data?.activeModel || 'Đang tải...'}>
            {data?.activeModel || 'gemini-flash-lite-latest'}
          </div>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ● {data?.provider || 'Google Gemini API'}
          </p>
        </div>

        {/* Tổng số phiên trò chuyện */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Cuộc trò chuyện (Sessions)</span>
            <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">💬</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data?.totalSessions ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tổng phiên đã lưu trong DB
          </p>
        </div>

        {/* Tổng tin nhắn hỏi đáp */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Lượt tương tác (Messages)</span>
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">⚡</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data?.totalMessages ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tin nhắn User & FinAI
          </p>
        </div>

        {/* Trạng thái máy chủ AI */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Trạng thái Engine</span>
            <span className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-lg">🛡️</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span>HOẠT ĐỘNG</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            FastAPI :8000 · Dockerized
          </p>
        </div>
      </div>

      {/* 4 Thuật toán AI của Finora */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🧠</span>
          Danh mục Mô hình & Thuật toán AI (Core AI Engines)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.algorithms?.map((algo, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{algo.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {algo.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  Engine: {algo.engine}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {algo.desc}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Loại mô hình:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{algo.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danh sách phiên trò chuyện gần nhất */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span>
              Nhật ký Phiên Hội thoại AI Gần đây
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Các cuộc trò chuyện được người dùng tương tác với FinAI lưu trữ tại database
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
            {data?.recentSessions?.length ?? 0} phiên mới nhất
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Tiêu đề cuộc trò chuyện</th>
                <th className="py-3 px-4">Người dùng</th>
                <th className="py-3 px-4 text-center">Số tin nhắn</th>
                <th className="py-3 px-4">Thời gian cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {data?.recentSessions && data.recentSessions.length > 0 ? (
                data.recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium max-w-xs truncate" title={s.title}>
                      <span className="mr-1.5">💬</span>
                      {s.title}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.userName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{s.userEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {s.messageCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {s.updatedAt
                        ? new Date(s.updatedAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Chưa có phiên hội thoại nào được ghi nhận.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

