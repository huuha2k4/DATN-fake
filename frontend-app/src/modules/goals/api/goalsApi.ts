import { API_BASE_URL, authStorage, authFetch } from '../../auth/api/authApi';

export interface GoalItem {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon?: string;
  percentage: number;
  category?: string;
}

export interface ContributionHistoryItem {
  id: string;
  title: string;
  date: string;
  amount: number;
  type?: 'deposit' | 'withdraw';
  note?: string;
  accountName?: string;
}

export interface GoalDetailData {
  id: string;
  title: string;
  category: string;
  description: string;
  percentage: number;
  currentAmount: number;
  targetAmount: number;
  deadline?: string;
  daysRemaining?: number;
  additionalNeeded: number;
  frequency?: string;
  icon?: string;
  version?: number;
  isSaving?: boolean;
  history: ContributionHistoryItem[];
}

export const fallbackGoalDetail: GoalDetailData = {
  id: 'goal-study-laptop',
  title: 'Mua laptop học tập',
  category: 'Học tập',
  description: 'Tiết kiệm để mua laptop phục vụ học tập và làm đồ án.',
  percentage: 75.0,
  currentAmount: 15000000,
  targetAmount: 20000000,
  deadline: '30/04/2027',
  daysRemaining: 173,
  additionalNeeded: 5000000,
  icon: 'cap',
  history: [
    {
      id: 'hist-1',
      title: 'Tiết kiệm định kỳ',
      date: '08:30 • 01/11/2026',
      amount: 2000000,
      type: 'deposit',
      note: 'Trích từ lương tháng 10 vào quỹ laptop',
      accountName: 'Tài khoản chính (VPBank)',
    },
    {
      id: 'hist-2',
      title: 'Tiết kiệm định kỳ',
      date: '14:15 • 25/10/2026',
      amount: 3000000,
      type: 'deposit',
      note: 'Tiết kiệm thưởng dự án',
      accountName: 'Ví điện tử MoMo',
    },
    {
      id: 'hist-3',
      title: 'Tiết kiệm định kỳ',
      date: '09:00 • 10/10/2026',
      amount: 1500000,
      type: 'deposit',
      note: 'Nộp tiết kiệm đầu kỳ',
      accountName: 'Tài khoản Techcombank',
    },
  ],
};

export const fallbackGoals: GoalItem[] = [
  {
    id: 'goal-1',
    title: 'Mua laptop mới',
    targetAmount: 15000000,
    currentAmount: 8000000,
    deadline: '31/01/2027',
    percentage: 53,
    icon: 'shopping',
    category: 'Mua sắm lớn',
  },
  {
    id: 'goal-2',
    title: 'Du lịch Đà Nẵng',
    targetAmount: 5000000,
    currentAmount: 3000000,
    deadline: '30/06/2027',
    percentage: 60,
    icon: 'travel',
    category: 'Du lịch',
  },
  {
    id: 'goal-3',
    title: 'Mua xe máy',
    targetAmount: 25000000,
    currentAmount: 1000000,
    deadline: '31/12/2027',
    percentage: 4,
    icon: 'shopping',
    category: 'Mua sắm lớn',
  },
];

export interface SavingItem {
  id: string;
  title: string;
  subtitle: string;
  currentAmount: number;
  category: string;
  icon?: string;
  description?: string;
}

export const fallbackSavings: SavingItem[] = [
  {
    id: 'saving-1',
    title: 'Tiết kiệm tự do',
    subtitle: 'Tích lũy không giới hạn',
    currentAmount: 4500000,
    category: 'Tiết kiệm tự do',
    icon: 'saving_free',
    description: 'Tích lũy tài chính tự do, không áp lực mục tiêu hay thời hạn.',
  },
  {
    id: 'saving-2',
    title: 'Quỹ dự phòng',
    subtitle: 'Dành cho tình huống bất ngờ',
    currentAmount: 2000000,
    category: 'Quỹ dự phòng khẩn cấp',
    icon: 'saving_emergency',
    description: 'Dành cho tình huống y tế, bất ngờ hoặc khẩn cấp trong cuộc sống.',
  },
];

