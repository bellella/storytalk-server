/**
 * RewardType별 payload 필드 정의
 * 어드민 페이지에서 Reward 등록 시 참고용
 */

/** COIN: 코인 지급 */
export interface CoinPayload {
  amount: number; // 지급할 코인 수량 (양수)
}

/** XP: 경험치 지급 */
export interface XpPayload {
  amount: number; // 지급할 XP 수량 (양수)
}

/** CHARACTER_INVITE: 캐릭터 친구 초대권 지급 */
export interface CharacterInvitePayload {
  characterId: number; // 초대 가능 상태로 전환할 캐릭터 ID
}

/** COUPON: 쿠폰 지급 */
export interface CouponPayload {
  couponKey: string; // 발급할 쿠폰 키 (Coupon.key)
}

/** ITEM: 아이템 지급 (기록만, 별도 처리 필요) */
export interface ItemPayload {
  itemId: number;      // 아이템 ID
  itemName?: string;   // 아이템 이름 (표시용)
  quantity?: number;   // 수량 (기본 1)
}

/** RewardType → payload 타입 매핑 */
export type RewardPayloadMap = {
  COIN: CoinPayload;
  XP: XpPayload;
  CHARACTER_INVITE: CharacterInvitePayload;
  COUPON: CouponPayload;
  ITEM: ItemPayload;
};
