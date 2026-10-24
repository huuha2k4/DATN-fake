package com.finance.finance.modules.tag.service;

import com.finance.finance.modules.tag.dto.request.CreateTagRequest;
import com.finance.finance.modules.tag.dto.request.UpdateTagRequest;
import com.finance.finance.modules.tag.dto.response.TagResponse;
import com.finance.finance.modules.tag.entity.Tag;
import com.finance.finance.modules.tag.exception.TagNotFoundException;
import com.finance.finance.modules.tag.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TagService {

    private final TagRepository tagRepository;

    @Transactional
    public TagResponse createTag(UUID userId, CreateTagRequest request) {
        log.info("Creating tag for user: {}, name: {}", userId, request.getName());

        // Check duplicate
        if (tagRepository.existsByNameAndUserId(request.getName(), userId, null)) {
            throw new IllegalArgumentException("Tag '" + request.getName() + "' đã tồn tại");
        }

        Tag tag = Tag.builder()
                .userId(userId)
                .name(request.getName())
                .color(request.getColor())
                .build();

        tag = tagRepository.save(tag);
        log.info("Tag created: {}", tag.getId());

        return mapToResponse(tag);
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getTags(UUID userId) {
        log.info("Getting tags for user: {}", userId);

        return tagRepository.findAllByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TagResponse getTagById(UUID userId, UUID tagId) {
        log.info("Getting tag: {}", tagId);

        Tag tag = tagRepository.findByIdAndUserId(tagId, userId)
                .orElseThrow(() -> new TagNotFoundException("Không tìm thấy tag"));

        return mapToResponse(tag);
    }

    @Transactional
    public TagResponse updateTag(UUID userId, UUID tagId, UpdateTagRequest request) {
        log.info("Updating tag: {}", tagId);

        Tag tag = tagRepository.findByIdAndUserId(tagId, userId)
                .orElseThrow(() -> new TagNotFoundException("Không tìm thấy tag"));

        // Check duplicate name
        if (request.getName() != null && !request.getName().equals(tag.getName())) {
            if (tagRepository.existsByNameAndUserId(request.getName(), userId, tagId)) {
                throw new IllegalArgumentException("Tag '" + request.getName() + "' đã tồn tại");
            }
        }

        if (request.getName() != null) tag.setName(request.getName());
        if (request.getColor() != null) tag.setColor(request.getColor());

        tag = tagRepository.save(tag);
        return mapToResponse(tag);
    }

    @Transactional
    public void deleteTag(UUID userId, UUID tagId) {
        log.info("Deleting tag: {}", tagId);

        Tag tag = tagRepository.findByIdAndUserId(tagId, userId)
                .orElseThrow(() -> new TagNotFoundException("Không tìm thấy tag"));

        tag.markAsDeleted();
        tagRepository.save(tag);
    }

    private TagResponse mapToResponse(Tag tag) {
        Long transactionCount = tagRepository.countTransactionsByTagId(tag.getId());

        return TagResponse.builder()
                .id(tag.getId())
                .name(tag.getName())
                .color(tag.getColor())
                .transactionCount(transactionCount != null ? transactionCount.intValue() : 0)
                .createdAt(tag.getCreatedAt())
                .updatedAt(tag.getUpdatedAt())
                .build();
    }
}
