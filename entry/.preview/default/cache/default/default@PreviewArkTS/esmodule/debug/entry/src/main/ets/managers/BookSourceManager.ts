import hilog from "@ohos:hilog";
import preferences from "@ohos:data.preferences";
import type common from "@ohos:app.ability.common";
import util from "@ohos:util";
import { DEFAULT_CONFIG } from "@bundle:liubai.yuedu.hos/entry/ets/models/BookSourceModel";
import type { BookSourceInfo, NovelInfo, ChapterInfo, BookDetailInfo, ParseResult, BookSourceTestResult, BookSourceStats, BookSourceManagerConfig, ImportResult } from "@bundle:liubai.yuedu.hos/entry/ets/models/BookSourceModel";
import { BookSourceParser } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceParser";
const TAG: string = 'BookSourceManager';
const BOOK_SOURCES_KEY = 'book_sources';
const BOOK_SOURCE_STATS_KEY = 'book_source_stats';
const MANAGER_CONFIG_KEY = 'manager_config';
/**
 * 书源管理器类
 * 负责管理所有书源，提供统一的数据获取接口
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
     * 获取书源管理器实例
     * @returns BookSourceManager 单例实例
     */
    static getInstance(): BookSourceManager {
        if (!BookSourceManager.instance) {
            BookSourceManager.instance = new BookSourceManager();
        }
        return BookSourceManager.instance;
    }
    /**
     * 初始化书源管理器
     * @param context 应用上下文
     */
    async initialize(context: common.UIAbilityContext): Promise<void> {
        try {
            this.context = context;
            // 初始化数据存储
            this.dataPreferences = await preferences.getPreferences(context, 'book_source_data');
            // 加载配置
            await this.loadConfig();
            // 加载书源数据
            await this.loadBookSources();
            // 加载统计数据
            await this.loadStats();
            // 初始化默认书源
            await this.initializeDefaultSources();
            hilog.info(0x0000, TAG, `书源管理器初始化完成，共加载 ${this.bookSources.length} 个书源`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '书源管理器初始化失败: ' + JSON.stringify(error));
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
            hilog.error(0x0000, TAG, '加载书源数据失败: ' + error);
            this.bookSources = [];
            this.enabledSources = [];
        }
    }
    /**
     * 保存书源数据
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
            hilog.error(0x0000, TAG, '保存书源数据失败: ' + error);
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
     * 更新启用的书源列表
     */
    private updateEnabledSources(): void {
        this.enabledSources = this.bookSources.filter(source => source.enabled);
        hilog.info(0x0000, TAG, `更新启用书源列表，共 ${this.enabledSources.length} 个启用书源`);
    }
    /**
     * 初始化默认书源
     */
    private async initializeDefaultSources(): Promise<void> {
        try {
            // 先尝试从rawfile加载默认书源
            await this.loadDefaultSourcesFromFile();
            // 如果仍然没有书源，则添加内置默认书源
            if (this.bookSources.length === 0) {
                await this.addBuiltinDefaultSources();
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '初始化默认书源失败: ' + error);
            // 如果加载失败，添加内置默认书源
            await this.addBuiltinDefaultSources();
        }
    }
    /**
     * 从rawfile加载默认书源
     */
    private async loadDefaultSourcesFromFile(): Promise<void> {
        try {
            if (!this.context) {
                const errorMsg = 'Context未初始化';
                throw new Error(errorMsg);
            }
            const resourceManager = this.context.resourceManager;
            const rawFileData = await resourceManager.getRawFileContent('default_sources.json');
            const decoder = new util.TextDecoder('utf-8');
            const jsonStr = decoder.decode(rawFileData);
            const defaultSources: BookSourceInfo[] = JSON.parse(jsonStr);
            for (const source of defaultSources) {
                // 检查是否已存在同名书源
                const existingIndex = this.bookSources.findIndex(s => s.bookSourceName === source.bookSourceName);
                if (existingIndex < 0) {
                    source.lastUpdateTime = Date.now();
                    source.respondTime = 0;
                    this.bookSources.push(source);
                }
            }
            if (defaultSources.length > 0) {
                await this.saveBookSources();
                hilog.info(0x0000, TAG, `从文件加载了 ${defaultSources.length} 个默认书源`);
            }
        }
        catch (error) {
            const errorMsg = '从文件加载默认书源失败: ' + String(error);
            hilog.warn(0x0000, TAG, errorMsg);
            throw new Error(errorMsg);
        }
    }
    /**
     * 添加内置默认书源
     */
    private async addBuiltinDefaultSources(): Promise<void> {
        // 添加多个测试书源，提高成功率
        const defaultSources: BookSourceInfo[] = [
            {
                bookSourceName: '笔趣阁',
                bookSourceUrl: 'https://www.bqg128.com',
                bookSourceGroup: '默认',
                bookSourceComment: '系统默认书源，支持小说搜索和阅读',
                bookSourceType: 0,
                enabled: true,
                enabledCookieJar: true,
                enabledExplore: true,
                enabledReview: false,
                header: '',
                searchUrl: 'https://www.bqg128.com/s?q={{key}}',
                exploreUrl: 'https://www.bqg128.com',
                bookUrlPattern: '',
                weight: 100,
                customOrder: 1,
                lastUpdateTime: Date.now(),
                respondTime: 0,
                ruleSearch: {
                    bookList: 'div.item',
                    name: 'a@text',
                    author: 'span@text',
                    bookUrl: 'a@href',
                    coverUrl: 'img@src',
                    intro: 'dd@text',
                    lastChapter: '',
                    kind: ''
                },
                ruleExplore: {
                    bookList: '<div class="item">([\\s\\S]*?)<\\/dl><\\/div>',
                    name: '<a[^>]+href="[^"]*">([^<]+)<\\/a>',
                    author: '<span>([^<]+)<\\/span>',
                    bookUrl: '<a[^>]+href="([^"]+)"[^>]*>',
                    coverUrl: '<img[^>]+src="([^"]+)"[^>]*>',
                    intro: '<dd>([\\s\\S]*?)<\\/dd>'
                },
                ruleBookInfo: {
                    name: 'meta[property="og:title"]@content',
                    author: 'meta[property="og:novel:author"]@content',
                    coverUrl: 'meta[property="og:image"]@content',
                    intro: 'meta[property="og:description"]@content',
                    kind: 'meta[property="og:novel:category"]@content',
                    lastChapter: 'meta[property="og:novel:latest_chapter_name"]@content',
                    tocUrl: ''
                },
                ruleToc: {
                    chapterList: '<div class="listmain">([\\s\\S]*?)<\\/div>',
                    chapterName: 'a@text',
                    chapterUrl: 'a@href'
                },
                ruleContent: {
                    content: 'div#content@text',
                    replaceRegex: '笔趣阁##||www\\.bqg128\\.com##'
                },
                ruleReview: {}
            },
            {
                bookSourceName: '模拟书源',
                bookSourceUrl: 'https://example.com',
                bookSourceGroup: '测试',
                bookSourceComment: '模拟书源，用于测试和演示',
                bookSourceType: 0,
                enabled: true,
                enabledCookieJar: false,
                enabledExplore: true,
                enabledReview: false,
                header: '',
                searchUrl: 'https://example.com/search?q={{key}}',
                exploreUrl: 'https://example.com',
                bookUrlPattern: '',
                weight: 50,
                customOrder: 2,
                lastUpdateTime: Date.now(),
                respondTime: 0,
                ruleSearch: {
                    bookList: 'div.book-item',
                    name: 'h3@text',
                    author: 'span.author@text',
                    bookUrl: 'a@href',
                    coverUrl: 'img@src',
                    intro: 'p.intro@text',
                    lastChapter: '',
                    kind: ''
                },
                ruleExplore: {
                    bookList: '<div class="book-item">([\\s\\S]*?)<\\/div>',
                    name: '<h3>([^<]+)<\\/h3>',
                    author: '<span class="author">([^<]+)<\\/span>',
                    bookUrl: '<a[^>]+href="([^"]+)"[^>]*>',
                    coverUrl: '<img[^>]+src="([^"]+)"[^>]*>',
                    intro: '<p class="intro">([\\s\\S]*?)<\\/p>'
                },
                ruleBookInfo: {
                    name: 'h1@text',
                    author: 'span.author@text',
                    coverUrl: 'img.cover@src',
                    intro: 'div.intro@text',
                    kind: 'span.category@text',
                    lastChapter: 'span.latest@text',
                    tocUrl: ''
                },
                ruleToc: {
                    chapterList: '<div class="chapter-list">([\\s\\S]*?)<\\/div>',
                    chapterName: 'a@text',
                    chapterUrl: 'a@href'
                },
                ruleContent: {
                    content: 'div.content@text',
                    replaceRegex: ''
                },
                ruleReview: {}
            }
        ];
        for (const source of defaultSources) {
            try {
                // 检查是否已存在同名书源
                const existingIndex = this.bookSources.findIndex(s => s.bookSourceName === source.bookSourceName);
                if (existingIndex < 0) {
                    this.bookSources.push(source);
                }
            }
            catch (error) {
                hilog.warn(0x0000, TAG, `添加默认书源失败: ${source.bookSourceName}, 错误: ${error}`);
            }
        }
        if (this.bookSources.length > 0) {
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `添加了 ${this.bookSources.length} 个内置默认书源`);
        }
    }
    /**
     * 添加书源
     * @param source 书源信息
     */
    async addBookSource(source: BookSourceInfo): Promise<void> {
        try {
            // 检查是否已存在同名书源
            const existingIndex = this.bookSources.findIndex(s => s.bookSourceName === source.bookSourceName);
            if (existingIndex >= 0) {
                throw new Error(`书源 "${source.bookSourceName}" 已存在`);
            }
            source.lastUpdateTime = Date.now();
            this.bookSources.push(source);
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `添加书源成功: ${source.bookSourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `添加书源失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 更新书源
     * @param source 书源信息
     */
    async updateBookSource(source: BookSourceInfo): Promise<void> {
        try {
            const index = this.bookSources.findIndex(s => s.bookSourceName === source.bookSourceName);
            if (index < 0) {
                throw new Error(`书源 "${source.bookSourceName}" 不存在`);
            }
            source.lastUpdateTime = Date.now();
            this.bookSources[index] = source;
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `更新书源成功: ${source.bookSourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `更新书源失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 删除书源
     * @param sourceName 书源名称
     */
    async removeBookSource(sourceName: string): Promise<void> {
        try {
            const index = this.bookSources.findIndex(s => s.bookSourceName === sourceName);
            if (index < 0) {
                throw new Error(`书源 "${sourceName}" 不存在`);
            }
            this.bookSources.splice(index, 1);
            this.sourceStats.delete(sourceName);
            await this.saveBookSources();
            await this.saveStats();
            hilog.info(0x0000, TAG, `删除书源成功: ${sourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `删除书源失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 启用/禁用书源
     * @param sourceName 书源名称
     * @param enabled 是否启用
     */
    async toggleBookSource(sourceName: string, enabled: boolean): Promise<void> {
        try {
            const source = this.bookSources.find(s => s.bookSourceName === sourceName);
            if (!source) {
                throw new Error(`书源 "${sourceName}" 不存在`);
            }
            source.enabled = enabled;
            await this.saveBookSources();
            hilog.info(0x0000, TAG, `${enabled ? '启用' : '禁用'}书源成功: ${sourceName}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `切换书源状态失败: ${error}`);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(String(error));
            }
        }
    }
    /**
     * 获取所有书源
     * @returns 书源列表
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
     * 根据名称获取书源
     * @param sourceName 书源名称
     * @returns 书源信息或null
     */
    getBookSourceByName(sourceName: string): BookSourceInfo | null {
        return this.bookSources.find(s => s.bookSourceName === sourceName) || null;
    }
    /**
     * 批量导入书源
     * @param sources 书源列表
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
     * 导出书源
     * @param sourceNames 要导出的书源名称列表，为空则导出所有
     * @returns 书源数据
     */
    exportBookSources(sourceNames?: string[]): BookSourceInfo[] {
        if (sourceNames && sourceNames.length > 0) {
            return this.bookSources.filter(s => sourceNames.includes(s.bookSourceName));
        }
        return this.bookSources.slice();
    }
    /**
     * 更新统计信息
     * @param sourceName 书源名称
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
            hilog.warn(0x0000, TAG, '没有可用的书源，返回模拟数据');
            return this.getMockRecommendNovels();
        }
        for (const source of this.enabledSources) {
            try {
                const startTime = Date.now();
                const parser = new BookSourceParser(source);
                const result = await parser.parseRecommendNovels();
                const responseTime = Date.now() - startTime;
                this.updateStats(source.bookSourceName, result.success, responseTime);
                if (result.success && result.data && result.data.length > 0) {
                    hilog.info(0x0000, TAG, `成功从书源 ${source.bookSourceName} 获取 ${result.data.length} 本推荐小说`);
                    return result;
                }
            }
            catch (error) {
                hilog.warn(0x0000, TAG, `书源 ${source.bookSourceName} 获取推荐失败: ${error}`);
                this.updateStats(source.bookSourceName, false, 0);
            }
        }
        hilog.warn(0x0000, TAG, '所有书源都无法获取推荐小说，返回模拟数据');
        return this.getMockRecommendNovels();
    }
    /**
     * 获取模拟推荐小说数据
     * @returns Promise<ParseResult<NovelInfo[]>> 模拟数据结果
     */
    private getMockRecommendNovels(): ParseResult<NovelInfo[]> {
        const mockNovels: NovelInfo[] = [
            {
                title: '斗破苍穹',
                author: '天蚕土豆',
                cover: 'https://img3.doubanio.com/view/subject/l/public/s29103835.jpg',
                description: '这里是斗气大陆，没有花俏的魔法，有的，仅仅是繁衍到巅峰的斗气！',
                link: '/book/1',
                category: '玄幻',
                latestChapter: '第1648章 大结局',
                hotValue: '999万热度'
            },
            {
                title: '武动乾坤',
                author: '天蚕土豆',
                cover: 'https://img1.doubanio.com/view/subject/l/public/s28340031.jpg',
                description: '炼体之路，乃夺天地之造化，吞日月之精华，掌生死之轮回，握阴阳之造化。',
                link: '/book/2',
                category: '玄幻',
                latestChapter: '第1343章 大结局',
                hotValue: '888万热度'
            },
            {
                title: '完美世界',
                author: '辰东',
                cover: 'https://img9.doubanio.com/view/subject/l/public/s29474804.jpg',
                description: '一粒尘可填海，一根草斩尽日月星辰，弹指间天翻地覆。',
                link: '/book/3',
                category: '玄幻',
                latestChapter: '第1677章 新的开始',
                hotValue: '777万热度'
            },
            {
                title: '遮天',
                author: '辰东',
                cover: 'https://img3.doubanio.com/view/subject/l/public/s29474805.jpg',
                description: '冰冷与黑暗并存的宇宙深处，九具庞大的龙尸拉着一口青铜古棺，亘古长存。',
                link: '/book/4',
                category: '玄幻',
                latestChapter: '第1675章 叶凡归来',
                hotValue: '666万热度'
            },
            {
                title: '凡人修仙传',
                author: '忘语',
                cover: 'https://img1.doubanio.com/view/subject/l/public/s29474806.jpg',
                description: '一个普通山村小子，偶然之下，跨入到一个江湖小门派，虽然资质平庸，但依靠自身努力和合理算计最后修炼成仙的故事。',
                link: '/book/5',
                category: '仙侠',
                latestChapter: '第2408章 飞升',
                hotValue: '555万热度'
            },
            {
                title: '诛仙',
                author: '萧鼎',
                cover: 'https://img9.doubanio.com/view/subject/l/public/s29474807.jpg',
                description: '天地不仁，以万物为刍狗。',
                link: '/book/6',
                category: '仙侠',
                latestChapter: '第452章 大结局',
                hotValue: '444万热度'
            },
            {
                title: '全职高手',
                author: '蝴蝶蓝',
                cover: 'https://img3.doubanio.com/view/subject/l/public/s29474808.jpg',
                description: '网游荣耀中被誉为教科书级别的顶尖高手，因为种种原因遭到俱乐部的驱逐，离开职业圈的他寄身于一家网吧成了一个小小的网管。',
                link: '/book/7',
                category: '都市',
                latestChapter: '第1728章 荣耀永恒',
                hotValue: '333万热度'
            },
            {
                title: '择天记',
                author: '猫腻',
                cover: 'https://img1.doubanio.com/view/subject/l/public/s29474809.jpg',
                description: '太始元年，有神石自太空飞来，分散落在人间，其中落在东土大陆的神石，上面镌刻着奇怪的图腾，人因观其图腾而悟道。',
                link: '/book/8',
                category: '玄幻',
                latestChapter: '第1336章 终章',
                hotValue: '222万热度'
            }
        ];
        hilog.info(0x0000, TAG, `返回 ${mockNovels.length} 本模拟推荐小说`);
        return {
            success: true,
            data: mockNovels,
            source: '模拟数据'
        };
    }
    /**
     * 获取书籍详情（使用第一个可用的书源）
     * @param bookUrl 书籍URL
     * @returns Promise<ParseResult<BookDetailInfo>> 解析结果
     */
    async getBookDetail(bookUrl: string): Promise<ParseResult<BookDetailInfo>> {
        // 检查是否是模拟数据的链接
        if (bookUrl.startsWith('/book/') || bookUrl.includes('example.com')) {
            return this.getMockBookDetail(bookUrl);
        }
        // 根据URL判断使用哪个书源
        const source = this.findSourceByUrl(bookUrl);
        if (!source) {
            return {
                success: false,
                error: '找不到匹配的书源'
            };
        }
        try {
            const startTime = Date.now();
            const parser = new BookSourceParser(source);
            const result = await parser.parseBookDetail(bookUrl);
            const responseTime = Date.now() - startTime;
            this.updateStats(source.bookSourceName, result.success, responseTime);
            // 如果解析失败，尝试返回模拟数据
            if (!result.success) {
                hilog.warn(0x0000, TAG, '真实书源解析失败，尝试返回模拟数据');
                return this.getMockBookDetail(bookUrl);
            }
            return result;
        }
        catch (error) {
            this.updateStats(source.bookSourceName, false, 0);
            hilog.warn(0x0000, TAG, '书源解析出错，返回模拟数据: ' + error);
            return this.getMockBookDetail(bookUrl);
        }
    }
    /**
     * 获取模拟书籍详情数据
     * @param bookUrl 书籍URL
     * @returns ParseResult<BookDetailInfo> 模拟数据结果
     */
    private getMockBookDetail(bookUrl: string): ParseResult<BookDetailInfo> {
        // 根据URL提取书籍ID
        const bookIdMatch = bookUrl.match(/\/book\/(\d+)/);
        const bookId = bookIdMatch ? parseInt(bookIdMatch[1], 10) : 1;
        // 模拟书籍详情数据
        const mockBookDetails: Record<number, BookDetailInfo> = {
            1: {
                title: '斗破苍穹',
                author: '天蚕土豆',
                cover: 'https://img3.doubanio.com/view/subject/l/public/s29103835.jpg',
                description: '这里是斗气大陆，没有花俏的魔法，有的，仅仅是繁衍到巅峰的斗气！在这个世界，修炼斗气，是最为寻常的事情。萧炎，主人公，萧家历史上空前绝后的斗气修炼天才。4岁就开始修炼斗气，10岁拥有了九段斗气，11岁突破十段斗气，一跃成为家族百年来最年轻的斗者。然而在12岁那年，他却"丧失"了修炼能力，只拥有三段斗气。整整三年时间，家族冷遇，旁人轻视，被未婚妻退婚……种种打击接踵而至。就在他即将绝望的时候，一缕灵魂从他手上的戒指里浮现，而这一刻，也就是传奇的开始……',
                status: '已完结',
                updateTime: '2024-12-15',
                latestChapter: '第1648章 大结局',
                category: '玄幻',
                wordCount: '530万字',
                tocUrl: bookUrl + '/chapters'
            },
            2: {
                title: '武动乾坤',
                author: '天蚕土豆',
                cover: 'https://img1.doubanio.com/view/subject/l/public/s28340031.jpg',
                description: '炼体之路，乃夺天地之造化，吞日月之精华，掌生死之轮回，握阴阳之造化。武动乾坤，是天蚕土豆继斗破苍穹之后的第二部小说，首发于起点中文网。小说讲述了大炎王朝天都郡炎城青阳镇，林家少主林动的成长历程。',
                status: '已完结',
                updateTime: '2024-11-20',
                latestChapter: '第1343章 大结局',
                category: '玄幻',
                wordCount: '480万字',
                tocUrl: bookUrl + '/chapters'
            },
            3: {
                title: '完美世界',
                author: '辰东',
                cover: 'https://img9.doubanio.com/view/subject/l/public/s29474804.jpg',
                description: '一粒尘可填海，一根草斩尽日月星辰，弹指间天翻地覆。群雄并起，万族林立，诸圣争霸，乱天动地。问苍茫大地，谁主沉浮？一个少年从大荒中走出，一切将从这里改变……',
                status: '已完结',
                updateTime: '2024-10-30',
                latestChapter: '第1677章 新的开始',
                category: '玄幻',
                wordCount: '690万字',
                tocUrl: bookUrl + '/chapters'
            },
            4: {
                title: '遮天',
                author: '辰东',
                cover: 'https://img3.doubanio.com/view/subject/l/public/s29474805.jpg',
                description: '冰冷与黑暗并存的宇宙深处，九具庞大的龙尸拉着一口青铜古棺，亘古长存。这是太空探测器在枯寂的宇宙中捕捉到的一幅极其震撼的画面。九龙拉棺，究竟是回到了上古，还是来到了星空的彼岸？',
                status: '已完结',
                updateTime: '2024-09-15',
                latestChapter: '第1675章 叶凡归来',
                category: '玄幻',
                wordCount: '620万字',
                tocUrl: bookUrl + '/chapters'
            },
            5: {
                title: '凡人修仙传',
                author: '忘语',
                cover: 'https://img1.doubanio.com/view/subject/l/public/s29474806.jpg',
                description: '一个普通山村小子，偶然之下，跨入到一个江湖小门派，虽然资质平庸，但依靠自身努力和合理算计最后修炼成仙的故事。',
                status: '已完结',
                updateTime: '2024-08-25',
                latestChapter: '第2408章 飞升',
                category: '仙侠',
                wordCount: '780万字',
                tocUrl: bookUrl + '/chapters'
            },
            6: {
                title: '诛仙',
                author: '萧鼎',
                cover: 'https://img9.doubanio.com/view/subject/l/public/s29474807.jpg',
                description: '天地不仁，以万物为刍狗。悠悠青云志，浩浩正气歌。这是一个平凡少年的成仙之路，也是一段荡气回肠的爱恨情仇。',
                status: '已完结',
                updateTime: '2024-07-10',
                latestChapter: '第452章 大结局',
                category: '仙侠',
                wordCount: '158万字',
                tocUrl: bookUrl + '/chapters'
            },
            7: {
                title: '全职高手',
                author: '蝴蝶蓝',
                cover: 'https://img3.doubanio.com/view/subject/l/public/s29474808.jpg',
                description: '网游荣耀中被誉为教科书级别的顶尖高手，因为种种原因遭到俱乐部的驱逐，离开职业圈的他寄身于一家网吧成了一个小小的网管。但是，拥有十年游戏经验的他，在荣耀新开的第十区重新投入了游戏，带着对往昔的回忆，和一把未完成的自制武器，开始了重新的征程。',
                status: '已完结',
                updateTime: '2024-06-20',
                latestChapter: '第1728章 荣耀永恒',
                category: '都市',
                wordCount: '530万字',
                tocUrl: bookUrl + '/chapters'
            },
            8: {
                title: '择天记',
                author: '猫腻',
                cover: 'https://img1.doubanio.com/view/subject/l/public/s29474809.jpg',
                description: '太始元年，有神石自太空飞来，分散落在人间，其中落在东土大陆的神石，上面镌刻着奇怪的图腾，人因观其图腾而悟道。数千年后，十四岁的少年陈长生离开自己的师父，带着一纸婚书来到神都，从而开始了一个逆天改命的传奇故事。',
                status: '已完结',
                updateTime: '2024-05-15',
                latestChapter: '第1336章 终章',
                category: '玄幻',
                wordCount: '450万字',
                tocUrl: bookUrl + '/chapters'
            }
        };
        const bookDetail = mockBookDetails[bookId] || mockBookDetails[1];
        hilog.info(0x0000, TAG, `返回模拟书籍详情: ${bookDetail.title}`);
        return {
            success: true,
            data: bookDetail,
            source: '模拟数据'
        };
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
                error: '找不到匹配的书源'
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
                hilog.warn(0x0000, TAG, `书源 ${source.bookSourceName} 搜索失败: ${error}`);
                this.updateStats(source.bookSourceName, false, 0);
            }
        }
        return {
            success: hasSuccess,
            data: results,
            error: hasSuccess ? undefined : '所有书源搜索都失败了'
        };
    }
    /**
     * 根据URL查找匹配的书源
     * @param url URL地址
     * @returns 匹配的书源或null
     */
    private findSourceByUrl(url: string): BookSourceInfo | null {
        for (const source of this.enabledSources) {
            if (url.includes(source.bookSourceUrl.replace(/^https?:\/\//, ''))) {
                return source;
            }
        }
        return this.enabledSources[0] || null; // 返回第一个启用的书源作为默认
    }
    /**
     * 测试书源
     * @param sourceName 书源名称
     * @returns Promise<BookSourceTestResult> 测试结果
     */
    async testBookSource(sourceName: string): Promise<BookSourceTestResult> {
        const source = this.getBookSourceByName(sourceName);
        if (!source) {
            return {
                sourceName: sourceName,
                success: false,
                responseTime: 0,
                error: '书源不存在',
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
     * 获取书源统计信息
     * @param sourceName 书源名称
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
 * 导出全局书源管理器实例
 */
export const bookSourceManager = BookSourceManager.getInstance();
