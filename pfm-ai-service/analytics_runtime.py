"""Small, dependency-free runtime helpers shared by AI 2-5.

The cache is intentionally process-local: the current deployment runs one Uvicorn
worker and this avoids introducing new infrastructure.  Keys always include a
database-derived data version, while TTL is a final safety net.
"""

from __future__ import annotations

import copy
import logging
import os
import threading
import time
from collections import OrderedDict
from contextlib import contextmanager
from typing import Any, Dict, Hashable, Iterator, Optional


LOGGER = logging.getLogger("finora.analytics")


class TTLCache:
    def __init__(self, ttl_seconds: Optional[int] = None, max_entries: int = 256, copy_values: bool = True):
        self.ttl_seconds = ttl_seconds or int(os.getenv("AI_CACHE_TTL_SECONDS", "300"))
        self.max_entries = max_entries
        self.copy_values = copy_values
        self._values: "OrderedDict[Hashable, tuple[float, Any]]" = OrderedDict()
        self._lock = threading.RLock()

    def get(self, key: Hashable) -> Any:
        now = time.monotonic()
        with self._lock:
            item = self._values.get(key)
            if item is None:
                return None
            created_at, value = item
            if now - created_at >= self.ttl_seconds:
                self._values.pop(key, None)
                return None
            self._values.move_to_end(key)
            return copy.deepcopy(value) if self.copy_values else value

    def set(self, key: Hashable, value: Any) -> None:
        with self._lock:
            stored = copy.deepcopy(value) if self.copy_values else value
            self._values[key] = (time.monotonic(), stored)
            self._values.move_to_end(key)
            while len(self._values) > self.max_entries:
                self._values.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._values.clear()


class KeyedLocks:
    def __init__(self):
        self._locks: Dict[Hashable, threading.Lock] = {}
        self._guard = threading.Lock()

    @contextmanager
    def acquire(self, key: Hashable) -> Iterator[None]:
        with self._guard:
            lock = self._locks.setdefault(key, threading.Lock())
        with lock:
            yield


class Timings:
    def __init__(self, module: str):
        self.module = module
        self.started = time.perf_counter()
        self.values: Dict[str, float] = {}

    @contextmanager
    def measure(self, name: str) -> Iterator[None]:
        started = time.perf_counter()
        try:
            yield
        finally:
            self.values[name] = (time.perf_counter() - started) * 1000.0

    def log(self, **fields: Any) -> None:
        self.values["total"] = (time.perf_counter() - self.started) * 1000.0
        parts = [f"{name}={value:.2f}ms" for name, value in self.values.items()]
        parts.extend(f"{name}={value}" for name, value in fields.items())
        LOGGER.info("[%s] %s", self.module, ", ".join(parts))

