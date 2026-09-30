# Finny Personal Finance Frontend

Frontend mobile cho he thong quan ly tai chinh ca nhan, xay dung voi React Native va Expo Go.

## Chay ung dung

```bash
npm install
npm start
```

Mo Expo Go va quet QR code de chay app mobile. Web se duoc phat trien thanh frontend rieng, khong dung Expo Go.

## Cau truc

- `App.tsx`: app shell va tab navigation hien tai.
- `src/modules`: moi module co `api/`, `assets/` va `screen/` rieng.
- `src/components`: component dung lai.
- `src/modules/dashboard/api`: du lieu mau cho UI prototype.
- `src/modules/core/api/api.ts`: API client san sang noi Spring Boot.
- `.env.example`: bien moi truong cho Spring Boot va FastAPI.

## Dinh huong tiep theo

- Thay du lieu mau bang auth + API Spring Boot.
- Them luong OCR hoa don qua FastAPI.
- Them state management va cache server khi API contract on dinh.
- Mo rong AI assistant, phan loai giao dich, du bao va canh bao bat thuong.
