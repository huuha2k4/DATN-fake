package com.finance.finance.modules.finai.tool;
import java.time.Duration;
import java.util.*;
public record FinAiToolDefinition(
        String name, String description, FinAiToolMode mode,
        Set<String> allowedArguments, Set<String> requiredArguments,
        Map<String, Object> inputSchema, Map<String, Object> outputSchema,
        String permission, Duration timeout) {}

