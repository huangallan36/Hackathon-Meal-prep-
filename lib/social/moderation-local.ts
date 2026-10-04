/**
 * Tiny offline text check for Social posts. Pure (no imports) so the client,
 * the /api/moderate fallback and test scripts all share it.
 *
 * It only catches the obvious: strong profanity, slurs, harassment, contact
 * details and spam links. Everything else is allowed; Gemini does the real
 * (image + text) moderation when it is reachable.
 */

export type LocalCategory = "profanity" | "hate" | "harassment" | "personal_info" | "spam";

export interface LocalVerdict {
  allowed: boolean;
  /** Warm, user-facing sentence */
  reason: string;
  category?: LocalCategory;
}

export const ALLOWED_REASON = "Looks tasty!";

const REASONS: Record<LocalCategory, string> = {
  profanity: "Let's keep it friendly. Mind rewording your caption without the strong language?",
  hate: "Sous keeps the feed kind for everyone. Please rephrase that caption.",
  harassment: "Let's keep captions kind. Mind rewording that?",
  personal_info: "For your safety, leave phone numbers and emails out of your post.",
  spam: "Links and promos aren't allowed on Sous. Just tell everyone about the food!",
};

/**
 * Word stems matched at word boundaries with an optional suffix, so
 * "shiitake", "class", "scunthorpe" and "cocktail" stay allowed.
 */
const PROFANITY = [
  "fuck", "fuk", "fck", "motherfuck", "shit", "bullshit", "bitch", "cunt", "asshole", "arsehole",
  "dickhead", "bastard", "wanker", "twat", "slut", "whore", "pussy", "jackass", "dumbass",
];
const SLURS = [
  "nigger", "nigga", "faggot", "fag", "retard", "chink", "kike", "tranny", "wetback", "gook",
  "raghead", "towelhead", "coon", "dyke",
];
// No bare "y" suffix: it would turn food words into hits.
const SUFFIX = "(?:s|es|ed|er|ers|ing|in|ty|tard|face|head|hole)?";

const PROFANITY_RE = stemRegex(PROFANITY);
const SLUR_RE = stemRegex(SLURS);
const HARASSMENT_RE =
  /\b(?:kys|kill (?:your ?self|ur ?self|yourselves)|go die|hope you die|you(?:'re| are)? (?:ugly|worthless|disgusting|pathetic)|nobody likes you)\b/;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\s().-]*){10,}/;
const LINK_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|ly|co|xyz|shop|biz)\b/i;
const SPAM_RE =
  /\b(?:buy now|promo code|discount code|use code|click (?:the )?link|link in (?:my )?bio|dm (?:me )?(?:to|for) (?:order|buy|price)|follow for follow|f4f|onlyfans|crypto|giveaway)\b/;

/** U+0300..U+036F, built from char codes so the source stays plain ASCII */
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

/** Lowercase, strip accents, undo common leetspeak and squash long letter runs ("fuuuuck" -> "fuuck"). */
export function normalizeForModeration(text: string): string {
  return text
    .normalize("NFKD")
    // Combining marks (U+0300 to U+036F): "cafe" from "café"
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    .replace(/([a-z])\1{2,}/g, "$1$1");
}

function stemRegex(stems: string[]): RegExp {
  // Each letter may repeat ("fuuck"), a vowel may be starred out ("sh*t"),
  // and the word may carry a short suffix ("shitty", "fuckers").
  const alts = stems.map((s) => [...s].map((c) => ("aeiou".includes(c) ? `[${c}*]+` : `${c}+`)).join(""));
  return new RegExp(`\\b(?:${alts.join("|")})${SUFFIX}\\b`);
}

/** Check any number of user strings (dish name, caption). Allowed unless something obvious trips. */
export function checkTextLocally(...texts: (string | undefined | null)[]): LocalVerdict {
  const raw = texts.filter((t): t is string => typeof t === "string" && t.trim().length > 0).join("\n");
  if (!raw) return { allowed: true, reason: ALLOWED_REASON };

  // Contact info and links are checked on the raw text: leetspeak mapping would mangle digits.
  if (EMAIL_RE.test(raw) || PHONE_RE.test(raw)) return block("personal_info");
  if (LINK_RE.test(raw)) return block("spam");

  const text = normalizeForModeration(raw);
  // Also test with separators removed inside words ("f.u.c.k", "s h i t").
  const squashed = text.replace(/\b(\w)[\s._-](?=\w\b)/g, "$1");
  const variants = text === squashed ? [text] : [text, squashed];

  if (variants.some((v) => SLUR_RE.test(v))) return block("hate");
  if (variants.some((v) => HARASSMENT_RE.test(v))) return block("harassment");
  if (variants.some((v) => PROFANITY_RE.test(v))) return block("profanity");
  if (SPAM_RE.test(text)) return block("spam");
  return { allowed: true, reason: ALLOWED_REASON };
}

function block(category: LocalCategory): LocalVerdict {
  return { allowed: false, reason: REASONS[category], category };
}
