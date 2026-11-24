package com.finance.finance.common.upload;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FileUploadValidatorTest {

    private final FileUploadValidator validator = new FileUploadValidator();

    @Test
    void acceptsPngWhenDeclaredTypeMatchesMagicBytes() throws IOException {
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", png);

        FileUploadValidator.ValidatedUpload result =
                validator.validate(file, FileUploadValidator.Policy.AVATAR);

        assertEquals("image/png", result.contentType());
        assertEquals(".png", result.extension());
    }

    @Test
    void rejectsHtmlRenamedAsJpeg() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.jpg", "image/jpeg", "<script>alert(1)</script>".getBytes());

        assertThrows(IllegalArgumentException.class,
                () -> validator.validate(file, FileUploadValidator.Policy.AVATAR));
    }

    @Test
    void rejectsDeclaredMimeThatDoesNotMatchMagicBytes() {
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", png);

        assertThrows(IllegalArgumentException.class,
                () -> validator.validate(file, FileUploadValidator.Policy.AVATAR));
    }

    @Test
    void rejectsFileOverPolicyLimitBeforeReadingContent() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(5L * 1024 * 1024 + 1);

        assertThrows(IllegalArgumentException.class,
                () -> validator.validate(file, FileUploadValidator.Policy.AVATAR));
    }
}
