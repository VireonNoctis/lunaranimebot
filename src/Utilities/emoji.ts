// import should be import { EMOJI } from "../Utilities/emoji.js";

export const EMOJI = Object.freeze({
  // ─────────────────────────────
  // Moderation
  // ─────────────────────────────
  hammer: "<:Modhammer:1517573534061170868>", // Moderation actions
  verify: "<a:Verify:1517572452081729667>", // Verification prompts or General
  gemlock: "<:Gemlock:1527671482841436161>", // Premium/locked content

  // ─────────────────────────────
  // General
  // ─────────────────────────────
  approved: "<:Approved:1517572719623930016>", // Success/accepted
  denied: "<:Denied:1517572662279274710>", // Rejected/denied
  error: "<:Error:1517572590225461421>", // Errors/failures
  question: "<:Question:1517572535393190121>", // Help/questions
  loading: "<a:Loading:1517569264817672412>", // Loading/progress

  // ─────────────────────────────
  // Staff
  // ─────────────────────────────
  staff: "<:Staff:1520891667136254105>", // Staff members
  dev: "<:Developer:1527010893483872357>", // Developers

  // ─────────────────────────────
  // Branding
  // ─────────────────────────────
  moon: "<:Moon:1517573475496362267>", // General Lunar branding
  lunar: "<:Lunar:1527008583953289369>", // LunarAnime logo

  // ─────────────────────────────
  // Decorative
  // ─────────────────────────────
  new1: "<:new1:1527005146188349492>", // Decorative header (left)
  new2: "<:new2:1527005092660904147>", // Decorative header (right)
  aniheart: "<a:aniheart:1527671771111886989>", // Love/favorites

  // ─────────────────────────────
  // Navigation
  // ─────────────────────────────
  right: "<a:pointright:1527005041679143034>", // Next/right
  left: "<a:pointleft:1527004977933848770>", // Previous/left

  // ─────────────────────────────
  // Reactions
  // ─────────────────────────────
  thumbsup: "<:thumbsup:1527004918718660798>", // Positive
  thumbdown: "<:thumbsdown:1527004837093314612>", // Negative

  // ─────────────────────────────
  // Rating Stars
  // ─────────────────────────────
  yellowstar: "<:yellowstar:1527671893279117482>", // Standard/Common
  greenstar: "<:greenstar:1527672435858477139>", // Uncommon
  cyanstar: "<:cyanstar:1527672593006596277>", // Rare
  purplestar: "<:purplestar:1527672060606681268>", // Epic
  pinkstar: "<:pinkstar:1527672153053593663>", // Mythic
  redstar: "<:redstar:1527671984127869038>", // Legendary
  orangestar: "<:orangestar:1527672340077478009>", // Exclusive/Ultimate
} as const);

export type EmojiName = keyof typeof EMOJI;