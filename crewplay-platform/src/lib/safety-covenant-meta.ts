export const SAFETY_COVENANT_VERSION = "2026-08-v1";

export type SafetyCovenantKey = "risk_ack" | "etiquette_ack" | "mediation_ack";

export const SAFETY_COVENANT_ITEMS: Array<{ key: SafetyCovenantKey; text: string }> = [
  {
    key: "risk_ack",
    text: "我理解運動競技風險，包含肢體碰撞或被球擊中等可容許風險。",
  },
  {
    key: "etiquette_ack",
    text: "我承諾遵守場上禮儀，不言語暴力、不挑釁、不破壞場館設備。",
  },
  {
    key: "mediation_ack",
    text: "若發生爭議，我同意優先透過 CrewPlay 客服與團主進行客觀釐清。",
  },
];

