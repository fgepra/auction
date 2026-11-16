/** 프론트엔드 ItemArt 의 종류와 배경색. 이미지가 없는 물건에 쓰는 기본 그림이다. */
export const ART_TINTS = {
  clock: "#E9E4FF",
  umbrella: "#FFE6D9",
  jar: "#FFF1C9",
  key: "#D9F3E6",
  shoe: "#DCEBFF",
  cloud: "#E4E9F7",
  book: "#FBE0EC",
  lamp: "#FFEBCF",
};

export const ART_KINDS = Object.keys(ART_TINTS);

/** 물건 이름으로 그림을 정해, 같은 이름이면 항상 같은 그림이 나오게 한다. */
export function pickArt(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return ART_KINDS[hash % ART_KINDS.length];
}

export function tintOf(art) {
  return ART_TINTS[art] ?? ART_TINTS.clock;
}
