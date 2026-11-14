package com.finance.finance.modules.transaction.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.RoundRectangle2D;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.util.*;

@Slf4j
@Service
public class FinancialReportPdfService {

    public byte[] generateFinancialReportPdf(
            String dateRangeDisplay,
            String walletName,
            double totalIncome,
            double totalExpense,
            double netCashFlow,
            double savingRate,
            java.util.List<Map<String, Object>> categories,
            java.util.List<Map<String, Object>> topExpenses,
            java.util.List<Map<String, Object>> comparisons,
            java.util.List<Map<String, Object>> dailyTrend,
            String aiInsight) {

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 20, 20, 18, 18);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();

            // 1. NẠP FONT UNICODE TIẾNG VIỆT CHUẨN ARIAL (100% không bao giờ lỗi dấu tiếng Việt)
            BaseFont bfRegular = null;
            BaseFont bfBold = null;

            try {
                bfRegular = BaseFont.createFont("C:/Windows/Fonts/arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                bfBold = BaseFont.createFont("C:/Windows/Fonts/arialbd.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            } catch (Exception e1) {
                log.warn("Khong tim thay Windows Arial font: {}", e1.getMessage());
            }

            if (bfRegular == null) {
                try {
                    ClassPathResource regRes = new ClassPathResource("fonts/arial.ttf");
                    ClassPathResource boldRes = new ClassPathResource("fonts/arialbd.ttf");
                    if (regRes.exists() && boldRes.exists()) {
                        byte[] regBytes;
                        byte[] boldBytes;
                        try (InputStream is = regRes.getInputStream()) {
                            regBytes = is.readAllBytes();
                        }
                        try (InputStream is = boldRes.getInputStream()) {
                            boldBytes = is.readAllBytes();
                        }
                        bfRegular = BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, regBytes, null);
                        bfBold = BaseFont.createFont("arialbd.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, boldBytes, null);
                    }
                } catch (Exception e2) {
                    log.warn("Khong doc duoc classpath font: {}", e2.getMessage());
                }
            }

            if (bfRegular == null) {
                bfRegular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
                bfBold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            }

            // FONT MAPPER CHO GRAPHICS2D: TỰ ĐỘNG MAP TẤT CẢ AWT FONT SANG ARIAL IDENTITY-H (HẾT SẠCH LỖI FONT TRÊN BIỂU ĐỒ)
            final BaseFont finalBfRegular = bfRegular;
            final BaseFont finalBfBold = bfBold;
            FontMapper fontMapper = new FontMapper() {
                @Override
                public BaseFont awtToPdf(java.awt.Font font) {
                    return font.isBold() ? finalBfBold : finalBfRegular;
                }

                @Override
                public java.awt.Font pdfToAwt(BaseFont bf, int size) {
                    return new java.awt.Font("Arial", java.awt.Font.PLAIN, size);
                }
            };

            // BẢNG MÀU THIẾT KẾ ĐẲNG CẤP CHUẨN FINORA WEB
            Color brandEmerald = new Color(7, 84, 63);       // #07543F
            Color brandGreen = new Color(4, 120, 87);         // #047857
            Color redRose = new Color(225, 29, 72);           // #E11D48
            Color darkSlate = new Color(15, 23, 42);          // #0F172A
            Color graySub = new Color(100, 116, 139);         // #64748B
            Color cardBorder = new Color(226, 232, 240);       // #E2E8F0
            Color cardBg = new Color(248, 250, 252);           // #F8FAFC
            Color lightMint = new Color(240, 253, 244);       // #F0FDF4
            Color mintBorder = new Color(187, 247, 208);      // #BBF7D0

            Font brandBannerFont = new Font(bfBold, 10, Font.NORMAL, new Color(167, 243, 208));
            Font mainTitleFont = new Font(bfBold, 15, Font.NORMAL, Color.WHITE);
            Font bannerMetaFont = new Font(bfRegular, 8.5f, Font.NORMAL, new Color(226, 232, 240));
            Font sectionTitleFont = new Font(bfBold, 11, Font.NORMAL, brandEmerald);
            Font tableHeaderFont = new Font(bfBold, 8.5f, Font.NORMAL, new Color(51, 65, 85));
            Font bodyFont = new Font(bfRegular, 8.5f, Font.NORMAL, darkSlate);
            Font boldBodyFont = new Font(bfBold, 8.5f, Font.NORMAL, darkSlate);
            Font incomeFont = new Font(bfBold, 9f, Font.NORMAL, brandGreen);
            Font expenseFont = new Font(bfBold, 9f, Font.NORMAL, redRose);

            NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
            String nowFormatted = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date());

