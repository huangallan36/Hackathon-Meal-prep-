/** Figma 2.3 "cooking mode" assets (downloaded to /public/figma/screens/2-150) */
const S = "/figma/screens/2-150";

export const COOK_ICON = {
  /** 20px header chevron */
  back: `${S}/icon-chev-l.svg`,
  /** 20px header "more" dots */
  more: `${S}/icon-more.svg`,
  /** 16px white check (done step badge) */
  check: `${S}/icon-check.svg`,
  /** 14px dark play triangle (tutorial thumbnail) */
  play: `${S}/icon-play.svg`,
  /** 14px butter-ink stopwatch (timer pills) */
  timer: `${S}/icon-timer.svg`,
  /** 28px orange voice orb (hands-free row) */
  voiceOrb: `${S}/voice-orb.svg`,
  /** 22px ink chevron (sheet back circle) */
  stepBack: `${S}/icon-chev-l-1.svg`,
  /** 18px white chevron ("Next step") */
  next: `${S}/icon-chev-r.svg`,
  /** 22px orange mic (sheet mic circle) */
  mic: `${S}/icon-mic.svg`,
} as const;

/** Green sparkle from the planner's "Tuned to you" badge (12px) */
export const SPARKLE_GREEN = "/figma/screens/2-146/icon-sparkle.svg";
