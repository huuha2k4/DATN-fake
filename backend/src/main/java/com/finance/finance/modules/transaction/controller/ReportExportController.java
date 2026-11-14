package com.finance.finance.modules.transaction.controller;

import com.finance.finance.modules.transaction.service.FinancialReportPdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Controller chuyên biệt xử lý xuất báo cáo tài chính PDF nhị phân
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportExportController {

    private final FinancialReportPdfService financialReportPdfService;

    @PostMapping(value = "/export-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportFinancialReportPdf(
            @RequestBody Map<String, Object> body) {

        String dateRange = String.valueOf(body.getOrDefault("dateRangeDisplay", "Kỳ báo cáo"));
        String walletName = String.valueOf(body.getOrDefault("walletName", "Tất cả ví"));
        double totalIncome = Double.parseDouble(String.valueOf(body.getOrDefault("totalIncome", 0)));
        double totalExpense = Double.parseDouble(String.valueOf(body.getOrDefault("totalExpense", 0)));
        double netCashFlow = Double.parseDouble(String.valueOf(body.getOrDefault("netCashFlow", 0)));
        double savingRate = Double.parseDouble(String.valueOf(body.getOrDefault("savingRate", 0)));

        String aiInsight = null;
        Object insightObj = body.get("aiInsight");
        if (insightObj instanceof Map<?, ?> insightMap) {
            Object textVal = insightMap.get("text");
            aiInsight = textVal != null ? textVal.toString() : null;
        } else if (insightObj instanceof String str) {
            aiInsight = str;
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> categories = (List<Map<String, Object>>) body.getOrDefault("categories", Collections.emptyList());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> topExpenses = (List<Map<String, Object>>) body.getOrDefault("topExpenses", Collections.emptyList());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> comparisons = (List<Map<String, Object>>) body.getOrDefault("comparisons", Collections.emptyList());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dailyTrend = (List<Map<String, Object>>) body.getOrDefault("dailyTrend", Collections.emptyList());

        byte[] pdfBytes = financialReportPdfService.generateFinancialReportPdf(
                dateRange, walletName, totalIncome, totalExpense, netCashFlow, savingRate,
                categories, topExpenses, comparisons, dailyTrend, aiInsight
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"BaoCao_TaiChinh.pdf\"")
                .body(pdfBytes);
    }
}
