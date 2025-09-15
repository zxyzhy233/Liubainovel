import hilog from "@ohos:hilog";
import http from "@ohos:net.http";
import type { BookSourceInfo, NovelInfo, ChapterInfo, BookDetailInfo, ParseResult } from '../models/BookSourceModel';
const TAG: string = 'BookSourceParser';
/**
 * 书源解析器类
 * 负责根据书源规则解析网页内容
 */
export class BookSourceParser {
    private source: BookSourceInfo;
    /**
     * 构造函数
     * @param source 书源信息
     */
    constructor(source: BookSourceInfo) {
        this.source = source;
    }
    /**
     * 获取网页内容
     * @param url 请求URL
     * @returns Promise<string> 网页HTML内容
     */
    private async fetchHtml(url: string): Promise<string> {
        try {
            const httpRequest = http.createHttp();
            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            // 解析自定义请求头
            if (this.source.header) {
                try {
                    const customHeaders: Record<string, string> = JSON.parse(this.source.header);
                    const headerKeys = Object.keys(customHeaders);
                    for (let i = 0; i < headerKeys.length; i++) {
                        const key = headerKeys[i];
                        headers[key] = customHeaders[key];
                    }
                }
                catch (error) {
                    hilog.warn(0x0000, TAG, '解析自定义请求头失败: ' + error);
                }
            }
            const response = await httpRequest.request(url, {
                method: http.RequestMethod.GET,
                header: headers
            });
            if (response.responseCode === 200) {
                return response.result.toString();
            }
            else {
                const errorMsg = `HTTP请求失败: ${response.responseCode}`;
                hilog.error(0x0000, TAG, errorMsg);
                throw new Error(errorMsg);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, `获取网页内容失败: ${url}, 错误: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 根据规则解析文本内容
     * @param html HTML内容
     * @param rule 解析规则
     * @param multiple 是否返回多个结果
     * @returns 解析结果
     */
    private parseByRule(html: string, rule: string, multiple: boolean = false): string | string[] {
        if (!rule || !html) {
            return multiple ? [] : '';
        }
        try {
            // 判断规则类型并解析
            if (rule.includes('@')) {
                // CSS选择器格式: selector@attr 或 selector@text
                return this.parseByCssSelector(html, rule, multiple);
            }
            else if (rule.startsWith('/') && rule.endsWith('/g')) {
                // 正则表达式格式: /pattern/flags
                return this.parseByRegex(html, rule, multiple);
            }
            else {
                // 直接正则表达式
                return this.parseByRegex(html, rule, multiple);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, `解析规则失败: ${rule}, 错误: ${error}`);
            return multiple ? [] : '';
        }
    }
    /**
     * 使用正则表达式解析
     * @param html HTML内容
     * @param pattern 正则表达式
     * @param multiple 是否返回多个结果
     * @returns 解析结果
     */
    private parseByRegex(html: string, pattern: string, multiple: boolean = false): string | string[] {
        try {
            // 处理正则表达式格式
            let regex: RegExp;
            if (pattern.startsWith('/') && pattern.includes('/')) {
                // 提取正则表达式和标志
                const lastSlash = pattern.lastIndexOf('/');
                const regexPattern = pattern.substring(1, lastSlash);
                const flags = pattern.substring(lastSlash + 1);
                regex = new RegExp(regexPattern, flags);
            }
            else {
                regex = new RegExp(pattern, multiple ? 'g' : '');
            }
            if (multiple) {
                const results: string[] = [];
                let match: RegExpExecArray | null;
                while ((match = regex.exec(html)) !== null) {
                    results.push(match[1] || match[0]);
                    if (!regex.global)
                        break;
                }
                return results;
            }
            else {
                const match = regex.exec(html);
                return match ? (match[1] || match[0]) : '';
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, `正则表达式解析失败: ${pattern}, 错误: ${error}`);
            return multiple ? [] : '';
        }
    }
    /**
     * 使用CSS选择器解析（简化版实现）
     * @param html HTML内容
     * @param rule CSS选择器规则
     * @param multiple 是否返回多个结果
     * @returns 解析结果
     */
    private parseByCssSelector(html: string, rule: string, multiple: boolean = false): string | string[] {
        try {
            const ruleParts = rule.split('@');
            const selector = ruleParts[0];
            const attr = ruleParts[1];
            // 简化的CSS选择器转正则表达式实现
            let pattern: string;
            if (selector.includes('.')) {
                // 类选择器: div.item -> <div[^>]*class="[^"]*item[^"]*"[^>]*>
                const selectorParts = selector.split('.');
                const tag = selectorParts[0];
                const className = selectorParts[1];
                pattern = `<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>(.*?)<\\/${tag}>`;
            }
            else if (selector.includes('[')) {
                // 属性选择器: meta[property='og:title'] -> <meta[^>]*property="og:title"[^>]*>
                const attrMatch = selector.match(/(\w+)\[([^=]+)='([^']+)'\]/);
                if (attrMatch) {
                    const tag = attrMatch[1];
                    const attrName = attrMatch[2];
                    const attrValue = attrMatch[3];
                    if (attr === 'content') {
                        pattern = `<${tag}[^>]*${attrName}="${attrValue}"[^>]*content="([^"]+)"[^>]*>`;
                    }
                    else {
                        pattern = `<${tag}[^>]*${attrName}="${attrValue}"[^>]*>`;
                    }
                }
                else {
                    pattern = selector;
                }
            }
            else {
                // 标签选择器: div -> <div[^>]*>(.*?)</div>
                pattern = `<${selector}[^>]*>(.*?)<\\/${selector}>`;
            }
            // 根据属性类型调整正则表达式
            if (attr === 'text') {
                // 提取文本内容
                return this.parseByRegex(html, pattern, multiple);
            }
            else if (attr === 'href') {
                // 提取href属性
                const hrefPattern = pattern.replace('>(.*?)<', '[^>]*href="([^"]+)"[^>]*>');
                return this.parseByRegex(html, hrefPattern, multiple);
            }
            else if (attr === 'src') {
                // 提取src属性
                const srcPattern = pattern.replace('>(.*?)<', '[^>]*src="([^"]+)"[^>]*>');
                return this.parseByRegex(html, srcPattern, multiple);
            }
            else if (attr === 'content') {
                // 已在上面处理
                return this.parseByRegex(html, pattern, multiple);
            }
            else {
                // 默认提取文本内容
                return this.parseByRegex(html, pattern, multiple);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, `CSS选择器解析失败: ${rule}, 错误: ${error}`);
            return multiple ? [] : '';
        }
    }
    /**
     * 清理HTML标签
     * @param text 包含HTML标签的文本
     * @returns 清理后的纯文本
     */
    private cleanHtmlTags(text: string): string {
        return text.replace(/<[^>]*>/g, '').trim();
    }
    /**
     * 构建完整URL
     * @param baseUrl 基础URL
     * @param relativeUrl 相对URL
     * @returns 完整URL
     */
    private buildFullUrl(baseUrl: string, relativeUrl: string): string {
        if (relativeUrl.startsWith('http')) {
            return relativeUrl;
        }
        const urlParts = baseUrl.split('/');
        const baseUrlRoot = urlParts.slice(0, 3).join('/');
        if (relativeUrl.startsWith('/')) {
            return baseUrlRoot + relativeUrl;
        }
        else {
            return baseUrlRoot + '/' + relativeUrl;
        }
    }
    /**
     * 解析推荐小说列表
     * @param url 推荐页面URL
     * @returns Promise<ParseResult<NovelInfo[]>> 解析结果
     */
    async parseRecommendNovels(url?: string): Promise<ParseResult<NovelInfo[]>> {
        try {
            const targetUrl = url || this.source.bookSourceUrl;
            const html = await this.fetchHtml(targetUrl);
            const rule = this.source.ruleExplore;
            if (!rule.bookList) {
                throw new Error('书源缺少书籍列表规则');
            }
            // 解析书籍列表
            const bookItems = this.parseByRule(html, rule.bookList, true) as string[];
            const novels: NovelInfo[] = [];
            for (const item of bookItems) {
                try {
                    const title = this.cleanHtmlTags(this.parseByRule(item, rule.name || '', false) as string);
                    const author = this.cleanHtmlTags(this.parseByRule(item, rule.author || '', false) as string);
                    const cover = this.parseByRule(item, rule.coverUrl || '', false) as string;
                    const description = this.cleanHtmlTags(this.parseByRule(item, rule.intro || '', false) as string);
                    const link = this.parseByRule(item, rule.bookUrl || '', false) as string;
                    const category = this.cleanHtmlTags(this.parseByRule(item, rule.kind || '', false) as string);
                    const lastChapter = this.cleanHtmlTags(this.parseByRule(item, rule.lastChapter || '', false) as string);
                    if (title && cover) {
                        novels.push({
                            title: title,
                            author: author || '未知作者',
                            cover: this.buildFullUrl(targetUrl, cover),
                            description: description || '暂无简介',
                            link: this.buildFullUrl(targetUrl, link),
                            category: category,
                            latestChapter: lastChapter,
                            hotValue: Math.floor(Math.random() * 50 + 10) + '万热度'
                        });
                    }
                }
                catch (error) {
                    hilog.warn(0x0000, TAG, `解析单个书籍项目失败: ${error}`);
                }
            }
            return {
                success: true,
                data: novels,
                source: this.source.bookSourceName
            };
        }
        catch (error) {
            hilog.error(0x0000, TAG, `解析推荐小说失败: ${error}`);
            return {
                success: false,
                error: error.toString(),
                source: this.source.bookSourceName
            };
        }
    }
    /**
     * 解析书籍详情
     * @param bookUrl 书籍详情页URL
     * @returns Promise<ParseResult<BookDetailInfo>> 解析结果
     */
    async parseBookDetail(bookUrl: string): Promise<ParseResult<BookDetailInfo>> {
        try {
            const html = await this.fetchHtml(bookUrl);
            const rule = this.source.ruleBookInfo;
            const title = this.cleanHtmlTags(this.parseByRule(html, rule.name || '', false) as string);
            const author = this.cleanHtmlTags(this.parseByRule(html, rule.author || '', false) as string);
            const cover = this.parseByRule(html, rule.coverUrl || '', false) as string;
            const description = this.cleanHtmlTags(this.parseByRule(html, rule.intro || '', false) as string);
            const category = this.cleanHtmlTags(this.parseByRule(html, rule.kind || '', false) as string);
            const lastChapter = this.cleanHtmlTags(this.parseByRule(html, rule.lastChapter || '', false) as string);
            const wordCount = this.cleanHtmlTags(this.parseByRule(html, rule.wordCount || '', false) as string);
            const tocUrl = this.parseByRule(html, rule.tocUrl || '', false) as string;
            // 提取状态和更新时间（如果规则中没有定义，使用默认解析）
            let status = '未知状态';
            let updateTime = '未知时间';
            // 尝试从常见的meta标签中提取
            const statusMatch = html.match(/<meta property="og:novel:status" content="([^"]+)"/);
            if (statusMatch) {
                status = statusMatch[1];
            }
            const updateMatch = html.match(/<meta property="og:novel:update_time" content="([^"]+)"/);
            if (updateMatch) {
                updateTime = updateMatch[1];
            }
            const bookDetail: BookDetailInfo = {
                title: title || '未知书名',
                author: author || '未知作者',
                cover: cover ? this.buildFullUrl(bookUrl, cover) : '',
                description: description || '暂无简介',
                status: status,
                updateTime: updateTime,
                latestChapter: lastChapter || '未知章节',
                category: category,
                wordCount: wordCount,
                tocUrl: tocUrl ? this.buildFullUrl(bookUrl, tocUrl) : ''
            };
            return {
                success: true,
                data: bookDetail,
                source: this.source.bookSourceName
            };
        }
        catch (error) {
            hilog.error(0x0000, TAG, `解析书籍详情失败: ${error}`);
            return {
                success: false,
                error: error.toString(),
                source: this.source.bookSourceName
            };
        }
    }
    /**
     * 构建搜索URL
     * @param searchUrl 搜索URL模板
     * @param keyword 搜索关键词
     * @returns 完整的搜索URL
     */
    private buildSearchUrl(searchUrl: string, keyword: string): string {
        // 对关键词进行URL编码
        const encodedKeyword = encodeURIComponent(keyword);
        // 替换URL模板中的占位符，支持多种格式
        return searchUrl
            .replace('${keyword}', encodedKeyword)
            .replace('{{key}}', encodedKeyword)
            .replace('{{keyword}}', encodedKeyword);
    }
    /**
     * 解析章节列表
     * @param tocUrl 目录页面URL
     * @returns Promise<ParseResult<ChapterInfo[]>> 解析结果
     */
    async parseChapterList(tocUrl: string): Promise<ParseResult<ChapterInfo[]>> {
        try {
            const html = await this.fetchHtml(tocUrl);
            const rule = this.source.ruleToc;
            if (!rule.chapterList) {
                throw new Error('书源缺少章节列表规则');
            }
            // 解析章节列表容器
            const chapterContainer = this.parseByRule(html, rule.chapterList, false) as string;
            const chapters: ChapterInfo[] = [];
            if (chapterContainer) {
                // 在容器中查找所有章节链接
                const chapterLinks = this.parseByRule(chapterContainer, rule.chapterUrl || 'a@href', true) as string[];
                const chapterNames = this.parseByRule(chapterContainer, rule.chapterName || 'a@text', true) as string[];
                for (let i = 0; i < Math.min(chapterLinks.length, chapterNames.length); i++) {
                    const chapterUrl = chapterLinks[i];
                    const chapterName = this.cleanHtmlTags(chapterNames[i]);
                    if (chapterName && chapterUrl && chapterUrl.includes('.html')) {
                        chapters.push({
                            title: chapterName,
                            url: this.buildFullUrl(tocUrl, chapterUrl),
                            index: i + 1
                        });
                    }
                }
            }
            // 按章节顺序排序
            chapters.sort((a, b) => {
                const aNum = this.extractChapterNumber(a.url);
                const bNum = this.extractChapterNumber(b.url);
                return aNum - bNum;
            });
            return {
                success: true,
                data: chapters,
                source: this.source.bookSourceName
            };
        }
        catch (error) {
            hilog.error(0x0000, TAG, `解析章节列表失败: ${error}`);
            return {
                success: false,
                error: error.toString(),
                source: this.source.bookSourceName
            };
        }
    }
    /**
     * 从URL中提取章节编号
     * @param url 章节URL
     * @returns 章节编号
     */
    private extractChapterNumber(url: string): number {
        const match = url.match(/\/(\d+)\.html$/);
        return match ? parseInt(match[1], 10) : 0;
    }
    /**
     * 解析章节内容
     * @param chapterUrl 章节URL
     * @returns Promise<ParseResult<string>> 解析结果
     */
    async parseChapterContent(chapterUrl: string): Promise<ParseResult<string>> {
        try {
            const html = await this.fetchHtml(chapterUrl);
            const rule = this.source.ruleContent;
            if (!rule.content) {
                throw new Error('书源缺少章节内容规则');
            }
            let content = this.parseByRule(html, rule.content, false) as string;
            content = this.cleanHtmlTags(content);
            // 应用替换规则
            if (rule.replaceRegex) {
                try {
                    const replaceRules = rule.replaceRegex.split('||');
                    for (const replaceRule of replaceRules) {
                        const ruleParts = replaceRule.split('##');
                        const pattern = ruleParts[0];
                        const replacement = ruleParts[1];
                        if (pattern) {
                            const regex = new RegExp(pattern, 'g');
                            content = content.replace(regex, replacement || '');
                        }
                    }
                }
                catch (error) {
                    hilog.warn(0x0000, TAG, `应用替换规则失败: ${error}`);
                }
            }
            return {
                success: true,
                data: content,
                source: this.source.bookSourceName
            };
        }
        catch (error) {
            hilog.error(0x0000, TAG, `解析章节内容失败: ${error}`);
            return {
                success: false,
                error: error.toString(),
                source: this.source.bookSourceName
            };
        }
    }
    /**
     * 搜索小说
     * @param keyword 搜索关键词
     * @returns Promise<ParseResult<NovelInfo[]>> 解析结果
     */
    async searchNovels(keyword: string): Promise<ParseResult<NovelInfo[]>> {
        try {
            if (!this.source.searchUrl) {
                throw new Error('书源缺少搜索URL');
            }
            // 构建搜索URL
            const searchUrl = this.source.searchUrl.replace('{{key}}', encodeURIComponent(keyword));
            const html = await this.fetchHtml(searchUrl);
            const rule = this.source.ruleSearch;
            if (!rule.bookList) {
                throw new Error('书源缺少搜索结果列表规则');
            }
            // 解析搜索结果
            const bookItems = this.parseByRule(html, rule.bookList, true) as string[];
            const novels: NovelInfo[] = [];
            for (const item of bookItems) {
                try {
                    const title = this.cleanHtmlTags(this.parseByRule(item, rule.name || '', false) as string);
                    const author = this.cleanHtmlTags(this.parseByRule(item, rule.author || '', false) as string);
                    const cover = this.parseByRule(item, rule.coverUrl || '', false) as string;
                    const description = this.cleanHtmlTags(this.parseByRule(item, rule.intro || '', false) as string);
                    const link = this.parseByRule(item, rule.bookUrl || '', false) as string;
                    const category = this.cleanHtmlTags(this.parseByRule(item, rule.kind || '', false) as string);
                    const lastChapter = this.cleanHtmlTags(this.parseByRule(item, rule.lastChapter || '', false) as string);
                    if (title) {
                        novels.push({
                            title: title,
                            author: author || '未知作者',
                            cover: cover ? this.buildFullUrl(searchUrl, cover) : '',
                            description: description || '暂无简介',
                            link: this.buildFullUrl(searchUrl, link),
                            category: category,
                            latestChapter: lastChapter
                        });
                    }
                }
                catch (error) {
                    hilog.warn(0x0000, TAG, `解析搜索结果项目失败: ${error}`);
                }
            }
            return {
                success: true,
                data: novels,
                source: this.source.bookSourceName
            };
        }
        catch (error) {
            hilog.error(0x0000, TAG, `搜索小说失败: ${error}`);
            return {
                success: false,
                error: error.toString(),
                source: this.source.bookSourceName
            };
        }
    }
}
