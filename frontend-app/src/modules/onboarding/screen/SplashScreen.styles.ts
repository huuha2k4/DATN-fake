import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#FAFCFB',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '100%',
  },

  // Ambient Layer
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  ambientBlob1: {
    position: 'absolute',
    top: -120,
    left: '10%',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#A7F3D0',
    opacity: 0.35,
  },
  ambientBlob2: {
    position: 'absolute',
    top: 140,
    right: -60,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#6EE7B7',
    opacity: 0.22,
  },
  ambientBlob3: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#D1FAE5',
    opacity: 0.3,
  },

  // Top Section (Chiếm trọn không gian phía trên, lấp đầy khoảng hở)
  topBlock: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 2,
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    marginBottom: 6,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAF8F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#07543F',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  navLogo: {
    width: 48,
    height: 48,
  },
  navBrandTitle: {
    color: '#07543F',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  navBrandSub: {
    color: '#087557',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginTop: 0,
  },

  // Swipe Area
  swipeContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
  },
  slideAnimated: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
  },

  // Hero Pill Badge
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#EAF8F1',
    borderWidth: 1,
    borderColor: '#C7E8D8',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    marginBottom: 5,
  },
  heroBadgeSpark: {
    fontSize: 11.5,
  },
  heroBadgeText: {
    color: '#07543F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    flexShrink: 1,
  },

  // Hero Titles
  heroTitleBox: {
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#14251F',
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  heroTitleHighlight: {
    color: '#087557',
  },
  heroDesc: {
    color: '#576B61',
    marginTop: 4,
    maxWidth: 420,
    textAlign: 'left',
  },

  // Mockup Outer Container (Tăng chiều cao ảnh thẻ trung tâm)
  mockupContainer: {
    width: '100%',
    marginVertical: 4,
  },

  // Mockup Card Common Glassmorphism (Tăng độ đẫy đà & chiều sâu)
  mockupCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#07543F',
    borderWidth: 1,
    borderColor: '#0B8060',
    overflow: 'hidden',
    shadowColor: '#04382A',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
  mockupTopStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: 'rgba(4, 56, 42, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mockupHeaderDots: {
    flexDirection: 'row',
    gap: 4.5,
  },
  mockupDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  mockupUrlText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  mockupLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  mockupLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  mockupLiveText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: '700',
  },
  mockupCardBody: {
    padding: 15,
  },
  mockupCardBodyCompact: {
    padding: 13,
  },

  // Stat Row
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#A7F3D0',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  statValueCompact: {
    fontSize: 20,
  },
  statCurrency: {
    color: '#A7F3D0',
    fontSize: 13.5,
  },
  statSubGreen: {
    color: '#78E2A2',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 3,
  },
  statBadgeSquare: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeSquareIcon: {
    color: '#173D30',
    fontSize: 16,
    fontWeight: '900',
  },

  // Bar Chart Mockup (Tăng chiều cao lên 56dp)
  barChartStrip: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  barChartStripCompact: {
    height: 48,
    marginTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barPair: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3.5,
  },
  barGreen: {
    width: 9,
    backgroundColor: '#10B981',
    borderRadius: 3.5,
  },
  barGreenActive: {
    backgroundColor: '#D4AF37',
  },
  barLight: {
    width: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3.5,
  },
  barLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    fontWeight: '700',
  },

  // Summary Mini Row (Tăng padding)
  summaryMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(4, 56, 42, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.5,
  },
  chipDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  chipText: {
    color: '#D8F6E2',
    fontSize: 9.5,
    fontWeight: '700',
  },

  // OCR Mockup Specifics (Tăng độ rộng rãi cho hoá đơn)
  ocrBox: {
    gap: 9,
  },
  ocrReceiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(4, 56, 42, 0.6)',
    borderRadius: 11,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ocrScanLaser: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: '#34D399',
    shadowColor: '#34D399',
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  ocrReceiptIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrReceiptDetails: {
    flex: 1,
  },
  ocrReceiptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ocrReceiptStore: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  ocrStatusSuccess: {
    backgroundColor: '#059669',
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 4.5,
  },
  ocrStatusText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ocrReceiptDate: {
    color: '#A7F3D0',
    fontSize: 9,
    marginTop: 2.5,
  },
  ocrResultStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(4, 56, 42, 0.7)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ocrField: {
    flex: 1,
    alignItems: 'center',
  },
  ocrFieldLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 8,
    fontWeight: '600',
  },
  ocrFieldValueGreen: {
    color: '#34D399',
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 1.5,
  },
  ocrFieldValueBlue: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1.5,
  },
  ocrDividerV: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  ocrAiHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  ocrAiHintIcon: {
    color: '#D4AF37',
    fontSize: 10.5,
  },
  ocrAiHintText: {
    color: '#D8F6E2',
    fontSize: 9.5,
    flex: 1,
  },

  // Forecast Mockup Specifics (Tăng chiều cao lên 54dp)
  forecastChartBox: {
    height: 54,
    marginTop: 7,
    borderRadius: 9,
    backgroundColor: 'rgba(4, 56, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    justifyContent: 'center',
  },
  forecastGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  forecastCurveLine: {
    ...StyleSheet.absoluteFillObject,
  },
  forecastNode: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
    borderWidth: 1.5,
    borderColor: '#04382A',
  },
  aiAdvisorBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 9,
    padding: 8,
    marginTop: 7,
  },
  aiAdvisorIcon: {
    fontSize: 11.5,
  },
  aiAdvisorText: {
    color: '#D8F6E2',
    fontSize: 9.5,
    lineHeight: 13.5,
    flex: 1,
  },

  // 4 Feature Chips (Tăng độ dày dặn và chiều cao các thẻ)
  featureGridWrapper: {
    gap: 7,
    marginTop: 6,
  },
  featureGridRow: {
    flexDirection: 'row',
    gap: 9,
  },
  featureChipCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E4EBE6',
    shadowColor: '#123A2C',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  featureChipIconBox: {
    borderRadius: 8,
    backgroundColor: '#EAF8F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureChipIconText: {
    textAlign: 'center',
  },
  featureChipTextBox: {
    flex: 1,
  },
  featureChipTitle: {
    color: '#14251F',
    fontSize: 10.5,
    fontWeight: '800',
  },
  featureChipDesc: {
    color: '#576B61',
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
  },

  // Bottom Section: Vừa vặn, lấp đầy không gian chết
  bottomBlock: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 22,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  dotBase: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#07543F',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D1DDD6',
  },
  highlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
    paddingVertical: 4,
    marginBottom: 12,
  },
  highlightText: {
    color: '#576B61',
    fontSize: 10,
    fontWeight: '700',
  },
  highlightDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#B5C4BC',
  },

  // CTA Action Group
  ctaGroup: {
    gap: 9,
  },
  btnPrimary: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#07543F',
    borderWidth: 1,
    borderColor: '#0B8060',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#04382A',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#07543F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#07543F',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  // Footer
  footerBox: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  footerText: {
    color: '#94A69D',
    fontSize: 9,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
