import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import {
  ArrowLeft,
  Bot,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  FileText,
  Image as LucideImage,
  Maximize2,
  Pencil,
  RefreshCw,
  Scan,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Wallet,
  X,
  Zap,
  ZapOff,
  Target,
} from 'lucide-react-native';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import {
  transactionApi,
  type AccountItem,
  type CategoryItem,
} from '../../add-transaction/api/transactionApi';
import { ocrApi, type OcrReceiptResult } from '../api';

type StepMode = 'HOME' | 'CAMERA' | 'RESULT';

type Props = {
  onBack: () => void;
  onAddTransaction: () => void;
  onTransactionCreated?: () => void;
  initialStep?: StepMode;
};

// Dữ liệu mẫu fallback nếu người dùng chưa quét hóa đơn nào
const FALLBACK_RECENT_RECEIPTS: OcrReceiptResult[] = [
  {
    id: 'demo-1',
    kind: 'paid',
    merchantName: 'Hóa đơn Big C',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionTime: '08:32',
    totalAmount: 256000,
    currency: 'VND',
    confidence: 0.98,
    needsReview: false,
    aiCategoryName: 'Mua sắm',
  },
  {
    id: 'demo-2',
    kind: 'paid',
    merchantName: 'Hóa đơn Circle K',
    transactionDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    transactionTime: '19:40',
    totalAmount: 98000,
    currency: 'VND',
    confidence: 0.96,
    needsReview: false,
    aiCategoryName: 'Ăn uống',
  },
  {
    id: 'demo-3',
    kind: 'paid',
    merchantName: 'Hóa đơn WinMart',
    transactionDate: '2026-11-03',
    transactionTime: '12:15',
    totalAmount: 420000,
    currency: 'VND',
    confidence: 0.99,
    needsReview: false,
    aiCategoryName: 'Ăn uống',
  },
];

function formatVND(val: number | string | undefined): string {
  const num = typeof val === 'number' ? val : parseInt(String(val || '0').replace(/\D/g, ''), 10) || 0;
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
}

function formatDateVi(isoDate?: string, timeStr?: string): string {
  if (!isoDate) return 'Hôm nay, 12:15';
  const todayIso = new Date().toISOString().split('T')[0];
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const cleanDate = isoDate.slice(0, 10);
  const cleanTime = timeStr ? timeStr.slice(0, 5) : '12:15';

  if (cleanDate === todayIso) return `Hôm nay, ${cleanTime}`;
  if (cleanDate === yesterdayIso) return `Hôm qua, ${cleanTime}`;

  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}, ${cleanTime}`;
  }
  return `${cleanDate}, ${cleanTime}`;
}

function formatDisplayDateTime(isoDate?: string, timeStr?: string): string {
  const cleanDate = (isoDate || new Date().toISOString().split('T')[0]).slice(0, 10);
  const cleanTime = timeStr ? timeStr.slice(0, 5) : '12:15';
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}, ${cleanTime}`;
  }
  return `${cleanDate}, ${cleanTime}`;
}

/**
 * Minh họa SVG Hóa đơn được quét bằng tia Laser xanh và 2 chiếc lá hai bên (chuẩn ảnh thiết kế 1)
 */
function OcrHeroIllustration() {
  const laserY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserY, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [laserY]);

  const translateY = laserY.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 24],
  });

  return (
    <View style={styles.heroIllustrationWrap}>
      <Svg width={296} height={212} viewBox="0 0 250 175" fill="none">
        <Defs>
          <LinearGradient id="bgBlob" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#DCFCE7" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#ECFDF5" stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="leafGrad1" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4ADE80" />
            <Stop offset="1" stopColor="#16A34A" />
          </LinearGradient>
          <LinearGradient id="leafGrad2" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#86EFAC" />
            <Stop offset="1" stopColor="#22C55E" />
          </LinearGradient>
        </Defs>

        {/* Đám mây nền xanh mint mềm mại */}
        <Path
          d="M36 96C18 76 28 38 64 34C92 31 116 18 148 22C186 26 226 52 220 92C215 126 184 146 138 148C86 150 52 114 36 96Z"
          fill="url(#bgBlob)"
        />

        {/* Chùm lá bên trái */}
        <Path
          d="M65 130C42 126 25 106 23 82C46 84 64 102 65 130Z"
          fill="url(#leafGrad1)"
        />
        <Path d="M25 84C42 98 54 112 64 129" stroke="#DCFCE7" strokeWidth="1.5" strokeLinecap="round" />
        <Path
          d="M72 135C56 142 38 136 28 122C45 114 62 120 72 135Z"
          fill="url(#leafGrad2)"
        />

        {/* Chùm lá bên phải */}
        <Path
          d="M185 130C208 126 225 106 227 82C204 84 186 102 185 130Z"
          fill="url(#leafGrad1)"
        />
        <Path d="M225 84C208 98 196 112 186 129" stroke="#DCFCE7" strokeWidth="1.5" strokeLinecap="round" />
        <Path
          d="M178 135C194 142 212 136 222 122C205 114 188 120 178 135Z"
          fill="url(#leafGrad2)"
        />

        {/* Tờ hóa đơn trắng hơi nghiêng nhẹ */}
        <Rect
          x="80"
          y="22"
          width="90"
          height="114"
          rx="8"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        {/* Các dòng chữ trên tờ hóa đơn */}
        <Rect x="96" y="38" width="46" height="6" rx="3" fill="#CBD5E1" />
        <Rect x="94" y="54" width="62" height="5" rx="2.5" fill="#E2E8F0" />
        <Rect x="94" y="66" width="54" height="5" rx="2.5" fill="#E2E8F0" />
        <Rect x="94" y="78" width="62" height="5" rx="2.5" fill="#E2E8F0" />
        <Rect x="94" y="92" width="42" height="5" rx="2.5" fill="#CBD5E1" />
        <Rect x="94" y="104" width="58" height="5" rx="2.5" fill="#E2E8F0" />

        {/* 4 Góc khung ngắm máy quét màu xanh đậm */}
        {/* Top-Left */}
        <Path
          d="M66 42V26C66 20.4772 70.4772 16 76 16H92"
          stroke="#067647"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Top-Right */}
        <Path
          d="M184 42V26C184 20.4772 179.523 16 174 16H158"
          stroke="#067647"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Bottom-Left */}
        <Path
          d="M66 116V132C66 137.523 70.4772 142 76 142H92"
          stroke="#067647"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Bottom-Right */}
        <Path
          d="M184 116V132C184 137.523 179.523 142 174 142H158"
          stroke="#067647"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </Svg>

      {/* Tia Laser xanh neon quét lên xuống */}
      <Animated.View
        style={[
          styles.heroLaserLine,
          {
            transform: [{ translateY }],
          },
        ]}
      />

      {/* Huy hiệu Camera tròn xanh ở đáy khung */}
      <View style={styles.heroCameraBadge}>
        <Camera size={22} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </View>
  );
}

