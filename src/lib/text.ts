/** 配置里以这个前缀开头的句子会在页面上画出虚线框，提醒站主替换。 */
export const PLACEHOLDER_PREFIX = "【待填写】";

export function isPlaceholder(value: string): boolean {
  return value.trimStart().startsWith(PLACEHOLDER_PREFIX);
}
