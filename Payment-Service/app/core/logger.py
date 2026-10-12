import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from app.core.config import settings


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "message": record.getMessage(),
        }

        # Include custom attributes passed via `extra`
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_entry.update(record.extra_data)

        # Include any extra kwargs that aren't standard LogRecord attributes
        standard_attrs = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
            "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "created", "msecs", "relativeCreated", "thread", "threadName",
            "processName", "process", "extra_data"
        }
        for key, value in record.__dict__.items():
            if key not in standard_attrs and not key.startswith("_"):
                log_entry[key] = value

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


class CustomLogger(logging.Logger):
    def _log_with_extra(self, level: int, msg: Any, args: Any, exc_info: Any = None, extra: Any = None, **kwargs):
        if extra is None:
            extra = {}
        if kwargs:
            extra = {**extra, **kwargs}
        super()._log(level, str(msg), args, exc_info=exc_info, extra={"extra_data": extra})

    def info(self, msg: Any, *args, **kwargs):
        self._log_with_extra(logging.INFO, msg, args, **kwargs)

    def error(self, msg: Any, *args, **kwargs):
        self._log_with_extra(logging.ERROR, msg, args, **kwargs)

    def warn(self, msg: Any, *args, **kwargs):
        self._log_with_extra(logging.WARNING, msg, args, **kwargs)

    def warning(self, msg: Any, *args, **kwargs):
        self._log_with_extra(logging.WARNING, msg, args, **kwargs)

    def debug(self, msg: Any, *args, **kwargs):
        self._log_with_extra(logging.DEBUG, msg, args, **kwargs)


logging.setLoggerClass(CustomLogger)


def setup_logger() -> CustomLogger:
    logger = logging.getLogger(settings.service_name)
    log_level_map = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warn": logging.WARNING,
        "warning": logging.WARNING,
        "error": logging.ERROR,
    }
    level = log_level_map.get(settings.log_level.lower(), logging.INFO)
    logger.setLevel(level)
    logger.propagate = False

    # Avoid duplicate handlers if setup_logger called multiple times
    if logger.handlers:
        return logger  # type: ignore

    formatter = JSONFormatter()

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)
    logger.addHandler(console_handler)

    # Optional file logging
    if settings.log_to_file:
        try:
            combined_path = Path(settings.log_file)
            combined_path.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(combined_path)
            file_handler.setFormatter(formatter)
            file_handler.setLevel(level)
            logger.addHandler(file_handler)

            error_path = Path(settings.error_file)
            error_path.parent.mkdir(parents=True, exist_ok=True)
            error_file_handler = logging.FileHandler(error_path)
            error_file_handler.setFormatter(formatter)
            error_file_handler.setLevel(logging.ERROR)
            logger.addHandler(error_file_handler)
        except Exception as e:
            print(f"Failed to initialize file logger: {e}", file=sys.stderr)

    return logger  # type: ignore


logger = setup_logger()
