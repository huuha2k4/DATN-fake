export interface BankOrWalletPreset {
  code: string;
  name: string;
  shortName: string;
  kind: 'BANK' | 'E_WALLET';
  brandColor: string;
  bgColor: string;
  textColor: string;
  logoUrl?: string;
  defaultSubtype?: 'CHECKING' | 'SAVINGS' | 'CREDIT';
}

export const POPULAR_BANKS_AND_WALLETS: BankOrWalletPreset[] = [
  {
    "code": "MOMO",
    "name": "Ví điện tử MoMo",
    "shortName": "MoMo",
    "kind": "E_WALLET",
    "brandColor": "#a50064",
    "bgColor": "#fdf0f7",
    "textColor": "#a50064",
    "logoUrl": "https://cdn.vietqr.io/img/momo.png"
  },
  {
    "code": "ZALOPAY",
    "name": "Ví điện tử ZaloPay",
    "shortName": "ZaloPay",
    "kind": "E_WALLET",
    "brandColor": "#0088ff",
    "bgColor": "#eaf5ff",
    "textColor": "#0070d6",
    "logoUrl": "https://cdn.vietqr.io/img/ZALOPAY.png"
  },
  {
    "code": "VNPAY",
    "name": "Ví điện tử VNPAY",
    "shortName": "VNPay",
    "kind": "E_WALLET",
    "brandColor": "#005baa",
    "bgColor": "#e8f3fc",
    "textColor": "#005baa",
    "logoUrl": "https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VNPAY-QR-1.png"
  },
  {
    "code": "SHOPEEPAY",
    "name": "Ví điện tử ShopeePay",
    "shortName": "ShopeePay",
    "kind": "E_WALLET",
    "brandColor": "#ee4d2d",
    "bgColor": "#fdf2ef",
    "textColor": "#d83818",
    "logoUrl": "https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ShopeePay-V.png"
  },
  {
    "code": "VIETTELMONEY",
    "name": "Hệ sinh thái số Viettel Money",
    "shortName": "Viettel Money",
    "kind": "E_WALLET",
    "brandColor": "#e01a22",
    "bgColor": "#fdf0f1",
    "textColor": "#c7151c",
    "logoUrl": "https://cdn.vietqr.io/img/VTLMONEY.png"
  },
  {
    "code": "VNPTMONEY",
    "name": "Ví điện tử VNPT Money",
    "shortName": "VNPT Money",
    "kind": "E_WALLET",
    "brandColor": "#0066cc",
    "bgColor": "#ebf4fc",
    "textColor": "#0066cc",
    "logoUrl": "https://cdn.vietqr.io/img/VNPTMONEY.png"
  },
  {
    "code": "ICB",
    "name": "Ngân hàng TMCP Công thương Việt Nam",
    "shortName": "VietinBank",
    "kind": "BANK",
    "brandColor": "#004c8c",
    "bgColor": "#ebf4fb",
    "textColor": "#004c8c",
    "logoUrl": "https://cdn.vietqr.io/img/ICB.png"
  },
  {
    "code": "VCB",
    "name": "Ngân hàng TMCP Ngoại Thương Việt Nam",
    "shortName": "Vietcombank",
    "kind": "BANK",
    "brandColor": "#005f27",
    "bgColor": "#eaf7ef",
    "textColor": "#005f27",
    "logoUrl": "https://cdn.vietqr.io/img/VCB.png"
  },
  {
    "code": "BIDV",
    "name": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    "shortName": "BIDV",
    "kind": "BANK",
    "brandColor": "#0b7952",
    "bgColor": "#eaf6f1",
    "textColor": "#0b7952",
    "logoUrl": "https://cdn.vietqr.io/img/BIDV.png"
  },
  {
    "code": "VBA",
    "name": "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
    "shortName": "Agribank",
    "kind": "BANK",
    "brandColor": "#961e27",
    "bgColor": "#faeeee",
    "textColor": "#961e27",
    "logoUrl": "https://cdn.vietqr.io/img/VBA.png"
  },
  {
    "code": "OCB",
    "name": "Ngân hàng TMCP Phương Đông",
    "shortName": "OCB",
    "kind": "BANK",
    "brandColor": "#008542",
    "bgColor": "#eaf6f0",
    "textColor": "#008542",
    "logoUrl": "https://cdn.vietqr.io/img/OCB.png"
  },
  {
    "code": "MB",
    "name": "Ngân hàng TMCP Quân đội",
    "shortName": "MBBank",
    "kind": "BANK",
    "brandColor": "#002d9c",
    "bgColor": "#edf2fc",
    "textColor": "#002d9c",
    "logoUrl": "https://cdn.vietqr.io/img/MB.png"
  },
  {
    "code": "TCB",
    "name": "Ngân hàng TMCP Kỹ thương Việt Nam",
    "shortName": "Techcombank",
    "kind": "BANK",
    "brandColor": "#e01a22",
    "bgColor": "#fdf0f0",
    "textColor": "#c7151c",
    "logoUrl": "https://cdn.vietqr.io/img/TCB.png"
  },
  {
    "code": "ACB",
    "name": "Ngân hàng TMCP Á Châu",
    "shortName": "ACB",
    "kind": "BANK",
    "brandColor": "#0066b3",
    "bgColor": "#ebf5fc",
    "textColor": "#0066b3",
    "logoUrl": "https://cdn.vietqr.io/img/ACB.png"
  },
  {
    "code": "VPB",
    "name": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    "shortName": "VPBank",
    "kind": "BANK",
    "brandColor": "#00a850",
    "bgColor": "#ebf9f2",
    "textColor": "#008c43",
    "logoUrl": "https://cdn.vietqr.io/img/VPB.png"
  },
  {
    "code": "TPB",
    "name": "Ngân hàng TMCP Tiên Phong",
    "shortName": "TPBank",
    "kind": "BANK",
    "brandColor": "#7a207f",
    "bgColor": "#f9edf9",
    "textColor": "#6f1974",
    "logoUrl": "https://cdn.vietqr.io/img/TPB.png"
  },
  {
    "code": "STB",
    "name": "Ngân hàng TMCP Sài Gòn Tài Lộc",
    "shortName": "Sacombank",
    "kind": "BANK",
    "brandColor": "#00468f",
    "bgColor": "#ebf3fc",
    "textColor": "#00468f",
    "logoUrl": "https://cdn.vietqr.io/img/SACOMBANK.png"
  },
  {
    "code": "HDB",
    "name": "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh",
    "shortName": "HDBank",
    "kind": "BANK",
    "brandColor": "#f10d29",
    "bgColor": "#fdf0f1",
    "textColor": "#d30b23",
    "logoUrl": "https://cdn.vietqr.io/img/HDB.png"
  },
  {
    "code": "VCCB",
    "name": "Ngân hàng TMCP Bản Việt",
    "shortName": "VietCapitalBank",
    "kind": "BANK",
    "brandColor": "#00843d",
    "bgColor": "#e9f6ef",
    "textColor": "#00843d",
    "logoUrl": "https://cdn.vietqr.io/img/VCCB.png"
  },
  {
    "code": "SCB",
    "name": "Ngân hàng TMCP Sài Gòn",
    "shortName": "SCB",
    "kind": "BANK",
    "brandColor": "#d62027",
    "bgColor": "#fdf1f2",
    "textColor": "#d62027",
    "logoUrl": "https://cdn.vietqr.io/img/SCB.png"
  },
  {
    "code": "VIB",
    "name": "Ngân hàng TMCP Quốc tế Việt Nam",
    "shortName": "VIB",
    "kind": "BANK",
    "brandColor": "#004a99",
    "bgColor": "#edf4fc",
    "textColor": "#004a99",
    "logoUrl": "https://cdn.vietqr.io/img/VIB.png"
  },
  {
    "code": "SHB",
    "name": "Ngân hàng TMCP Sài Gòn - Hà Nội",
    "shortName": "SHB",
    "kind": "BANK",
    "brandColor": "#f78f1e",
    "bgColor": "#fef6ee",
    "textColor": "#cf6b04",
    "logoUrl": "https://cdn.vietqr.io/img/SHB.png"
  },
  {
    "code": "EIB",
    "name": "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam",
    "shortName": "Eximbank",
    "kind": "BANK",
    "brandColor": "#002d9c",
    "bgColor": "#edf2fc",
    "textColor": "#002d9c",
    "logoUrl": "https://cdn.vietqr.io/img/EIB.png"
  },
  {
    "code": "MSB",
    "name": "Ngân hàng TMCP Hàng Hải",
    "shortName": "MSB",
    "kind": "BANK",
    "brandColor": "#d62027",
    "bgColor": "#fdf1f2",
    "textColor": "#d62027",
    "logoUrl": "https://cdn.vietqr.io/img/MSB.png"
  },
  {
    "code": "CAKE",
    "name": "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank",
    "shortName": "CAKE",
    "kind": "BANK",
    "brandColor": "#004c8c",
    "bgColor": "#ebf4fb",
    "textColor": "#004c8c",
    "logoUrl": "https://cdn.vietqr.io/img/CAKE.png"
  },
  {
    "code": "Ubank",
    "name": "TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank",
    "shortName": "Ubank",
    "kind": "BANK",
    "brandColor": "#0066b3",
    "bgColor": "#ebf5fc",
    "textColor": "#0066b3",
    "logoUrl": "https://cdn.vietqr.io/img/Ubank.png"
  },
  {
    "code": "TIMO",
    "name": "Ngân hàng số Timo by Ban Viet Bank (Timo by Ban Viet Bank)",
    "shortName": "Timo",
    "kind": "BANK",
    "brandColor": "#00a850",
    "bgColor": "#ebf9f2",
    "textColor": "#008c43",
    "logoUrl": "https://cdn.vietqr.io/img/TIMO.png"
  },
  {
    "code": "VTLMONEY",
    "name": "Tổng Công ty Dịch vụ số Viettel - Chi nhánh tập đoàn công nghiệp viễn thông Quân Đội",
    "shortName": "ViettelMoney",
    "kind": "E_WALLET",
    "brandColor": "#7a207f",
    "bgColor": "#f9edf9",
    "textColor": "#6f1974",
    "logoUrl": "https://cdn.vietqr.io/img/VTLMONEY.png"
  },
  {
    "code": "SGICB",
    "name": "Ngân hàng TMCP Sài Gòn Công Thương",
    "shortName": "SaigonBank",
    "kind": "BANK",
    "brandColor": "#f10d29",
    "bgColor": "#fdf0f1",
    "textColor": "#d30b23",
    "logoUrl": "https://cdn.vietqr.io/img/SGICB.png"
  },
  {
    "code": "BAB",
    "name": "Ngân hàng TMCP Bắc Á",
    "shortName": "BacABank",
    "kind": "BANK",
    "brandColor": "#004a99",
    "bgColor": "#edf4fc",
    "textColor": "#004a99",
    "logoUrl": "https://cdn.vietqr.io/img/BAB.png"
  },
  {
    "code": "PVDB",
    "name": "Ngân hàng số PVcomBank",
    "shortName": "PVcomBank Pay",
    "kind": "BANK",
    "brandColor": "#f78f1e",
    "bgColor": "#fef6ee",
    "textColor": "#cf6b04",
    "logoUrl": "https://cdn.vietqr.io/img/PVCB%20Pay.png"
  },
  {
    "code": "PVCB",
    "name": "Ngân hàng TMCP Đại Chúng Việt Nam",
    "shortName": "PVcomBank",
    "kind": "BANK",
    "brandColor": "#d62027",
    "bgColor": "#fdf1f2",
    "textColor": "#d62027",
    "logoUrl": "https://cdn.vietqr.io/img/PVCB.png"
  },
  {
    "code": "MBV",
    "name": "Ngân hàng TNHH MTV Việt Nam Hiện Đại",
    "shortName": "MBV",
    "kind": "BANK",
    "brandColor": "#005f27",
    "bgColor": "#eaf7ef",
    "textColor": "#005f27",
    "logoUrl": "https://cdn.vietqr.io/img/MBV.png"
  },
  {
    "code": "NCB",
    "name": "Ngân hàng TMCP Quốc Dân",
    "shortName": "NCB",
    "kind": "BANK",
    "brandColor": "#e01a22",
    "bgColor": "#fdf0f0",
    "textColor": "#c7151c",
    "logoUrl": "https://cdn.vietqr.io/img/NCB.png"
  },
  {
    "code": "SHBVN",
    "name": "Ngân hàng TNHH MTV Shinhan Việt Nam",
    "shortName": "ShinhanBank",
    "kind": "BANK",
    "brandColor": "#002d9c",
    "bgColor": "#edf2fc",
    "textColor": "#002d9c",
    "logoUrl": "https://cdn.vietqr.io/img/SHBVN.png"
  },
  {
    "code": "ABB",
    "name": "Ngân hàng TMCP An Bình",
    "shortName": "ABBANK",
    "kind": "BANK",
    "brandColor": "#0b7952",
    "bgColor": "#eaf6f1",
    "textColor": "#0b7952",
    "logoUrl": "https://cdn.vietqr.io/img/ABB.png"
  },
  {
    "code": "VAB",
    "name": "Ngân hàng TMCP Việt Á",
    "shortName": "VietABank",
    "kind": "BANK",
    "brandColor": "#004c8c",
    "bgColor": "#ebf4fb",
    "textColor": "#004c8c",
    "logoUrl": "https://cdn.vietqr.io/img/VAB.png"
  },
  {
    "code": "NAB",
    "name": "Ngân hàng TMCP Nam Á",
    "shortName": "NamABank",
    "kind": "BANK",
    "brandColor": "#0066b3",
    "bgColor": "#ebf5fc",
    "textColor": "#0066b3",
    "logoUrl": "https://cdn.vietqr.io/img/NAB.png"
  },
  {
    "code": "PGB",
    "name": "Ngân hàng TMCP Thịnh vượng và Phát triển",
    "shortName": "PGBank",
    "kind": "BANK",
    "brandColor": "#00a850",
    "bgColor": "#ebf9f2",
    "textColor": "#008c43",
    "logoUrl": "https://cdn.vietqr.io/img/PGB.png"
  },
  {
    "code": "VIETBANK",
    "name": "Ngân hàng TMCP Việt Nam Thương Tín",
    "shortName": "VietBank",
    "kind": "BANK",
    "brandColor": "#7a207f",
    "bgColor": "#f9edf9",
    "textColor": "#6f1974",
    "logoUrl": "https://cdn.vietqr.io/img/VIETBANK.png"
  },
  {
    "code": "BVB",
    "name": "Ngân hàng TMCP Bảo Việt",
    "shortName": "BaoVietBank",
    "kind": "BANK",
    "brandColor": "#00468f",
    "bgColor": "#ebf3fc",
    "textColor": "#00468f",
    "logoUrl": "https://cdn.vietqr.io/img/BVB.png"
  },
  {
    "code": "SEAB",
    "name": "Ngân hàng TMCP Đông Nam Á",
    "shortName": "SeABank",
    "kind": "BANK",
    "brandColor": "#d11b23",
    "bgColor": "#fdf1f1",
    "textColor": "#d11b23",
    "logoUrl": "https://cdn.vietqr.io/img/SEAB.png"
  },
  {
    "code": "COOPBANK",
    "name": "Ngân hàng Hợp tác xã Việt Nam",
    "shortName": "COOPBANK",
    "kind": "BANK",
    "brandColor": "#004a99",
    "bgColor": "#edf4fc",
    "textColor": "#004a99",
    "logoUrl": "https://cdn.vietqr.io/img/COOPBANK.png"
  },
  {
    "code": "LPB",
    "name": "Ngân hàng TMCP Lộc Phát Việt Nam",
    "shortName": "LPBank",
    "kind": "BANK",
    "brandColor": "#f47920",
    "bgColor": "#fef5ee",
    "textColor": "#c95b07",
    "logoUrl": "https://cdn.vietqr.io/img/LPBANK.png"
  },
  {
    "code": "KLB",
    "name": "Ngân hàng TMCP Kiên Long",
    "shortName": "KienLongBank",
    "kind": "BANK",
    "brandColor": "#008542",
    "bgColor": "#eaf6f0",
    "textColor": "#008542",
    "logoUrl": "https://cdn.vietqr.io/img/KLB.png"
  },
  {
    "code": "KBank",
    "name": "Ngân hàng Đại chúng TNHH Kasikornbank",
    "shortName": "KBank",
    "kind": "BANK",
    "brandColor": "#d62027",
    "bgColor": "#fdf1f2",
    "textColor": "#d62027",
    "logoUrl": "https://cdn.vietqr.io/img/KBank.png"
  },
  {
    "code": "KEBHANAHCM",
    "name": "Ngân hàng KEB Hana – Chi nhánh Thành phố Hồ Chí Minh",
    "shortName": "KEBHanaHCM",
    "kind": "BANK",
    "brandColor": "#005f27",
    "bgColor": "#eaf7ef",
    "textColor": "#005f27",
    "logoUrl": "https://cdn.vietqr.io/img/KEBHANAHCM.png"
  },
  {
    "code": "KEBHANAHN",
    "name": "Ngân hàng KEB Hana – Chi nhánh Hà Nội",
    "shortName": "KEBHANAHN",
    "kind": "BANK",
    "brandColor": "#e01a22",
    "bgColor": "#fdf0f0",
    "textColor": "#c7151c",
    "logoUrl": "https://cdn.vietqr.io/img/KEBHANAHN.png"
  },
  {
    "code": "MAFC",
    "name": "Công ty Tài chính TNHH MTV Mirae Asset (Việt Nam) ",
    "shortName": "MAFC",
    "kind": "BANK",
    "brandColor": "#002d9c",
    "bgColor": "#edf2fc",
    "textColor": "#002d9c",
    "logoUrl": "https://cdn.vietqr.io/img/MAFC.png"
  },
  {
    "code": "VBSP",
    "name": "Ngân hàng Chính sách Xã hội",
    "shortName": "VBSP",
    "kind": "BANK",
    "brandColor": "#0b7952",
    "bgColor": "#eaf6f1",
    "textColor": "#0b7952",
    "logoUrl": "https://cdn.vietqr.io/img/VBSP.png"
  },
  {
    "code": "BNP HN",
    "name": "Ngân hàng BNP Paribas – Chi nhánh Hà Nội",
    "shortName": "BNP HN",
    "kind": "BANK",
    "brandColor": "#004c8c",
    "bgColor": "#ebf4fb",
    "textColor": "#004c8c",
    "logoUrl": "https://cdn.vietqr.io/img/BNP.png"
  },
  {
    "code": "BIDC",
    "name": "Ngân hàng Đầu Tư Và Phát Triển Campuchia - Chi nhánh Hà Nội",
    "shortName": "BIDC",
    "kind": "BANK",
    "brandColor": "#0066b3",
    "bgColor": "#ebf5fc",
    "textColor": "#0066b3",
    "logoUrl": "https://cdn.vietqr.io/img/BIDC.png"
  },
  {
    "code": "BNP HCM",
    "name": "Ngân hàng BNP Paribas – Chi nhánh Thành phố Hồ Chí Minh",
    "shortName": "BNP HCM",
    "kind": "BANK",
    "brandColor": "#00a850",
    "bgColor": "#ebf9f2",
    "textColor": "#008c43",
    "logoUrl": "https://cdn.vietqr.io/img/BNP.png"
  },
  {
    "code": "BOCHK",
    "name": "Ngân hàng Bank of China (Hong Kong) Limited – Chi nhánh Hồ Chí Minh",
    "shortName": "BOCHK",
    "kind": "BANK",
    "brandColor": "#00468f",
    "bgColor": "#ebf3fc",
    "textColor": "#00468f",
    "logoUrl": "https://cdn.vietqr.io/img/BOCHK.png"
  },
  {
    "code": "BSP",
    "name": "Ngân hàng SinoPac - Chi nhánh Thành phố Hồ Chí Minh",
    "shortName": "BSP",
    "kind": "BANK",
    "brandColor": "#f10d29",
    "bgColor": "#fdf0f1",
    "textColor": "#d30b23",
    "logoUrl": "https://cdn.vietqr.io/img/BSP.png"
  },
  {
    "code": "CUBHCM",
    "name": "Ngân hàng Cathay United Bank – Chi nhánh Hồ Chí Minh",
    "shortName": "CUBHCM",
    "kind": "BANK",
    "brandColor": "#004a99",
    "bgColor": "#edf4fc",
    "textColor": "#004a99",
    "logoUrl": "https://cdn.vietqr.io/img/CUB.png"
  },
  {
    "code": "ESUN",
    "name": "Ngân hàng Thương mại TNHH E.SUN – Chi nhánh Đồng Nai (ESUNBANK)",
    "shortName": "ESUN",
    "kind": "BANK",
    "brandColor": "#f78f1e",
    "bgColor": "#fef6ee",
    "textColor": "#cf6b04",
    "logoUrl": "https://cdn.vietqr.io/img/ESUN.png"
  },
  {
    "code": "ICBC",
    "name": "Ngân hàng Công thương Trung Quốc – Chi nhánh thành phố Hà Nội",
    "shortName": "ICBC",
    "kind": "BANK",
    "brandColor": "#008542",
    "bgColor": "#eaf6f0",
    "textColor": "#008542",
    "logoUrl": "https://cdn.vietqr.io/img/ICBC.png"
  },
  {
    "code": "MVAS",
    "name": "Trung tâm Dịch vụ số Mobifone – Chi nhánh Tổng Công ty viễn thông Mobifone",
    "shortName": "MVAS",
    "kind": "BANK",
    "brandColor": "#d62027",
    "bgColor": "#fdf1f2",
    "textColor": "#d62027",
    "logoUrl": "https://cdn.vietqr.io/img/MVAS.png"
  },
  {
    "code": "TNEX",
    "name": "TNEX by MSB",
    "shortName": "TNEX",
    "kind": "BANK",
    "brandColor": "#005f27",
    "bgColor": "#eaf7ef",
    "textColor": "#005f27",
    "logoUrl": "https://cdn.vietqr.io/img/TNEX.png"
  },
  {
    "code": "HSBC",
    "name": "Ngân hàng TNHH MTV HSBC (Việt Nam)",
    "shortName": "HSBC",
    "kind": "BANK",
    "brandColor": "#e01a22",
    "bgColor": "#fdf0f0",
    "textColor": "#c7151c",
    "logoUrl": "https://cdn.vietqr.io/img/HSBC.png"
  },
  {
    "code": "HLBVN",
    "name": "Ngân hàng TNHH MTV Hong Leong Việt Nam",
    "shortName": "HongLeong",
    "kind": "BANK",
    "brandColor": "#002d9c",
    "bgColor": "#edf2fc",
    "textColor": "#002d9c",
    "logoUrl": "https://cdn.vietqr.io/img/HLBVN.png"
  },
  {
    "code": "IBK - HN",
    "name": "Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh Hà Nội",
    "shortName": "IBKHN",
    "kind": "BANK",
    "brandColor": "#0b7952",
    "bgColor": "#eaf6f1",
    "textColor": "#0b7952",
    "logoUrl": "https://cdn.vietqr.io/img/IBK.png"
  },
  {
    "code": "IBK - HCM",
    "name": "Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh TP. Hồ Chí Minh",
    "shortName": "IBKHCM",
    "kind": "BANK",
    "brandColor": "#004c8c",
    "bgColor": "#ebf4fb",
    "textColor": "#004c8c",
    "logoUrl": "https://cdn.vietqr.io/img/IBK.png"
  },
  {
    "code": "IVB",
    "name": "Ngân hàng TNHH Indovina",
    "shortName": "IndovinaBank",
    "kind": "BANK",
    "brandColor": "#0066b3",
    "bgColor": "#ebf5fc",
    "textColor": "#0066b3",
    "logoUrl": "https://cdn.vietqr.io/img/IVB.png"
  },
  {
    "code": "Vikki",
    "name": "Ngân hàng TNHH Một thành viên số Vikki",
    "shortName": "Vikki",
    "kind": "BANK",
    "brandColor": "#00a850",
    "bgColor": "#ebf9f2",
    "textColor": "#008c43",
    "logoUrl": "https://cdn.vietqr.io/img/DOB.png"
  },
  {
    "code": "NHB HN",
    "name": "Ngân hàng Nonghyup - Chi nhánh Hà Nội",
    "shortName": "Nonghyup",
    "kind": "BANK",
    "brandColor": "#7a207f",
    "bgColor": "#f9edf9",
    "textColor": "#6f1974",
    "logoUrl": "https://cdn.vietqr.io/img/NHB%20HN.png"
  },
  {
    "code": "DBS",
    "name": "DBS Bank Ltd - Chi nhánh Thành phố Hồ Chí Minh",
    "shortName": "DBSBank",
    "kind": "BANK",
    "brandColor": "#00468f",
    "bgColor": "#ebf3fc",
    "textColor": "#00468f",
    "logoUrl": "https://cdn.vietqr.io/img/DBS.png"
  },
  {
    "code": "PBVN",
    "name": "Ngân hàng TNHH MTV Public Việt Nam",
    "shortName": "PublicBank",
    "kind": "BANK",
    "brandColor": "#f10d29",
    "bgColor": "#fdf0f1",
    "textColor": "#d30b23",
    "logoUrl": "https://cdn.vietqr.io/img/PBVN.png"
  },
  {
    "code": "SCVN",
    "name": "Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam",
    "shortName": "StandardChartered",
    "kind": "BANK",
    "brandColor": "#004a99",
    "bgColor": "#edf4fc",
    "textColor": "#004a99",
    "logoUrl": "https://cdn.vietqr.io/img/SCVN.png"
  },
  {
    "code": "CITIBANK",
    "name": "Ngân hàng Citibank, N.A. - Chi nhánh Hà Nội",
    "shortName": "Citibank",
    "kind": "BANK",
    "brandColor": "#f78f1e",
    "bgColor": "#fef6ee",
    "textColor": "#cf6b04",
    "logoUrl": "https://cdn.vietqr.io/img/CITIBANK.png"
  },
  {
    "code": "CIMB",
    "name": "Ngân hàng TNHH MTV CIMB Việt Nam",
    "shortName": "CIMB",
    "kind": "BANK",
    "brandColor": "#008542",
    "bgColor": "#eaf6f0",
    "textColor": "#008542",
    "logoUrl": "https://cdn.vietqr.io/img/CIMB.png"
  },
  {
    "code": "UOB",
    "name": "Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh",
    "shortName": "UnitedOverseas",
    "kind": "BANK",
    "brandColor": "#d62027",
    "bgColor": "#fdf1f2",
    "textColor": "#d62027",
    "logoUrl": "https://cdn.vietqr.io/img/UOB.png"
  },
  {
    "code": "CBB",
    "name": "Ngân hàng Thương mại trách nhiệm hữu hạn một thành viên Ngoại thương Công nghệ số (Vietcombank Neo Limited)",
    "shortName": "CBBank",
    "kind": "BANK",
    "brandColor": "#005f27",
    "bgColor": "#eaf7ef",
    "textColor": "#005f27",
    "logoUrl": "https://cdn.vietqr.io/img/VCBNeo.png"
  },
  {
    "code": "GPB",
    "name": "Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu",
    "shortName": "GPBank",
    "kind": "BANK",
    "brandColor": "#e01a22",
    "bgColor": "#fdf0f0",
    "textColor": "#c7151c",
    "logoUrl": "https://cdn.vietqr.io/img/GPB.png"
  },
  {
    "code": "VRB",
    "name": "Ngân hàng Liên doanh Việt - Nga",
    "shortName": "VRB",
    "kind": "BANK",
    "brandColor": "#002d9c",
    "bgColor": "#edf2fc",
    "textColor": "#002d9c",
    "logoUrl": "https://cdn.vietqr.io/img/VRB.png"
  },
  {
    "code": "WVN",
    "name": "Ngân hàng TNHH MTV Woori Việt Nam",
    "shortName": "Woori",
    "kind": "BANK",
    "brandColor": "#0b7952",
    "bgColor": "#eaf6f1",
    "textColor": "#0b7952",
    "logoUrl": "https://cdn.vietqr.io/img/WVN.png"
  },
  {
    "code": "KBHN",
    "name": "Ngân hàng Kookmin - Chi nhánh Hà Nội",
    "shortName": "KookminHN",
    "kind": "BANK",
    "brandColor": "#004c8c",
    "bgColor": "#ebf4fb",
    "textColor": "#004c8c",
    "logoUrl": "https://cdn.vietqr.io/img/KB.png"
  },
  {
    "code": "KBHCM",
    "name": "Ngân hàng Kookmin - Chi nhánh Thành phố Hồ Chí Minh",
    "shortName": "KookminHCM",
    "kind": "BANK",
    "brandColor": "#0066b3",
    "bgColor": "#ebf5fc",
    "textColor": "#0066b3",
    "logoUrl": "https://cdn.vietqr.io/img/KB.png"
  }
];

/**
 * Tìm preset thương hiệu theo mã code, id hoặc tên
 */
export function findBankOrWalletPreset(query?: string): BankOrWalletPreset | undefined {
  if (!query) return undefined;
  const q = query.trim().toUpperCase();
  return POPULAR_BANKS_AND_WALLETS.find(
    (item) =>
      item.code.toUpperCase() === q ||
      item.shortName.toUpperCase() === q ||
      q.includes(item.shortName.toUpperCase()) ||
      item.name.toUpperCase().includes(q)
  );
}
