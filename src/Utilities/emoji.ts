export const EMOJI = Object.freeze({
  hammer: "<:Modhammer:1517573534061170868>",
  moon: "<:Moon:1517573475496362267>",
  approved: "<:Approved:1517572719623930016>",
  denied: "<:Denied:1517572662279274710>",
  error: "<:Error:1517572590225461421>",
  question: "<:Question:1517572535393190121>",
  verify: "<a:Verify:1517572452081729667>",
  staff: "<:Staff:1520891667136254105>",
  loading: "<a:Loading:1517569264817672412>",
  new1: "<:new1:1527005146188349492>",
  new2: "<:new2:1527005092660904147>",
  right: "<a:pointright:1527005041679143034>",
  left: "<a:pointleft:1527004977933848770>",
  thumbsup: "<:thumbsup:1527004918718660798>",
  thumbdown: "<:thumbsdown:1527004837093314612>",
  lunar: "<:Lunar:1527008583953289369>",
} as const);

export type EmojiName = keyof typeof EMOJI;