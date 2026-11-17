import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  goalsApi,
  GoalItem,
  SavingItem,
  fallbackGoals,
  fallbackSavings,
} from '../api/goalsApi';
import { GoalDetailScreen } from './GoalDetailScreen';
import { SavingDetailScreen } from './SavingDetailScreen';
import { CreateGoalModal } from './CreateGoalModal';
import { CreateSavingModal } from './CreateSavingModal';

const { width } = Dimensions.get('window');

type Props = {
  onBack: () => void;
};

type GoalTabType = 'goals' | 'savings';

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

function getGoalCategoryIcon(iconKey?: string, categoryName?: string) {
  const key = (iconKey || categoryName || '').toLowerCase();
  if (key.includes('travel') || key.includes('du lịch') || key.includes('plane')) {
    return require('../../../assets/icons/goal_cat_travel_3d.png');
  }
  if (key.includes('education') || key.includes('học tập') || key.includes('cap')) {
    return require('../../../assets/icons/goal_cat_education_3d.png');
  }
  if (key.includes('investment') || key.includes('đầu tư')) {
    return require('../../../assets/icons/goal_cat_investment_3d.png');
  }
  if (key.includes('debt') || key.includes('nợ') || key.includes('thanh toán')) {
    return require('../../../assets/icons/goal_cat_debt_3d.png');
  }
  if (key.includes('family') || key.includes('gia đình')) {
    return require('../../../assets/icons/goal_cat_family_3d.png');
  }
  if (key.includes('other') || key.includes('khác')) {
    return require('../../../assets/icons/goal_cat_other_3d.png');
  }
  // Mua sắm lớn (laptop, điện thoại, xe máy...)
  return require('../../../assets/icons/goal_cat_shopping_3d.png');
}

function getSavingCategoryIcon(iconKey?: string, categoryName?: string) {
  const key = (iconKey || categoryName || '').toLowerCase();
  if (key.includes('emergency') || key.includes('khẩn cấp') || key.includes('dự phòng')) {
    return require('../../../assets/icons/saving_cat_emergency_3d.png');
  }
  if (key.includes('term') || key.includes('kỳ hạn') || key.includes('kì hạn')) {
    return require('../../../assets/icons/saving_cat_term_3d.png');
  }
  if (key.includes('longterm') || key.includes('dài hạn')) {
    return require('../../../assets/icons/saving_cat_longterm_3d.png');
  }
  if (key.includes('other') || key.includes('khác')) {
    return require('../../../assets/icons/saving_cat_other_3d.png');
  }
  // Tiết kiệm tự do
  return require('../../../assets/icons/saving_cat_free_3d.png');
}

