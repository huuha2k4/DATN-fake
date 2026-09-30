import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { colors, radius, spacing } from '../../../theme';
import { sampleScannedInvoice } from '../api';

type Props = { onBack: () => void; onAddTransaction: () => void };

const receiptAssetUri = Image.resolveAssetSource(require('../assets/receipt-ocr.svg')).uri;

export function ScanInvoiceScreen({ onBack, onAddTransaction }: Props) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [hasResult, setHasResult] = React.useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setHasResult(true);
    }, 700);
  };

  return <View style={styles.screen}>
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Quay lại"><Text style={styles.backIcon}>‹</Text></Pressable>
      <Text style={styles.headerTitle}>Quét hóa đơn</Text><View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>NHẬN DIỆN HÓA ĐƠN</Text>
        <Text style={styles.title}>{hasResult ? 'Đã nhận diện hóa đơn' : 'Quản lý chi tiêu nhanh hơn'}</Text>
        <Text style={styles.subtitle}>{hasResult ? 'Kiểm tra thông tin trước khi lưu vào giao dịch.' : 'Chụp hoặc tải lên hóa đơn để tự động lấy thông tin giao dịch.'}</Text>
      </View>

      {hasResult ? <View style={styles.resultCard}>
        <View style={styles.resultHeader}><View style={styles.successBadge}><Text style={styles.successIcon}>✓</Text></View><View><Text style={styles.resultTitle}>Hóa đơn đã quét</Text><Text style={styles.resultHint}>Độ chính xác {sampleScannedInvoice.accuracy}</Text></View></View>
        <View style={styles.resultLine}><Text style={styles.resultLabel}>Cửa hàng</Text><Text style={styles.resultValue}>{sampleScannedInvoice.merchant}</Text></View>
        <View style={styles.resultLine}><Text style={styles.resultLabel}>Tổng tiền</Text><Text style={styles.resultAmount}>{sampleScannedInvoice.total}</Text></View>
        <View style={styles.resultLine}><Text style={styles.resultLabel}>Danh mục</Text><Text style={styles.resultValue}>{sampleScannedInvoice.category}</Text></View>
        <Pressable onPress={onAddTransaction} style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Thêm vào giao dịch"><Text style={styles.primaryText}>Thêm vào giao dịch</Text></Pressable>
        <Pressable onPress={() => setHasResult(false)} style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Quét hóa đơn khác"><Text style={styles.secondaryText}>Quét hóa đơn khác</Text></Pressable>
      </View> : <>
        <View style={styles.scanFrame}>
          <View style={styles.cornerTopLeft} /><View style={styles.cornerTopRight} /><View style={styles.cornerBottomLeft} /><View style={styles.cornerBottomRight} />
          <SvgUri uri={receiptAssetUri} width={150} height={150} />
          <Text style={styles.frameHint}>{isScanning ? 'Đang nhận diện hóa đơn...' : 'Đặt hóa đơn vào khung'}</Text>
        </View>
        <Pressable onPress={handleScan} style={styles.primaryButton} disabled={isScanning} accessibilityRole="button" accessibilityLabel="Chụp hóa đơn"><Text style={styles.primaryText}>{isScanning ? 'Đang quét...' : 'Chụp hóa đơn'}</Text></Pressable>
        <Pressable onPress={handleScan} style={styles.uploadButton} accessibilityRole="button" accessibilityLabel="Tải ảnh hóa đơn"><Text style={styles.uploadIcon}>＋</Text><Text style={styles.uploadText}>Tải ảnh hóa đơn từ thư viện</Text></Pressable>
      </>}

      <View style={styles.tip}><Text style={styles.tipIcon}>i</Text><Text style={styles.tipText}>Đảm bảo hóa đơn đủ sáng, không bị mờ hoặc che khuất để nhận diện chính xác hơn.</Text></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EAF4FF' }, header: { height: 76, paddingHorizontal: spacing.md, backgroundColor: '#004D40', flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 14, justifyContent: 'space-between' }, backButton: { width: 32, height: 32, justifyContent: 'center' }, backIcon: { color: colors.surface, fontSize: 34, lineHeight: 32, fontWeight: '300' }, headerTitle: { color: colors.surface, fontSize: 20, fontWeight: '700' }, headerSpacer: { width: 32 }, content: { padding: spacing.lg, paddingBottom: spacing.xl }, intro: { marginBottom: spacing.lg }, eyebrow: { color: colors.forest, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, scanFrame: { height: 330, borderRadius: radius.lg, backgroundColor: '#D6E9F7', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: spacing.lg }, receiptImage: { width: 150, height: 150, opacity: 0.85 }, frameHint: { color: colors.forest, fontSize: 13, fontWeight: '700', marginTop: spacing.md }, cornerTopLeft: { position: 'absolute', top: 28, left: 28, width: 42, height: 42, borderTopWidth: 4, borderLeftWidth: 4, borderColor: colors.forest, borderTopLeftRadius: 8 }, cornerTopRight: { position: 'absolute', top: 28, right: 28, width: 42, height: 42, borderTopWidth: 4, borderRightWidth: 4, borderColor: colors.forest, borderTopRightRadius: 8 }, cornerBottomLeft: { position: 'absolute', bottom: 28, left: 28, width: 42, height: 42, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: colors.forest, borderBottomLeftRadius: 8 }, cornerBottomRight: { position: 'absolute', bottom: 28, right: 28, width: 42, height: 42, borderBottomWidth: 4, borderRightWidth: 4, borderColor: colors.forest, borderBottomRightRadius: 8 }, primaryButton: { backgroundColor: '#004D40', borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center', marginTop: spacing.md, shadowColor: '#004D40', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, primaryText: { color: colors.surface, fontSize: 14, fontWeight: '800' }, uploadButton: { minHeight: 52, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.mintStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: spacing.md }, uploadIcon: { color: colors.forest, fontSize: 20 }, uploadText: { color: colors.forest, fontSize: 13, fontWeight: '800' }, resultCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }, successBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }, successIcon: { color: colors.forest, fontSize: 22, fontWeight: '800' }, resultTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, resultHint: { color: colors.forest, fontSize: 12, marginTop: 3 }, resultLine: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }, resultLabel: { color: colors.muted, fontSize: 13 }, resultValue: { color: colors.ink, fontSize: 13, fontWeight: '700' }, resultAmount: { color: colors.coral, fontSize: 14, fontWeight: '800' }, secondaryButton: { alignItems: 'center', paddingVertical: spacing.md }, secondaryText: { color: colors.forest, fontSize: 13, fontWeight: '800' }, tip: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.sm, backgroundColor: '#FFF8E7' }, tipIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.amber, color: colors.surface, textAlign: 'center', lineHeight: 20, fontWeight: '800', marginRight: spacing.sm }, tipText: { flex: 1, color: '#7A5A1A', fontSize: 12, lineHeight: 18 },
});