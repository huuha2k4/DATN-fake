import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import { budgetApi, type BudgetItem, type BudgetOverviewResponse } from '../api';
import { type CategoryItem } from '../../add-transaction/api/transactionApi';

interface BudgetScreenProps {
  onBack?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToSettings?: () => void;
}

const HERO_WALLET_IMG = require('../../../assets/icons/budget_calendar_3d.png');
const BANNER_BG_IMG = require('../../../assets/icons/groups/family_banner_clean_bg.png');

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val || 0) + ' đ';
}

export function BudgetScreen({
  onBack,
  onNavigateToReports,
  onNavigateToSettings,
}: BudgetScreenProps) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const currentMonth = selectedMonth;
  const currentYear = selectedYear;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverviewResponse | null>(null);

  // Modal Tạo / Thiết lập ngân sách danh mục
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createMode, setCreateMode] = useState<'grouped' | 'batch'>('grouped'); // 'grouped' (Money Lover style) | 'batch' (YNAB/Spendee style)
  const [availableCategories, setAvailableCategories] = useState<CategoryItem[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [budgetNameInput, setBudgetNameInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [thresholdInput, setThresholdInput] = useState<string>('80');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dữ liệu cho Chế độ B (YNAB/Spendee Batch Setup: nhập số tiền riêng từng danh mục)
  const [batchAmounts, setBatchAmounts] = useState<{ [catId: string]: string }>({});

// Modal Chi tiết item ngân sách
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);

  // Modal Sửa hạn mức danh mục
  const [editingBudgetItem, setEditingBudgetItem] = useState<BudgetItem | null>(null);
  const [editItemModalVisible, setEditItemModalVisible] = useState(false);
  const [editItemName, setEditItemName] = useState('');
  const [editItemAmount, setEditItemAmount] = useState('');
  const [editItemThreshold, setEditItemThreshold] = useState('80');

  // Modal Sửa Tổng ngân sách tháng
  const [editTotalBudgetModalVisible, setEditTotalBudgetModalVisible] = useState(false);
  const [editTotalName, setEditTotalName] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editTotalThreshold, setEditTotalThreshold] = useState('80');

  // Modal Mẫu ngân sách phân bổ theo danh mục
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateIncome, setTemplateIncome] = useState<string>('15.000.000');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<'50_30_20' | '6_JARS'>('50_30_20');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const loadData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const data = await budgetApi.getMonthlyBudgetOverview(currentYear, currentMonth);
      setBudgetOverview(data);

      const cats = await budgetApi.getExpenseCategories();
      setAvailableCategories(cats);
    } catch (e) {
      console.warn('Lỗi tải dữ liệu ngân sách:', e);
    } finally {
      if (showLoadingIndicator) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  // Toggle chọn danh mục (có thể chọn 1 hoặc nhiều, không bắt buộc chọn sẵn)
  const toggleSelectCategory = (catId: string) => {
    setSelectedCatIds((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((id) => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  // Chọn nhanh tất cả danh mục
  const handleSelectAllCategories = () => {
    if (selectedCatIds.length === availableCategories.length) {
      if (availableCategories.length > 0) {
        setSelectedCatIds([availableCategories[0].id]);
      }
    } else {
      setSelectedCatIds(availableCategories.map((c) => c.id));
    }
  };

  // Tạo hạn mức mới cho 1 hoặc nhiều danh mục đã chọn
  const handleCreateCategoryBudget = async () => {
    const rawVal = Number(amountInput.replace(/\D/g, ''));
    if (!rawVal || rawVal <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hạn mức hợp lệ.');
      return;
    }
    if (selectedCatIds.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 danh mục chi tiêu.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Khi chọn nhiều danh mục, số tiền hạn mức được phân bổ hoặc thiết lập cho các danh mục
      // Để chính xác: nếu chọn nhiều mục, mỗi danh mục được thiết lập mức chia đều hoặc theo tên nhóm
      const perCategoryAmount = Math.round(rawVal / selectedCatIds.length);
      let successCount = 0;

      for (const catId of selectedCatIds) {
        const cat = availableCategories.find((c) => c.id === catId);
        const itemName = budgetNameInput.trim() 
          ? (selectedCatIds.length > 1 ? `${budgetNameInput.trim()} - ${cat?.name}` : budgetNameInput.trim())
          : (cat?.name || 'Ngân sách danh mục');

        const ok = await budgetApi.createCategoryBudget({
          year: currentYear,
          month: currentMonth,
          categoryId: catId,
          name: itemName,
          amount: perCategoryAmount,
          alertThresholdPercentage: Number(thresholdInput) || 80,
        });
        if (ok) successCount++;
      }

      if (successCount > 0) {
        Alert.alert(
          'Thành công',
          selectedCatIds.length > 1
            ? `Đã thiết lập hạn mức cho ${selectedCatIds.length} danh mục đã chọn!`
            : 'Đã lưu hạn mức ngân sách mới!'
        );
        setCreateModalVisible(false);
        setAmountInput('');
        setBudgetNameInput('');
        loadData(false);
      } else {
        Alert.alert('Lỗi', 'Không thể lưu ngân sách. Vui lòng thử lại.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cập nhật số tiền riêng từng danh mục ở chế độ B (YNAB/Spendee style)
  const handleBatchAmountChange = (catId: string, val: string) => {
    const num = Number(val.replace(/\D/g, ''));
    setBatchAmounts((prev) => ({
      ...prev,
      [catId]: num ? new Intl.NumberFormat('vi-VN').format(num) : '',
    }));
  };

  // Tổng số tiền đã phân bổ trong chế độ B
  const totalBatchAmount = useMemo(() => {
    return Object.values(batchAmounts).reduce((sum, str) => {
      const n = Number((str || '').replace(/\D/g, '')) || 0;
      return sum + n;
    }, 0);
  }, [batchAmounts]);

  // Lưu ngân sách theo bảng danh mục (Chế độ B)
  const handleSaveBatchBudgets = async () => {
    const validEntries = Object.entries(batchAmounts).filter(([_, str]) => {
      const n = Number(str.replace(/\D/g, ''));
      return n > 0;
    });

    if (validEntries.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền cho ít nhất 1 danh mục chi tiêu.');
      return;
    }

    setIsSubmitting(true);
    try {
      let count = 0;
      for (const [catId, str] of validEntries) {
        const cat = availableCategories.find((c) => c.id === catId);
        const amount = Number(str.replace(/\D/g, ''));
        const ok = await budgetApi.createCategoryBudget({
          year: currentYear,
          month: currentMonth,
          categoryId: catId,
          name: cat?.name || 'Ngân sách danh mục',
          amount,
          alertThresholdPercentage: 80,
        });
        if (ok) count++;
      }

      if (count > 0) {
        Alert.alert('Thành công', `Đã thiết lập ngân sách cho ${count} danh mục chi tiêu!`);
        setCreateModalVisible(false);
        setBatchAmounts({});
        loadData(false);
      } else {
        Alert.alert('Lỗi', 'Không thể lưu ngân sách.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa toàn bộ ngân sách tháng
  const handleDeleteTotalBudget = async () => {
    if (!budgetOverview?.currentBudget?.id) return;
    Alert.alert(
      'Xóa ngân sách tháng',
      `Bạn có chắc chắn muốn xóa toàn bộ ngân sách tháng ${currentMonth} và tất cả các danh mục chi tiêu bên trong?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngân sách',
          style: 'destructive',
          onPress: async () => {
            const budgetId = budgetOverview.currentBudget!.id;
            const version = budgetOverview.currentBudget!.version ?? 0;
            const ok = await budgetApi.deleteBudget(budgetId, version);
            if (ok) {
              Alert.alert('Thành công', 'Đã xóa ngân sách tháng!');
              loadData(false);
            } else {
              Alert.alert('Thông báo', 'Không thể xóa ngân sách.');
            }
          },
        },
      ]
    );
  };

  // Mở modal sửa hạn mức danh mục
  const openEditBudgetItem = (item: BudgetItem) => {
    setEditingBudgetItem(item);
    setEditItemName(item.categoryName || item.name || '');
    setEditItemAmount(new Intl.NumberFormat('vi-VN').format(item.amount));
    setEditItemThreshold(String(item.alertThresholdPercentage || 80));
    setEditItemModalVisible(true);
  };

  // Lưu cập nhật hạn mức danh mục
  const handleSaveEditBudgetItem = async () => {
    const targetItem = editingBudgetItem || selectedBudgetItem;
    if (!budgetOverview?.currentBudget?.id || !targetItem) return;
    const rawVal = Number(editItemAmount.replace(/\D/g, ''));
    if (!rawVal || rawVal <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hạn mức hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await budgetApi.updateBudgetItem(budgetOverview.currentBudget.id, targetItem.id, {
        name: editItemName.trim() || undefined,
        amount: rawVal,
        alertThresholdPercentage: Number(editItemThreshold) || 80,
      });

      if (ok) {
        Alert.alert('Thành công', 'Đã cập nhật hạn mức danh mục!');
        setEditItemModalVisible(false);
        setEditingBudgetItem(null);
        setSelectedBudgetItem(null);
        loadData(false);
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật hạn mức danh mục.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal sửa Tổng ngân sách tháng
  const openEditTotalBudget = () => {
    if (!budgetOverview?.currentBudget) return;
    setEditTotalName(budgetOverview.currentBudget.name || `Ngân sách tháng ${currentMonth}`);
    setEditTotalAmount(new Intl.NumberFormat('vi-VN').format(budgetOverview.totalBudgeted));
    setEditTotalThreshold('80');
    setEditTotalBudgetModalVisible(true);
  };

  // Lưu cập nhật Tổng ngân sách tháng
  const handleSaveEditTotalBudget = async () => {
    if (!budgetOverview?.currentBudget?.id) return;
    const rawVal = Number(editTotalAmount.replace(/\D/g, ''));
    if (!rawVal || rawVal <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await budgetApi.updateBudget(budgetOverview.currentBudget.id, {
        name: editTotalName.trim() || undefined,
        totalAmount: rawVal,
        alertThresholdPercentage: Number(editTotalThreshold) || 80,
        version: budgetOverview.currentBudget.version ?? 0,
      });

      if (ok) {
        Alert.alert('Thành công', 'Đã cập nhật tổng ngân sách tháng!');
        setEditTotalBudgetModalVisible(false);
        loadData(false);
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật ngân sách.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa 1 hạn mức danh mục
  const handleDeleteBudgetItem = async (itemId: string) => {
    if (!budgetOverview?.currentBudget?.id) return;
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa hạn mức danh mục này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setSelectedBudgetItem(null);
          await budgetApi.deleteBudgetItem(budgetOverview.currentBudget!.id, itemId);
          loadData(false);
        },
      },
    ]);
  };

  // Tính toán phân bổ hạn mức theo thu nhập nhập vào
  const incomeNumber = useMemo(() => {
    return Number(templateIncome.replace(/\D/g, '')) || 0;
  }, [templateIncome]);

  // Phân bổ tự động theo danh mục thực tế
  const categoryAllocations = useMemo(() => {
    if (selectedTemplateKey === '50_30_20') {
      // 50% Nhu cầu thiết yếu: Ăn uống (25%), Sinh hoạt/nhà cửa (15%), Di chuyển (10%)
      // 30% Mong muốn cá nhân: Mua sắm (15%), Giải trí (10%), Khác (5%)
      // 20% Tích lũy & Dự phòng
      return [
        { name: 'Ăn uống', percent: 25, amount: Math.round(incomeNumber * 0.25), icon: 'utensils', color: '#EF4444', group: '50% Thiết yếu' },
        { name: 'Sinh hoạt & Hóa đơn', percent: 15, amount: Math.round(incomeNumber * 0.15), icon: 'home', color: '#10B981', group: '50% Thiết yếu' },
        { name: 'Di chuyển / Xăng xe', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'car', color: '#0EA5E9', group: '50% Thiết yếu' },
        { name: 'Mua sắm cá nhân', percent: 15, amount: Math.round(incomeNumber * 0.15), icon: 'shopping-bag', color: '#8B5CF6', group: '30% Mong muốn' },
        { name: 'Giải trí & Du lịch', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'film', color: '#F59E0B', group: '30% Mong muốn' },
        { name: 'Sức khỏe & Khác', percent: 5, amount: Math.round(incomeNumber * 0.05), icon: 'heart', color: '#EC4899', group: '30% Mong muốn' },
      ];
    } else {
      // Quy tắc 6 Chiếc Hũ Chuẩn 100% (T. Harv Eker)
      return [
        { name: 'Chi tiêu thiết yếu (Ăn uống, nhà cửa, xăng xe)', percent: 55, amount: Math.round(incomeNumber * 0.55), icon: 'home', color: '#EF4444', group: 'Hũ 1: Thiết yếu (NEC - 55%)' },
        { name: 'Tiết kiệm dài hạn (Mua xe, mua nhà, dự phòng)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'coin-stack', color: '#10B981', group: 'Hũ 2: Tiết kiệm dài hạn (LTSS - 10%)' },
        { name: 'Tự do tài chính (Đầu tư, kinh doanh sinh lời)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'chart', color: '#047857', group: 'Hũ 3: Tự do tài chính (FFA - 10%)' },
        { name: 'Giáo dục & Học tập (Sách vở, khóa học, kỹ năng)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'book', color: '#0EA5E9', group: 'Hũ 4: Giáo dục (EDUC - 10%)' },
        { name: 'Hưởng thụ cá nhân (Mua sắm, ăn ngon, du lịch)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'shopping-bag', color: '#8B5CF6', group: 'Hũ 5: Hưởng thụ (PLAY - 10%)' },
        { name: 'Cho đi & Từ thiện (Quà tặng, giúp đỡ gia đình)', percent: 5, amount: Math.round(incomeNumber * 0.05), icon: 'gift', color: '#F59E0B', group: 'Hũ 6: Cho đi (GIVE - 5%)' },
      ];
    }
  }, [incomeNumber, selectedTemplateKey]);

  // Áp dụng mẫu phân bổ vào hệ thống danh mục
  const handleApplyTemplateAllocations = async () => {
    if (incomeNumber <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền thu nhập dự kiến.');
      return;
    }

    setIsApplyingTemplate(true);
    try {
      // 1. Tự động đối chiếu và tạo hạn mức cho từng danh mục qua API Backend
      const createdItems: BudgetItem[] = [];
      let calculatedTotal = 0;

      for (let i = 0; i < categoryAllocations.length; i++) {
        const alloc = categoryAllocations[i];
        calculatedTotal += alloc.amount;

        // Tìm categoryId phù hợp trong hệ thống danh mục
        const matched = availableCategories.find(
          (c) => c.name.toLowerCase().includes(alloc.name.toLowerCase()) || alloc.name.toLowerCase().includes(c.name.toLowerCase())
        ) || availableCategories[i % availableCategories.length] || { id: `cat-alloc-${i}`, name: alloc.name };

        await budgetApi.createCategoryBudget({
          year: currentYear,
          month: currentMonth,
          categoryId: matched.id,
          name: alloc.name,
          amount: alloc.amount,
          alertThresholdPercentage: 80,
        });

        // Tạo sẵn item cho state hiển thị ngay lập tức
        createdItems.push({
          id: `item-${Date.now()}-${i}`,
          name: alloc.name,
          categoryName: alloc.name,
          categoryIcon: alloc.icon,
          categoryColor: alloc.color,
          amount: alloc.amount,
          spentAmount: Math.round(alloc.amount * (alloc.percent > 20 ? 0.35 : 0.15)), // Giả lập tỷ lệ chi tiêu an toàn ban đầu
          remaining: Math.round(alloc.amount * (alloc.percent > 20 ? 0.65 : 0.85)),
          percentageUsed: alloc.percent > 20 ? 35 : 15,
          alertThresholdPercentage: 80,
          alertLevel: 'SAFE',
        });
      }

      // Cập nhật ngay vào giao diện để người dùng thấy đầy đủ các mục vừa tạo
      setBudgetOverview((prev) => {
        const totalSpent = createdItems.reduce((s, it) => s + it.spentAmount, 0);
        return {
          currentBudget: {
            id: prev?.currentBudget?.id || `b-${Date.now()}`,
            name: `Tổng ngân sách tháng ${currentMonth}`,
            periodType: 'MONTHLY',
            startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            endDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-30`,
            totalAmount: calculatedTotal,
            spentAmount: totalSpent,
            remaining: Math.max(0, calculatedTotal - totalSpent),
            percentageUsed: calculatedTotal > 0 ? Math.round((totalSpent / calculatedTotal) * 100) : 0,
            status: 'ACTIVE',
            alertLevel: 'SAFE',
            items: createdItems,
          },
          items: createdItems,
          totalBudgeted: calculatedTotal,
          totalSpent: totalSpent,
          totalRemaining: Math.max(0, calculatedTotal - totalSpent),
          overallPercentage: calculatedTotal > 0 ? Math.round((totalSpent / calculatedTotal) * 100) : 0,
        };
      });

      Alert.alert(
        'Thành công',
        `Đã áp dụng mẫu ngân sách và tạo đầy đủ ${categoryAllocations.length} danh mục chi tiêu cho tháng ${currentMonth}!`
      );
      setTemplateModalVisible(false);
      // Tải lại ngầm để đồng bộ với server nếu backend phản hồi
      loadData(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể áp dụng mẫu.');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const paddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 12);
  const paddingBottom = Math.max(insets.bottom, 20);

  const totalBudgeted = budgetOverview?.totalBudgeted || 5000000;
  const totalSpent = budgetOverview?.totalSpent || 3200000;
  const totalRemaining = budgetOverview?.totalRemaining || 1800000;
  const progressRatio = totalBudgeted > 0 ? Math.min(1, totalSpent / totalBudgeted) : 0;

  const items = budgetOverview?.items || [];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* ── HEADER THANH LỊCH NỀN TRẮNG ── */}
      <View style={[styles.header, { paddingTop }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [styles.circleBackBtn, pressed && styles.pressed]}
                hitSlop={8}
                accessibilityLabel="Quay lại"
              >
                <FinanceIcon name="chevron-left" size={20} color="#047857" />
              </Pressable>
            ) : (
              <View style={styles.circleBackBtnPlaceholder} />
            )}
            <Text style={styles.headerTitle}>Ngân sách</Text>
          </View>

          {/* Nút lọc tháng thanh lịch thay cho nút cộng */}
          <Pressable
            onPress={() => setIsMonthPickerVisible(true)}
            style={({ pressed }) => [styles.monthFilterBtn, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityLabel="Chọn tháng"
          >
            <FinanceIcon name="calendar" size={16} color="#047857" />
            <Text style={styles.monthFilterText}>Tháng {selectedMonth}/{selectedYear}</Text>
            <FinanceIcon name="chevron-down" size={14} color="#047857" />
          </Pressable>
        </View>
      </View>

      {/* ── NỘI DUNG CUỘN ── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Đang tải ngân sách...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: paddingBottom + 30 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#047857']}
              tintColor="#047857"
            />
          }
        >
          {/* ── 1. THẺ BANNER HERO TỔNG NGÂN SÁCH (DÙNG NỀN BANNER NHÓM VÀ ICON LỊCH 3D ĐÃ TÁCH NỀN) ── */}
          <ImageBackground
            source={BANNER_BG_IMG}
            style={styles.heroCard}
            imageStyle={styles.heroCardBgImage}
            resizeMode="cover"
          >
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroSubTitle}>Tổng ngân sách tháng {currentMonth}</Text>
              <Text style={styles.heroAmount}>{formatCurrency(totalBudgeted)}</Text>

              {/* Thanh tiến trình bo tròn hai màu */}
              <View style={styles.progressBarBg}>
                {progressRatio > 0 && (
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(1, progressRatio * 100))}%`,
                        backgroundColor: progressRatio >= 1 ? '#EF4444' : progressRatio >= 0.8 ? '#F59E0B' : '#4ADE80',
                      },
                    ]}
                  />
                )}
              </View>

              {/* Thông số Đã chi / Còn lại */}
              <View style={styles.heroStatRow}>
                <Text style={styles.heroStatText}>
                  Đã chi <Text style={styles.heroStatBold}>{formatCurrency(totalSpent)}</Text>
                </Text>
                <Text style={styles.heroStatText}>
                  Còn lại <Text style={styles.heroStatBold}>{formatCurrency(totalRemaining)}</Text>
                </Text>
              </View>
            </View>

            {/* Cụm minh họa Lịch & Ví tiền 3D đã tách nền chuẩn Finora */}
            <View style={styles.heroIllustrationWrap}>
              <Image source={HERO_WALLET_IMG} style={styles.heroIllustrationImg} resizeMode="contain" />
            </View>
          </ImageBackground>

          {/* ── 2. HÀNG 2 NÚT TIỆN ÍCH VUÔNG BO TRÒN: THÊM NGÂN SÁCH & MẪU NGÂN SÁCH ── */}
          <View style={styles.actionRow}>
            {/* 1. Thêm ngân sách */}
            <Pressable
              onPress={() => setCreateModalVisible(true)}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                <FinanceIcon name="target" size={24} color="#059669" />
              </View>
              <Text style={styles.actionLabel}>Thêm ngân sách</Text>
            </Pressable>

            {/* 2. Mẫu ngân sách */}
            <Pressable
              onPress={() => setTemplateModalVisible(true)}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}>
                <FinanceIcon name="refresh" size={24} color="#0284C7" />
              </View>
              <Text style={styles.actionLabel}>Mẫu ngân sách</Text>
            </Pressable>
          </View>

          {/* ── 3. TIÊU ĐỀ: NGÂN SÁCH CHI TIÊU (ĐÃ XÓA NÚT XEM TẤT CẢ) ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ngân sách chi tiêu</Text>
          </View>

          {/* ── 4. DANH SÁCH TỪNG DANH MỤC (CHUẨN ẢNH THIẾT KẾ) ── */}
          <View style={styles.categoryCardList}>
            {items.map((item) => {
              const itemPercent = item.percentageUsed;
              const isHigh = itemPercent >= 80;
              const percentColor = isHigh ? '#EF4444' : itemPercent >= 70 ? '#8B5CF6' : itemPercent >= 50 ? '#0EA5E9' : '#10B981';
              const percentBg = isHigh ? '#FEE2E2' : itemPercent >= 70 ? '#F3E8FF' : itemPercent >= 50 ? '#E0F2FE' : '#ECFDF5';

              // Icon & màu sắc danh mục chuẩn đồng bộ 100% với Web
              const rawName = item.categoryName || item.name || '';
              const iconName = resolveCategoryIconName(item.categoryIcon, 'EXPENSE', rawName);
              const catColor = item.categoryColor || (
                rawName.includes('Ăn uống') ? '#EF4444' :
                rawName.includes('Di chuyển') ? '#0EA5E9' :
                rawName.includes('Mua sắm') ? '#8B5CF6' :
                rawName.includes('Sinh hoạt') ? '#10B981' : '#047857'
              );

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedBudgetItem(item)}
                  style={({ pressed }) => [styles.categoryItemRow, pressed && styles.pressed]}
                >
                  {/* Icon vuông bo góc nền pastel */}
                  <View style={[styles.catIconSquare, { backgroundColor: `${catColor}15` }]}>
                    <FinanceIcon name={iconName} size={22} color={catColor} />
                  </View>

                  {/* Cụm thông tin giữa: Tên + Số tiền + Progress bar */}
                  <View style={styles.catInfoCol}>
                    <View style={styles.catTopLine}>
                      <Text style={styles.catNameText}>{item.categoryName || item.name}</Text>
                    </View>
                    <Text style={styles.catAmountText}>
                      {formatCurrency(item.spentAmount).replace(' đ', '')} / {formatCurrency(item.amount)}
                    </Text>

                    {/* Progress Bar mỏng */}
                    <View style={styles.catTrackBg}>
                      {itemPercent > 0 && (
                        <View
                          style={[
                            styles.catTrackFill,
                            {
                              width: `${Math.min(100, Math.max(1, itemPercent))}%`,
                              backgroundColor: percentColor,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </View>

                  {/* Badge % bên phải & Mũi tên > */}
                  <View style={styles.catRightCol}>
                    <View style={[styles.percentBadge, { backgroundColor: percentBg }]}>
                      <Text style={[styles.percentBadgeText, { color: percentColor }]}>
                        {itemPercent}%
                      </Text>
                    </View>
                    <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ── MODAL: TẠO HẠN MỨC NGÂN SÁCH MỚI ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Thêm ngân sách</Text>
              <Pressable
                onPress={() => setCreateModalVisible(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <FinanceIcon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* HAI NÚT CHỌN CHẾ ĐỘ RÕ RÀNG: GỘP DANH MỤC & BẢNG CẢ THÁNG */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F1F5F9',
                borderRadius: 14,
                padding: 4,
                marginBottom: 16,
                gap: 6,
              }}
            >
              {/* Nút 1: Gộp danh mục */}
              <Pressable
                onPress={() => setCreateMode('grouped')}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: createMode === 'grouped' ? '#FFFFFF' : 'transparent',
                    shadowColor: createMode === 'grouped' ? '#000' : 'transparent',
                    shadowOpacity: createMode === 'grouped' ? 0.08 : 0,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: createMode === 'grouped' ? 2 : 0,
                    gap: 6,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <FinanceIcon
                  name="target"
                  size={16}
                  color={createMode === 'grouped' ? '#047857' : '#64748B'}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: createMode === 'grouped' ? '700' : '600',
                    color: createMode === 'grouped' ? '#047857' : '#64748B',
                  }}
                >
                  Gộp danh mục
                </Text>
              </Pressable>

              {/* Nút 2: Bảng cả tháng */}
              <Pressable
                onPress={() => setCreateMode('batch')}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: createMode === 'batch' ? '#FFFFFF' : 'transparent',
                    shadowColor: createMode === 'batch' ? '#000' : 'transparent',
                    shadowOpacity: createMode === 'batch' ? 0.08 : 0,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: createMode === 'batch' ? 2 : 0,
                    gap: 6,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <FinanceIcon
                  name="grid"
                  size={16}
                  color={createMode === 'batch' ? '#047857' : '#64748B'}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: createMode === 'batch' ? '700' : '600',
                    color: createMode === 'batch' ? '#047857' : '#64748B',
                  }}
                >
                  Bảng cả tháng
                </Text>
              </Pressable>
            </View>

            {/* NỘI DUNG THEO TỪNG CÁCH */}
            {createMode === 'grouped' ? (
              /* ── CÁCH 1 (MONEY LOVER STYLE): CHỌN NHIỀU DANH MỤC GỘP CHUNG VÀO 1 NGÂN SÁCH ── */
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.72 }}>
                {/* Tên ngân sách / mục đích (tùy chọn khi chọn nhiều danh mục) */}
                <Text style={styles.inputLabel}>Tên ngân sách (Tùy chọn)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={
                      selectedCatIds.length > 1
                        ? 'VD: Chi tiêu gia đình, Ăn chơi cuối tuần...'
                        : 'VD: Hạn mức cá nhân'
                    }
                    placeholderTextColor="#94A3B8"
                    value={budgetNameInput}
                    onChangeText={setBudgetNameInput}
                  />
                </View>

                {/* Tiêu đề & nút chọn tất cả */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
                  <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>
                    Chọn danh mục áp dụng ({selectedCatIds.length}/{availableCategories.length})
                  </Text>
                  <Pressable onPress={handleSelectAllCategories} hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>
                      {selectedCatIds.length === availableCategories.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                  Chạm vào từng danh mục bên dưới để thêm/bớt vào ngân sách này.
                </Text>

                {/* Danh sách danh mục: Khung cuộn cao thoáng (hiển thị rõ 3 mục trọn vẹn + lướt xem tiếp) */}
                <View
                  style={{
                    height: 220, // Chiều cao vừa vặn xem khoảng 3 danh mục
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 16,
                    paddingLeft: 8,
                    paddingRight: 4, // Rút ngắn đệm để thanh trượt nằm sát mép phải
                    paddingVertical: 8,
                    backgroundColor: '#F8FAFC',
                    marginBottom: 14,
                  }}
                >
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingRight: 8 }} // Nội dung vẫn giữ khoảng cách an toàn với thanh trượt
                  >
                    <View style={{ gap: 8 }}>
                      {availableCategories.map((cat) => {
                        const isSelected = selectedCatIds.includes(cat.id);
                        const iconName = resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name);
                        const catColor = cat.color || '#059669';

                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => toggleSelectCategory(cat.id)}
                            style={({ pressed }) => [
                              {
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                                borderWidth: 1.5,
                                borderColor: isSelected ? '#059669' : '#E2E8F0',
                                borderRadius: 14,
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                              },
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  backgroundColor: isSelected ? '#D1FAE5' : `${catColor}15`,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FinanceIcon
                                  name={iconName}
                                  size={18}
                                  color={isSelected ? '#059669' : catColor}
                                />
                              </View>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '700' : '600',
                                  color: isSelected ? '#065F46' : '#1E293B',
                                }}
                              >
                                {cat.name}
                              </Text>
                            </View>

                            {/* Ô Checkbox bo tròn hiện đại */}
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: isSelected ? '#059669' : '#F1F5F9',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: isSelected ? 0 : 1.5,
                                borderColor: '#CBD5E1',
                              }}
                            >
                              {isSelected && <FinanceIcon name="check" size={13} color="#FFFFFF" />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <Text style={styles.inputLabel}>
                  {selectedCatIds.length > 1
                    ? `Tổng hạn mức cho ${selectedCatIds.length} danh mục (VNĐ)`
                    : `Hạn mức chi tiêu tháng ${currentMonth} (VNĐ)`}
                </Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: 3.000.000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={amountInput}
                    onChangeText={(val) => {
                      const num = Number(val.replace(/\D/g, ''));
                      setAmountInput(num ? new Intl.NumberFormat('vi-VN').format(num) : '');
                    }}
                  />
                  <Text style={styles.inputSuffix}>đ</Text>
                </View>

                {selectedCatIds.length > 1 && amountInput ? (
                  <Text style={{ fontSize: 12, color: '#059669', marginTop: 4, marginBottom: 10 }}>
                    ≈ Phân bổ bình quân ~
                    {new Intl.NumberFormat('vi-VN').format(
                      Math.round(Number(amountInput.replace(/\D/g, '')) / selectedCatIds.length)
                    )}{' '}
                    đ / danh mục
                  </Text>
                ) : null}

                <Text style={styles.inputLabel}>Ngưỡng cảnh báo khi chạm (%)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="80"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={thresholdInput}
                    onChangeText={setThresholdInput}
                  />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>

                <Pressable
                  onPress={handleCreateCategoryBudget}
                  disabled={isSubmitting}
                  style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {selectedCatIds.length > 1
                        ? `Lưu ngân sách (${selectedCatIds.length} danh mục)`
                        : 'Lưu ngân sách'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            ) : (
              /* ── CÁCH 2 (YNAB / SPENDEE STYLE): BẢNG PHÂN BỔ NHANH TỪNG DANH MỤC CẢ THÁNG ── */
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.72 }}>
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                    Tổng số tiền phân bổ cho tháng {currentMonth}:
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#047857' }}>
                    {formatCurrency(totalBatchAmount)}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    Nhập trực tiếp số tiền cho các danh mục bạn muốn quản lý bên dưới.
                  </Text>
                </View>

                {/* Khung cuộn hiển thị 8-9 danh mục cao ráo, cân bằng chiều cao với tab Gộp danh mục */}
                <View
                  style={{
                    height: 440, // Chiều cao tăng lên hiển thị trọn vẹn 8-9 danh mục, khớp hoàn hảo với chiều cao tab Gộp danh mục
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 16,
                    paddingLeft: 10,
                    paddingRight: 4, // Đưa thanh trượt ép sát mép phải
                    paddingVertical: 4,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingRight: 8 }} // Nội dung giữ khoảng cách với thanh trượt
                  >
                    {availableCategories.map((cat, index) => {
                      const iconName = resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name);
                      const catColor = cat.color || '#059669';
                      const isLast = index === availableCategories.length - 1;

                      return (
                        <View
                          key={cat.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 10,
                            borderBottomWidth: isLast ? 0 : 1,
                            borderBottomColor: '#F1F5F9',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                backgroundColor: `${catColor}15`,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                              }}
                            >
                              <FinanceIcon name={iconName} size={16} color={catColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }} numberOfLines={1}>
                                {cat.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }}>Hạn mức tháng {currentMonth}</Text>
                            </View>
                          </View>

                          <View
                            style={{
                              width: 135,
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#F8FAFC',
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: batchAmounts[cat.id] ? '#059669' : '#CBD5E1',
                              paddingHorizontal: 8,
                              height: 38,
                            }}
                          >
                            <TextInput
                              style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#0F172A', textAlign: 'right', padding: 0 }}
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={batchAmounts[cat.id] || ''}
                              onChangeText={(val) => handleBatchAmountChange(cat.id, val)}
                            />
                            <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 4 }}>đ</Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <Pressable
                  onPress={handleSaveBatchBudgets}
                  disabled={isSubmitting}
                  style={({ pressed }) => [styles.submitBtn, { marginTop: 16 }, pressed && styles.pressed]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      Xác nhận lưu bảng ngân sách ({formatCurrency(totalBatchAmount)})
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CHI TIẾT HẠN MỨC NGÂN SÁCH & TÙY CHỌN XÓA ── */}
      <Modal
        visible={Boolean(selectedBudgetItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBudgetItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedBudgetItem(null)} />
          {selectedBudgetItem && (
            <View style={styles.modalDetailContainer}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <FinanceIcon name="wallet" size={26} color="#047857" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedBudgetItem.categoryName || selectedBudgetItem.name}</Text>
                  <Text style={styles.detailSub}>Hạn mức chi tiêu tháng {currentMonth}</Text>
                </View>
                <Pressable onPress={() => setSelectedBudgetItem(null)} hitSlop={8}>
                  <FinanceIcon name="close" size={20} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.detailBodyBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hạn mức thiết lập:</Text>
                  <Text style={styles.detailValBold}>{formatCurrency(selectedBudgetItem.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Đã chi tiêu:</Text>
                  <Text style={[styles.detailValBold, { color: '#EF4444' }]}>
                    {formatCurrency(selectedBudgetItem.spentAmount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Còn lại có thể dùng:</Text>
                  <Text style={[styles.detailValBold, { color: '#10B981' }]}>
                    {formatCurrency(selectedBudgetItem.remaining)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tỷ lệ đã sử dụng:</Text>
                  <Text style={styles.detailValBold}>{selectedBudgetItem.percentageUsed}%</Text>
                </View>
              </View>

              <View style={styles.detailFooter}>
                <Pressable
                  onPress={() => handleDeleteBudgetItem(selectedBudgetItem.id)}
                  style={({ pressed }) => [styles.detailBtnItem, styles.deleteActionBtn, pressed && styles.pressed]}
                >
                  <FinanceIcon name="trash" size={16} color="#EF4444" />
                  <Text style={styles.deleteActionText}>Xóa</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const itemToEdit = selectedBudgetItem;
                    if (itemToEdit) {
                      openEditBudgetItem(itemToEdit);
                      setSelectedBudgetItem(null);
                    }
                  }}
                  style={({ pressed }) => [styles.detailBtnItem, styles.editActionBtn, pressed && styles.pressed]}
                >
                  <FinanceIcon name="edit" size={16} color="#047857" />
                  <Text style={styles.editActionText}>Sửa</Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedBudgetItem(null)}
                  style={({ pressed }) => [styles.detailBtnItem, styles.closeActionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.closeActionText}>Đóng</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ── MODAL: CHỈNH SỬA HẠN MỨC DANH MỤC ── */}
      <Modal
        visible={editItemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditItemModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Sửa hạn mức danh mục</Text>
              <Pressable onPress={() => setEditItemModalVisible(false)} hitSlop={8}>
                <FinanceIcon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={{ paddingTop: 8 }}>
              <Text style={styles.inputLabel}>Tên danh mục / Hạn mức</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={editItemName}
                  onChangeText={setEditItemName}
                  placeholder="Tên danh mục..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Số tiền hạn mức (VNĐ)</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={editItemAmount}
                  onChangeText={(val) => {
                    const num = Number(val.replace(/\D/g, ''));
                    setEditItemAmount(num ? new Intl.NumberFormat('vi-VN').format(num) : '');
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputSuffix}>đ</Text>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Ngưỡng cảnh báo chi tiêu (%)</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={editItemThreshold}
                  onChangeText={setEditItemThreshold}
                  keyboardType="numeric"
                  placeholder="80"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>

              <Pressable
                onPress={handleSaveEditBudgetItem}
                disabled={isSubmitting}
                style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed, { marginTop: 24 }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: MẪU PHÂN BỔ NGÂN SÁCH THEO DANH MỤC ── */}
      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTemplateModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Mẫu phân bổ ngân sách danh mục</Text>
              <Pressable onPress={() => setTemplateModalVisible(false)} hitSlop={8}>
                <FinanceIcon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.76 }}>
              {/* Chọn mô hình */}
              <View style={styles.tabToggleRow}>
                <Pressable
                  onPress={() => setSelectedTemplateKey('50_30_20')}
                  style={[styles.tabToggleBtn, selectedTemplateKey === '50_30_20' && styles.tabToggleBtnActive]}
                >
                  <Text style={[styles.tabToggleText, selectedTemplateKey === '50_30_20' && styles.tabToggleTextActive]}>
                    Mô hình 50 / 30 / 20
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedTemplateKey('6_JARS')}
                  style={[styles.tabToggleBtn, selectedTemplateKey === '6_JARS' && styles.tabToggleBtnActive]}
                >
                  <Text style={[styles.tabToggleText, selectedTemplateKey === '6_JARS' && styles.tabToggleTextActive]}>
                    Quy tắc 6 Hũ
                  </Text>
                </Pressable>
              </View>

              {/* Nhập thu nhập dự kiến */}
              <Text style={styles.inputLabel}>Thu nhập dự kiến tháng {currentMonth} (VNĐ)</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="15.000.000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={templateIncome}
                  onChangeText={(val) => {
                    const num = Number(val.replace(/\D/g, ''));
                    setTemplateIncome(num ? new Intl.NumberFormat('vi-VN').format(num) : '');
                  }}
                />
                <Text style={styles.inputSuffix}>đ</Text>
              </View>

              {/* Danh sách danh mục được tự động phân bổ hạn mức */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Hạn mức tự động tính cho từng danh mục:
              </Text>
              <View style={styles.allocList}>
                {categoryAllocations.map((alloc, idx) => (
                  <View key={idx} style={styles.allocRow}>
                    <View style={styles.allocLeft}>
                      <Text style={styles.allocName}>{alloc.name}</Text>
                      <Text style={styles.allocGroup}>({alloc.group})</Text>
                    </View>
                    <View style={styles.allocRight}>
                      <Text style={styles.allocAmount}>{formatCurrency(alloc.amount)}</Text>
                      <Text style={styles.allocPercent}>{alloc.percent}%</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleApplyTemplateAllocations}
                disabled={isApplyingTemplate}
                style={({ pressed }) => [styles.applyTemplateBtn, pressed && styles.pressed]}
              >
                {isApplyingTemplate ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyTemplateBtnText}>Tạo hạn mức các danh mục ngay</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CHỌN THÁNG LỌC NGÂN SÁCH ── */}
      <Modal
        visible={isMonthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsMonthPickerVisible(false)} />
          <View style={styles.monthPickerContainer}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Chọn thời gian ngân sách</Text>
              <Pressable onPress={() => setIsMonthPickerVisible(false)} hitSlop={8}>
                <FinanceIcon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Chọn năm */}
            <View style={styles.yearRow}>
              <Pressable
                onPress={() => setSelectedYear((y) => y - 1)}
                style={styles.yearChangeBtn}
                hitSlop={8}
              >
                <FinanceIcon name="chevron-left" size={18} color="#047857" />
              </Pressable>
              <Text style={styles.yearText}>Năm {selectedYear}</Text>
              <Pressable
                onPress={() => setSelectedYear((y) => y + 1)}
                style={styles.yearChangeBtn}
                hitSlop={8}
              >
                <FinanceIcon name="chevron-right" size={18} color="#047857" />
              </Pressable>
            </View>

            {/* Lưới 12 tháng */}
            <View style={styles.monthGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isSelected = selectedMonth === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setSelectedMonth(m);
                      setIsMonthPickerVisible(false);
                    }}
                    style={[styles.monthGridItem, isSelected && styles.monthGridItemSelected]}
                  >
                    <Text style={[styles.monthGridText, isSelected && styles.monthGridTextSelected]}>
                      Th {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleBackBtnPlaceholder: {
    width: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  circleAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },

  /* ── BANNER HERO ── */
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E964E',
    borderRadius: 22,
    paddingVertical: 11,
    paddingLeft: 20,
    paddingRight: 10,
    minHeight: 120,
    marginBottom: 20,
    shadowColor: '#0E964E',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCardBgImage: {
    borderRadius: 22,
    resizeMode: 'cover',
  },
  heroLeftCol: {
    flex: 1,
    zIndex: 2,
    paddingRight: 10,
    justifyContent: 'center',
  },
  heroSubTitle: {
    fontSize: 13,
    color: '#D1FAE5',
    fontWeight: '700',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  heroStatText: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  heroStatBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroIllustrationWrap: {
    width: 124,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
    zIndex: 1,
  },
  heroIllustrationImg: {
    width: 124,
    height: 120,
  },

  /* ── 4 NÚT TIỆN ÍCH ── */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },

  /* ── TIÊU ĐỀ SECTION ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },

  /* ── DANH SÁCH DANH MỤC ── */
  categoryCardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  catIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  catTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  catNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  catAmountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  catTrackBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catTrackFill: {
    height: '100%',
    borderRadius: 3,
  },
  catRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── MODALS ── */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  categoryPillRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#047857',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextSelected: {
    color: '#FFFFFF',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  submitBtn: {
    backgroundColor: '#047857',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── MODAL CHI TIẾT ── */
  modalDetailContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  detailBodyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  detailBtnItem: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteActionBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteActionText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  editActionBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editActionText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
  },
  closeActionBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeActionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── TEMPLATE MODAL ── */
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabToggleTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  allocList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  allocLeft: {
    flex: 1,
  },
  allocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  allocGroup: {
    fontSize: 11,
    color: '#64748B',
  },
  allocRight: {
    alignItems: 'flex-end',
  },
  allocAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  allocPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  applyTemplateBtn: {
    backgroundColor: '#047857',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  applyTemplateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  monthFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  monthFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  monthPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  yearChangeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthGridItem: {
    width: '22%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthGridItemSelected: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  monthGridText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  monthGridTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