export const goalsApi = {
  async getGoals(): Promise<{ goals: GoalItem[]; savings: SavingItem[]; totalAccumulated: number; totalGoalsAmount: number; totalSavingsAmount: number }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals`);
      if (res.ok) {
        const json = await res.json();
        const rawGoals = json?.data?.goals || json?.goals || (Array.isArray(json) ? json : []);
        if (Array.isArray(rawGoals) && rawGoals.length > 0) {
          // Tách riêng mục tiêu có hạn/mục tiêu tiền vs khoản tích lũy tự do (targetAmount === 0 hoặc không có deadline)
          const apiGoals: GoalItem[] = [];
          const apiSavings: SavingItem[] = [];

          rawGoals.forEach((g: any, idx: number) => {
            const current = Number(g.currentAmount || g.savedAmount || g.current_amount || 0);
            const target = Number(g.targetAmount || g.target_amount || 0);
            const hasTarget = target > 0;
            const hasDeadline = Boolean(g.targetDate || g.deadline);

            const isSavingsItem = (!hasTarget && !hasDeadline) || String(g.goalType).includes('SAVING') || String(g.category || '').toLowerCase().includes('tiết kiệm') || String(g.category || '').toLowerCase().includes('dự phòng');

            if (isSavingsItem) {
              const cat = g.category || 'Tiết kiệm tự do';
              let iconKey = 'saving_free';
              const lowCat = cat.toLowerCase();
              if (lowCat.includes('khẩn cấp') || lowCat.includes('dự phòng')) iconKey = 'saving_emergency';
              else if (lowCat.includes('kỳ hạn') || lowCat.includes('kì hạn')) iconKey = 'saving_term';
              else if (lowCat.includes('dài hạn')) iconKey = 'saving_longterm';
              else if (lowCat.includes('khác')) iconKey = 'saving_other';

              apiSavings.push({
                id: g.id || `saving-${idx}`,
                title: g.title || g.name || 'Khoản tiết kiệm',
                subtitle: g.description || 'Tích lũy tài chính',
                currentAmount: current,
                category: cat,
                icon: g.icon || iconKey,
                description: g.description,
              });
            } else {
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              let catName = g.category || '';
              if (!catName && g.goalType) {
                const gt = String(g.goalType).toUpperCase();
                if (gt === 'PURCHASE') catName = 'Mua sắm lớn';
                else if (gt === 'VACATION') catName = 'Du lịch';
                else if (gt === 'EDUCATION') catName = 'Học tập';
                else if (gt === 'INVESTMENT') catName = 'Đầu tư';
                else if (gt === 'DEBT_PAYOFF') catName = 'Thanh toán nợ';
                else if (gt === 'EMERGENCY_FUND') catName = 'Gia đình';
                else catName = 'Mục tiêu khác';
              }
              if (!catName) catName = 'Mua sắm lớn';

              const iconKey =
                g.icon ||
                (catName.toLowerCase().includes('mua') ? 'shopping' :
                 catName.toLowerCase().includes('du lịch') ? 'travel' :
                 catName.toLowerCase().includes('học') ? 'education' :
                 catName.toLowerCase().includes('đầu tư') ? 'investment' :
                 catName.toLowerCase().includes('nợ') ? 'debt' :
                 catName.toLowerCase().includes('gia đình') ? 'family' : 'other');

              apiGoals.push({
                id: g.id || `goal-${idx}`,
                title: g.title || g.name || 'Mục tiêu',
                targetAmount: target,
                currentAmount: current,
                deadline: g.deadline ? String(g.deadline).split('-').reverse().join('/') : (g.targetDate ? String(g.targetDate).split('-').reverse().join('/') : '31/12/2027'),
                percentage: pct,
                icon: iconKey,
                category: catName,
              });
            }
          });

          const finalGoals = apiGoals;
          const finalSavings = apiSavings;

          const totalG = finalGoals.reduce((sum, g) => sum + g.currentAmount, 0);
          const totalS = finalSavings.reduce((sum, s) => sum + s.currentAmount, 0);

          return {
            goals: finalGoals,
            savings: finalSavings,
            totalAccumulated: totalG + totalS,
            totalGoalsAmount: totalG,
            totalSavingsAmount: totalS,
          };
        }
      }
    } catch {
      // ignore
    }

    return {
      goals: [],
      savings: [],
      totalAccumulated: 0,
      totalGoalsAmount: 0,
      totalSavingsAmount: 0,
    };
  },

  async getGoalDetail(goalId: string): Promise<GoalDetailData> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals/${goalId}`);
      if (res.ok) {
        const json = await res.json();
        const g = json?.data || json;
        if (g && (g.title || g.name)) {
          const current = Number(g.currentAmount || g.savedAmount || g.current_amount || 0);
          const target = Number(g.targetAmount || g.target_amount || 1);
          const pct = Number(((current / (target || 1)) * 100).toFixed(1));
          const remaining = Math.max(0, target - current);

          // Map GoalType or Category to Vietnamese category name
          let cat = g.category || '';
          if (!cat && g.goalType) {
            const gt = String(g.goalType).toUpperCase();
            if (gt === 'PURCHASE') cat = 'Mua sắm lớn';
            else if (gt === 'VACATION') cat = 'Du lịch';
            else if (gt === 'EDUCATION') cat = 'Học tập';
            else if (gt === 'INVESTMENT') cat = 'Đầu tư';
            else if (gt === 'DEBT_PAYOFF') cat = 'Thanh toán nợ';
            else if (gt === 'EMERGENCY_FUND') cat = 'Gia đình';
            else cat = 'Mục tiêu khác';
          }
          if (!cat) cat = 'Mua sắm lớn';

          const iconKey =
            g.icon ||
            (cat.toLowerCase().includes('mua') ? 'shopping' :
             cat.toLowerCase().includes('du lịch') ? 'travel' :
             cat.toLowerCase().includes('học') ? 'education' :
             cat.toLowerCase().includes('đầu tư') ? 'investment' :
             cat.toLowerCase().includes('nợ') ? 'debt' :
             cat.toLowerCase().includes('gia đình') ? 'family' : 'other');

          // Target date & days remaining
          let targetDateStr = '30/04/2027';
          let daysLeft = 173;
          if (g.targetDate || g.deadline) {
            const rawDate = String(g.targetDate || g.deadline);
            targetDateStr = rawDate.split('-').reverse().join('/');
            const targetMs = new Date(rawDate).getTime();
            const nowMs = Date.now();
            if (!isNaN(targetMs)) {
              daysLeft = Math.max(0, Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24)));
            }
          }
          if (g.daysRemaining !== undefined && g.daysRemaining !== null) {
            daysLeft = Number(g.daysRemaining);
          }

          // Auto save frequency
          let freqStr = 'Hàng tháng';
          const autoSaveFreq = g.autoSave?.frequency || g.auto_save_frequency || g.frequency;
          if (autoSaveFreq) {
            const freqUpper = String(autoSaveFreq).toUpperCase();
            if (freqUpper === 'DAILY') freqStr = 'Hàng ngày';
            else if (freqUpper === 'WEEKLY') freqStr = 'Hàng tuần';
            else if (freqUpper === 'MONTHLY') freqStr = 'Hàng tháng';
            else if (freqUpper === 'QUARTERLY') freqStr = 'Hàng quý';
          }

          // History contributions
          let historyList: ContributionHistoryItem[] = fallbackGoalDetail.history;
          if (Array.isArray(g.contributions) && g.contributions.length > 0) {
            historyList = g.contributions.map((c: any, cIdx: number) => {
              const dt = c.contributedAt ? new Date(c.contributedAt) : new Date();
              const formattedDate = !isNaN(dt.getTime())
                ? `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')} • ${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
                : '09:00 • 01/11/2026';
              const isWithdraw = Number(c.amount || 0) < 0;
              const accName = c.sourceAccountName || c.accountName || (c.sourceAccountId ? `Tài khoản (${String(c.sourceAccountId).substring(0, 8)})` : 'Tài khoản chính (VPBank)');

              return {
                id: c.id || `contrib-${cIdx}`,
                title: c.note || (isWithdraw ? 'Rút tiền mục tiêu' : 'Tiết kiệm định kỳ'),
                date: formattedDate,
                amount: Math.abs(Number(c.amount || 0)),
                type: isWithdraw ? 'withdraw' : 'deposit',
                note: c.note || (isWithdraw ? 'Rút tiền chi tiêu đột xuất' : 'Nộp tiền vào mục tiêu'),
                accountName: accName,
              };
            });
          }

          const isSavingItem =
            target <= 0 ||
            !g.targetDate ||
            String(g.goalType).includes('SAVING') ||
            String(g.category || '').toLowerCase().includes('tiết kiệm') ||
            String(g.icon || '').startsWith('saving_');

          return {
            id: g.id || goalId,
            title: g.title || g.name,
            category: isSavingItem ? (g.category || 'Tiết kiệm tự do') : cat,
            description: g.description || (isSavingItem ? 'Tích lũy tài chính tự do, linh hoạt rút nộp khi cần.' : `Tiết kiệm để ${g.name || 'đạt mục tiêu'} phục vụ kế hoạch tương lai.`),
            percentage: isSavingItem ? 100 : pct,
            currentAmount: current,
            targetAmount: target,
            deadline: isSavingItem ? undefined : targetDateStr,
            daysRemaining: isSavingItem ? undefined : daysLeft,
            additionalNeeded: isSavingItem ? 0 : remaining,
            frequency: freqStr,
            icon: iconKey,
            version: g.version ?? 0,
            isSaving: isSavingItem,
            history: historyList,
          };
        }
      }
    } catch {
      // ignore
    }

    const matchedGoal = fallbackGoals.find((g) => g.id === goalId);
    if (matchedGoal) {
      return {
        ...fallbackGoalDetail,
        id: matchedGoal.id,
        title: matchedGoal.title,
        category: matchedGoal.category || 'Mua sắm lớn',
        icon: matchedGoal.icon || 'shopping',
        currentAmount: matchedGoal.currentAmount,
        targetAmount: matchedGoal.targetAmount,
        percentage: matchedGoal.percentage,
        additionalNeeded: Math.max(0, matchedGoal.targetAmount - matchedGoal.currentAmount),
        deadline: matchedGoal.deadline || '30/04/2027',
        daysRemaining: 173,
        frequency: 'Hàng tháng',
        version: 0,
      };
    }

    return fallbackGoalDetail;
  },

  async createGoal(payload: {
    name: string;
    goalType: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate?: string; // YYYY-MM-DD
    description?: string;
    icon?: string;
    accountId?: string;
  }): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          goalType: payload.goalType,
          targetAmount: payload.targetAmount,
          currentAmount: payload.currentAmount || 0,
          currencyCode: 'VND',
          targetDate: payload.targetDate,
          description: payload.description,
          icon: payload.icon || 'shopping',
          priority: 'MEDIUM',
          accountId: payload.accountId || undefined,
        }),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || errJson?.error || `Lỗi máy chủ (${res.status})`;
      return { ok: false, message: errMsg };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Không thể kết nối đến máy chủ.' };
    }
  },

  async updateGoal(
    goalId: string,
    payload: {
      name?: string;
      targetAmount?: number;
      targetDate?: string;
      description?: string;
      version: number;
    }
  ): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          targetAmount: payload.targetAmount,
          targetDate: payload.targetDate,
          description: payload.description,
          version: payload.version,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteGoal(goalId: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals/${goalId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async createSaving(payload: {
    name: string;
    category: string;
    currentAmount?: number;
    description?: string;
    icon?: string;
    accountId?: string;
  }): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          goalType: 'EMERGENCY_FUND',
          targetAmount: 0,
          currentAmount: payload.currentAmount || 0,
          currencyCode: 'VND',
          description: payload.description,
          icon: payload.icon || 'saving_free',
          priority: 'MEDIUM',
          accountId: payload.accountId || undefined,
        }),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || errJson?.error || `Lỗi máy chủ (${res.status})`;
      return { ok: false, message: errMsg };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Không thể kết nối đến máy chủ.' };
    }
  },

  async contributeGoal(
    goalId: string,
    payload: {
      amount: number;
      note?: string;
      sourceAccountId?: string;
    }
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals/${goalId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || errJson?.error || `Lỗi máy chủ (${res.status})`;
      return { ok: false, message: errMsg };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Không thể kết nối đến máy chủ.' };
    }
  },

  async withdrawGoal(
    goalId: string,
    payload: {
      amount: number;
      note?: string;
      targetAccountId?: string;
    }
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/goals/${goalId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || errJson?.error || `Lỗi máy chủ (${res.status})`;
      return { ok: false, message: errMsg };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Không thể kết nối đến máy chủ.' };
    }
  },
};

