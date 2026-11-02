path = 'frontend-web/src/modules/group/screen/GroupManagementScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Hide Create Group button in header
old_create_btn = """          <div className="flex items-center justify-between pb-3 border-b border-[#edf3ef] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
                Nhóm của bạn
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-[#07543f] dark:text-emerald-300">
                {groups.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 px-3 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center gap-1.5 shadow-2xs"
            >
              <FinanceIcon name="plus" size={13} />
              <span>Tạo nhóm</span>
            </button>
          </div>"""

new_create_btn = """          <div className="flex items-center justify-between pb-3 border-b border-[#edf3ef] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
                Nhóm của bạn
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-[#07543f] dark:text-emerald-300">
                {groups.length}
              </span>
            </div>
            {!isChildAccount && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8 px-3 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center gap-1.5 shadow-2xs"
              >
                <FinanceIcon name="plus" size={13} />
                <span>Tạo nhóm</span>
              </button>
            )}
          </div>"""
c = c.replace(old_create_btn, new_create_btn)

# 2. Hide Create Group empty button
old_empty_btn = """              <p className="text-xs text-[#718579] dark:text-slate-400 m-0">
                Hãy tạo nhóm gia đình hoặc bạn bè để cùng chia tiền sinh hoạt
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 h-9 px-4 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition shadow-2xs"
              >
                + Tạo nhóm đầu tiên
              </button>"""

new_empty_btn = """              <p className="text-xs text-[#718579] dark:text-slate-400 m-0">
                Hãy tạo nhóm gia đình hoặc bạn bè để cùng chia tiền sinh hoạt
              </p>
              {!isChildAccount && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2 h-9 px-4 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition shadow-2xs"
                >
                  + Tạo nhóm đầu tiên
                </button>
              )}"""
c = c.replace(old_empty_btn, new_empty_btn)

# 3. Hide quick action buttons (Them khoan chi, Nop quy)
old_quick_actions = """                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="h-9 px-3.5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <FinanceIcon name="plus" size={14} />
                    <span>Thêm khoản chi</span>
                  </button>

                  {/* Chỉ Trưởng nhóm hoặc Quản trị viên mới thấy nút Mời thành viên */}
                  <button type="button" onClick={() => setIsFundModalOpen(true)} className="h-9 px-3.5 rounded-xl border border-emerald-300 text-xs font-bold text-[#07543f] hover:bg-emerald-50 transition flex items-center gap-1.5">
                    <FinanceIcon name="wallet" size={14} />
                    <span>Nộp quỹ</span>
                  </button>"""

new_quick_actions = """                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isChildAccount && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="h-9 px-3.5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <FinanceIcon name="plus" size={14} />
                        <span>Thêm khoản chi</span>
                      </button>

                      <button type="button" onClick={() => setIsFundModalOpen(true)} className="h-9 px-3.5 rounded-xl border border-emerald-300 text-xs font-bold text-[#07543f] hover:bg-emerald-50 transition flex items-center gap-1.5">
                        <FinanceIcon name="wallet" size={14} />
                        <span>Nộp quỹ</span>
                      </button>
                    </>
                  )}"""
c = c.replace(old_quick_actions, new_quick_actions)

# 4. Hide Tong quan, Thu & chi, Vi tre em, Can doi for isChildAccount
old_subtabs = """              {/* Sub-tabs Navigation */}
              <div className="flex border-b border-[#edf3ef] dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'OVERVIEW'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="chart" size={15} />
                  <span>Tổng quan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('EXPENSES')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'EXPENSES'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="receipt" size={15} />
                  <span>Thu & chi ({expenses.length + fundContributions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('CHAT')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'CHAT'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="message-square" size={15} />
                  <span>Trò chuyện</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 min-w-[18px] text-[10px] font-extrabold bg-red-500 text-white rounded-full grid place-items-center animate-pulse shadow-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MEMBERS')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'MEMBERS'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="users" size={15} />
                  <span>Thành viên ({members.length})</span>
                </button>
                {selectedGroup.groupType === 'FAMILY' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('CHILD_WALLETS')}
                    className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'CHILD_WALLETS'
                        ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <FinanceIcon name="wallet" size={15} />
                    <span>Ví trẻ em ({childWallets.length})</span>
                  </button>
                )}
                {selectedGroup.groupType !== 'FAMILY' && selectedGroup.groupType !== 'COUPLE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('BALANCES')}
                      className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'BALANCES'
                          ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FinanceIcon name="refresh" size={15} />
                      <span>Cân đối & bù trừ</span>
                    </button>
                  </>
                )}
              </div>"""

new_subtabs = """              {/* Sub-tabs Navigation */}
              <div className="flex border-b border-[#edf3ef] dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                {!isChildAccount && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('OVERVIEW')}
                      className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'OVERVIEW'
                          ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FinanceIcon name="chart" size={15} />
                      <span>Tổng quan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('EXPENSES')}
                      className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'EXPENSES'
                          ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FinanceIcon name="receipt" size={15} />
                      <span>Thu & chi ({expenses.length + fundContributions.length})</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('CHAT')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'CHAT'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="message-square" size={15} />
                  <span>Trò chuyện</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 min-w-[18px] text-[10px] font-extrabold bg-red-500 text-white rounded-full grid place-items-center animate-pulse shadow-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MEMBERS')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'MEMBERS'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="users" size={15} />
                  <span>Thành viên ({members.length})</span>
                </button>
                {!isChildAccount && selectedGroup.groupType === 'FAMILY' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('CHILD_WALLETS')}
                    className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'CHILD_WALLETS'
                        ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <FinanceIcon name="wallet" size={15} />
                    <span>Ví trẻ em ({childWallets.length})</span>
                  </button>
                )}
                {!isChildAccount && selectedGroup.groupType !== 'FAMILY' && selectedGroup.groupType !== 'COUPLE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('BALANCES')}
                      className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'BALANCES'
                          ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FinanceIcon name="refresh" size={15} />
                      <span>Cân đối & bù trừ</span>
                    </button>
                  </>
                )}
              </div>"""
c = c.replace(old_subtabs, new_subtabs)

# 5. Default tab effect for child accounts
old_roles = """  // Role Permissions
  const isChildAccount = Boolean((currentUser as any)?.childAccount);
  const myMemberInfo = members.find((m) => m.userId === currentUser?.id);
  const myRole = myMemberInfo?.role || (selectedGroup?.ownerId === currentUser?.id ? 'OWNER' : selectedGroup?.myRole);
  const isLeader = !isChildAccount && (myRole === 'OWNER' || myRole === 'ADMIN' || selectedGroup?.ownerId === currentUser?.id);"""

new_roles = """  // Role Permissions
  const isChildAccount = Boolean((currentUser as any)?.childAccount);
  const myMemberInfo = members.find((m) => m.userId === currentUser?.id);
  const myRole = myMemberInfo?.role || (selectedGroup?.ownerId === currentUser?.id ? 'OWNER' : selectedGroup?.myRole);
  const isLeader = !isChildAccount && (myRole === 'OWNER' || myRole === 'ADMIN' || selectedGroup?.ownerId === currentUser?.id);

  // Đối với tài khoản trẻ em: mặc định vào tab Trò chuyện, không truy cập các tab thu chi
  useEffect(() => {
    if (isChildAccount && (activeTab === 'OVERVIEW' || activeTab === 'EXPENSES' || activeTab === 'BALANCES' || activeTab === 'CHILD_WALLETS')) {
      setActiveTab('CHAT');
    }
  }, [isChildAccount, activeTab]);"""
c = c.replace(old_roles, new_roles)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('FRONTEND_UPDATED_PERFECTLY')

