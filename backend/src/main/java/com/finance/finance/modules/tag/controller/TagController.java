package com.finance.finance.modules.tag.controller;

import com.finance.finance.modules.tag.dto.request.CreateTagRequest;
import com.finance.finance.modules.tag.dto.request.UpdateTagRequest;
import com.finance.finance.modules.tag.dto.response.TagResponse;
import com.finance.finance.modules.tag.service.TagService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createTag(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTagRequest request) {
        TagResponse tagResponse = tagService.createTag(user.getId(), request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", tagResponse);
        response.put("message", "Tag đã được tạo");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getTags(@AuthenticationPrincipal User user) {
        List<TagResponse> tags = tagService.getTags(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", Map.of("tags", tags));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getTagById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        TagResponse tagResponse = tagService.getTagById(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", tagResponse);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateTag(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTagRequest request) {
        TagResponse tagResponse = tagService.updateTag(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", tagResponse);
        response.put("message", "Tag đã được cập nhật");

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTag(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        tagService.deleteTag(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tag đã được xóa");

        return ResponseEntity.ok(response);
    }
}
