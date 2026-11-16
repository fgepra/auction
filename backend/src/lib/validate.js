import {
  AUCTION_DAYS,
  BID_STEP,
  FEATURES_MAX_LINES,
  FEATURE_MAX_CHARS,
  MAX_PRICE,
  NAME_MAX,
  NICKNAME_MAX,
  NICKNAME_MIN,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN,
  STORY_MAX,
  TAGLINE_MAX,
} from "../constants.js";
import { validationError } from "../errors.js";
import { ART_KINDS } from "./art.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (v) => (typeof v === "string" ? v : "");
/** 글자 수 (이모지 같은 문자도 한 글자로 센다) */
const size = (s) => [...s].length;

function toInt(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : NaN;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return NaN;
}

function toLines(value) {
  const raw = Array.isArray(value) ? value : text(value).split(/\r?\n/);
  return raw.map((line) => text(line).trim()).filter(Boolean);
}

function throwIfAny(fields) {
  if (Object.keys(fields).length > 0) throw validationError(fields);
}

export function parseSignup(body = {}) {
  const fields = {};
  const email = text(body.email).trim().toLowerCase();
  const nickname = text(body.nickname).trim();
  const password = text(body.password);

  if (!email) fields.email = "이메일을 적어 주세요.";
  else if (email.length > 254 || !EMAIL_RE.test(email)) {
    fields.email = "이메일 형식이 맞는지 확인해 주세요.";
  }

  if (size(nickname) < NICKNAME_MIN || size(nickname) > NICKNAME_MAX) {
    fields.nickname = `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 적어 주세요.`;
  }

  if (size(password) < PASSWORD_MIN) {
    fields.password = `비밀번호는 ${PASSWORD_MIN}자 이상으로 정해 주세요.`;
  } else if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) {
    fields.password = "비밀번호가 너무 길어요. 조금 줄여 주세요.";
  }

  throwIfAny(fields);
  return { email, nickname, password };
}

export function parseLogin(body = {}) {
  const fields = {};
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password);
  if (!email) fields.email = "이메일을 적어 주세요.";
  if (!password) fields.password = "비밀번호를 적어 주세요.";
  throwIfAny(fields);
  return { email, password };
}

export function parseNewItem(body = {}) {
  const fields = {};
  const name = text(body.name).trim();
  const tagline = text(body.tagline).trim();
  const story = text(body.story).trim();
  const features = toLines(body.features);
  const startPrice = toInt(body.startPrice);
  const days = toInt(body.days);

  if (!name) fields.name = "물건 이름을 적어 주세요.";
  else if (size(name) > NAME_MAX) {
    fields.name = `물건 이름은 ${NAME_MAX}자까지 적을 수 있어요.`;
  }

  if (size(tagline) > TAGLINE_MAX) {
    fields.tagline = `한 줄 소개는 ${TAGLINE_MAX}자까지 적을 수 있어요.`;
  }

  if (features.length > FEATURES_MAX_LINES) {
    fields.features = `기능은 ${FEATURES_MAX_LINES}줄까지 적을 수 있어요.`;
  } else if (features.some((line) => size(line) > FEATURE_MAX_CHARS)) {
    fields.features = `기능 한 줄은 ${FEATURE_MAX_CHARS}자까지 적을 수 있어요.`;
  }

  if (size(story) > STORY_MAX) {
    fields.story = `이야기는 ${STORY_MAX}자까지 적을 수 있어요.`;
  }

  if (!Number.isFinite(startPrice)) fields.startPrice = "시작가를 적어 주세요.";
  else if (startPrice < BID_STEP || startPrice % BID_STEP !== 0) {
    fields.startPrice = `시작가는 ${BID_STEP.toLocaleString("ko-KR")} 몽 이상, ${BID_STEP.toLocaleString("ko-KR")} 몽 단위로 정해 주세요.`;
  } else if (startPrice > MAX_PRICE) {
    fields.startPrice = `시작가는 ${MAX_PRICE.toLocaleString("ko-KR")} 몽까지 정할 수 있어요.`;
  }

  if (!AUCTION_DAYS.includes(days)) {
    fields.days = `경매 기간은 ${AUCTION_DAYS.join(", ")}일 중에서 골라 주세요.`;
  }

  let art = null;
  if (body.art !== undefined && body.art !== null && body.art !== "") {
    if (!ART_KINDS.includes(body.art)) fields.art = "알 수 없는 그림이에요.";
    else art = body.art;
  }

  throwIfAny(fields);
  return { name, tagline, story, features, startPrice, days, art };
}

export function parseBid(body = {}) {
  const amount = toInt(body.amount);
  if (!Number.isFinite(amount)) {
    throw validationError({ amount: "입찰 금액을 숫자로 적어 주세요." });
  }
  if (amount < BID_STEP || amount % BID_STEP !== 0) {
    throw validationError({
      amount: `입찰 금액은 ${BID_STEP.toLocaleString("ko-KR")} 몽 단위로 적어 주세요.`,
    });
  }
  if (amount > MAX_PRICE) {
    throw validationError({
      amount: `입찰 금액은 ${MAX_PRICE.toLocaleString("ko-KR")} 몽까지 가능해요.`,
    });
  }
  return { amount };
}
