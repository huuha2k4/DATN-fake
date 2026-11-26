package com.finance.finance.modules.audit.context;

import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;

/**
 * Thread-local holder for AuditContext synchronized with SLF4J MDC.
 */
public final class AuditContextHolder {

    public static final String MDC_REQUEST_ID = "requestId";
    public static final String MDC_CORRELATION_ID = "correlationId";

    private static final ThreadLocal<AuditContext> HOLDER = new ThreadLocal<>();

    private AuditContextHolder() {
    }

    public static void set(AuditContext context) {
        if (context == null) {
            clear();
            return;
        }
        HOLDER.set(context);
        if (context.getRequestId() != null) {
            MDC.put(MDC_REQUEST_ID, context.getRequestId());
        } else {
            MDC.remove(MDC_REQUEST_ID);
        }
        if (context.getCorrelationId() != null) {
            MDC.put(MDC_CORRELATION_ID, context.getCorrelationId());
        } else {
            MDC.remove(MDC_CORRELATION_ID);
        }
    }

    public static AuditContext get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
        MDC.remove(MDC_REQUEST_ID);
        MDC.remove(MDC_CORRELATION_ID);
    }

    /**
     * Propagates AuditContext and MDC safely across @Async boundaries without leaking across threads.
     */
    public static TaskDecorator taskDecorator() {
        return runnable -> {
            AuditContext captured = get();
            return () -> {
                AuditContext previous = get();
                try {
                    if (captured != null) {
                        set(captured);
                    } else {
                        clear();
                    }
                    runnable.run();
                } finally {
                    if (previous != null) {
                        set(previous);
                    } else {
                        clear();
                    }
                }
            };
        };
    }
}
