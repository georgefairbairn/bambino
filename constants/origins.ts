/**
 * Emoji flags for name origins, displayed on cards and filter rows.
 * Falls back to globe emoji for unmapped origins.
 */
export const ORIGIN_FLAGS: Record<string, string> = {
  Hebrew: '\u{1F1EE}\u{1F1F1}',
  English: '\u{1F1EC}\u{1F1E7}',
  Latin: '\u{1F1EE}\u{1F1F9}',
  Greek: '\u{1F1EC}\u{1F1F7}',
  Germanic: '\u{1F1E9}\u{1F1EA}',
  Irish: '\u{1F1EE}\u{1F1EA}',
  French: '\u{1F1EB}\u{1F1F7}',
  Welsh: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
  Scottish: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  Italian: '\u{1F1EE}\u{1F1F9}',
  Spanish: '\u{1F1EA}\u{1F1F8}',
  Scandinavian: '\u{1F1F8}\u{1F1EA}',
  Dutch: '\u{1F1F3}\u{1F1F1}',
  Aramaic: '\u{1F1F8}\u{1F1FE}',
  Arabic: '\u{1F1F8}\u{1F1E6}',
};

export function getOriginFlag(origin: string): string {
  return ORIGIN_FLAGS[origin] || '\u{1F30D}';
}