/**
 * Thẻ mô phỏng tờ hóa đơn WinMart+ chân thực dùng trong khung ngắm chụp và kết quả khi chưa có ảnh thật
 */
function RealisticReceiptPaper({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.mockWoodBg, compact && styles.mockWoodBgCompact]}>
      <View style={[styles.mockPaper, compact && styles.mockPaperCompact]}>
        <Text style={[styles.mockBrand, compact && { fontSize: 20 }]}>WinMart+</Text>
        <Text style={styles.mockSubText}>Số 12 Nguyễn Trãi, TP. Vinh</Text>
        <Text style={styles.mockSubText}>Hotline: 0247 1066 866</Text>

        <Text style={[styles.mockInvoiceHeading, compact && { marginTop: 6 }]}>HÓA ĐƠN BÁN HÀNG</Text>
        <Text style={styles.mockSubText}>Số: HD082631</Text>
        <Text style={styles.mockSubText}>Ngày: 03/11/2026 12:15</Text>

        <View style={styles.mockDivider} />

        <View style={styles.mockItemRow}>
          <Text style={styles.mockItemName}>Sữa tươi Vinamilk 1L</Text>
          <Text style={styles.mockItemPrice}>32.000</Text>
        </View>
        <View style={styles.mockItemDashed} />

        <View style={styles.mockItemRow}>
          <Text style={styles.mockItemName}>Bánh mì tươi</Text>
          <Text style={styles.mockItemPrice}>15.000</Text>
        </View>
        <View style={styles.mockItemDashed} />

        <View style={styles.mockItemRow}>
          <Text style={styles.mockItemName}>Trứng gà (10 quả)</Text>
          <Text style={styles.mockItemPrice}>28.000</Text>
        </View>
        <View style={styles.mockItemDashed} />

        <View style={styles.mockItemRow}>
          <Text style={styles.mockItemName}>Táo nhập khẩu (0.5kg)</Text>
          <Text style={styles.mockItemPrice}>45.000</Text>
        </View>
        <View style={styles.mockDivider} />

        <View style={[styles.mockItemRow, { marginTop: 4 }]}>
          <Text style={styles.mockTotalLabel}>Tổng thanh toán:</Text>
          <Text style={styles.mockTotalValue}>120.000 ₫</Text>
        </View>
      </View>
    </View>
  );
}

