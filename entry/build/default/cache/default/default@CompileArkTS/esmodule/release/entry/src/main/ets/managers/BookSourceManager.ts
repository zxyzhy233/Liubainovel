import hilog from "@ohos:hilog";
import preferences from "@ohos:data.preferences";
import type common from "@ohos:app.ability.common";
import { DEFAULT_CONFIG } from "@bundle:liubai.yuedu.hos/entry/ets/models/BookSourceModel";
import type { BookSourceInfo, NovelInfo, ChapterInfo, BookDetailInfo, ParseResult, BookSourceTestResult, BookSourceStats, BookSourceManagerConfig, ImportResult } from "@bundle:liubai.yuedu.hos/entry/ets/models/BookSourceModel";
import { BookSourceParser } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceParser";
const TAG: string = 'BookSourceManager';
const BOOK_SOURCES_KEY = 'book_sources';
const BOOK_SOURCE_STATS_KEY = 'book_source_stats';
const MANAGER_CONFIG_KEY = 'manager_config';
/**
 * 鹿析管理器类
 * 负责管理所有鹿析，提供统一的数据获取接口
 */
export class BookSourceManager {
    private static instance: BookSourceManager | null = null;
    private bookSources: BookSourceInfo[] = [];
    private enabledSources: BookSourceInfo[] = [];
    private sourceStats: Map<string, BookSourceStats> = new Map();
    private config: BookSourceManagerConfig = DEFAULT_CONFIG;
    private context: common.UIAbilityContext | null = null;
    private dataPreferences: preferences.Preferences | null = null;
    /**
     * 私有构造函数，实现单例模式
     */
    private constructor() { }
    /**
     * 获取鹿析管理器实例
     * @returns BookSourceManager 单例实例
     */
    static getInstance(): BookSourceManager {
        if (!BookSourceManager.instance) {
            BookSourceManager.instance = new BookSourceManager();
        }
        return BookSourceManager.instance;
    }
    /**
     * 初始化鹿析管理器
     * @param context 应用上下文
     */
    async initialize(context: common.UIAbilityContext): Promise<void> {
        try {
            this.context = context;
            // 初始化数据存储
            this.dataPreferences = await preferences.getPreferences(context, 'book_source_data');
            // 加载配置
            await this.loadConfig();
            // 加载鹿析数据
            await this.loadBookSources();
            // 加载统计数据
            await this.loadStats();
            hilog.info(0x0000, TAG, `鹿析管理器初始化完成，共加载 ${this.bookSources.length} 个书源`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '鹿析管理器初始化失败: ' + JSON.stringify(error));
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 加载配置
     */
    private async loadConfig(): Promise<void> {
        try {
            if (this.dataPreferences) {
                const configStr = await this.dataPreferences.get(MANAGER_CONFIG_KEY, '');
                if (configStr) {
                    const parsedConfig: Record<string, boolean | number> = JSON.parse(configStr as string);
                    this.config = {
                        enableStats: typeof parsedConfig.enableStats === 'boolean' ? parsedConfig.enableStats : DEFAULT_CONFIG.enableStats,
                        maxConcurrentRequests: typeof parsedConfig.maxConcurrentRequests === 'number' ? parsedConfig.maxConcurrentRequests : DEFAULT_CONFIG.maxConcurrentRequests,
                        requestTimeout: typeof parsedConfig.requestTimeout === 'number' ? parsedConfig.requestTimeout : DEFAULT_CONFIG.requestTimeout,
                        retryCount: typeof parsedConfig.retryCount === 'number' ? parsedConfig.retryCount : DEFAULT_CONFIG.retryCount,
                        cacheEnabled: typeof parsedConfig.cacheEnabled === 'boolean' ? parsedConfig.cacheEnabled : DEFAULT_CONFIG.cacheEnabled,
                        cacheDuration: typeof parsedConfig.cacheDuration === 'number' ? parsedConfig.cacheDuration : DEFAULT_CONFIG.cacheDuration
                    };
                }
            }
        }
        catch (error) {
            hilog.warn(0x0000, TAG, '加载配置失败，使用默认配置: ' + error);
            this.config = DEFAULT_CONFIG;
        }
    }
    /**
     * 保存配置
     */
    private async saveConfig(): Promise<void> {
        try {
            if (this.dataPreferences) {
                await this.dataPreferences.put(MANAGER_CONFIG_KEY, JSON.stringify(this.config));
                await this.dataPreferences.flush();
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '保存配置失败: ' + error);
        }
    }
    /**
     * 加载书源数据
     */
    private async loadBookSources(): Promise<void> {
        try {
            if (this.dataPreferences) {
                const sourcesStr = await this.dataPreferences.get(BOOK_SOURCES_KEY, '');
                if (sourcesStr) {
                    this.bookSources = JSON.parse(sourcesStr as string);
                    this.updateEnabledSources();
                }
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载鹿析数据失败: ' + error);
            this.bookSources = [];
            this.enabledSources = [];
        }
    }
    /**
     * 保存鹿析数据
     */
    private async saveBookSources(): Promise<void> {
        try {
            if (this.dataPreferences) {
                await this.dataPreferences.put(BOOK_SOURCES_KEY, JSON.stringify(this.bookSources));
                await this.dataPreferences.flush();
                this.updateEnabledSources();
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '保存鹿析数据失败: ' + error);
        }
    }
    /**
     * 加载统计数据
     */
    private async loadStats(): Promise<void> {
        try {
            if (this.dataPreferences) {
                const statsStr = await this.dataPreferences.get(BOOK_SOURCE_STATS_KEY, '');
                if (statsStr) {
                    const statsArray: BookSourceStats[] = JSON.parse(statsStr as string);
                    this.sourceStats.clear();
                    statsArray.forEach(stat => {
                        this.sourceStats.set(stat.sourceName, stat);
                    });
                }
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载统计数据失败: ' + error);
            this.sourceStats.clear();
        }
    }
    /**
     * 保存统计数据
     */
    private async saveStats(): Promise<void> {
        try {
            if (this.dataPreferences && this.config.enableStats) {
                const statsArray = Array.from(this.sourceStats.values());
                await this.dataPreferences.put(BOOK_SOURCE_STATS_KEY, JSON.stringify(statsArray));
                await this.dataPreferences.flush();
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '保存统计数据失败: ' + error);
        }
    }
    /**
     * 更新启用的鹿析列表
     */
    private updateEnabledSources(): void {
        this.enabledSources = this.bookSources.filter(source => source.enabled);
        hilog.info(0x0000, TAG, `更新启用鹿析列表，共 ${this.enabledSources.length} 个启用书源`);
    }
    /**
     * 添加鹿析
     * @param source 鹿析信息
     */
    async addBookSource(source: BookSourceInfo): Promise<void> {
        try {
            // 检查是否已存在同名鹿析
            const existingIndex = this.bookSources.findIndex(s => s.bookSourceName === source.bookSourceName);
            if (existingIndex >= 0) {
                throw new Error(`鹿析 "${source.bookSourceName}" 已存在`);
            }
            source.lastUpdateTime = Date.now();
            this.bookSources.push(source);
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `添加鹿析成功: ${source.bookSourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `添加鹿析失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 更新鹿析
     * @param source 鹿析信息
     */
    async updateBookSource(source: BookSourceInfo): Promise<void> {
        try {
            const index = this.bookSources.findIndex(s => s.bookSourceName === source.bookSourceName);
            if (index < 0) {
                throw new Error(`鹿析 "${source.bookSourceName}" 不存在`);
            }
            source.lastUpdateTime = Date.now();
            this.bookSources[index] = source;
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `更新鹿析成功: ${source.bookSourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `更新鹿析失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 删除鹿析
     * @param sourceName 鹿析名称
     */
    async removeBookSource(sourceName: string): Promise<void> {
        try {
            const index = this.bookSources.findIndex(s => s.bookSourceName === sourceName);
            if (index < 0) {
                throw new Error(`鹿析 "${sourceName}" 不存在`);
            }
            this.bookSources.splice(index, 1);
            this.sourceStats.delete(sourceName);
            await this.saveBookSources();
            await this.saveStats();
            hilog.info(0x0000, TAG, `删除鹿析成功: ${sourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `删除鹿析失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 启用/禁用鹿析
     * @param sourceName 鹿析名称
     * @param enabled 是否启用
     */
    async toggleBookSource(sourceName: string, enabled: boolean): Promise<void> {
        try {
            const source = this.bookSources.find(s => s.bookSourceName === sourceName);
            if (!source) {
                throw new Error(`鹿析 "${sourceName}" 不存在`);
            }
            source.enabled = enabled;
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `${enabled ? '启用' : '禁用'}鹿析成功: ${sourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `切换鹿析状态失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 获取所有鹿析
     * @returns 鹿析列表
     */
    getAllBookSources(): BookSourceInfo[] {
        return this.bookSources.slice();
    }
    /**
     * 获取启用的书源
     * @returns 启用的书源列表
     */
    getEnabledBookSources(): BookSourceInfo[] {
        return this.enabledSources.slice();
    }
    /**
     * 根据名称获取鹿析
     * @param sourceName 鹿析名称
     * @returns 鹿析信息或null
     */
    getBookSourceByName(sourceName: string): BookSourceInfo | null {
        return this.bookSources.find(s => s.bookSourceName === sourceName) || null;
    }
    /**
     * 批量导入鹿析
     * @param sources 鹿析列表
     * @returns 导入结果
     */
    async importBookSources(sources: BookSourceInfo[]): Promise<ImportResult> {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];
        for (const source of sources) {
            try {
                await this.addBookSource(source);
                success++;
            }
            catch (error) {
                failed++;
                errors.push(`${source.bookSourceName}: ${error}`);
            }
        }
        hilog.info(0x0000, TAG, `批量导入完成，成功: ${success}, 失败: ${failed}`);
        const result: ImportResult = {
            success: success,
            failed: failed,
            errors: errors
        };
        return result;
    }
    /**
     * 导出鹿析
     * @param sourceNames 要导出的鹿析名称列表，为空则导出所有
     * @returns 鹿析数据
     */
    exportBookSources(sourceNames?: string[]): BookSourceInfo[] {
        if (sourceNames && sourceNames.length > 0) {
            return this.bookSources.filter(s => sourceNames.includes(s.bookSourceName));
        }
        return this.bookSources.slice();
    }
    /**
     * 更新统计信息
     * @param sourceName 鹿析名称
     * @param success 是否成功
     * @param responseTime 响应时间
     */
    private updateStats(sourceName: string, success: boolean, responseTime: number): void {
        if (!this.config.enableStats)
            return;
        let stats = this.sourceStats.get(sourceName);
        if (!stats) {
            stats = {
                sourceName: sourceName,
                totalRequests: 0,
                successRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                lastUsedTime: 0,
                successRate: 0
            };
            this.sourceStats.set(sourceName, stats);
        }
        stats.totalRequests++;
        stats.lastUsedTime = Date.now();
        if (success) {
            stats.successRequests++;
        }
        else {
            stats.failedRequests++;
        }
        // 更新平均响应时间
        stats.averageResponseTime = (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests;
        // 更新成功率
        stats.successRate = stats.successRequests / stats.totalRequests;
        // 异步保存统计数据
        this.saveStats();
    }
    /**
     * 获取推荐小说（使用第一个可用的书源）
     * @returns Promise<ParseResult<NovelInfo[]>> 解析结果
     */
    async getRecommendNovels(): Promise<ParseResult<NovelInfo[]>> {
        if (this.enabledSources.length === 0) {
            hilog.warn(0x0000, TAG, '没有可用的鹿析');
            return {
                success: false,
                error: '没有可用的鹿析，请先添加并启用鹿析'
            };
        }
        for (const source of this.enabledSources) {
            try {
                const startTime = Date.now();
                const parser = new BookSourceParser(source);
                const result = await parser.parseRecommendNovels();
                const responseTime = Date.now() - startTime;
                this.updateStats(source.bookSourceName, result.success, responseTime);
                if (result.success && result.data && result.data.length > 0) {
                    hilog.info(0x0000, TAG, `成功从鹿析 ${source.bookSourceName} 获取 ${result.data.length} 本推荐小说`);
                    return result;
                }
            }
            catch (error) {
                hilog.warn(0x0000, TAG, `鹿析 ${source.bookSourceName} 获取推荐失败: ${error}`);
                this.updateStats(source.bookSourceName, false, 0);
            }
        }
        hilog.warn(0x0000, TAG, '所有鹿析都无法获取推荐小说');
        return {
            success: false,
            error: '所有鹿析都无法获取推荐小说，请检查鹿析配置或网络连接'
        };
    }
    /**
     * 获取书籍详情（使用第一个可用的鹿析）
     * @param bookUrl 书籍URL
     * @returns Promise<ParseResult<BookDetailInfo>> 解析结果
     */
    async getBookDetail(bookUrl: string): Promise<ParseResult<BookDetailInfo>> {
        // 根据URL判断使用哪个鹿析
        const source = this.findSourceByUrl(bookUrl);
        if (!source) {
            return {
                success: false,
                error: '找不到匹配的鹿析'
            };
        }
        try {
            const startTime = Date.now();
            const parser = new BookSourceParser(source);
            const result = await parser.parseBookDetail(bookUrl);
            const responseTime = Date.now() - startTime;
            this.updateStats(source.bookSourceName, result.success, responseTime);
            return result;
        }
        catch (error) {
            this.updateStats(source.bookSourceName, false, 0);
            return {
                success: false,
                error: error.toString(),
                source: source.bookSourceName
            };
        }
    }
    /**
     * 获取章节列表
     * @param tocUrl 目录URL
     * @returns Promise<ParseResult<ChapterInfo[]>> 解析结果
     */
    async getChapterList(tocUrl: string): Promise<ParseResult<ChapterInfo[]>> {
        const source = this.findSourceByUrl(tocUrl);
        if (!source) {
            return {
                success: false,
                error: '找不到匹配的鹿析'
            };
        }
        try {
            const startTime = Date.now();
            const parser = new BookSourceParser(source);
            const result = await parser.parseChapterList(tocUrl);
            const responseTime = Date.now() - startTime;
            this.updateStats(source.bookSourceName, result.success, responseTime);
            return result;
        }
        catch (error) {
            this.updateStats(source.bookSourceName, false, 0);
            return {
                success: false,
                error: error.toString(),
                source: source.bookSourceName
            };
        }
    }
    /**
     * 获取章节内容
     * @param chapterUrl 章节URL
     * @returns Promise<ParseResult<string>> 解析结果
     */
    async getChapterContent(chapterUrl: string): Promise<ParseResult<string>> {
        const source = this.findSourceByUrl(chapterUrl);
        if (!source) {
            return {
                success: false,
                error: '找不到匹配的鹿析'
            };
        }
        try {
            const startTime = Date.now();
            const parser = new BookSourceParser(source);
            const result = await parser.parseChapterContent(chapterUrl);
            const responseTime = Date.now() - startTime;
            this.updateStats(source.bookSourceName, result.success, responseTime);
            return result;
        }
        catch (error) {
            this.updateStats(source.bookSourceName, false, 0);
            return {
                success: false,
                error: error.toString(),
                source: source.bookSourceName
            };
        }
    }
    /**
     * 搜索小说
     * @param keyword 搜索关键词
     * @returns Promise<ParseResult<NovelInfo[]>> 解析结果
     */
    async searchNovels(keyword: string): Promise<ParseResult<NovelInfo[]>> {
        const results: NovelInfo[] = [];
        let hasSuccess = false;
        for (const source of this.enabledSources) {
            if (!source.searchUrl)
                continue;
            try {
                const startTime = Date.now();
                const parser = new BookSourceParser(source);
                const result = await parser.searchNovels(keyword);
                const responseTime = Date.now() - startTime;
                this.updateStats(source.bookSourceName, result.success, responseTime);
                if (result.success && result.data) {
                    results.push(...result.data);
                    hasSuccess = true;
                }
            }
            catch (error) {
                hilog.warn(0x0000, TAG, `鹿析 ${source.bookSourceName} 搜索失败: ${error}`);
                this.updateStats(source.bookSourceName, false, 0);
            }
        }
        return {
            success: hasSuccess,
            data: results,
            error: hasSuccess ? undefined : '所有鹿析搜索都失败了'
        };
    }
    /**
     * 根据URL查找匹配的鹿析
     * @param url URL地址
     * @returns 匹配的鹿析或null
     */
    private findSourceByUrl(url: string): BookSourceInfo | null {
        for (const source of this.enabledSources) {
            if (url.includes(source.bookSourceUrl.replace(/^https?:\/\//, ''))) {
                return source;
            }
        }
        return this.enabledSources[0] || null; // 返回第一个启用的鹿析作为默认
    }
    /**
     * 测试鹿析
     * @param sourceName 鹿析名称
     * @returns Promise<BookSourceTestResult> 测试结果
     */
    async testBookSource(sourceName: string): Promise<BookSourceTestResult> {
        const source = this.getBookSourceByName(sourceName);
        if (!source) {
            return {
                sourceName: sourceName,
                success: false,
                responseTime: 0,
                error: '鹿析不存在',
                testType: 'search'
            };
        }
        try {
            const startTime = Date.now();
            const parser = new BookSourceParser(source);
            // 测试推荐功能
            const result = await parser.parseRecommendNovels();
            const responseTime = Date.now() - startTime;
            return {
                sourceName: sourceName,
                success: result.success,
                responseTime: responseTime,
                error: result.error,
                testType: 'explore',
                testData: result.data
            };
        }
        catch (error) {
            return {
                sourceName: sourceName,
                success: false,
                responseTime: 0,
                error: error.toString(),
                testType: 'explore'
            };
        }
    }
    /**
     * 获取鹿析统计信息
     * @param sourceName 鹿析名称
     * @returns 统计信息或null
     */
    getSourceStats(sourceName: string): BookSourceStats | null {
        return this.sourceStats.get(sourceName) || null;
    }
    /**
     * 获取所有统计信息
     * @returns 统计信息列表
     */
    getAllStats(): BookSourceStats[] {
        return Array.from(this.sourceStats.values());
    }
}
/**
 * 导出全局鹿析管理器实例
 */
export const bookSourceManager = BookSourceManager.getInstance();
