/** 응답으로 그대로 내려가는 오류. message는 화면에 바로 보여 줘도 되는 문장이다. */
export class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const badRequest = (message, code = "bad_request", extra) =>
  new HttpError(400, code, message, extra);

/** fields: { 필드이름: "안내 문장" }  → 첫 문장을 message로, 전체를 fields로 내려 준다. */
export const validationError = (fields) =>
  new HttpError(400, "validation_failed", Object.values(fields)[0], { fields });

export const unauthorized = (message = "로그인이 필요해요.") =>
  new HttpError(401, "unauthorized", message);

export const forbidden = (message, code = "forbidden") =>
  new HttpError(403, code, message);

export const notFound = (message = "찾을 수 없어요.") =>
  new HttpError(404, "not_found", message);

export const conflict = (message, code = "conflict", extra) =>
  new HttpError(409, code, message, extra);