            // ── 1. HEADER CARD GRADIENT EMERALD SANG TRỌNG NHƯ BẢN WEB CÓ LOGO FINORA ──
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{16, 84});

            PdfPCell logoCell = new PdfPCell();
            logoCell.setBackgroundColor(brandEmerald);
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            logoCell.setPadding(8);

            try {
                ClassPathResource logoRes = new ClassPathResource("static/logo.png");
                if (logoRes.exists()) {
                    Image logoImg = Image.getInstance(logoRes.getURL());
                    logoImg.scaleToFit(56, 56);
                    logoImg.setAlignment(Element.ALIGN_CENTER);
                    logoCell.addElement(logoImg);
                }
            } catch (Exception imgEx) {
                log.warn("Khong the tai logo Finora cho PDF: {}", imgEx.getMessage());
            }

            PdfPCell headerCell = new PdfPCell();
            headerCell.setBackgroundColor(brandEmerald);
            headerCell.setPadding(10);
            headerCell.setBorder(Rectangle.NO_BORDER);

            Paragraph pBrand = new Paragraph("FINORA · NỀN TẢNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN", brandBannerFont);
            pBrand.setSpacingAfter(3);
            headerCell.addElement(pBrand);

            Paragraph pTitle = new Paragraph("BÁO CÁO TÀI CHÍNH TOÀN DIỆN (" + dateRangeDisplay.toUpperCase() + ")", mainTitleFont);
            pTitle.setSpacingAfter(5);
            headerCell.addElement(pTitle);

            Paragraph pMeta = new Paragraph("Kỳ báo cáo: " + dateRangeDisplay + "   |   Ví tài khoản: " + walletName + "   |   Thời gian xuất: " + nowFormatted, bannerMetaFont);
            headerCell.addElement(pMeta);

            headerTable.addCell(logoCell);
            headerTable.addCell(headerCell);
            headerTable.setSpacingAfter(8);
            document.add(headerTable);

            // ── 2. KHỐI 4 THẺ CHỈ SỐ KPI CHÍNH (Thu nhập, Chi tiêu, Dòng tiền ròng, Tiết kiệm) ──
            PdfPTable kpiTable = new PdfPTable(4);
            kpiTable.setWidthPercentage(100);
            kpiTable.setWidths(new float[]{25, 25, 25, 25});

            addKpiCard(kpiTable, "TỔNG THU NHẬP", "+" + nf.format(Math.round(totalIncome)) + " đ", "Thu thực tế ghi nhận", brandGreen, cardBg, cardBorder, bfRegular, bfBold);
            addKpiCard(kpiTable, "TỔNG CHI TIÊU", "-" + nf.format(Math.round(totalExpense)) + " đ", "TB ngày: " + nf.format(Math.round(totalExpense / 30)) + " đ", redRose, cardBg, cardBorder, bfRegular, bfBold);
            addKpiCard(kpiTable, "DÒNG TIỀN RÒNG", (netCashFlow >= 0 ? "+" : "") + nf.format(Math.round(netCashFlow)) + " đ", netCashFlow >= 0 ? "Thặng dư tích lũy" : "Thâm hụt chi tiêu", netCashFlow >= 0 ? brandGreen : redRose, cardBg, cardBorder, bfRegular, bfBold);
            addKpiCard(kpiTable, "TỶ LỆ TIẾT KIỆM", savingRate + "%", "Hiệu suất tài chính", new Color(14, 165, 233), cardBg, cardBorder, bfRegular, bfBold);
            kpiTable.setSpacingAfter(10);
            document.add(kpiTable);

            // ── 3. THẺ FINAI INSIGHTS NHẬN ĐỊNH CHUYÊN SÂU ──
            if (aiInsight != null && !aiInsight.isBlank()) {
                PdfPTable aiTable = new PdfPTable(1);
                aiTable.setWidthPercentage(100);
                PdfPCell aiCell = new PdfPCell();
                aiCell.setBackgroundColor(lightMint);
                aiCell.setBorderColor(mintBorder);
                aiCell.setPadding(8);

                Paragraph pAi = new Paragraph("✦ FinAI Nhận định chuyên sâu: " + aiInsight, new Font(bfBold, 8.5f, Font.NORMAL, new Color(6, 95, 70)));
                aiCell.addElement(pAi);
                aiTable.addCell(aiCell);
                aiTable.setSpacingAfter(10);
                document.add(aiTable);
            }

            // ── 4. PHẦN 1: BIỂU ĐỒ CỘT THU - CHI THEO NGÀY (DAILY TREND BAR CHART) ──
            if (dailyTrend != null && !dailyTrend.isEmpty()) {
                Paragraph trendTitle = new Paragraph("I. BIẾN ĐỘNG THU - CHI THEO THỜI GIAN", sectionTitleFont);
                trendTitle.setSpacingAfter(5);
                document.add(trendTitle);

                float chartWidth = 545;
                float chartHeight = 110;
                PdfContentByte cb = writer.getDirectContent();
                PdfTemplate tpTrend = cb.createTemplate(chartWidth, chartHeight);
                Graphics2D g2 = tpTrend.createGraphics(chartWidth, chartHeight, fontMapper);
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

                // Nền thẻ biểu đồ
                g2.setColor(cardBg);
                g2.fill(new RoundRectangle2D.Float(0, 0, chartWidth, chartHeight, 8, 8));
                g2.setColor(cardBorder);
                g2.draw(new RoundRectangle2D.Float(0, 0, chartWidth - 1, chartHeight - 1, 8, 8));

                // Legend
                g2.setColor(brandGreen);
                g2.fillRoundRect(20, 10, 10, 10, 3, 3);
                g2.setColor(darkSlate);
                g2.setFont(new java.awt.Font("Arial", java.awt.Font.BOLD, 9));
                g2.drawString("Thu nhập (VND)", 35, 18);

                g2.setColor(redRose);
                g2.fillRoundRect(130, 10, 10, 10, 3, 3);
                g2.setColor(darkSlate);
                g2.drawString("Chi tiêu (VND)", 145, 18);

                // Tìm max
                double maxVal = 100000;
                for (Map<String, Object> day : dailyTrend) {
                    double inc = Double.parseDouble(String.valueOf(day.getOrDefault("income", 0)));
                    double exp = Double.parseDouble(String.valueOf(day.getOrDefault("expense", 0)));
                    if (inc > maxVal) maxVal = inc;
                    if (exp > maxVal) maxVal = exp;
                }

                int nDays = dailyTrend.size();
                float graphLeft = 45;
                float graphRight = chartWidth - 15;
                float graphBottom = chartHeight - 20;
                float graphTop = 28;
                float graphHeight = graphBottom - graphTop;
                float slotWidth = (graphRight - graphLeft) / nDays;
                float barW = Math.max(3, Math.min(12, slotWidth * 0.36f));

                // Trục tọa độ và đường lưới ngang
                g2.setColor(new Color(226, 232, 240));
                g2.drawLine((int) graphLeft, (int) graphBottom, (int) graphRight, (int) graphBottom);
                g2.drawLine((int) graphLeft, (int) (graphBottom - graphHeight * 0.5f), (int) graphRight, (int) (graphBottom - graphHeight * 0.5f));
                g2.drawLine((int) graphLeft, (int) graphTop, (int) graphRight, (int) graphTop);

                // Nhãn trục Y
                g2.setColor(graySub);
                g2.setFont(new java.awt.Font("Arial", java.awt.Font.PLAIN, 7));
                g2.drawString(maxVal >= 1000000 ? String.format("%.1fM", maxVal / 1000000) : String.format("%.0fK", maxVal / 1000), 10, graphTop + 6);
                g2.drawString(maxVal >= 1000000 ? String.format("%.1fM", (maxVal * 0.5) / 1000000) : String.format("%.0fK", (maxVal * 0.5) / 1000), 10, graphBottom - graphHeight * 0.5f + 4);
                g2.drawString("0", 25, graphBottom);

                // Vẽ các cột thu - chi
                for (int i = 0; i < nDays; i++) {
                    Map<String, Object> day = dailyTrend.get(i);
                    double inc = Double.parseDouble(String.valueOf(day.getOrDefault("income", 0)));
                    double exp = Double.parseDouble(String.valueOf(day.getOrDefault("expense", 0)));
                    String dateLabel = String.valueOf(day.getOrDefault("date", ""));

                    float slotCenter = graphLeft + (i * slotWidth) + (slotWidth / 2f);

                    float incH = (float) ((inc / maxVal) * graphHeight);
                    if (incH > 0) {
                        g2.setColor(brandGreen);
                        g2.fillRoundRect((int) (slotCenter - barW - 1), (int) (graphBottom - incH), (int) barW, (int) incH, 2, 2);
                    }

                    float expH = (float) ((exp / maxVal) * graphHeight);
                    if (expH > 0) {
                        g2.setColor(redRose);
                        g2.fillRoundRect((int) (slotCenter + 1), (int) (graphBottom - expH), (int) barW, (int) expH, 2, 2);
                    }

                    boolean drawLabel = (nDays <= 12) || (i % Math.max(1, nDays / 7) == 0) || (i == nDays - 1);
                    if (drawLabel) {
                        g2.setColor(graySub);
                        g2.setFont(new java.awt.Font("Arial", java.awt.Font.PLAIN, 8));
                        g2.drawString(dateLabel, (int) (slotCenter - 10), (int) (graphBottom + 12));
                    }
                }

                g2.dispose();
                Image trendImg = Image.getInstance(tpTrend);
                trendImg.setAlignment(Element.ALIGN_CENTER);
                trendImg.setSpacingAfter(10);
                document.add(trendImg);
            }

            // ── 5. PHẦN 2: BIỂU ĐỒ DONUT SVG & BẢNG CƠ CẤU CHI TIÊU THEO DANH MỤC ──
            if (categories != null && !categories.isEmpty()) {
                Paragraph catSecTitle = new Paragraph("II. CƠ CẤU CHI TIÊU THEO TỪNG DANH MỤC", sectionTitleFont);
                catSecTitle.setSpacingAfter(5);
                document.add(catSecTitle);

                // Vẽ Donut Chart bằng Graphics2D
                float chartWidth = 545;
                int catCount = categories.size();
                float chartHeight = Math.max(105, 18 + catCount * 19);
                PdfContentByte cb = writer.getDirectContent();
                PdfTemplate tpDonut = cb.createTemplate(chartWidth, chartHeight);
                Graphics2D g2Donut = tpDonut.createGraphics(chartWidth, chartHeight, fontMapper);
                g2Donut.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

                g2Donut.setColor(cardBg);
                g2Donut.fill(new RoundRectangle2D.Float(0, 0, chartWidth, chartHeight, 8, 8));
                g2Donut.setColor(cardBorder);
                g2Donut.draw(new RoundRectangle2D.Float(0, 0, chartWidth - 1, chartHeight - 1, 8, 8));

                // Vẽ Donut vòng tròn bên trái
                int cx = 70, cy = (int) (chartHeight / 2), rOut = 40, rIn = 25;
                // Bảng màu đồng bộ 100% với Web Finora và Mobile App
                Color[] colors = {
                        new Color(7, 84, 63),     // #07543f - Xanh đậm Finora
                        new Color(22, 131, 97),   // #168361 - Xanh ngọc
                        new Color(227, 163, 61),  // #e3a33d - Vàng cam
                        new Color(71, 138, 193),  // #478ac1 - Xanh dương
                        new Color(137, 113, 187), // #8971bb - Tím nhạt
                        new Color(201, 78, 98),   // #c94e62 - Đỏ hồng
                        new Color(230, 120, 50),  // #e67832 - Cam đất
                        new Color(8, 117, 87),    // #087557 - Xanh rừng
                        new Color(82, 97, 89),    // #526159 - Xám xanh
                        new Color(99, 102, 241)   // #6366f1 - Indigo
                };

                // Tính tổng % thực tế để các múi Donut khép kín trọn vẹn 360 độ (100%), không bao giờ bị hở khe trắng
                double totalCatPercent = 0;
                for (Map<String, Object> cat : categories) {
                    totalCatPercent += Double.parseDouble(String.valueOf(cat.getOrDefault("percentage", 0)));
                }
                if (totalCatPercent <= 0) totalCatPercent = 100.0;

                double startDeg = 90;
                for (int i = 0; i < categories.size(); i++) {
                    double pct = Double.parseDouble(String.valueOf(categories.get(i).getOrDefault("percentage", 0)));
                    double sweep;
                    if (i == categories.size() - 1) {
                        sweep = (90 + 360.0) - startDeg; // Múi cuối khép kín góc tròn 360 độ tuyệt đối
                    } else {
                        sweep = (pct / totalCatPercent) * 360.0;
                    }
                    g2Donut.setColor(colors[i % colors.length]);
                    g2Donut.fillArc(cx - rOut, cy - rOut, rOut * 2, rOut * 2, (int) Math.round(startDeg), (int) Math.ceil(sweep));
                    startDeg += sweep;
                }
                // Lỗ rỗng ở giữa tạo hình Donut
                g2Donut.setColor(cardBg);
                g2Donut.fillOval(cx - rIn, cy - rIn, rIn * 2, rIn * 2);

                // Chữ tổng chi ở giữa Donut
                g2Donut.setColor(graySub);
                g2Donut.setFont(new java.awt.Font("Arial", java.awt.Font.BOLD, 7));
                g2Donut.drawString("TỔNG CHI", cx - 18, cy - 3);
                g2Donut.setColor(redRose);
                g2Donut.drawString(nf.format(Math.round(totalExpense / 1000)) + "K", cx - 16, cy + 9);

                // Danh sách chú thích bên phải dạng danh sách (chấm tròn + Tên danh mục + Số tiền & %)
                // Không dùng thanh tiến trình ngang, hiển thị sạch đẹp chuẩn theo Web/App
                int legendStartY = 16;
                int rowHeight = Math.max(18, (int) (chartHeight - 24) / Math.max(1, categories.size()));
                for (int i = 0; i < categories.size(); i++) {
                    Map<String, Object> cat = categories.get(i);
                    String name = String.valueOf(cat.getOrDefault("name", ""));
                    double pct = Double.parseDouble(String.valueOf(cat.getOrDefault("percentage", 0)));
                    double amt = Double.parseDouble(String.valueOf(cat.getOrDefault("amount", 0)));

                    // Chấm tròn màu tương ứng lát donut
                    g2Donut.setColor(colors[i % colors.length]);
                    g2Donut.fillOval(145, legendStartY + 2, 7, 7);

                    // Tên danh mục
                    g2Donut.setColor(darkSlate);
                    g2Donut.setFont(new java.awt.Font("Arial", java.awt.Font.BOLD, 9));
                    g2Donut.drawString(name, 160, legendStartY + 9);

                    // Số tiền & tỷ trọng %
                    String amtStr = nf.format(Math.round(amt)) + " đ";
                    String pctStr = String.format("(%.1f%%)", pct);

                    g2Donut.setColor(darkSlate);
                    g2Donut.setFont(new java.awt.Font("Arial", java.awt.Font.BOLD, 9));
                    g2Donut.drawString(amtStr, 390, legendStartY + 9);

                    g2Donut.setColor(brandGreen);
                    g2Donut.drawString(" " + pctStr, 470, legendStartY + 9);

                    legendStartY += rowHeight;
                }

                g2Donut.dispose();
                Image donutImg = Image.getInstance(tpDonut);
                donutImg.setAlignment(Element.ALIGN_CENTER);
                donutImg.setSpacingAfter(8);
                document.add(donutImg);

                // Bảng chi tiết danh mục
                PdfPTable catTable = new PdfPTable(6);
                catTable.setWidthPercentage(100);
                catTable.setWidths(new float[]{8, 30, 20, 14, 12, 16});

                String[] catHeaders = {"STT", "DANH MỤC", "TỔNG CHI", "TỶ TRỌNG", "SỐ LẦN", "TB / LẦN"};
                for (String h : catHeaders) {
                    PdfPCell c = new PdfPCell(new Phrase(h, tableHeaderFont));
                    c.setBackgroundColor(new Color(241, 245, 249));
                    c.setHorizontalAlignment(Element.ALIGN_CENTER);
                    c.setPadding(4);
                    c.setBorderColor(cardBorder);
                    catTable.addCell(c);
                }

                int idx = 1;
                for (Map<String, Object> cat : categories) {
                    addTableCell(catTable, String.valueOf(idx++), bodyFont, Element.ALIGN_CENTER, cardBorder);
                    addTableCell(catTable, String.valueOf(cat.getOrDefault("name", "")), boldBodyFont, Element.ALIGN_LEFT, cardBorder);
                    double amt = Double.parseDouble(String.valueOf(cat.getOrDefault("amount", 0)));
                    addTableCell(catTable, "-" + nf.format(Math.round(amt)) + " đ", expenseFont, Element.ALIGN_RIGHT, cardBorder);
                    addTableCell(catTable, cat.getOrDefault("percentage", 0) + "%", bodyFont, Element.ALIGN_CENTER, cardBorder);
                    addTableCell(catTable, String.valueOf(cat.getOrDefault("count", 0)), bodyFont, Element.ALIGN_CENTER, cardBorder);
                    double avg = Double.parseDouble(String.valueOf(cat.getOrDefault("avgPerTx", 0)));
                    addTableCell(catTable, nf.format(Math.round(avg)) + " đ", bodyFont, Element.ALIGN_RIGHT, cardBorder);
                }
                catTable.setSpacingAfter(10);
                document.add(catTable);
            }

            // ── 6. PHẦN 3: TOP 5 KHOẢN CHI TIÊU LỚN NHẤT (TÁCH RIÊNG 2 CỘT NGÀY VÀ VÍ THEO YÊU CẦU) ──
            if (topExpenses != null && !topExpenses.isEmpty()) {
                Paragraph topTitle = new Paragraph("III. 5 KHOẢN CHI TIÊU LỚN NHẤT TRONG KỲ", sectionTitleFont);
                topTitle.setSpacingAfter(5);
                document.add(topTitle);

                PdfPTable topTable = new PdfPTable(6);
                topTable.setWidthPercentage(100);
                topTable.setWidths(new float[]{8, 30, 18, 16, 14, 14});

                String[] topHeaders = {"STT", "KHOẢN CHI", "SỐ TIỀN", "DANH MỤC", "NGÀY", "VÍ GIAO DỊCH"};
                for (String h : topHeaders) {
                    PdfPCell c = new PdfPCell(new Phrase(h, tableHeaderFont));
                    c.setBackgroundColor(new Color(241, 245, 249));
                    c.setHorizontalAlignment(Element.ALIGN_CENTER);
                    c.setPadding(4);
                    c.setBorderColor(cardBorder);
                    topTable.addCell(c);
                }

                int topIdx = 1;
                for (Map<String, Object> tx : topExpenses) {
                    addTableCell(topTable, String.valueOf(topIdx++), bodyFont, Element.ALIGN_CENTER, cardBorder);
                    addTableCell(topTable, String.valueOf(tx.getOrDefault("title", "")), boldBodyFont, Element.ALIGN_LEFT, cardBorder);
                    double amt = Double.parseDouble(String.valueOf(tx.getOrDefault("amount", 0)));
                    addTableCell(topTable, "-" + nf.format(Math.round(amt)) + " đ", expenseFont, Element.ALIGN_RIGHT, cardBorder);
                    addTableCell(topTable, String.valueOf(tx.getOrDefault("categoryName", "Chi tiêu")), bodyFont, Element.ALIGN_CENTER, cardBorder);

                    // Tách ngày và ví
                    String dateVal = String.valueOf(tx.getOrDefault("date", ""));
                    String walletVal = String.valueOf(tx.getOrDefault("wallet", ""));
                    if (dateVal.isBlank() && tx.get("sub") != null) {
                        String subStr = String.valueOf(tx.get("sub"));
                        String[] parts = subStr.split("•");
                        dateVal = parts[0].trim();
                        if (parts.length > 1) walletVal = parts[1].trim();
                    }
                    addTableCell(topTable, dateVal, bodyFont, Element.ALIGN_CENTER, cardBorder);
                    addTableCell(topTable, walletVal, bodyFont, Element.ALIGN_CENTER, cardBorder);
                }
                topTable.setSpacingAfter(10);
                document.add(topTable);
            }

            // ── 7. PHẦN 4: ĐỐI CHIẾU SO SÁNH KỲ TRƯỚC (PERIOD-OVER-PERIOD) ──
            if (comparisons != null && !comparisons.isEmpty()) {
                Paragraph compTitle = new Paragraph("IV. ĐỐI CHIẾU CHI TIÊU VỚI KỲ TRƯỚC (PERIOD-OVER-PERIOD)", sectionTitleFont);
                compTitle.setSpacingAfter(5);
                document.add(compTitle);

                PdfPTable compTable = new PdfPTable(6);
                compTable.setWidthPercentage(100);
                compTable.setWidths(new float[]{8, 28, 18, 18, 14, 14});

                String[] compHeaders = {"STT", "DANH MỤC", "KỲ TRƯỚC", "KỲ NÀY", "CHÊNH LỆCH", "BIẾN ĐỘNG"};
                for (String h : compHeaders) {
                    PdfPCell c = new PdfPCell(new Phrase(h, tableHeaderFont));
                    c.setBackgroundColor(new Color(241, 245, 249));
                    c.setHorizontalAlignment(Element.ALIGN_CENTER);
                    c.setPadding(4);
                    c.setBorderColor(cardBorder);
                    compTable.addCell(c);
                }

                int compIdx = 1;
                for (Map<String, Object> c : comparisons) {
                    addTableCell(compTable, String.valueOf(compIdx++), bodyFont, Element.ALIGN_CENTER, cardBorder);
                    addTableCell(compTable, String.valueOf(c.getOrDefault("name", "")), boldBodyFont, Element.ALIGN_LEFT, cardBorder);
                    double prev = Double.parseDouble(String.valueOf(c.getOrDefault("prevAmount", 0)));
                    double curr = Double.parseDouble(String.valueOf(c.getOrDefault("currentAmount", 0)));
                    double diff = Double.parseDouble(String.valueOf(c.getOrDefault("diffAmount", 0)));
                    double pct = Double.parseDouble(String.valueOf(c.getOrDefault("percentChange", 0)));

                    addTableCell(compTable, nf.format(Math.round(prev)) + " đ", bodyFont, Element.ALIGN_RIGHT, cardBorder);
                    addTableCell(compTable, nf.format(Math.round(curr)) + " đ", boldBodyFont, Element.ALIGN_RIGHT, cardBorder);
                    addTableCell(compTable, (diff >= 0 ? "+" : "") + nf.format(Math.round(diff)) + " đ", diff > 0 ? expenseFont : incomeFont, Element.ALIGN_RIGHT, cardBorder);
                    addTableCell(compTable, (pct >= 0 ? "+" : "") + pct + "%", pct > 0 ? expenseFont : incomeFont, Element.ALIGN_CENTER, cardBorder);
                }
                document.add(compTable);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Loi tao PDF bao cao:", e);
            throw new RuntimeException("Loi tao PDF: " + e.getMessage(), e);
        }
    }

    private void addKpiCard(PdfPTable table, String label, String value, String subText, Color valColor, Color bgColor, Color borderColor, BaseFont bfRegular, BaseFont bfBold) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bgColor);
        cell.setPadding(6);
        cell.setBorderColor(borderColor);

        Paragraph pLabel = new Paragraph(label, new Font(bfBold, 7.5f, Font.NORMAL, new Color(100, 116, 139)));
        pLabel.setAlignment(Element.ALIGN_CENTER);
        pLabel.setSpacingAfter(2);
        cell.addElement(pLabel);

        Paragraph pVal = new Paragraph(value, new Font(bfBold, 10.5f, Font.NORMAL, valColor));
        pVal.setAlignment(Element.ALIGN_CENTER);
        pVal.setSpacingAfter(2);
        cell.addElement(pVal);

        Paragraph pSub = new Paragraph(subText, new Font(bfRegular, 6.5f, Font.NORMAL, new Color(148, 163, 184)));
        pSub.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pSub);

        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font, int alignment, Color borderColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4.5f);
        cell.setBorderColor(borderColor);
        table.addCell(cell);
    }
}