export function GoalsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<GoalTabType>('goals');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedSavingId, setSelectedSavingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSavingModal, setShowCreateSavingModal] = useState(false);

  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [savings, setSavings] = useState<SavingItem[]>([]);
  const [totalAccumulated, setTotalAccumulated] = useState<number>(0);
  const [totalGoalsAmount, setTotalGoalsAmount] = useState<number>(0);
  const [totalSavingsAmount, setTotalSavingsAmount] = useState<number>(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await goalsApi.getGoals();
      setGoals(data.goals);
      setSavings(data.savings);
      setTotalAccumulated(data.totalAccumulated);
      setTotalGoalsAmount(data.totalGoalsAmount);
      setTotalSavingsAmount(data.totalSavingsAmount);
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = () => {
    if (activeTab === 'goals') {
      setShowCreateModal(true);
    } else {
      setShowCreateSavingModal(true);
    }
  };

  if (selectedGoalId) {
    return (
      <GoalDetailScreen
        goalId={selectedGoalId}
        onBack={() => {
          setSelectedGoalId(null);
          loadData();
        }}
      />
    );
  }

  if (selectedSavingId) {
    return (
      <SavingDetailScreen
        savingId={selectedSavingId}
        onBack={() => {
          setSelectedSavingId(null);
          loadData();
        }}
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar barStyle="dark-content" />
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftCol}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <FinanceIcon name="chevron-left" size={24} color="#006747" />
          </Pressable>
          <Text style={styles.screenTitle}>Mục tiêu & Tiết kiệm</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contentScroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. HERO BANNER: TỔNG TIỀN ĐÃ TÍCH LŨY */}
        <ImageBackground
          source={require('../../../assets/icons/goals_banner_bg_neon.jpg')}
          style={styles.heroBanner}
          imageStyle={styles.heroBannerBgImage}
          resizeMode="cover"
        >
          <View style={styles.bannerTopRow}>
            <View style={styles.bannerLeftCol}>
              <Text style={styles.bannerLabel}>Tổng tiền đã tích lũy</Text>
              <Text style={styles.bannerAmountText}>{formatVND(totalAccumulated)}</Text>
              <Text style={styles.bannerSubText}>
                {goals.length} mục tiêu • {savings.length} khoản tiết kiệm
              </Text>
            </View>

            <View style={styles.bannerPiggyWrap}>
              <Image
                source={require('../../../assets/icons/goals_piggy_coin_3d_hd.png')}
                style={styles.piggyBankImg}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Thin divider line */}
          <View style={styles.bannerDivider} />

          {/* Bottom stats row with 3D squircle icons & vertical divider */}
          <View style={styles.bannerBottomRow}>
            <View style={styles.bannerStatItem}>
              <Image
                source={require('../../../assets/icons/banner_target_squircle_3d.png')}
                style={styles.statIconImg}
                resizeMode="contain"
              />
              <View style={styles.statTextCol}>
                <Text style={styles.statLabelText}>Theo mục tiêu</Text>
                <Text style={styles.statValueText}>{formatVND(totalGoalsAmount)}</Text>
              </View>
            </View>

            <View style={styles.bannerVerticalDivider} />

            <View style={styles.bannerStatItem}>
              <Image
                source={require('../../../assets/icons/banner_coins_squircle_3d.png')}
                style={styles.statIconImg}
                resizeMode="contain"
              />
              <View style={styles.statTextCol}>
                <Text style={styles.statLabelText}>Tiết kiệm tự do</Text>
                <Text style={styles.statValueText}>{formatVND(totalSavingsAmount)}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* 3. SEGMENTED TAB SWITCH: Mục tiêu vs Tiết kiệm */}
        <View style={styles.tabSwitchContainer}>
          <Pressable
            onPress={() => setActiveTab('goals')}
            style={[styles.switchTabBtn, activeTab === 'goals' && styles.switchTabBtnActive]}
          >
            <FinanceIcon
              name="target"
              size={18}
              color={activeTab === 'goals' ? '#FFFFFF' : '#006747'}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'goals' && styles.switchTabTextActive,
              ]}
            >
              Mục tiêu
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('savings')}
            style={[styles.switchTabBtn, activeTab === 'savings' && styles.switchTabBtnActive]}
          >
            <FinanceIcon
              name="piggy-bank"
              size={18}
              color={activeTab === 'savings' ? '#FFFFFF' : '#006747'}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'savings' && styles.switchTabTextActive,
              ]}
            >
              Tiết kiệm
            </Text>
          </Pressable>
        </View>

        {/* 4. CONTENT ACCORDING TO TAB */}
        {activeTab === 'goals' ? (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Mục tiêu của bạn</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{goals.length} mục tiêu</Text>
              </View>
            </View>

            <View style={styles.itemsList}>
              {goals.map((item) => {
                const imgSource = getGoalCategoryIcon(item.icon, item.category || item.title);

                return (
                  <Pressable
                    key={item.id}
                    style={styles.goalCard}
                    onPress={() => setSelectedGoalId(item.id)}
                  >
                    <View style={styles.goalCardRow}>
                      <View style={styles.goalIcon3dBox}>
                        <Image source={imgSource} style={styles.goal3dImg} resizeMode="contain" />
                      </View>

                      <View style={styles.goalInfoCol}>
                        <View style={styles.goalTopLine}>
                          <Text style={styles.goalTitleText}>{item.title}</Text>
                          <View style={styles.goalPctBadge}>
                            <Text style={styles.goalPctBadgeText}>{item.percentage}%</Text>
                          </View>
                          <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                        </View>

                        {item.deadline && (
                          <View style={styles.deadlineToRow}>
                            <FinanceIcon name="calendar" size={13} color="#64748B" />
                            <Text style={styles.deadlineText}>Hạn: {item.deadline}</Text>
                          </View>
                        )}

                        {/* Progress Bar */}
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${Math.min(100, item.percentage)}%` },
                            ]}
                          />
                        </View>

                        {/* Amounts */}
                        <Text style={styles.goalAmountsText}>
                          <Text style={styles.currentAmountGreen}>
                            {formatVND(item.currentAmount)}
                          </Text>{' '}
                          / {formatVND(item.targetAmount)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Các khoản tiết kiệm của bạn</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{savings.length} khoản</Text>
              </View>
            </View>

            <View style={styles.itemsList}>
              {savings.map((item) => {
                const imgSource = getSavingCategoryIcon(item.icon, item.category || item.title);

                return (
                  <Pressable
                    key={item.id}
                    style={styles.savingCard}
                    onPress={() => setSelectedSavingId(item.id)}
                  >
                    <View style={styles.savingCardRow}>
                      <View style={styles.savingIcon3dBox}>
                        <Image source={imgSource} style={styles.saving3dImg} resizeMode="contain" />
                      </View>

                      <View style={styles.savingInfoCol}>
                        <View style={styles.savingTopLine}>
                          <Text style={styles.savingTitleText}>{item.title}</Text>
                          <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                        </View>

                        <Text style={styles.savingSubtitleText}>{item.subtitle || item.category}</Text>
                        <Text style={styles.savingAmountText}>
                          {formatVND(item.currentAmount)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 5. BOTTOM FLOATING ACTION BUTTON */}
      <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          style={styles.mainActionBtn}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={activeTab === 'goals' ? 'Thêm mục tiêu' : 'Thêm khoản tiết kiệm'}
        >
          <FinanceIcon name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.mainActionBtnText}>
            {activeTab === 'goals' ? 'Thêm mục tiêu' : 'Thêm khoản tiết kiệm'}
          </Text>
        </Pressable>
      </View>

      {/* MODAL THÊM MỤC TIÊU MỚI */}
      <CreateGoalModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadData}
      />

      {/* MODAL THÊM KHOẢN TIẾT KIỆM MỚI */}
      <CreateSavingModal
        visible={showCreateSavingModal}
        onClose={() => setShowCreateSavingModal(false)}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  /* Hero Banner */
  heroBanner: {
    borderRadius: 22,
    backgroundColor: '#056835',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#056835',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  heroBannerBgImage: {
    borderRadius: 22,
    resizeMode: 'cover',
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeftCol: {
    flex: 1,
    paddingRight: 6,
  },
  bannerLabel: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerAmountText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 5,
  },
  bannerSubText: {
    color: '#E8F5E9',
    fontSize: 11.5,
    fontWeight: '500',
  },
  bannerPiggyWrap: {
    width: 140,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
  piggyBankImg: {
    width: 150,
    height: 118,
  },

  /* Banner Divider & Bottom Stats */
  bannerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginVertical: 12,
  },
  bannerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconImg: {
    width: 44,
    height: 44,
  },
  statTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabelText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11.5,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bannerVerticalDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
  },

  /* Segmented Tab Switch */
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  switchTabBtnActive: {
    backgroundColor: '#006747',
    shadowColor: '#006747',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  switchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#006747',
  },
  switchTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Tab Section */
  tabSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  itemsList: {
    gap: 12,
  },

  /* Goal Card */
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  goalCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalIcon3dBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  goal3dImg: {
    width: 64,
    height: 64,
  },
  goalInfoCol: {
    flex: 1,
  },
  goalTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  goalTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  goalPctBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  goalPctBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  deadlineToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  deadlineText: {
    fontSize: 11,
    color: '#64748B',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#006747',
    borderRadius: 3,
  },
  goalAmountsText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  currentAmountGreen: {
    color: '#006747',
    fontWeight: '700',
  },

  /* Saving Card */
  savingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  savingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  savingIcon3dBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  saving3dImg: {
    width: 64,
    height: 64,
  },
  savingInfoCol: {
    flex: 1,
  },
  savingTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  savingTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  savingSubtitleText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  savingAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#006747',
  },

  /* Bottom Floating Action Button */
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  mainActionBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#006747',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#006747',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
