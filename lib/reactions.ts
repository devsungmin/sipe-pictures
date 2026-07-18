/** 사진에 남길 수 있는 반응 이모지 목록 (서버 검증과 UI가 함께 사용) */
export const REACTION_EMOJIS = ["❤️", "👍", "😍", "🔥"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
