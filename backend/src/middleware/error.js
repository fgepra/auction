import { HttpError } from "../errors.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "not_found", message: "요청한 주소를 찾을 수 없어요." },
  });
}

// Express는 인자가 4개인 함수를 오류 처리기로 인식한다.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...err.extra },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "bad_json", message: "요청 내용을 읽을 수 없어요." },
    });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "too_large", message: "요청 내용이 너무 커요." },
    });
  }

  console.error(err);
  res.status(500).json({
    error: { code: "internal", message: "잠시 문제가 생겼어요. 다시 시도해 주세요." },
  });
}
