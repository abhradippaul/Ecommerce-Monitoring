class HttpError(Exception):
    def __init__(self, status_code: int, message: str, error_type: str = "internal_error"):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.error_type = error_type
        self.name = "HttpError"
