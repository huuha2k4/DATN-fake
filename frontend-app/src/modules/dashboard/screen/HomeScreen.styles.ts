import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8F6',
  },
  contentContainer: {
    paddingBottom: 36,
  },

  // ── 1. HEADER XANH VÒM CẢNH (CHÍNH XÁC THEO ẢNH) ──
  headerContainer: {
    width: '100%',
    backgroundColor: '#013B2B', // Màu xanh lục sẫm góc trái
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 16,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  // Hiệu ứng màu gradient & sóng xanh ngọc lượn góc phải trên
  headerWaveLayer1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#056149',
    opacity: 0.65,
  },
  headerWaveLayer2: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#097E5F',
    opacity: 0.5,
  },

  // ── 2. Top Bar (Logo FinAI, Chuông thông báo & Avatar) ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finaiLogoImage: {
    width: 132,
    height: 40,
  },
  topIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleIconEmoji: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#013B2B',
  },

  // ── 3. THẺ TỔNG TÀI SẢN (NỀN XANH NGỌC SẪM NỔI BẬT KHỐI) ──
  heroCard: {
    backgroundColor: '#014532',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  wallet3DOverlay: {
    position: 'absolute',
    right: 8,
    top: 10,
    width: 120,
    height: 88,
  },
  balanceRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceTitle: {
    fontSize: 13,
    color: '#A8EBCA',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 2,
  },
  eyeIcon: {
    fontSize: 14,
  },
  totalAmountText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  growthBadgeRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 6,
    marginBottom: 16,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  growthNote: {
    fontSize: 11.5,
    color: '#A8EBCA',
  },
  cashFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  cashFlowCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flowIconIncome: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowIconExpense: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowArrow: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  flowLabel: {
    fontSize: 11,
    color: '#98B8AC',
  },
  flowValIncome: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  flowValExpense: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },

  // ── 4. THẺ NGÂN SÁCH THÁNG TRẮNG ──
  budgetCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8ECE9',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetBarIcon: {
    fontSize: 16,
    color: '#059669',
  },
  budgetTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14251F',
  },
  budgetDaysLeft: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  budgetTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  budgetTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  budgetPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  budgetAmountNote: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },

  // ── 5. CỤM 6 NÚT CHỨC NĂNG CHÍNH (3 CỘT X 2 HÀNG) ──
  gridActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 14,
    gap: 8,
  },
  actionCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8ECE9',
  },
  actionIconContainer: {
    width: 64,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionIconImage: {
    width: 60,
    height: 56,
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14251F',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── 6. BANNER TRỢ LÝ FINAI (CHUẨN HÌNH MẪU) ──
  finAiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#EBF8F2',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8EADB',
    shadowColor: '#059669',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12,
  },
  finAiMascotImage: {
    width: 62,
    height: 56,
  },
  finAiContentCol: {
    flex: 1,
  },
  finAiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  finAiTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  finAiSubText: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
  finAiArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finAiArrowIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // ── 7. GIAO DỊCH GẦN ĐÂY ──
  recentSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  recentTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#14251F',
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  txListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E8ECE9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  txItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txCircleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txEmoji: {
    fontSize: 19,
  },
  txDetails: {
    flex: 1,
  },
  txName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14251F',
  },
  txTime: {
    fontSize: 11,
    color: '#8C9C93',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  incomeColor: {
    color: '#059669',
  },
  expenseColor: {
    color: '#EF4444',
  },
  txDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  pressedFeedback: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
