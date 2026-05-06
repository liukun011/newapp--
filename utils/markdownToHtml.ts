import {marked} from 'marked';
import DOMPurify from 'dompurify';

/**
 * 将 Markdown 字符串转换为 HTML
 * @param markdown - 要转换的 Markdown 文本，传入空值时返回空字符串
 * @param options - 可选配置项
 * @param options.gfm - 是否启用 GFM（GitHub 风格 Markdown，支持表格、任务列表等），默认为 true
 * @param options.breaks - 是否将软换行（\n）转换为 <br> 标签，默认为 false
 * @returns 转换后的 HTML 字符串
 * @example
 * markdownToHtml('# Hello', {gfm: true})
 * // => '<h1>Hello</h1>\n'
 */
export function markdownToHtml(markdown?: string | null, options?: {gfm?: boolean; breaks?: boolean}): string {
    if (!markdown) return '';
    const {gfm = true, breaks = false} = options || {};
    // 去除 ```markdown 前缀和 ``` 后缀
    const cleaned = markdown.replace(/^```markdown\s*/i, '').replace(/\s*```$/, '');
    const rawHtml = marked.parse(cleaned, {gfm, breaks}) as string;
    return DOMPurify.sanitize(rawHtml);
}