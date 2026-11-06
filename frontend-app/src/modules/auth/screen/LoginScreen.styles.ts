import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },

  /* Trang đăng nhập */
  loginPage: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },

  /* Phần đầu màu xanh */
  loginHero: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#00362c',
    overflow: 'hidden',
  },

  loginBack: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)', // Nổi bật viền sáng
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)', // Nền kính mờ nổi bật rõ nét trên nền ảnh
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },

  loginBackArrow: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: -1,
  },

  loginBackText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* Ảnh banner tỷ lệ 3:2 chuẩn (1024x682) - Phóng to nhẹ 1.08 để căng tràn và tăng chiều cao chuẩn */
  loginHeroImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.08 }],
  },

  /* Form trắng bo góc chiếm 65% phía dưới */
  loginCard: {
    position: 'relative',
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 2,
    flex: 1,
    justifyContent: 'space-between',
  },

  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#12251f',
  },

  loginTitleSpan: {
    color: '#006747',
  },

  loginSubtitle: {
    fontSize: 13,
    color: '#69756f',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },

  /* Alert thông báo lỗi */
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFD8D6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 14,
  },
  alertText: {
    fontSize: 12,
    color: '#D93025',
    fontWeight: '600',
    flex: 1,
  },

  /* Form Group & Input */
  formGroup: {
    marginBottom: 14,
  },

  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#12251f',
    marginBottom: 6,
  },

  forgotBtn: {
    paddingVertical: 2,
  },

  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#006747',
  },

  formInputWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#dce3df',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  formInputWrapFocused: {
    borderColor: '#009a70',
    borderWidth: 1.5,
  },

  formInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#12251f',
    paddingVertical: 0,
    height: '100%',
  },

  eyeBtn: {
    padding: 6,
  },

  /* Nút bấm Đăng nhập */
  loginButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#006747',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#004c3b',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Divider */
  dividerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e9e7',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
  },

  /* Nút Google */
  googleButton: {
    width: '100%',
    minHeight: 46,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce3df',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#24352f',
  },

  /* Footer chuyển tiếp Đăng ký */
  loginFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
  },

  loginFooterText: {
    fontSize: 13,
    color: '#6b7571',
    textAlign: 'center',
  },

  loginFooterLink: {
    color: '#006747',
    fontWeight: '700',
  },

  copyrightText: {
    fontSize: 10.5,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.988 }],
  },
});
