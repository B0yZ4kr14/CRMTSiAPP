class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class ForbiddenError extends HttpError {
  constructor(message = 'forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends HttpError {
  constructor(message = 'not found') {
    super(message, 404);
  }
}

module.exports = { HttpError, ForbiddenError, NotFoundError };
