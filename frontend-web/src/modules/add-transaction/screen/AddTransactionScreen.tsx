import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FinanceIcon, resolveCategoryIconName, getCategoryCanonicalKey } from '../../core/components/FinanceIcon'
import {
  transactionApi,
  type TransactionType,
  type CategoryItem,
  type TransactionItem
} from '../../cash-flow-management/api/transactionApi'
import { accountApi, type AccountItem } from '../../account-management/api/accountApi'
import { formatDate } from '../../core/utils/dateUtils'
import { DatePicker } from '../../core/components/DatePicker'
import { groupApi, type GroupFundResponse, type GroupMemberResponse, type GroupResponse, type ChildWalletResponse } from '../../group/api/groupApi'
import { getStoredUser } from '../../auth/api/authApi'

type Props = {
  onCancel: () => void;
  onNotify: (message: string) => void;
  onOpenInvoiceScanner: () => void;
}

const presets = [
  { label: '+5k', value: 5_000 },
  { label: '+10k', value: 10_000 },
  { label: '+20k', value: 20_000 },
  { label: '+50k', value: 50_000 },
  { label: '+100k', value: 100_000 },
  { label: '+200k', value: 200_000 },
  { label: '+500k', value: 500_000 },
]

// Kid Income Categories
const KID_INCOME_CATEGORIES: (CategoryItem & { systemCodes: string[] })[] = [
  { id: 'kid_gift', systemCodes: ['GIFT_SYS'], name: 'Người thân cho / Quà tặng', icon: 'gift', color: '#ec4899', kind: 'INCOME' },
  { id: 'kid_lixi', systemCodes: ['GIFT_SYS'], name: 'Tiền lì xì Tết', icon: 'coins', color: '#ef4444', kind: 'INCOME' },
  { id: 'kid_award', systemCodes: ['BONUS', 'BONUS_SYS'], name: 'Thưởng học tập & thành tích', icon: 'spark', color: '#f59e0b', kind: 'INCOME' },
  { id: 'kid_other', systemCodes: ['OTHER_INCOME', 'OTHER_INCOME_SYS'], name: 'Thu nhập khác của bé', icon: 'wallet', color: '#10b981', kind: 'INCOME' },
]