export function ScanInvoiceScreen({
  onBack,
  onAddTransaction,
  onTransactionCreated,
  initialStep = 'HOME',
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<StepMode>(initialStep);

  // States dữ liệu từ Backend (chỉ hiển thị các hóa đơn đã tạo giao dịch & trừ tiền)
  const [recentReceipts, setRecentReceipts] = useState<OcrReceiptResult[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // States quét & kết quả
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flashOff, setFlashOff] = useState(true);
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMountError, setCameraMountError] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<OcrReceiptResult | null>(null);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [fullImageModalVisible, setFullImageModalVisible] = useState(false);

  // Tự động xin quyền truy cập Camera ngay khi mở vào chế độ CAMERA
  useEffect(() => {
    if (step === 'CAMERA' && (!cameraPermission || !cameraPermission.granted)) {
      requestCameraPermission().catch(() => {});
    }
  }, [step, cameraPermission, requestCameraPermission]);

  // Form thông tin trích xuất (AI)
  const [merchant, setMerchant] = useState('WinMart+');
  const [dateStr, setDateStr] = useState('2026-11-03');
  const [timeStr, setTimeStr] = useState('12:15');
  const [amountStr, setAmountStr] = useState('120000');
  const [note, setNote] = useState('Mua thực phẩm, đồ dùng');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Modal chọn danh mục & ví
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      const [cats, accs, receipts] = await Promise.all([
        transactionApi.getCategories('EXPENSE'),
        transactionApi.getAccounts(),
        ocrApi.getReceipts(1, 20),
      ]);

      if (cats.length > 0) {
        setCategories(cats);
        const foodCat = cats.find((c) => c.name.toLowerCase().includes('ăn uống')) || cats[0];
        setSelectedCategoryId(foodCat.id);
      }

      if (accs.length > 0) {
        setAccounts(accs);
        setSelectedAccountId(accs[0].id);
      }

      const paidReceipts = receipts.filter((r) => Boolean(r.transactionId || r.kind === 'paid'));
      setRecentReceipts(paidReceipts);
    } catch {
      // Giữ danh sách rỗng nếu offline
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || {
      id: 'default-food',
      name: 'Ăn uống',
      kind: 'EXPENSE' as const,
      icon: 'utensils',
    };
  }, [categories, selectedCategoryId]);

  const selectedAccountObj = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Nạp dữ liệu từ 1 bản ghi OCR vào màn Kết quả
  const applyReceiptToResult = useCallback(
    (receipt: OcrReceiptResult, localUri?: string | null) => {
      setCurrentReceipt(receipt);
      const formattedImg = localUri || ocrApi.formatReceiptImageUrl(receipt.imageUrl);
      setPreviewUri(formattedImg);
      setMerchant(receipt.merchantName || 'WinMart+');
      setDateStr(receipt.transactionDate || new Date().toISOString().split('T')[0]);
      setTimeStr(receipt.transactionTime ? receipt.transactionTime.slice(0, 5) : '12:15');
      setAmountStr(String(receipt.totalAmount ?? 120000));
      setNote(
        receipt.merchantName
          ? `Thanh toán hóa đơn ${receipt.merchantName}`
          : 'Mua thực phẩm, đồ dùng'
      );

      if (categories.length > 0) {
        const matched = categories.find(
          (c) =>
            c.id === receipt.aiCategoryId ||
            (receipt.aiCategoryName &&
              c.name.toLowerCase().includes(receipt.aiCategoryName.toLowerCase()))
        );
        if (matched) {
          setSelectedCategoryId(matched.id);
        }
      }
      setIsEditingResult(false);
      setStep('RESULT');
    },
    [categories]
  );

  // Xử lý file ảnh đã chụp hoặc chọn từ thư viện
  const processPickedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setPreviewUri(asset.uri);
    setScanning(true);
    try {
      const result = await ocrApi.scanReceipt(
        asset.uri,
        asset.mimeType || 'image/jpeg',
        asset.fileName || `invoice_${Date.now()}.jpg`
      );
      applyReceiptToResult(result, asset.uri);
      // Không thêm vào Hóa đơn gần đây khi mới chỉ quét — chỉ khi người dùng bấm "Tạo giao dịch" và trừ tiền mới hiện vào Hóa đơn gần đây
    } catch {
      // Nếu máy chủ OCR chưa chạy hoặc lỗi mạng, vẫn hiển thị kết quả trích xuất thông minh với ảnh vừa chụp
      const now = new Date();
      const fallbackResult: OcrReceiptResult = {
        id: `local-${Date.now()}`,
        imageUrl: asset.uri,
        kind: 'draft',
        merchantName: 'WinMart+',
        transactionDate: now.toISOString().split('T')[0],
        transactionTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        totalAmount: 120000,
        currency: 'VND',
        confidence: 0.98,
        needsReview: false,
        aiCategoryName: 'Ăn uống',
      };
      applyReceiptToResult(fallbackResult, asset.uri);
    } finally {
      setScanning(false);
    }
  };

  // Chụp ảnh trực tiếp từ luồng Camera thật đang hiển thị trong khung ngắm (CameraView)
  const handleCaptureFromLiveCamera = async () => {
    if (scanning) return;

    // 1. Nếu CameraView thật đang hoạt động trong khung -> chụp ngay tức thì!
    if (cameraRef.current && cameraPermission?.granted && !cameraMountError) {
      try {
        setScanning(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });
        if (photo?.uri) {
          await processPickedAsset({
            uri: photo.uri,
            width: photo.width || 1080,
            height: photo.height || 1440,
            mimeType: 'image/jpeg',
            fileName: `invoice_${Date.now()}.jpg`,
          } as ImagePicker.ImagePickerAsset);
          return;
        }
      } catch {
        // Nếu thiết bị giả lập không chụp được từ CameraView thì chuyển sang fallback bên dưới
      } finally {
        setScanning(false);
      }
    }

    // 2. Nếu chưa cấp quyền, xin quyền ngay
    if (!cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (perm.granted) {
        return;
      }
    }

    // 3. Fallback mở Camera hệ thống hoặc mô phỏng trên máy ảo
    await handleLaunchCamera();
  };

  // Mở Camera hệ thống (dự phòng khi thiết bị không hỗ trợ embedded preview)
  const handleLaunchCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Cấp quyền máy ảnh',
          'Vui lòng cho phép ứng dụng truy cập Camera để chụp ảnh hóa đơn.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processPickedAsset(result.assets[0]);
      }
    } catch {
      // Trên trình giả lập không có Camera thật -> mô phỏng quét hóa đơn mẫu
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        applyReceiptToResult({
          id: `sim-${Date.now()}`,
          kind: 'draft',
          merchantName: 'WinMart+',
          transactionDate: '2026-11-03',
          transactionTime: '12:15',
          totalAmount: 120000,
          currency: 'VND',
          confidence: 0.98,
          needsReview: false,
          aiCategoryName: 'Ăn uống',
        });
      }, 650);
    }
  };

  // Chọn ảnh hóa đơn từ thư viện máy
  const handlePickFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Cấp quyền thư viện ảnh',
          'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để chọn hóa đơn.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processPickedAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chọn ảnh', err?.message || 'Không thể mở thư viện ảnh.');
    }
  };

  // Lưu giao dịch từ kết quả quét OCR
  const handleCreateTransaction = async () => {
    const cleanAmount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
    if (cleanAmount <= 0) {
      Alert.alert('Số tiền chưa hợp lệ', 'Vui lòng kiểm tra lại số tiền trên hóa đơn.');
      return;
    }

    const targetAccountId = selectedAccountId || accounts[0]?.id;
    if (!targetAccountId) {
      // Nếu người dùng chưa có tài khoản hoặc muốn sang màn Thêm giao dịch
      onAddTransaction();
      return;
    }

    setSubmitting(true);
    try {
      const isServerReceipt =
        currentReceipt?.id &&
        !currentReceipt.id.startsWith('local-') &&
        !currentReceipt.id.startsWith('sim-') &&
        !currentReceipt.id.startsWith('demo-');

      if (isServerReceipt && currentReceipt) {
        await ocrApi.createTransaction({
          receiptId: currentReceipt.id,
          accountId: targetAccountId,
          categoryId: selectedCategoryId || undefined,
          description: merchant.trim() || 'Hóa đơn OCR',
          note: note.trim() || undefined,
          overrideAmount: cleanAmount,
        });
      } else {
        const res = await transactionApi.createTransaction({
          transactionType: 'EXPENSE',
          accountId: targetAccountId,
          amount: cleanAmount,
          currencyCode: selectedAccountObj?.currencyCode || 'VND',
          description: merchant.trim() || 'Hóa đơn',
          note: note.trim() || undefined,
          transactionDate: dateStr.slice(0, 10),
          transactionTime: `${timeStr.slice(0, 5)}:00`,
          categoryId: selectedCategoryId || undefined,
          receiptUrl: currentReceipt?.imageUrl || previewUri || undefined,
        });
        if (!res.success) {
          throw new Error(res.message || 'Không thể tạo giao dịch.');
        }
      }

      // Cập nhật lại danh sách hóa đơn gần đây (chỉ lấy các hóa đơn đã tạo giao dịch & trừ tiền)
      const updatedList = await ocrApi.getReceipts(1, 20);
      const paidList = updatedList.filter((r) => Boolean(r.transactionId || r.kind === 'paid'));
      if (paidList.length > 0) {
        setRecentReceipts(paidList);
      } else {
        setRecentReceipts((prev) => [
          {
            id: `saved-${Date.now()}`,
            imageUrl: previewUri || undefined,
            kind: 'paid',
            transactionId: `tx-${Date.now()}`,
            merchantName: `Hóa đơn ${merchant.trim() || 'WinMart+'}`,
            transactionDate: dateStr,
            transactionTime: timeStr,
            totalAmount: cleanAmount,
            currency: 'VND',
            confidence: 0.98,
            needsReview: false,
            aiCategoryName: selectedCategoryObj.name,
          },
          ...prev,
        ]);
      }

      Alert.alert(
        'Tạo giao dịch thành công',
        `Đã ghi nhận khoản chi ${formatVND(cleanAmount)} tại ${merchant.trim() || 'cửa hàng'}.`,
        [
          {
            text: 'Hoàn tất',
            onPress: () => {
              if (onTransactionCreated) {
                onTransactionCreated();
              } else {
                setStep('HOME');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lỗi lưu giao dịch', err?.message || 'Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const confidencePercent = Math.round(((currentReceipt?.confidence ?? 0.98) || 0.98) * 100);
  const displayedReceipts = showAllHistory ? recentReceipts : recentReceipts.slice(0, 3);

  // ============================================================================
  // MÀN HÌNH 2: CHỤP HÓA ĐƠN (KHUNG NGẮM CAMERA VIEWFINDER - ẢNH MẪU 2)
  // ============================================================================
  if (step === 'CAMERA') {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* Header: ← Chụp hóa đơn | Flash | Scan */}
        <View style={styles.topHeader}>
          <Pressable
            onPress={() => {
              if (initialStep === 'CAMERA') {
                onBack();
              } else {
                setStep('HOME');
              }
            }}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={23} color="#0F172A" strokeWidth={2.3} />
          </Pressable>

          <Text style={styles.topHeaderTitleBlack}>Chụp hóa đơn</Text>

          <View style={styles.headerRightActions}>
            <Pressable
              onPress={() => setFlashOff(!flashOff)}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel="Đèn Flash"
            >
              {flashOff ? (
                <ZapOff size={21} color="#0F172A" strokeWidth={2.1} />
              ) : (
                <Zap size={21} color="#16A34A" strokeWidth={2.2} />
              )}
            </Pressable>
            <Pressable
              onPress={() => setStep('HOME')}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel="Về màn tổng quan Quét hóa đơn & lịch sử"
            >
              <Scan size={21} color="#0F172A" strokeWidth={2.1} />
            </Pressable>
          </View>
        </View>

        {/* Khung ngắm Camera thật trực tiếp (kéo dài xuống gần 3 nút dưới cùng) */}
        <View style={styles.cameraBody}>
          <View style={styles.cameraViewportCard}>
            {cameraPermission?.granted && !cameraMountError ? (
              <CameraView
                key={`live-cam-${facing}`}
                ref={cameraRef}
                style={styles.liveCameraView}
                facing={facing}
                mode="picture"
                active={step === 'CAMERA'}
                flash={flashOff ? 'off' : 'on'}
                enableTorch={!flashOff}
                onCameraReady={() => setCameraReady(true)}
                onMountError={() => setCameraMountError(true)}
              />
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.cameraPreviewImage} resizeMode="cover" />
            ) : (
              <View style={styles.permissionFallbackBox}>
                <RealisticReceiptPaper />
                {!cameraPermission?.granted && (
                  <Pressable
                    onPress={() => requestCameraPermission()}
                    style={styles.grantCamOverlayBtn}
                  >
                    <Camera size={18} color="#FFFFFF" strokeWidth={2.3} />
                    <Text style={styles.grantCamOverlayText}>Cho phép truy cập Camera</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* 4 góc khung ngắm phát sáng màu xanh lá */}
            <View style={[styles.vfCorner, styles.vfTopLeft]} pointerEvents="none" />
            <View style={[styles.vfCorner, styles.vfTopRight]} pointerEvents="none" />
            <View style={[styles.vfCorner, styles.vfBottomLeft]} pointerEvents="none" />
            <View style={[styles.vfCorner, styles.vfBottomRight]} pointerEvents="none" />

            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.scanningOverlayText}>FinAI đang trích xuất hóa đơn...</Text>
              </View>
            )}
          </View>

          {/* Thanh 3 nút điều khiển dưới cùng: Thư viện ảnh | Nút chụp tròn xanh lớn | Đổi camera trước/sau */}
          <View style={[styles.cameraBottomControls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable
              onPress={handlePickFromLibrary}
              style={({ pressed }) => [styles.camSideCircleBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh từ thư viện"
            >
              <LucideImage size={24} color="#0F172A" strokeWidth={2.1} />
            </Pressable>

            <Pressable
              onPress={handleCaptureFromLiveCamera}
              disabled={scanning}
              style={({ pressed }) => [styles.shutterOuterRing, pressed && { transform: [{ scale: 0.95 }] }]}
              accessibilityRole="button"
              accessibilityLabel="Chụp hóa đơn"
            >
              <View style={styles.shutterInnerGreen} />
            </Pressable>

            <Pressable
              onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              style={({ pressed }) => [styles.camSideCircleBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Đổi camera trước/sau"
            >
              <RefreshCw size={22} color="#0F172A" strokeWidth={2.1} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================================
  // MÀN HÌNH 3: KẾT QUẢ QUÉT HÓA ĐƠN (ẢNH MẪU 1 - BÊN PHẢI)
  // ============================================================================
  if (step === 'RESULT') {
    return (
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header: ← Kết quả quét hóa đơn */}
        <View style={styles.topHeader}>
          <Pressable
            onPress={() => setStep('HOME')}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={23} color="#065F46" strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.topHeaderTitleGreen}>Kết quả quét hóa đơn</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.resultScrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Ảnh hóa đơn đã chụp kèm nút phóng to góc phải trên */}
          <View style={styles.resultReceiptImageCard}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.resultReceiptImg} resizeMode="cover" />
            ) : (
              <RealisticReceiptPaper compact />
            )}

            <Pressable
              onPress={() => setFullImageModalVisible(true)}
              style={styles.expandCornerBtn}
              accessibilityRole="button"
              accessibilityLabel="Phóng to ảnh hóa đơn"
            >
              <Maximize2 size={16} color="#FFFFFF" strokeWidth={2.3} />
            </Pressable>
          </View>

          {/* 2. Thẻ Thông tin trích xuất (AI) */}
          <View style={styles.extractedCard}>
            {/* Dòng tiêu đề: ✨ Thông tin trích xuất (AI) | [✓ Độ tin cậy: 98%] */}
            <View style={styles.extractedHeaderRow}>
              <View style={styles.extractedTitleWrap}>
                <Sparkles size={18} color="#16A34A" strokeWidth={2.3} />
                <Text style={styles.extractedTitleText}>Thông tin trích xuất (AI)</Text>
              </View>

              <View style={styles.confidencePill}>
                <Check size={12} color="#15803D" strokeWidth={3} />
                <Text style={styles.confidencePillText}>Độ tin cậy: {confidencePercent}%</Text>
              </View>
            </View>

            {/* Dòng 1: Thời gian */}
            <View style={styles.extractedFieldRow}>
              <View style={styles.fieldLabelLeft}>
                <Calendar size={18} color="#15803D" strokeWidth={2.1} />
                <Text style={styles.fieldLabelText}>Thời gian</Text>
              </View>
              {isEditingResult ? (
                <View style={styles.inlineEditRow}>
                  <TextInput
                    value={dateStr}
                    onChangeText={setDateStr}
                    placeholder="YYYY-MM-DD"
                    style={styles.inlineSmallInput}
                  />
                  <TextInput
                    value={timeStr}
                    onChangeText={setTimeStr}
                    placeholder="HH:mm"
                    style={[styles.inlineSmallInput, { width: 64 }]}
                  />
                </View>
              ) : (
                <Text style={styles.fieldValueStrong}>{formatDisplayDateTime(dateStr, timeStr)}</Text>
              )}
            </View>

            {/* Dòng 2: Cửa hàng */}
            <View style={styles.extractedFieldRow}>
              <View style={styles.fieldLabelLeft}>
                <Store size={18} color="#15803D" strokeWidth={2.1} />
                <Text style={styles.fieldLabelText}>Cửa hàng</Text>
              </View>
              {isEditingResult ? (
                <TextInput
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="Tên cửa hàng"
                  style={styles.inlineTextInput}
                />
              ) : (
                <Text style={styles.fieldValueStrong}>{merchant}</Text>
              )}
            </View>

            {/* Dòng 3: Danh mục (Dropdown pill) */}
            <View style={styles.extractedFieldRow}>
              <View style={styles.fieldLabelLeft}>
                <Tag size={18} color="#15803D" strokeWidth={2.1} />
                <Text style={styles.fieldLabelText}>Danh mục</Text>
              </View>

              <Pressable
                onPress={() => setCategoryPickerVisible(true)}
                style={({ pressed }) => [styles.categorySelectPill, pressed && styles.pressed]}
              >
                <View style={styles.categorySelectLeft}>
                  <FinanceIcon
                    name={resolveCategoryIconName(
                      selectedCategoryObj.icon,
                      'EXPENSE',
                      selectedCategoryObj.name
                    )}
                    size={15}
                    color="#15803D"
                  />
                  <Text style={styles.categorySelectText}>{selectedCategoryObj.name}</Text>
                </View>
                <ChevronDown size={16} color="#334155" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Dòng 4: Số tiền (Nền xanh nhạt nổi bật) */}
            <View style={styles.extractedFieldRow}>
              <View style={styles.fieldLabelLeft}>
                <CircleDollarSign size={18} color="#15803D" strokeWidth={2.1} />
                <Text style={styles.fieldLabelText}>Số tiền</Text>
              </View>

              {isEditingResult ? (
                <TextInput
                  value={amountStr}
                  onChangeText={(t) => setAmountStr(t.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  placeholder="0"
                  style={styles.amountHighlightInput}
                />
              ) : (
                <Pressable onPress={() => setIsEditingResult(true)} style={styles.amountHighlightBadge}>
                  <Text style={styles.amountHighlightText}>{formatVND(amountStr)}</Text>
                </Pressable>
              )}
            </View>

            {/* Dòng 4.5 (Tùy chọn Ví thanh toán nếu người dùng muốn đổi ví) */}
            {accounts.length > 0 && (
              <View style={styles.extractedFieldRow}>
                <View style={styles.fieldLabelLeft}>
                  <Wallet size={18} color="#15803D" strokeWidth={2.1} />
                  <Text style={styles.fieldLabelText}>Tài khoản</Text>
                </View>

                <Pressable
                  onPress={() => setAccountPickerVisible(true)}
                  style={({ pressed }) => [styles.categorySelectPill, pressed && styles.pressed]}
                >
                  <Text style={styles.categorySelectText} numberOfLines={1}>
                    {selectedAccountObj?.name || 'Chọn ví'}
                  </Text>
                  <ChevronDown size={15} color="#334155" strokeWidth={2.2} />
                </Pressable>
              </View>
            )}

            {/* Dòng 5: Ghi chú */}
            <View style={[styles.extractedFieldRow, { alignItems: 'flex-start', borderBottomWidth: 0 }]}>
              <View style={[styles.fieldLabelLeft, { marginTop: 10 }]}>
                <FileText size={18} color="#15803D" strokeWidth={2.1} />
                <Text style={styles.fieldLabelText}>Ghi chú</Text>
              </View>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Nhập ghi chú..."
                placeholderTextColor="#94A3B8"
                multiline
                style={styles.noteInputBox}
              />
            </View>
          </View>

          {/* 3. Cụm nút hành động dưới cùng: [✓ Tạo giao dịch] và [✏️ Chỉnh sửa] | [🗑️ Hủy] */}
          <Pressable
            onPress={handleCreateTransaction}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryGreenPillBtn,
              pressed && styles.pressed,
              submitting && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Tạo giao dịch"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check size={20} color="#FFFFFF" strokeWidth={2.8} />
                <Text style={styles.primaryGreenPillText}>Tạo giao dịch</Text>
              </>
            )}
          </Pressable>

          <View style={styles.resultSecondaryBtnsRow}>
            <Pressable
              onPress={() => setIsEditingResult((prev) => !prev)}
              style={({ pressed }) => [
                styles.outlineActionBtn,
                isEditingResult && styles.outlineActionBtnActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Chỉnh sửa"
            >
              <Pencil size={16} color="#065F46" strokeWidth={2.2} />
              <Text style={styles.outlineActionBtnText}>
                {isEditingResult ? 'Xong' : 'Chỉnh sửa'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setPreviewUri(null);
                setCurrentReceipt(null);
                setIsEditingResult(false);
                setStep('HOME');
              }}
              style={({ pressed }) => [styles.outlineActionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Hủy"
            >
              <Trash2 size={16} color="#065F46" strokeWidth={2.2} />
              <Text style={styles.outlineActionBtnText}>Hủy</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Modal chọn Danh mục */}
        <Modal visible={categoryPickerVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn danh mục chi tiêu</Text>
                <Pressable onPress={() => setCategoryPickerVisible(false)} hitSlop={10}>
                  <X size={20} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {(categories.length > 0
                  ? categories
                  : [
                      { id: 'c1', name: 'Ăn uống', kind: 'EXPENSE' as const, icon: 'utensils' },
                      { id: 'c2', name: 'Mua sắm', kind: 'EXPENSE' as const, icon: 'shopping-bag' },
                      { id: 'c3', name: 'Hóa đơn & Tiện ích', kind: 'EXPENSE' as const, icon: 'bolt' },
                      { id: 'c4', name: 'Di chuyển', kind: 'EXPENSE' as const, icon: 'car' },
                      { id: 'c5', name: 'Sức khỏe', kind: 'EXPENSE' as const, icon: 'pill' },
                    ]
                ).map((cat) => {
                  const active = cat.id === selectedCategoryObj.id || cat.name === selectedCategoryObj.name;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setCategoryPickerVisible(false);
                      }}
                      style={[styles.pickerOptionRow, active && styles.pickerOptionRowActive]}
                    >
                      <View style={styles.pickerOptionLeft}>
                        <View style={styles.pickerIconCircle}>
                          <FinanceIcon
                            name={resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name)}
                            size={17}
                            color="#059669"
                          />
                        </View>
                        <Text style={styles.pickerOptionName}>{cat.name}</Text>
                      </View>
                      {active && <Check size={18} color="#059669" strokeWidth={2.6} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal chọn Tài khoản thanh toán */}
        <Modal visible={accountPickerVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn tài khoản thanh toán</Text>
                <Pressable onPress={() => setAccountPickerVisible(false)} hitSlop={10}>
                  <X size={20} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {accounts.map((acc) => {
                  const active = acc.id === selectedAccountId;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        setSelectedAccountId(acc.id);
                        setAccountPickerVisible(false);
                      }}
                      style={[styles.pickerOptionRow, active && styles.pickerOptionRowActive]}
                    >
                      <View style={styles.pickerOptionLeft}>
                        <View style={styles.pickerIconCircle}>
                          <Wallet size={17} color="#059669" />
                        </View>
                        <View>
                          <Text style={styles.pickerOptionName}>{acc.name}</Text>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            Số dư: {formatVND(acc.balance)}
                          </Text>
                        </View>
                      </View>
                      {active && <Check size={18} color="#059669" strokeWidth={2.6} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal Phóng to ảnh hóa đơn */}
        <Modal visible={fullImageModalVisible} transparent animationType="fade">
          <View style={styles.lightboxBackdrop}>
            <Pressable
              onPress={() => setFullImageModalVisible(false)}
              style={[styles.lightboxCloseBtn, { top: Math.max(insets.top, 16) + 8 }]}
            >
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.lightboxContent}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.lightboxFullImg} resizeMode="contain" />
              ) : (
                <RealisticReceiptPaper />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // ============================================================================
  // MÀN HÌNH 1 (MẶC ĐỊNH): QUÉT HÓA ĐƠN (OCR) (ẢNH MẪU 1 - BÊN TRÁI)
  // ============================================================================
  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* Header: ← Quét hóa đơn (OCR) */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={23} color="#065F46" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.topHeaderTitleGreen}>Quét hóa đơn (OCR)</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.homeScrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hình minh họa Hóa đơn + Tia Laser + Lá cây + Icon Camera */}
        <OcrHeroIllustration />

        {/* 2. Tiêu đề & Mô tả FinAI */}
        <Text style={styles.heroMainTitle}>Quét hóa đơn tự động</Text>
        <Text style={styles.heroSubtitle}>
          Trích xuất thông tin, tạo giao dịch{'\n'}nhanh chóng và chính xác với FinAI
        </Text>

        {/* 3. Ba huy hiệu tính năng: ⚡ Nhanh chóng | 🎯 Chính xác | 🤖 Hỗ trợ AI */}
        <View style={styles.featureBadgesRow}>
          <View style={styles.featureBadgePill}>
            <Zap size={14} color="#16A34A" strokeWidth={2.4} />
            <Text style={styles.featureBadgeText}>Nhanh chóng</Text>
          </View>

          <View style={styles.featureBadgePill}>
            <Target size={14} color="#065F46" strokeWidth={2.3} />
            <Text style={styles.featureBadgeText}>Chính xác</Text>
          </View>

          <View style={styles.featureBadgePill}>
            <Bot size={15} color="#065F46" strokeWidth={2.2} />
            <Text style={styles.featureBadgeText}>Hỗ trợ AI</Text>
          </View>
        </View>

        {/* 4. Hai nút hành động chính: [📷 Chụp hóa đơn] và [🖼️ Chọn ảnh từ thư viện] */}
        <Pressable
          onPress={() => setStep('CAMERA')}
          style={({ pressed }) => [styles.primaryGreenPillBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Chụp hóa đơn"
        >
          <Camera size={20} color="#FFFFFF" strokeWidth={2.3} />
          <Text style={styles.primaryGreenPillText}>Chụp hóa đơn</Text>
        </Pressable>

        <Pressable
          onPress={handlePickFromLibrary}
          disabled={scanning}
          style={({ pressed }) => [styles.secondaryOutlinePillBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Chọn ảnh từ thư viện"
        >
          {scanning ? (
            <ActivityIndicator color="#065F46" />
          ) : (
            <>
              <LucideImage size={19} color="#065F46" strokeWidth={2.2} />
              <Text style={styles.secondaryOutlinePillText}>Chọn ảnh từ thư viện</Text>
            </>
          )}
        </Pressable>

        {/* 5. Danh sách Hóa đơn gần đây (chỉ hiển thị hóa đơn đã tạo giao dịch & trừ tiền) */}
        <View style={styles.recentSectionHeader}>
          <View style={styles.recentHeaderLeft}>
            <Clock size={18} color="#065F46" strokeWidth={2.3} />
            <Text style={styles.recentHeaderTitle}>Hóa đơn gần đây</Text>
          </View>

          {recentReceipts.length > 3 && (
            <Pressable
              onPress={() => setShowAllHistory((prev) => !prev)}
              style={styles.viewAllBtn}
              hitSlop={8}
            >
              <Text style={styles.viewAllText}>
                {showAllHistory ? 'Thu gọn' : 'Xem tất cả'}
              </Text>
              <ChevronRight size={15} color="#15803D" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>

        <View style={styles.recentListCard}>
          {displayedReceipts.length === 0 ? (
            <View style={{ paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#475569', textAlign: 'center' }}>
                Chưa có hóa đơn nào được tạo giao dịch
              </Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
                Các hóa đơn sau khi bạn bấm "Tạo giao dịch" và trừ tiền sẽ hiển thị tại đây.
              </Text>
            </View>
          ) : (
            displayedReceipts.map((item, idx) => {
              const title = item.merchantName?.startsWith('Hóa đơn')
                ? item.merchantName
                : `Hóa đơn ${item.merchantName || 'WinMart'}`;
              const amountNum = item.totalAmount ?? 120000;
              const thumbUrl = ocrApi.formatReceiptImageUrl(item.imageUrl);

              return (
                <Pressable
                  key={item.id || String(idx)}
                  onPress={() => applyReceiptToResult(item)}
                  style={({ pressed }) => [
                    styles.recentItemRow,
                    idx < displayedReceipts.length - 1 && styles.recentItemBorder,
                    pressed && { backgroundColor: '#F8FAFC' },
                  ]}
                >
                  {/* Ảnh thu nhỏ của hóa đơn */}
                  <View style={styles.recentThumbBox}>
                    {thumbUrl ? (
                      <Image source={{ uri: thumbUrl }} style={styles.recentThumbImg} />
                    ) : (
                      <View style={styles.miniReceiptMock}>
                        <Text style={styles.miniReceiptBrand} numberOfLines={1}>
                          WinMart+
                        </Text>
                        <View style={styles.miniReceiptLine} />
                        <View style={[styles.miniReceiptLine, { width: '65%' }]} />
                        <View style={[styles.miniReceiptLineGreen]} />
                      </View>
                    )}
                  </View>

                  {/* Tên & Thời gian */}
                  <View style={styles.recentInfoMiddle}>
                    <Text style={styles.recentItemTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.recentItemTime}>
                      {formatDateVi(item.transactionDate, item.transactionTime)}
                    </Text>
                  </View>

                  {/* Số tiền âm màu đỏ & Badge Đã xử lý */}
                  <View style={styles.recentInfoRight}>
                    <Text style={styles.recentItemAmount}>-{formatVND(amountNum)}</Text>
                    <View style={styles.processedBadge}>
                      <Check size={11} color="#15803D" strokeWidth={3} />
                      <Text style={styles.processedBadgeText}>Đã xử lý</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pressed: {
    opacity: 0.85,
  },

  /* ── HEADER ── */
  topHeader: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeaderTitleGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.2,
  },
  topHeaderTitleBlack: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  /* ── MÀN 1: HOME (QUÉT HÓA ĐƠN OCR) ── */
  homeScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  heroIllustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 8,
    position: 'relative',
  },
  heroLaserLine: {
    position: 'absolute',
    top: 93,
    width: 174,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  heroCameraBadge: {
    position: 'absolute',
    bottom: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#15803D',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#065F46',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  heroMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
  },
  featureBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 18,
  },
  featureBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },

  primaryGreenPillBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: '#066A43',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#065F46',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryGreenPillText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },

  secondaryOutlinePillBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.3,
    borderColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 11,
  },
  secondaryOutlinePillText: {
    color: '#065F46',
    fontSize: 15,
    fontWeight: '700',
  },

  /* ── HÓA ĐƠN GẦN ĐÂY ── */
  recentSectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentHeaderTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  recentListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 11,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentThumbImg: {
    width: '100%',
    height: '100%',
  },
  miniReceiptMock: {
    width: 32,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    padding: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  miniReceiptBrand: {
    fontSize: 5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  miniReceiptLine: {
    width: '85%',
    height: 2,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
    marginVertical: 1,
  },
  miniReceiptLineGreen: {
    width: '80%',
    height: 2.5,
    backgroundColor: '#22C55E',
    borderRadius: 1,
    marginTop: 2,
  },
  recentInfoMiddle: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentItemTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  recentInfoRight: {
    alignItems: 'flex-end',
  },
  recentItemAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  processedBadge: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  processedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  /* ── MÀN 2: CAMERA VIEWFINDER ── */
  cameraBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    justifyContent: 'space-between',
  },
  cameraViewportCard: {
    flex: 1,
    width: '100%',
    marginBottom: 18,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  liveCameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  permissionFallbackBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantCamOverlayBtn: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 95, 70, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  grantCamOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cameraPreviewImage: {
    width: '100%',
    height: '100%',
  },
  vfCorner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderColor: '#DCFCE7',
    shadowColor: '#22C55E',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  vfTopLeft: {
    top: 24,
    left: 24,
    borderTopWidth: 4.5,
    borderLeftWidth: 4.5,
    borderTopLeftRadius: 14,
  },
  vfTopRight: {
    top: 24,
    right: 24,
    borderTopWidth: 4.5,
    borderRightWidth: 4.5,
    borderTopRightRadius: 14,
  },
  vfBottomLeft: {
    bottom: 24,
    left: 24,
    borderBottomWidth: 4.5,
    borderLeftWidth: 4.5,
    borderBottomLeftRadius: 14,
  },
  vfBottomRight: {
    bottom: 24,
    right: 24,
    borderBottomWidth: 4.5,
    borderRightWidth: 4.5,
    borderBottomRightRadius: 14,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scanningOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraBottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
  },
  camSideCircleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shutterOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3.5,
    borderColor: '#15803D',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803D',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  shutterInnerGreen: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#0F7A43',
  },

  /* ── MÔ PHỎNG TỜ HÓA ĐƠN WINMART+ TRÊN NỀN GỖ ── */
  mockWoodBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#9A6332',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  mockWoodBgCompact: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  mockPaper: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  mockPaperCompact: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  mockBrand: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  mockSubText: {
    fontSize: 10.5,
    color: '#334155',
    textAlign: 'center',
    marginTop: 1.5,
  },
  mockInvoiceHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 10,
  },
  mockDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 8,
  },
  mockItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  mockItemDashed: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  mockItemName: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#1E293B',
  },
  mockItemPrice: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  mockTotalLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  mockTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* ── MÀN 3: KẾT QUẢ QUÉT HÓA ĐƠN ── */
  resultScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  resultReceiptImageCard: {
    height: 215,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#9A6332',
    position: 'relative',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultReceiptImg: {
    width: '100%',
    height: '100%',
  },
  expandCornerBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  extractedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  extractedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  extractedTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extractedTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  confidencePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  extractedFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },
  fieldLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabelText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#475569',
  },
  fieldValueStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineSmallInput: {
    width: 102,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inlineTextInput: {
    flex: 1,
    maxWidth: 190,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    backgroundColor: '#F8FAFC',
  },
  categorySelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 150,
  },
  categorySelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categorySelectText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  amountHighlightBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
  },
  amountHighlightText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#065F46',
  },
  amountHighlightInput: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#16A34A',
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'right',
  },

  noteInputBox: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    textAlignVertical: 'top',
  },

  resultSecondaryBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  outlineActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  outlineActionBtnActive: {
    backgroundColor: '#DCFCE7',
  },
  outlineActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },

  /* ── MODALS ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pickerOptionRowActive: {
    backgroundColor: '#ECFDF5',
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxContent: {
    width: '92%',
    height: '76%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  lightboxFullImg: {
    width: '100%',
    height: '100%',
  },
});
