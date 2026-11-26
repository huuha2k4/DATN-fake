package com.finance.finance.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.CommonsRequestLoggingFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Bean
    public CommonsRequestLoggingFilter requestLoggingFilter() {
        CommonsRequestLoggingFilter loggingFilter = new CommonsRequestLoggingFilter();
        loggingFilter.setIncludeClientInfo(true);
        loggingFilter.setIncludeQueryString(true);
        loggingFilter.setIncludePayload(false);
        loggingFilter.setIncludeHeaders(false);
        loggingFilter.setMaxPayloadLength(1000);
        return loggingFilter;
    }

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);  // 10 seconds
        factory.setReadTimeout(120_000);    // 120 seconds (OCR takes longer)
        return new RestTemplate(factory);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Avatars use UUID filenames and are public profile assets -> safe for 30-day public cache.
        addUploadResourceHandler(registry, "avatars", CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic());
        // Receipts / OCR scans are served exclusively by ReceiptMediaController with ownership/signature checks.
        // Group-message files are served only through short-lived signed URLs after group membership checks.
    }

    private void addUploadResourceHandler(ResourceHandlerRegistry registry, String directory, CacheControl cacheControl) {
        String uploadPath = Paths.get("uploads", directory).toAbsolutePath().toUri().toString();
        if (!uploadPath.endsWith("/")) uploadPath += "/";
        registry.addResourceHandler("/uploads/" + directory + "/**")
                .addResourceLocations(uploadPath)
                .setCacheControl(cacheControl);
    }
}