export function AddTransactionScreen({ onCancel, onNotify, onOpenInvoiceScanner }: Props) {
  const currentUser = getStoredUser()
  const isChildAccount = Boolean(currentUser?.childAccount && currentUser.childWalletId && currentUser.childWalletGroupId)
  // Types
  const [type, setType] = useState<TransactionType>('EXPENSE')

  // Real database states
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [groups, setGroups] = useState<GroupResponse[]>([])
  const [groupFunds, setGroupFunds] = useState<Record<string, GroupFundResponse>>({})
  const [childWallet, setChildWallet] = useState<ChildWalletResponse | null>(null)
  const [selectedGroupFundId, setSelectedGroupFundId] = useState<string>('')
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<GroupMemberResponse[]>([])
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([])
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Custom Dropdown Open States
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isToAccountPickerOpen, setIsToAccountPickerOpen] = useState(false)
  const categoryPickerRef = useRef<HTMLDivElement>(null)
  const accountPickerRef = useRef<HTMLDivElement>(null)
  const toAccountPickerRef = useRef<HTMLDivElement>(null)

  // Form Fields
  const [amount, setAmount] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('') // for TRANSFER
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = useState<string>(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [isCustomDateTime, setIsCustomDateTime] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')
  const [recurring, setRecurring] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')

  const fileRef = useRef<HTMLInputElement>(null)
  const numericAmount = Number(amount) || 0

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setIsCategoryPickerOpen(false)
      }
      if (accountPickerRef.current && !accountPickerRef.current.contains(e.target as Node)) {
        setIsAccountPickerOpen(false)
      }
      if (toAccountPickerRef.current && !toAccountPickerRef.current.contains(e.target as Node)) {
        setIsToAccountPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch real categories, accounts and recent transactions
  const loadData = async () => {
    try {
      setLoadingMetadata(true)
      const [catsRes, accsRes, txsRes, groupsRes, childWalletRes] = await Promise.all([
        transactionApi.getCategories().catch(() => []),
        accountApi.getAccounts().catch(() => []),
        transactionApi.getTransactions({ pageSize: 5 }).catch(() => ({ transactions: [] })),
        groupApi.getGroups().catch(() => []),
        isChildAccount
          ? groupApi.getChildWallet(currentUser!.childWalletGroupId!, currentUser!.childWalletId!).catch(() => null)
          : Promise.resolve(null),
      ])

      setCategories(catsRes)
      setChildWallet(childWalletRes)
      const usableAccounts = childWalletRes ? [{
        id: childWalletRes.id,
        name: `Ví của ${childWalletRes.childName}`,
        balance: childWalletRes.balance,
        currencyCode: childWalletRes.currency || 'VND',
        accountType: 'CASH',
        isActive: true,
        description: 'Ví do bố mẹ tạo và quản lý',
      } as AccountItem] : accsRes
      setAccounts(usableAccounts)
      setGroups(groupsRes)
      const funds = await Promise.all(groupsRes.map(async (group) => [group.id, await groupApi.getFund(group.id).catch(() => null)] as const))
      setGroupFunds(Object.fromEntries(funds.filter((entry): entry is readonly [string, GroupFundResponse] => entry[1] !== null)))
      if (isChildAccount && childWalletRes) {
        const ledger = await groupApi.getSpendRequests(currentUser!.childWalletGroupId!, childWalletRes.id)
        setRecentTransactions(ledger.filter((item) => item.status === 'APPROVED').map((item) => {
          const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
          const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
          const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ');
          const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
          const income = isDeposit || isChoreReward || isGiftIncome || isMoneyReq;

          let displayDesc = item.description || 'Giao dịch';
          if (isDeposit) {
            displayDesc = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`;
          } else if (isChoreReward) {
            displayDesc = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`;
          } else if (isGiftIncome) {
            displayDesc = item.description.replace('[INCOME_GIFT] ', '');
          } else if (isMoneyReq) {
            displayDesc = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`;
          }

          const categoryItem = income
            ? (item.category && item.category.name !== 'Lương'
                ? item.category
                : { id: 'family_sys', name: 'Gia đình & Con cái', icon: 'users', color: '#10b981' })
            : item.category;

          return {
            id: item.id,
            transactionType: income ? 'INCOME' : 'EXPENSE',
            accountId: childWalletRes.id,
            accountName: `Ví của ${childWalletRes.childName}`,
            amount: item.amount,
            currencyCode: childWalletRes.currency,
            description: displayDesc,
            transactionDate: item.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            createdAt: item.createdAt,
            category: categoryItem,
          } as TransactionItem;
        }))
      } else if (txsRes?.transactions) {
        setRecentTransactions(txsRes.transactions)
      }

      // Default selections
      if (usableAccounts.length > 0) {
        setSelectedAccountId(usableAccounts[0].id)
        if (usableAccounts.length > 1) {
          setToAccountId(usableAccounts[1].id)
        }
      }
    } catch {
      onNotify('Không thể nạp dữ liệu danh mục & tài khoản từ máy chủ')
    } finally {
      setLoadingMetadata(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Tài khoản trẻ em có thể ghi cả Tiền chi (EXPENSE) lẫn Tiền thu (INCOME), mặc định bắt đầu bằng Tiền chi
    if (isChildAccount && type === 'TRANSFER') {
      setType('EXPENSE')
    }
  }, [isChildAccount])

  useEffect(() => {
    if (!selectedGroupFundId) {
      setSelectedGroupMembers([])
      return
    }
    groupApi.getMembers(selectedGroupFundId).then(setSelectedGroupMembers).catch(() => setSelectedGroupMembers([]))
  }, [selectedGroupFundId])

  // Deduplicate categories by normalized canonical key & kind to prevent duplicate seeded data (e.g. Di chuyển / Đi lại)
  const uniqueCategories = categories.filter((cat, index, self) => {
    const key = getCategoryCanonicalKey(cat.kind, cat.name)
    return index === self.findIndex((c) => getCategoryCanonicalKey(c.kind, c.name) === key)
  })

  // Categories available for current mode & role
  const availableCategories = isChildAccount && type === 'INCOME'
    ? KID_INCOME_CATEGORIES
    : uniqueCategories

  // Auto pick default category based on transaction type
  useEffect(() => {
    if (type === 'TRANSFER') {
      setSelectedCategoryId('')
      return
    }
    const filtered = availableCategories.filter((c) => c.kind === type)
    if (filtered.length > 0) {
      const exists = filtered.some((c) => c.id === selectedCategoryId)
      if (!exists) {
        setSelectedCategoryId(filtered[0].id)
      }
    } else {
      setSelectedCategoryId('')
    }
  }, [type, availableCategories, selectedCategoryId])

  const filteredCategories = availableCategories.filter((c) => c.kind === type)
  const selectedAccountObj = accounts.find((a) => a.id === selectedAccountId)
  const selectedGroupFund = groups.find((group) => group.id === selectedGroupFundId)
  const selectedGroupFundBalance = selectedGroupFundId ? (groupFunds[selectedGroupFundId]?.balance || 0) : 0
  const toAccountObj = accounts.find((a) => a.id === toAccountId)
  const selectedCategoryObj = (isChildAccount && type === 'INCOME' ? KID_INCOME_CATEGORIES : uniqueCategories).find((c) => c.id === selectedCategoryId)

  const formatAmount = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  const renderCategoryIcon = (iconName?: string, fallbackKind?: string, size = 16, categoryName?: string) => {
    const resolved = resolveCategoryIconName(iconName, fallbackKind, categoryName)
    return <FinanceIcon name={resolved} size={size} />
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setError('Tệp đính kèm cần nhỏ hơn 15 MB.')
      event.target.value = ''
      setSelectedFile(null)
      setFileName('')
      return
    }
    setError('')
    setSelectedFile(file)
    setFileName(file.name)
    onNotify(`Đã chọn hóa đơn: ${file.name}`)
  }

  const handleSaveTransaction = async (continueAdding = false) => {
    if (numericAmount <= 0) {
      setError('Vui lòng nhập số tiền lớn hơn 0.')
      return
    }
    if (!selectedAccountId && !selectedGroupFundId) {
      setError('Vui lòng chọn tài khoản thanh toán.')
      return
    }
    if (isChildAccount && type === 'TRANSFER') {
      setError('Ví trẻ em không hỗ trợ tính năng chuyển ví.')
      return
    }
    if (selectedGroupFundId && type !== 'EXPENSE') {
      setError('Quỹ nhóm chỉ dùng để ghi khoản chi chung.')
      return
    }
    if (!isChildAccount && (type === 'EXPENSE' || type === 'TRANSFER') && numericAmount > selectedSourceBalance) {
      const sourceLabel = selectedGroupFund ? `quỹ chung “${selectedGroupFund.name}”` : `ví “${selectedAccountObj?.name || 'đã chọn'}”`
      setError(`Số tiền trong ${sourceLabel} không đủ để thực hiện giao dịch.`)
      return
    }
    if (type !== 'TRANSFER' && !selectedCategoryId) {
      setError('Vui lòng chọn danh mục cho giao dịch.')
      return
    }
    if (type === 'TRANSFER' && (!toAccountId || toAccountId === selectedAccountId)) {
      setError('Vui lòng chọn tài khoản nhận khác với tài khoản chuyển.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      if (isChildAccount && childWallet && currentUser?.childWalletGroupId) {
        const prefix = type === 'INCOME' ? '[INCOME_GIFT] ' : ''
        const descText = description.trim() || selectedCategoryObj?.name || (type === 'INCOME' ? 'Tiền người thân cho / quà tặng' : 'Chi tiêu của em')
        let resolvedCategoryId: string | undefined = selectedCategoryId
        if (type === 'INCOME') {
          const systemCodes = KID_INCOME_CATEGORIES.find((category) => category.id === selectedCategoryId)?.systemCodes
          resolvedCategoryId = categories.find((category) =>
            category.kind === 'INCOME' && category.isSystem && category.code && systemCodes?.includes(category.code),
          )?.id
        }
        if (!resolvedCategoryId) {
          setError('Không tìm thấy danh mục thu nhập này trên hệ thống. Vui lòng tải lại trang hoặc chọn danh mục khác.')
          return
        }
        await groupApi.createChildTransaction(currentUser.childWalletGroupId, childWallet.id, {
          amount: numericAmount,
          categoryId: resolvedCategoryId,
          description: prefix + descText,
        })
      } else if (selectedGroupFundId && selectedGroupFund) {
        // API members only returns current group members; it does not expose an ACTIVE status field.
        const members = selectedGroupMembers
        if (!members.length) throw new Error('Không tìm thấy thành viên đang hoạt động trong nhóm')
        const baseShare = Math.floor(numericAmount / members.length)
        const remainder = numericAmount - baseShare * members.length
        await groupApi.createExpense(selectedGroupFundId, {
          description: description.trim() || selectedCategoryObj?.name || 'Khoản chi nhóm', amount: numericAmount,
          currency: selectedGroupFund.baseCurrency, paidByUserId: getStoredUser()?.id || members[0].userId,
          paymentSource: 'GROUP_FUND', categoryId: selectedCategoryId, splitMethod: 'EQUAL', expenseDate: date,
          splits: members.map((member, index) => ({ userId: member.userId, amount: baseShare + (index === 0 ? remainder : 0) })),
        })
      } else {
        // Nếu không bật tùy chỉnh ngày giờ trong quá khứ (isCustomDateTime === false), tự động lấy chính xác ngày và giờ hiện tại
        let finalDate = date;
        let finalTime = time ? `${time}:00` : undefined;
        if (!isCustomDateTime) {
          const now = new Date();
          finalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          finalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        }

        const createdTx = await transactionApi.createTransaction({
          transactionType: type, accountId: selectedAccountId,
          toAccountId: type === 'TRANSFER' ? toAccountId : undefined, amount: numericAmount,
          currencyCode: selectedAccountObj?.currencyCode || 'VND',
          description: description.trim() || (type === 'INCOME' ? 'Khoản thu' : type === 'TRANSFER' ? 'Chuyển tiền nội bộ' : 'Khoản chi'),
          transactionDate: finalDate, transactionTime: finalTime,
          categoryId: type !== 'TRANSFER' ? selectedCategoryId : undefined,
        });

        const fileToUpload = selectedFile || fileRef.current?.files?.[0];
        if (fileToUpload && createdTx?.id) {
          try {
            await transactionApi.uploadAttachment(createdTx.id, fileToUpload);
          } catch (uploadErr) {
            console.error('Failed to upload attachment:', uploadErr);
          }
        }
      }

      const typeLabel = isChildAccount
        ? (type === 'INCOME' ? 'Đã ghi nhận tiền thu vào ví của em' : 'Đã ghi nhận khoản chi từ ví của em')
        : selectedGroupFund ? `Khoản chi từ quỹ ${selectedGroupFund.name}` : type === 'EXPENSE' ? 'Khoản chi' : type === 'INCOME' ? 'Khoản thu' : 'Chuyển khoản'
      onNotify(`Thành công! ${typeLabel} ${formatAmount(numericAmount)} ₫`)

      // Refresh recent transactions & accounts balance
      const [accsRes, txsRes] = await Promise.all([
        accountApi.getAccounts().catch(() => accounts),
        transactionApi.getTransactions({ pageSize: 5 }).catch(() => ({ transactions: [] })),
      ])
      if (!isChildAccount) setAccounts(accsRes)
      if (isChildAccount && childWallet && currentUser?.childWalletGroupId) {
        const ledger = await groupApi.getSpendRequests(currentUser.childWalletGroupId, childWallet.id)
        setRecentTransactions(ledger.filter((item) => item.status === 'APPROVED').map((item) => {
          const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
          const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
          const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ');
          const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
          const income = isDeposit || isChoreReward || isGiftIncome || isMoneyReq;

          let displayDesc = item.description || 'Giao dịch';
          if (isDeposit) {
            displayDesc = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`;
          } else if (isChoreReward) {
            displayDesc = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`;
          } else if (isGiftIncome) {
            displayDesc = item.description.replace('[INCOME_GIFT] ', '');
          } else if (isMoneyReq) {
            displayDesc = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`;
          }

          const categoryItem = income
            ? (item.category && item.category.name !== 'Lương'
                ? item.category
                : { id: 'family_sys', name: 'Gia đình & Con cái', icon: 'users', color: '#10b981' })
            : item.category;

          return {
            id: item.id,
            transactionType: income ? 'INCOME' : 'EXPENSE',
            accountId: childWallet.id,
            accountName: `Ví của ${childWallet.childName}`,
            amount: item.amount,
            currencyCode: childWallet.currency,
            description: displayDesc,
            transactionDate: item.createdAt?.slice(0, 10) || date,
            createdAt: item.createdAt,
            category: categoryItem,
          } as TransactionItem;
        }))
      } else if (txsRes?.transactions) {
        setRecentTransactions(txsRes.transactions)
      }

      if (continueAdding) {
        setAmount('')
        setDescription('')
        setFileName('')
        setSelectedFile(null)
        if (fileRef.current) fileRef.current.value = ''
      } else {
        onCancel()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu giao dịch vào cơ sở dữ liệu'
      setError(msg)
      onNotify(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleSaveTransaction(false)
  }

  const selectedSourceBalance = selectedGroupFund ? selectedGroupFundBalance : (selectedAccountObj?.balance || 0)
  const projectedBalance = selectedSourceBalance + (type === 'INCOME' ? numericAmount : -numericAmount)

  if (loadingMetadata) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-4xl items-center justify-center p-8 text-xs text-[#64748B]">
        <div className="flex flex-col items-center gap-3">
          <FinanceIcon name="refresh" size={28} className="animate-spin text-[#007F53]" />
          <span className="font-semibold text-sm text-[#0F172A]">Đang tải dữ liệu ví & danh mục...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-68px)] lg:h-[calc(100vh-68px)] lg:max-h-[calc(100vh-68px)] w-full flex-1 flex-col bg-[#F8FAFC] dark:bg-[#0B0F19] p-3 text-[#0F172A] dark:text-slate-100 sm:p-4 lg:p-5 overflow-y-auto lg:overflow-hidden">
      {/* Two-Column Responsive Workspace: fills 100% height without trailing empty space */}
      <div className="grid grid-cols-1 w-full flex-1 gap-4 lg:grid-cols-12 items-stretch min-h-0">
        {/* LEFT COLUMN: Main Form Container (chiếm tỷ lệ rộng 58% - 66%) */}
        <div className="min-w-0 lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col h-full justify-between rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#111827] shadow-md overflow-hidden min-h-0">
          {/* HERO BANNER: Type Toggle & Big Amount Display */}
          <div className={`relative px-3.5 sm:px-6 py-4 text-white transition-all duration-300 shrink-0 overflow-hidden ${
              type === 'EXPENSE'
                ? 'bg-gradient-to-br from-[#dc2626] via-[#b91c1c] to-[#991b1b]'
                : type === 'INCOME'
                  ? 'bg-gradient-to-br from-[#059669] via-[#007F53] to-[#065f46]'
                  : 'bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#075985]'
            }`}>
            {/* Ảnh nền sóng 3D theo loại giao dịch giống hệt Mobile App */}
            <img
              src={
                type === 'EXPENSE'
                  ? '/bg-expense-wave.jpg'
                  : type === 'INCOME'
                    ? '/bg-income-wave.jpg'
                    : '/bg-transfer-wave.jpg'
              }
              alt="Background wave"
              className="absolute inset-0 size-full object-cover opacity-90 pointer-events-none"
            />

            {/* Top Bar: 3-Way Toggle on the Left, OCR Scanner on the Right */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              {/* Segmented 3-Way Pill Switch on Left */}
              <div className={`grid ${isChildAccount ? 'grid-cols-2' : 'grid-cols-3'} sm:flex h-9 w-full sm:w-auto sm:max-w-sm items-center rounded-xl bg-black/20 p-0.5 backdrop-blur-md border border-white/20 shadow-inner overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`h-full min-w-0 sm:flex-1 rounded-lg px-1.5 sm:px-3 text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                    type === 'EXPENSE'
                      ? 'bg-white text-rose-600 shadow-md'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FinanceIcon name="expense" size={13} color={type === 'EXPENSE' ? '#e11d48' : 'currentColor'} />
                  <span className="truncate">Tiền chi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`h-full min-w-0 sm:flex-1 rounded-lg px-1.5 sm:px-3 text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                    type === 'INCOME'
                      ? 'bg-white text-emerald-700 shadow-md'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FinanceIcon name="income" size={13} color={type === 'INCOME' ? '#007F53' : 'currentColor'} />
                  <span className="truncate">Tiền thu</span>
                </button>

                {!isChildAccount && (
                  <button
                    type="button"
                    onClick={() => setType('TRANSFER')}
                    className={`h-full min-w-0 sm:flex-1 rounded-lg px-1.5 sm:px-3.5 text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                      type === 'TRANSFER'
                        ? 'bg-white text-sky-700 shadow-md'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <FinanceIcon name="arrows" size={13} color={type === 'TRANSFER' ? '#0284c7' : 'currentColor'} />
                    <span className="truncate">Chuyển ví</span>
                  </button>
                )}
              </div>

              {/* OCR Scanner Button on Right */}
              {!isChildAccount && (
                <button
                  type="button"
                  onClick={onOpenInvoiceScanner}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-3.5 text-xs font-bold text-white backdrop-blur-md border border-white/25 active:scale-95 transition shadow-sm cursor-pointer"
                  title="Tự động nhận diện số tiền, ngày và thông tin từ hóa đơn"
                >
                  <FinanceIcon name="scan" size={16} strokeWidth={2.2} />
                  <span>Quét hóa đơn OCR</span>
                </button>
              )}
            </div>

            {/* Large Hero Amount Input ở chính giữa */}
            <div className="relative z-10 mt-3.5 flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                {type === 'EXPENSE' ? 'Số tiền muốn chi' : type === 'INCOME' ? 'Số tiền nhận được' : 'Số tiền muốn chuyển'}
              </span>
              <div className="mt-1.5 flex items-center justify-center">
                <div className="relative inline-flex items-center justify-center">
                  <input
                    id="hero-amount-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setAmount(raw)
                    }}
                    style={{
                      width: `${Math.max(1, (amount ? Number(amount).toLocaleString('vi-VN') : '0').length)}ch`,
                      fontSize: 'clamp(34px, 3.8vw, 46px)',
                      fontWeight: 900,
                      lineHeight: '1.1',
                      outline: 'none',
                      border: 'none',
                      boxShadow: 'none',
                      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}
                    className="bg-transparent text-center font-black text-white outline-none border-none ring-0 tracking-tight placeholder:text-white/30 drop-shadow-md"
                    autoFocus
                  />
                  <span
                    style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                    className="absolute left-full ml-1.5 font-black text-white select-none self-center leading-none"
                  >
                    ₫
                  </span>
                </div>
              </div>

              {/* Quick Increment Presets */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setAmount(String((Number(amount) || 0) + preset.value))}
                    className={`rounded-full bg-white px-3.5 py-1 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition cursor-pointer ${
                      type === 'EXPENSE'
                        ? 'text-rose-600 hover:bg-rose-50'
                        : type === 'INCOME'
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-sky-700 hover:bg-sky-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                {numericAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="rounded-full border border-white/40 bg-black/30 hover:bg-black/45 px-3 py-1 text-xs font-bold text-white hover:scale-105 active:scale-95 transition shadow-sm cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FORM BODY: Scrollable body so footer buttons & inputs are accessible on all screens */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between overflow-hidden min-h-0 min-w-0">
            <div className="flex-1 p-3.5 sm:p-5 flex flex-col gap-3.5 overflow-y-auto min-w-0">
              {/* Row 1: Source Account & Category Selection */}
              <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2">
                {/* Account / Wallet Dropdown Picker */}
                <div className="relative min-w-0" ref={accountPickerRef}>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-slate-200">
                    <span>{type === 'TRANSFER' ? 'Từ tài khoản (Nguồn)' : 'Nguồn tiền thanh toán'}</span>
                    {(selectedAccountObj || selectedGroupFund) && (
                      <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                        Số dư: <strong className="text-[#007F53] dark:text-emerald-400">{formatAmount(selectedSourceBalance)} ₫</strong>
                      </span>
                    )}
                  </label>

                  <button
                    type="button"
                    disabled={isChildAccount}
                    onClick={() => {
                      if (isChildAccount) return
                      setIsAccountPickerOpen((prev) => !prev)
                      setIsCategoryPickerOpen(false)
                      setIsToAccountPickerOpen(false)
                    }}
                    className={`flex h-11 w-full items-center justify-between rounded-xl border bg-[#F8FAFC] dark:bg-slate-800/80 px-3.5 text-left transition ${
                      isChildAccount
                        ? 'border-[#CBD5E1] bg-[#F1F5F9] dark:bg-slate-800 cursor-default'
                        : isAccountPickerOpen
                        ? 'border-[#007F53] bg-white ring-2 ring-[#007F53]/20 dark:border-emerald-500 dark:bg-slate-800 dark:ring-emerald-500/20'
                        : 'border-[#CBD5E1] hover:border-[#94A3B8] dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#007F53] border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40">
                        <FinanceIcon name="wallet" size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
                          {selectedGroupFund ? `Quỹ chung · ${selectedGroupFund.name}` : selectedAccountObj?.name || (isChildAccount ? 'Ví của bé' : 'Chọn nguồn tiền')}
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                          {selectedGroupFund ? `Số dư quỹ: ${formatAmount(selectedGroupFundBalance)} ₫ · Ghi trong nhóm` : `${selectedAccountObj?.currencyCode || 'VND'} · Số dư: ${formatAmount(selectedAccountObj?.balance || 0)} ₫`}
                        </p>
                      </div>
                    </div>

                    {!isChildAccount && (
                      <FinanceIcon name="chevron-down" size={14} className={`text-gray-400 dark:text-slate-400 transition-transform ${isAccountPickerOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* Account Dropdown Menu */}
                  {!isChildAccount && isAccountPickerOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto rounded-2xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-[#111827] p-1.5 shadow-2xl animate-fadeIn">
                      {accounts.map((acc) => {
                        const isSelected = selectedAccountId === acc.id
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(acc.id)
                              setSelectedGroupFundId('')
                              setIsAccountPickerOpen(false)
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${isSelected ? 'bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-300' : 'hover:bg-[#F1F5F9] text-[#0F172A] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="grid size-7 place-items-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 shrink-0">
                                <FinanceIcon name="wallet" size={14} />
                              </span>
                              <div className="truncate">
                                <p className="truncate text-xs font-bold">{acc.name}</p>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400">{formatAmount(acc.balance)} ₫</p>
                              </div>
                            </div>
                            {isSelected && <span className="font-bold text-[#007F53] dark:text-emerald-400 ml-2">✓</span>}
                          </button>
                        )
                      })}
                      {type === 'EXPENSE' && groups.length > 0 && <div>
                        <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B] dark:text-slate-400">Quỹ chung của nhóm</p>
                        {groups.map((group) => {
                          const isSelected = selectedGroupFundId === group.id
                          return (
                            <button key={group.id} type="button" onClick={() => { setSelectedGroupFundId(group.id); setSelectedAccountId(''); setIsAccountPickerOpen(false) }} className={isSelected ? 'flex w-full items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-left text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-300' : 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 dark:hover:text-white'}>
                              <div className="flex items-center gap-2.5 truncate"><span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0"><FinanceIcon name="users" size={14} /></span><div className="truncate"><p className="truncate text-xs font-bold">Quỹ · {group.name}</p><p className="text-[10px] text-gray-500 dark:text-slate-400">Số dư quỹ: {formatAmount(groupFunds[group.id]?.balance || 0)} ₫</p></div></div>{isSelected && <span className="font-bold text-[#007F53] dark:text-emerald-400 ml-2">✓</span>}
                            </button>
                          )
                        })}
                      </div>}
                    </div>
                  )}
                </div>

                {/* If TRANSFER: Destination Account. If EXPENSE/INCOME: Category Picker */}
                {type === 'TRANSFER' ? (
                  <div className="relative" ref={toAccountPickerRef}>
                    <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-slate-200">
                      <span>Đến tài khoản (Đích)</span>
                      {toAccountObj && (
                        <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                          Số dư: <strong className="text-[#007F53] dark:text-emerald-400">{formatAmount(toAccountObj.balance)} ₫</strong>
                        </span>
                      )}
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToAccountPickerOpen((prev) => !prev)
                        setIsAccountPickerOpen(false)
                        setIsCategoryPickerOpen(false)
                      }}
                      className={`flex h-11 w-full items-center justify-between rounded-xl border bg-[#F8FAFC] dark:bg-slate-800/80 px-3.5 text-left transition ${isToAccountPickerOpen
                          ? 'border-[#007F53] bg-white ring-2 ring-[#007F53]/20 dark:border-sky-500 dark:bg-slate-800 dark:ring-sky-500/20'
                          : 'border-[#CBD5E1] hover:border-[#94A3B8] dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/40">
                          <FinanceIcon name="arrows" size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
                            {toAccountObj?.name || 'Chọn ví nhận'}
                          </p>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                            Số dư hiện tại: {formatAmount(toAccountObj?.balance || 0)} ₫
                          </p>
                        </div>
                      </div>

                      <FinanceIcon name="chevron-down" size={14} className={`text-gray-400 dark:text-slate-400 transition-transform ${isToAccountPickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* To Account Dropdown */}
                    {isToAccountPickerOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto rounded-2xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-[#111827] p-1.5 shadow-2xl animate-fadeIn">
                        {accounts.filter((a) => a.id !== selectedAccountId).map((acc) => {
                          const isSelected = toAccountId === acc.id
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                setToAccountId(acc.id)
                                setIsToAccountPickerOpen(false)
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${isSelected ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' : 'hover:bg-[#F1F5F9] text-[#0F172A] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
                                }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="grid size-7 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 shrink-0">
                                  <FinanceIcon name="wallet" size={14} />
                                </span>
                                <div className="truncate">
                                  <p className="truncate text-xs font-bold">{acc.name}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{formatAmount(acc.balance)} ₫</p>
                                </div>
                              </div>
                              {isSelected && <span className="font-bold text-sky-700 dark:text-sky-400 ml-2">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Category Picker */
                  <div className="relative" ref={categoryPickerRef}>
                    <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#0F172A] dark:text-slate-200">
                      <span>Phân loại danh mục</span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400">{filteredCategories.length} danh mục</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryPickerOpen((prev) => !prev)
                        setIsAccountPickerOpen(false)
                        setIsToAccountPickerOpen(false)
                      }}
                      className={`flex h-11 w-full items-center justify-between rounded-xl border bg-[#F8FAFC] dark:bg-slate-800/80 px-3.5 text-left transition ${isCategoryPickerOpen
                          ? 'border-[#007F53] bg-white ring-2 ring-[#007F53]/20 dark:border-emerald-500 dark:bg-slate-800 dark:ring-emerald-500/20'
                          : 'border-[#CBD5E1] hover:border-[#94A3B8] dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg"
                          style={{
                            backgroundColor: selectedCategoryObj?.color ? `${selectedCategoryObj.color}15` : '#f0f4f1',
                            color: selectedCategoryObj?.color || (type === 'INCOME' ? '#10b981' : '#f43f5e'),
                          }}
                        >
                          {renderCategoryIcon(selectedCategoryObj?.icon, type, 16, selectedCategoryObj?.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
                            {selectedCategoryObj?.name || 'Chọn danh mục'}
                          </p>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                            {type === 'EXPENSE' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}
                          </p>
                        </div>
                      </div>

                      <FinanceIcon name="chevron-down" size={14} className={`text-gray-400 dark:text-slate-400 transition-transform ${isCategoryPickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Category Dropdown Grid */}
                    {isCategoryPickerOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 overflow-y-auto rounded-2xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-[#111827] p-2 shadow-2xl animate-fadeIn">
                        <div className="grid grid-cols-2 gap-1.5">
                          {filteredCategories.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryId(cat.id)
                                  setIsCategoryPickerOpen(false)
                                }}
                                className={`flex items-center gap-2 rounded-xl p-2 text-left transition border ${isSelected
                                    ? 'border-[#007F53] bg-emerald-50 text-[#007F53] dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold'
                                    : 'border-transparent hover:bg-[#F1F5F9] text-[#0F172A] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
                                  }`}
                              >
                                <span
                                  className="grid size-7 place-items-center rounded-lg text-sm shrink-0"
                                  style={{
                                    backgroundColor: cat.color ? `${cat.color}15` : '#f0f4f1',
                                    color: cat.color || (cat.kind === 'INCOME' ? '#10b981' : '#f43f5e'),
                                  }}
                                >
                                  {renderCategoryIcon(cat.icon, cat.kind, 14, cat.name)}
                                </span>
                                <span className="truncate text-xs">{cat.name}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: Date & Time Section with Modern Toggle Switch */}
              <div className="rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FinanceIcon name="calendar" size={15} className="text-[#007F53] dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100 block">
                        Tự động ghi nhận theo thời gian hiện tại
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 block">
                        {isCustomDateTime
                          ? 'Đang bật tùy chỉnh ngày & giờ cho giao dịch trong quá khứ'
                          : `Tự động lấy chính xác lúc bấm "Lưu" (hôm nay ~${time})`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 hidden sm:inline">
                      {isCustomDateTime ? 'Chỉnh thủ công' : 'Tự động'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isCustomDateTime}
                      onClick={() => {
                        const nextVal = !isCustomDateTime
                        setIsCustomDateTime(nextVal)
                        if (!nextVal) {
                          const now = new Date()
                          setDate(now.toISOString().split('T')[0])
                          setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
                        }
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isCustomDateTime ? 'bg-[#007F53] dark:bg-emerald-600' : 'bg-[#CBD5E1] dark:bg-slate-700'
                      }`}
                      title={isCustomDateTime ? 'Tắt tùy chỉnh để tự động lấy giờ hiện tại' : 'Gạt để chỉnh ngày và giờ cho giao dịch quá khứ'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isCustomDateTime ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isCustomDateTime && (
                  <div className="grid gap-3 pt-2.5 border-t border-[#E2E8F0] dark:border-white/10 sm:grid-cols-2 animate-fadeIn">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#0F172A] dark:text-slate-200">
                        Ngày giao dịch
                      </label>
                      <DatePicker
                        value={date}
                        onChange={(newDate) => setDate(newDate)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#0F172A] dark:text-slate-200">
                        Thời gian thực hiện
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-[#007F53] focus:ring-1 focus:ring-[#007F53] transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Description Note */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#0F172A] dark:text-slate-200">
                  Ghi chú / Diễn giải
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Ăn trưa bún bò, Đổ xăng xe máy, Tiền thưởng dự án..."
                  className="h-10 w-full rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/80 px-3.5 text-xs text-[#0F172A] dark:text-slate-100 outline-none placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-[#007F53] focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-[#007F53] transition"
                />
              </div>

              {/* Row 4: Recurring Monthly Switch & Receipt Attachment */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 px-3.5 py-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#64748B] dark:text-slate-400">Lặp lại giao dịch hàng tháng:</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={recurring}
                    onClick={() => setRecurring(!recurring)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${recurring ? 'bg-[#007F53] dark:bg-emerald-600' : 'bg-[#CBD5E1] dark:bg-slate-700'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${recurring ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {fileName ? (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-[#007F53] dark:text-emerald-300 shadow-2xs">
                      <FinanceIcon name="receipt" size={14} className="text-[#007F53] dark:text-emerald-400" />
                      <span className="max-w-[170px] truncate" title={fileName}>{fileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFileName('');
                          if (fileRef.current) fileRef.current.value = '';
                        }}
                        className="ml-1 text-xs text-rose-500 hover:text-rose-700 font-bold"
                        title="Gỡ ảnh đính kèm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-[#007F53] dark:text-emerald-400 shadow-2xs hover:bg-[#E6F4EA] dark:hover:bg-slate-700 hover:border-[#007F53] active:scale-95 transition"
                    >
                      <FinanceIcon name="receipt" size={14} />
                      <span>+ Đính kèm ảnh hóa đơn</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-700 border border-rose-200 animate-fadeIn">
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Footer Action Buttons: Pinned cleanly at bottom */}
            <div className="flex flex-col-reverse justify-end gap-2.5 border-t border-[#E2E8F0] dark:border-[#1e293b] bg-[#F8FAFC] dark:bg-[#0f172a] p-3 sm:p-4 sm:flex-row shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={onCancel}
                className="h-10 rounded-xl bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-6 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveTransaction(true)}
                className="h-10 rounded-xl bg-[#E6F4EA] dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:border dark:border-emerald-800/50 px-6 text-xs font-bold text-[#007F53] hover:bg-[#D1FAE5] transition"
              >
                Lưu &amp; Tiếp tục thêm
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#007F53] hover:bg-[#009663] px-8 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                <FinanceIcon name="plus" size={15} />
                <span>{submitting ? 'Đang lưu vào ví...' : 'Lưu giao dịch ngay'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: 2 Cards (chiếm tỷ lệ cân đối 33% - 42%) */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col h-full gap-4 min-h-0">
          {/* Card 1: Số tiền còn lại / Dự tính số dư */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#111827] shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-[#E6F4EA] text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
                  <FinanceIcon name="trend" size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Dự tính số dư sau khi lưu</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">{selectedGroupFund ? `Quỹ chung: ${selectedGroupFund.name}` : `Tài khoản: ${selectedAccountObj?.name || 'Chưa chọn'}`}</p>
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B] dark:text-slate-400">Số dư hiện tại:</span>
                <strong className="text-[#0F172A] dark:text-slate-100 font-bold">
                  {formatAmount(selectedSourceBalance)} ₫
                </strong>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B] dark:text-slate-400">
                  {type === 'INCOME' ? 'Số tiền nhận:' : type === 'TRANSFER' ? 'Số tiền chuyển đi:' : 'Số tiền muốn chi:'}
                </span>
                <strong className={type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                  {type === 'INCOME' ? '+' : '-'}{formatAmount(numericAmount)} ₫
                </strong>
              </div>

              <div className="my-1 border-t border-dashed border-[#CBD5E1] dark:border-slate-800" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Số dư còn lại dự kiến:</span>
                <span className={`text-base font-black ${projectedBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#007F53] dark:text-emerald-400'}`}>
                  {formatAmount(Math.max(0, projectedBalance))} ₫
                </span>
              </div>

              {projectedBalance < 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  ⚠️ Cảnh báo: Số tiền trong {selectedGroupFund ? `quỹ chung “${selectedGroupFund.name}”` : 'ví'} không đủ ({formatAmount(Math.abs(projectedBalance))} ₫).
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Bảng giao dịch gần đây fills the rest */}
          <div className="flex flex-1 flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#111827] overflow-hidden min-h-0">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-white/5 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Giao dịch gần đây</h3>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400">Lịch sử ghi chép thu chi mới nhất</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-bold text-[#007F53] hover:underline dark:text-emerald-400"
              >
                Xem tất cả →
              </button>
            </div>

            <div className="mt-2 flex flex-1 flex-col divide-y divide-[#E2E8F0] dark:divide-white/5 overflow-y-auto pr-1">
              {recentTransactions.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-xs text-[#64748B] dark:text-slate-400">
                  Chưa có giao dịch nào được ghi nhận gần đây.
                </div>
              ) : (
                recentTransactions.slice(0, 5).map((tx) => {
                  const isInc = tx.transactionType === 'INCOME'
                  const isTrf = tx.transactionType === 'TRANSFER'
                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-xl border text-xs"
                          style={{
                            backgroundColor: isInc
                              ? (tx.category?.color ? `${tx.category.color}15` : '#ecfdf5')
                              : isTrf
                              ? '#eff6ff'
                              : (tx.category?.color ? `${tx.category.color}15` : '#f0f4f1'),
                            borderColor: isInc
                              ? (tx.category?.color ? `${tx.category.color}30` : '#a7f3d0')
                              : isTrf
                              ? '#bfdbfe'
                              : (tx.category?.color ? `${tx.category.color}30` : 'transparent'),
                            color: isInc
                              ? (tx.category?.color || '#15803d')
                              : isTrf
                              ? '#2563eb'
                              : (tx.category?.color || '#f43f5e')
                          }}
                        >
                          {renderCategoryIcon(tx.category?.icon, tx.transactionType, 15, tx.category?.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-200">
                            {tx.description || tx.category?.name || 'Giao dịch'}
                          </p>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                            {tx.accountName || 'Ví chính'} {tx.category?.name ? `· ${tx.category.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${isInc ? 'text-emerald-600 dark:text-emerald-400' : isTrf ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {isInc ? '+' : isTrf ? '' : '-'}{formatAmount(tx.amount)} ₫
                        </span>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          {formatDate(tx.transactionDate)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
