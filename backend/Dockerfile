# Dockerfile for Spring Boot backend with hot reload support

FROM maven:3.9-eclipse-temurin-21
WORKDIR /app

# Copy pom.xml and download dependencies (cache layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Expose port
EXPOSE 8080

# Run with spring-boot:run for hot reload (devtools will auto-restart on file changes)
CMD ["mvn", "spring-boot:run"]
