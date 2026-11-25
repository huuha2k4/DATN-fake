package com.finance.finance.common.upload;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Iterator;

@Component
@Slf4j
public class ImageCompressionHelper {

    public record SavedImage(
            String filename,
            String contentType,
            long sizeBytes,
            Integer width,
            Integer height
    ) {}

    /**
     * Lưu ảnh đã upload, tự động resize theo maxDimension và nén JPEG/PNG để giảm băng thông.
     * Giữ nguyên GIF/WEBP để tránh mất animation hoặc lỗi codec.
     */
    public SavedImage saveCompressed(
            MultipartFile file,
            Path uploadDir,
            String baseFilename,
            FileUploadValidator.ValidatedUpload validated,
            int maxDimension,
            float jpegQuality
    ) throws IOException {
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String contentType = validated.contentType();
        String ext = validated.extension();

        // Không nén lại GIF (tránh mất animation) hoặc WEBP (ImageIO mặc định không ghi WEBP)
        if ("image/gif".equals(contentType) || "image/webp".equals(contentType)) {
            String filename = baseFilename + ext;
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            Integer[] dims = readDimensions(target);
            return new SavedImage(filename, contentType, Files.size(target), dims[0], dims[1]);
        }

        BufferedImage source;
        try (InputStream is = file.getInputStream()) {
            source = ImageIO.read(is);
        }

        if (source == null) {
            String filename = baseFilename + ext;
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return new SavedImage(filename, contentType, Files.size(target), null, null);
        }

        int origW = source.getWidth();
        int origH = source.getHeight();
        BufferedImage resized = resizeIfNeeded(source, maxDimension);
        int finalW = resized.getWidth();
        int finalH = resized.getHeight();

        boolean hasAlpha = resized.getColorModel().hasAlpha();
        boolean writeAsJpeg = "image/jpeg".equals(contentType) || !hasAlpha;

        byte[] compressedBytes;
        String finalExt;
        String finalContentType;

        if (writeAsJpeg) {
            compressedBytes = encodeJpeg(resized, jpegQuality);
            finalExt = ".jpg";
            finalContentType = "image/jpeg";
        } else {
            compressedBytes = encodePng(resized);
            finalExt = ".png";
            finalContentType = "image/png";
        }

        // Nếu file gốc nhỏ hơn (hiếm gặp với ảnh đã nén sẵn) và không bị resize thì giữ file gốc
        if (compressedBytes != null && (compressedBytes.length < file.getSize() || finalW < origW || finalH < origH)) {
            String filename = baseFilename + finalExt;
            Path target = uploadDir.resolve(filename);
            Files.write(target, compressedBytes);
            log.debug("Compressed uploaded image {} -> {} ({} KB -> {} KB)",
                    file.getOriginalFilename(), filename, file.getSize() / 1024, compressedBytes.length / 1024);
            return new SavedImage(filename, finalContentType, compressedBytes.length, finalW, finalH);
        }

        String filename = baseFilename + ext;
        Path target = uploadDir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return new SavedImage(filename, contentType, Files.size(target), origW, origH);
    }

    private BufferedImage resizeIfNeeded(BufferedImage source, int maxDimension) {
        int w = source.getWidth();
        int h = source.getHeight();
        int max = Math.max(w, h);
        if (max <= maxDimension) {
            return source;
        }
        double scale = (double) maxDimension / max;
        int newW = Math.max(1, (int) Math.round(w * scale));
        int newH = Math.max(1, (int) Math.round(h * scale));
        int imageType = source.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage out = new BufferedImage(newW, newH, imageType);
        Graphics2D g2d = out.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.drawImage(source, 0, 0, newW, newH, null);
        g2d.dispose();
        return out;
    }

    private byte[] encodeJpeg(BufferedImage img, float quality) throws IOException {
        BufferedImage rgb = img;
        if (img.getType() != BufferedImage.TYPE_INT_RGB) {
            rgb = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, img.getWidth(), img.getHeight());
            g.drawImage(img, 0, 0, null);
            g.dispose();
        }
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) return null;
        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(rgb, null, null), param);
            ios.flush();
            return baos.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    private byte[] encodePng(BufferedImage img) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        }
    }

    private Integer[] readDimensions(Path path) {
        try {
            BufferedImage img = ImageIO.read(path.toFile());
            if (img != null) {
                return new Integer[]{img.getWidth(), img.getHeight()};
            }
        } catch (Exception ignored) {
        }
        return new Integer[]{null, null};
    }
}
