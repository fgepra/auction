/** 프론트엔드(src/lib/format.ts, auth.ts)와 같은 값을 쓴다. */
export const BID_STEP = 100;
export const SIGNUP_BONUS = 10000;
export const MAX_PRICE = 100_000_000;
export const AUCTION_DAYS = [1, 3, 7];

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;
export const PASSWORD_MIN = 8;
/** bcrypt는 72바이트까지만 읽는다. */
export const PASSWORD_MAX_BYTES = 72;

export const NAME_MAX = 60;
export const TAGLINE_MAX = 100;
export const STORY_MAX = 2000;
export const FEATURES_MAX_LINES = 10;
export const FEATURE_MAX_CHARS = 200;
