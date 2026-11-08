// 表記ゆれ（ひらがな/カタカナ、全角半角、空白）を吸収する
export function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .toLowerCase()
}
