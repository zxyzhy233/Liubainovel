if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
import hilog from "@ohos:hilog";
import router from "@ohos:router";
import picker from "@ohos:file.picker";
import type common from "@ohos:app.ability.common";
import fileIo from "@ohos:file.fs";
import util from "@ohos:util";
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
import type { BookSourceInfo as BookSourceInfoModel } from '../models/BookSourceModel';
const TAG: string = 'BookSourcePage';
/**
 * 书源规则接口
 */
interface BookSourceRule {
    author?: string;
    bookList?: string;
    bookUrl?: string;
    coverUrl?: string;
    intro?: string;
    kind?: string;
    lastChapter?: string;
    name?: string;
    wordCount?: string;
    checkKeyWord?: string;
    chapterList?: string;
    chapterName?: string;
    chapterUrl?: string;
    nextTocUrl?: string;
    content?: string;
    nextContentUrl?: string;
    replaceRegex?: string;
    tocUrl?: string;
    init?: string;
}
/**
 * 书源信息接口
 */
interface BookSource {
    id: number;
    name: string;
    url: string;
    enabled: boolean;
    description: string;
    lastUpdate: string;
    group?: string;
    comment?: string;
    type?: number;
    enabledCookieJar?: boolean;
    enabledExplore?: boolean;
    enabledReview?: boolean;
    header?: string;
    searchUrl?: string;
    exploreUrl?: string;
    bookUrlPattern?: string;
    weight?: number;
    customOrder?: number;
    // 添加规则字段
    ruleSearch?: BookSourceRule;
    ruleExplore?: BookSourceRule;
    ruleBookInfo?: BookSourceRule;
    ruleToc?: BookSourceRule;
    ruleContent?: BookSourceRule;
    ruleReview?: BookSourceRule;
}
/**
 * 完整书源信息接口（与编辑页面保持一致）
 */
interface BookSourceInfo {
    bookSourceName: string;
    bookSourceUrl: string;
    bookSourceGroup: string;
    bookSourceComment: string;
    bookSourceType: number;
    enabled: boolean;
    enabledCookieJar: boolean;
    enabledExplore: boolean;
    enabledReview: boolean;
    header: string;
    searchUrl: string;
    exploreUrl: string;
    bookUrlPattern: string;
    ruleSearch: BookSourceRule;
    ruleExplore: BookSourceRule;
    ruleBookInfo: BookSourceRule;
    ruleToc: BookSourceRule;
    ruleContent: BookSourceRule;
    ruleReview: BookSourceRule;
    weight: number;
    customOrder: number;
    lastUpdateTime?: number;
    respondTime?: number;
}
/**
 * 页面返回参数接口
 */
interface PageReturnParams {
    action?: string;
    sourceData?: BookSourceInfo;
}
/**
 * 弹窗状态变化事件接口
 */
interface PopupStateChangeEvent {
    isVisible: boolean;
}
/**
 * 弹窗状态变化监听器实现类
 */
class PopupStateChangeListenerImpl {
    /**
     * 状态变化回调方法
     * @param event 状态变化事件
     */
    onStateChange(event: PopupStateChangeEvent): void {
        hilog.info(0x0000, TAG, '弹窗状态变化: ' + event.isVisible);
    }
}
/**
 * Toast 配置选项接口
 */
interface ToastOptions {
    message: string;
    duration: number;
}
/**
 * TextDecoder 配置选项接口
 */
interface TextDecoderOptions {
    ignoreBOM?: boolean;
    fatal?: boolean;
}
/**
 * 路由选项接口
 */
interface RouterOptions {
    url: string;
    params?: RouterParams;
}
/**
 * 路由参数接口
 */
interface RouterParams {
    isEdit: boolean;
    sourceData?: BookSourceInfo;
}
/**
 * 弹窗配置选项接口
 */
interface PopupOptions {
    builder: CustomBuilder;
    placement: Placement;
    maskColor: ResourceColor;
    popupColor: ResourceColor;
    enableArrow: boolean;
    autoCancel: boolean;
    onStateChange: (event: PopupStateChangeEvent) => void;
}
/**
 * 阴影配置选项接口
 */
interface ShadowOptions {
    radius: number;
    color: ResourceColor;
    offsetY: number;
}
/**
 * 边距配置选项接口
 */
interface MarginOptions {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
/**
 * 内边距配置选项接口
 */
interface PaddingOptions {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
/**
 * 文本溢出配置选项接口
 */
interface TextOverflowOptions {
    overflow: TextOverflow;
}
/**
 * Progress 配置选项接口
 */
interface ProgressOptions {
    type: ProgressType;
    value: number;
}
/**
 * Toggle 配置选项接口
 */
interface ToggleOptions {
    type: ToggleType;
    isOn: boolean;
}
/**
 * Image 配置选项接口
 */
interface ImageOptions {
    src: ResourceStr;
}
/**
 * Column 配置选项接口
 */
interface ColumnOptions {
    space?: number;
}
/**
 * Row 配置选项接口
 */
interface RowOptions {
    space?: number;
}
class BookSourcePage extends ViewV2 {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda, extraInfo) {
        super(parent, elmtId, extraInfo);
        this.bookSources = [];
        this.isLoading = false;
        this.showAddMenu = false;
        this.popupStateChangeListener = new PopupStateChangeListenerImpl();
        this.handlePopupStateChange = (event: PopupStateChangeEvent): void => {
            this.popupStateChangeListener.onStateChange(event);
        };
        this.finalizeConstruction();
    }
    @Local
    bookSources: BookSource[]; // 书源列表
    @Local
    isLoading: boolean; // 加载状态
    @Local
    showAddMenu: boolean; // 添加菜单弹窗状态
    // 创建弹窗状态变化监听器实例
    private popupStateChangeListener: PopupStateChangeListenerImpl;
    /**
     * 创建空规则对象
     * @returns 空的书源规则对象
     */
    private createEmptyRule(): BookSourceRule {
        const emptyRule: BookSourceRule = {
            author: undefined,
            bookList: undefined,
            bookUrl: undefined,
            coverUrl: undefined,
            intro: undefined,
            kind: undefined,
            lastChapter: undefined,
            name: undefined,
            wordCount: undefined,
            checkKeyWord: undefined,
            chapterList: undefined,
            chapterName: undefined,
            chapterUrl: undefined,
            nextTocUrl: undefined,
            content: undefined,
            nextContentUrl: undefined,
            tocUrl: undefined,
            init: undefined
        };
        return emptyRule;
    }
    /**
     * 创建书源对象
     * @param source 源数据
     * @param emptyRule 空规则对象
     * @param index 索引
     * @returns 书源对象
     */
    private createBookSource(source: BookSourceInfoModel, emptyRule: BookSourceRule, index: number): BookSource {
        // 先创建规则对象，确保类型正确
        const ruleSearch: BookSourceRule = source.ruleSearch !== undefined ? source.ruleSearch : emptyRule;
        const ruleExplore: BookSourceRule = source.ruleExplore !== undefined ? source.ruleExplore : emptyRule;
        const ruleBookInfo: BookSourceRule = source.ruleBookInfo !== undefined ? source.ruleBookInfo : emptyRule;
        const ruleToc: BookSourceRule = source.ruleToc !== undefined ? source.ruleToc : emptyRule;
        const ruleContent: BookSourceRule = source.ruleContent !== undefined ? source.ruleContent : emptyRule;
        const ruleReview: BookSourceRule = source.ruleReview !== undefined ? source.ruleReview : emptyRule;
        // 创建书源对象
        const bookSource: BookSource = {
            id: source.lastUpdateTime || Date.now() + index,
            name: source.bookSourceName,
            url: source.bookSourceUrl,
            enabled: source.enabled,
            description: source.bookSourceComment || source.bookSourceGroup || '默认书源',
            lastUpdate: source.lastUpdateTime ? new Date(source.lastUpdateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            group: source.bookSourceGroup,
            comment: source.bookSourceComment,
            type: source.bookSourceType,
            enabledCookieJar: source.enabledCookieJar,
            enabledExplore: source.enabledExplore,
            enabledReview: source.enabledReview,
            header: source.header,
            searchUrl: source.searchUrl,
            exploreUrl: source.exploreUrl,
            bookUrlPattern: source.bookUrlPattern,
            weight: source.weight,
            customOrder: source.customOrder,
            ruleSearch: ruleSearch,
            ruleExplore: ruleExplore,
            ruleBookInfo: ruleBookInfo,
            ruleToc: ruleToc,
            ruleContent: ruleContent,
            ruleReview: ruleReview
        };
        return bookSource;
    }
    /**
     * 页面显示时初始化数据
     */
    async aboutToAppear() {
        await this.initializeBookSourceManager();
        await this.loadBookSources();
        this.handleReturnParams();
    }
    /**
     * 处理从编辑页面返回的参数
     */
    private handleReturnParams(): void {
        try {
            const params = router.getParams() as PageReturnParams;
            if (params && params.action && params.sourceData) {
                if (params.action === 'add') {
                    this.addNewBookSource(params.sourceData);
                }
                else if (params.action === 'update') {
                    this.updateBookSource(params.sourceData);
                }
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '处理返回参数失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 添加新书源
     * @param sourceData 书源数据
     */
    private addNewBookSource(sourceData: BookSourceInfo): void {
        const newSource: BookSource = this.createNewBookSource(sourceData);
        this.bookSources.push(newSource);
        hilog.info(0x0000, TAG, '添加新书源: ' + newSource.name);
    }
    /**
     * 创建新书源对象
     * @param sourceData 书源数据
     * @returns 新书源对象
     */
    private createNewBookSource(sourceData: BookSourceInfo): BookSource {
        // 先创建规则对象，确保类型正确
        const ruleSearch: BookSourceRule = sourceData.ruleSearch;
        const ruleExplore: BookSourceRule = sourceData.ruleExplore;
        const ruleBookInfo: BookSourceRule = sourceData.ruleBookInfo;
        const ruleToc: BookSourceRule = sourceData.ruleToc;
        const ruleContent: BookSourceRule = sourceData.ruleContent;
        const ruleReview: BookSourceRule = sourceData.ruleReview;
        // 创建书源对象
        const newBookSource: BookSource = {
            id: Date.now(),
            name: sourceData.bookSourceName,
            url: sourceData.bookSourceUrl,
            enabled: sourceData.enabled,
            description: sourceData.bookSourceComment || '用户添加的书源',
            lastUpdate: new Date().toISOString().split('T')[0],
            group: sourceData.bookSourceGroup,
            comment: sourceData.bookSourceComment,
            type: sourceData.bookSourceType,
            enabledCookieJar: sourceData.enabledCookieJar,
            enabledExplore: sourceData.enabledExplore,
            enabledReview: sourceData.enabledReview,
            header: sourceData.header,
            searchUrl: sourceData.searchUrl,
            exploreUrl: sourceData.exploreUrl,
            bookUrlPattern: sourceData.bookUrlPattern,
            weight: sourceData.weight,
            customOrder: sourceData.customOrder,
            ruleSearch: ruleSearch,
            ruleExplore: ruleExplore,
            ruleBookInfo: ruleBookInfo,
            ruleToc: ruleToc,
            ruleContent: ruleContent,
            ruleReview: ruleReview
        };
        return newBookSource;
    }
    /**
     * 创建导入的书源对象
     * @param sourceData 书源数据
     * @param emptyRule 空规则对象
     * @param importedCount 导入计数
     * @returns 导入的书源对象
     */
    private createImportedBookSource(sourceData: BookSourceInfo, emptyRule: BookSourceRule, importedCount: number): BookSource {
        // 先创建规则对象，确保类型正确
        const ruleSearch: BookSourceRule = sourceData.ruleSearch !== undefined ? sourceData.ruleSearch : emptyRule;
        const ruleExplore: BookSourceRule = sourceData.ruleExplore !== undefined ? sourceData.ruleExplore : emptyRule;
        const ruleBookInfo: BookSourceRule = sourceData.ruleBookInfo !== undefined ? sourceData.ruleBookInfo : emptyRule;
        const ruleToc: BookSourceRule = sourceData.ruleToc !== undefined ? sourceData.ruleToc : emptyRule;
        const ruleContent: BookSourceRule = sourceData.ruleContent !== undefined ? sourceData.ruleContent : emptyRule;
        const ruleReview: BookSourceRule = sourceData.ruleReview !== undefined ? sourceData.ruleReview : emptyRule;
        // 创建书源对象
        const importedBookSource: BookSource = {
            id: Date.now() + importedCount,
            name: sourceData.bookSourceName,
            url: sourceData.bookSourceUrl,
            enabled: sourceData.enabled !== false,
            description: sourceData.bookSourceComment || sourceData.bookSourceGroup || '导入的书源',
            lastUpdate: new Date().toISOString().split('T')[0],
            group: sourceData.bookSourceGroup,
            comment: sourceData.bookSourceComment,
            type: sourceData.bookSourceType || 0,
            enabledCookieJar: sourceData.enabledCookieJar !== false,
            enabledExplore: sourceData.enabledExplore !== false,
            enabledReview: sourceData.enabledReview || false,
            header: sourceData.header || '',
            searchUrl: sourceData.searchUrl || '',
            exploreUrl: sourceData.exploreUrl || '',
            bookUrlPattern: sourceData.bookUrlPattern || '',
            weight: sourceData.weight || 0,
            customOrder: sourceData.customOrder || 0,
            ruleSearch: ruleSearch,
            ruleExplore: ruleExplore,
            ruleBookInfo: ruleBookInfo,
            ruleToc: ruleToc,
            ruleContent: ruleContent,
            ruleReview: ruleReview
        };
        return importedBookSource;
    }
    /**
     * 更新书源
     * @param sourceData 书源数据
     */
    private updateBookSource(sourceData: BookSourceInfo): void {
        // 这里简化处理，实际应该根据ID查找并更新
        hilog.info(0x0000, TAG, '更新书源: ' + sourceData.bookSourceName);
    }
    /**
     * 初始化书源管理器
     */
    private async initializeBookSourceManager(): Promise<void> {
        try {
            this.isLoading = true;
            const context = getContext(this) as common.UIAbilityContext;
            await bookSourceManager.initialize(context);
            hilog.info(0x0000, TAG, '书源管理器初始化成功');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '书源管理器初始化失败: ' + JSON.stringify(error));
            const toastOptions: ToastOptions = {
                message: '书源管理器初始化失败',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(toastOptions);
        }
        finally {
            this.isLoading = false;
        }
    }
    /**
     * 加载书源数据
     */
    private async loadBookSources(): Promise<void> {
        try {
            this.isLoading = true;
            // 从书源管理器获取所有书源
            const allSources = bookSourceManager.getAllBookSources();
            // 转换为页面使用的BookSource格式
            const convertedSources: BookSource[] = [];
            // 创建空规则对象
            const emptyRule: BookSourceRule = this.createEmptyRule();
            for (let i = 0; i < allSources.length; i++) {
                const source = allSources[i];
                const bookSource: BookSource = this.createBookSource(source, emptyRule, i);
                convertedSources.push(bookSource);
            }
            this.bookSources = convertedSources;
            hilog.info(0x0000, TAG, '从书源管理器加载了 ' + this.bookSources.length + ' 个书源');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载书源数据失败: ' + JSON.stringify(error));
            // 清空书源数组
            this.bookSources.splice(0, this.bookSources.length);
        }
        finally {
            this.isLoading = false;
        }
    }
    /**
     * 导入书源文件
     */
    private async importBookSources(): Promise<void> {
        try {
            // 初始化文件选择器
            let documentSelectOptions = new picker.DocumentSelectOptions();
            // 设置文件类型选择
            documentSelectOptions.fileSuffixFilters = ['.json'];
            let documentPicker = new picker.DocumentViewPicker();
            let documentSelectResult = await documentPicker.select(documentSelectOptions);
            if (!documentSelectResult || documentSelectResult.length <= 0) {
                hilog.error(0x0000, TAG, '未选择书源文件');
                return;
            }
            // 获取文件路径
            let srcFile: string = decodeURI(documentSelectResult[0]);
            hilog.info(0x0000, TAG, '选择的书源文件: ' + srcFile);
            // 读取文件内容
            let file = fileIo.openSync(srcFile, fileIo.OpenMode.READ_ONLY);
            let buffer = new ArrayBuffer(1024 * 1024); // 1MB缓冲区
            let readLen = fileIo.readSync(file.fd, buffer);
            fileIo.closeSync(file);
            // 将ArrayBuffer转换为字符串
            let uint8Array = new Uint8Array(buffer, 0, readLen);
            const decoderOptions: TextDecoderOptions = {
                ignoreBOM: false,
                fatal: false
            };
            let textDecoder = util.TextDecoder.create('utf-8', decoderOptions);
            let jsonContent = textDecoder.decode(uint8Array);
            // 解析JSON数据
            let bookSourcesData: BookSourceInfo[] = JSON.parse(jsonContent) as BookSourceInfo[];
            if (!Array.isArray(bookSourcesData)) {
                hilog.error(0x0000, TAG, '书源文件格式错误，应为数组格式');
                const toastOptions: ToastOptions = {
                    message: '书源文件格式错误',
                    duration: 2000
                };
                this.getUIContext()
                    .getPromptAction()
                    .showToast(toastOptions);
                return;
            }
            // 转换并添加书源
            let importedCount = 0;
            // 创建空规则对象
            const emptyRule: BookSourceRule = this.createEmptyRule();
            bookSourcesData.forEach((sourceData: BookSourceInfo) => {
                if (sourceData.bookSourceName && sourceData.bookSourceUrl) {
                    const newSource: BookSource = this.createImportedBookSource(sourceData, emptyRule, importedCount);
                    this.bookSources.push(newSource);
                    importedCount++;
                }
            });
            hilog.info(0x0000, TAG, `成功导入 ${importedCount} 个书源`);
            const successToastOptions: ToastOptions = {
                message: `成功导入 ${importedCount} 个书源`,
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(successToastOptions);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '导入书源失败: ' + JSON.stringify(error));
            const errorToastOptions: ToastOptions = {
                message: '导入书源失败',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(errorToastOptions);
        }
    }
    /**
     * 切换书源启用状态
     * @param source 书源对象
     */
    private toggleBookSource(source: BookSource): void {
        source.enabled = !source.enabled;
        hilog.info(0x0000, TAG, `${source.name} 已${source.enabled ? '启用' : '禁用'}`);
    }
    /**
     * 删除书源
     * @param sourceId 书源ID
     */
    private deleteBookSource(sourceId: number): void {
        const index = this.bookSources.findIndex(source => source.id === sourceId);
        if (index > -1) {
            const deletedSource = this.bookSources.splice(index, 1)[0];
            hilog.info(0x0000, TAG, '删除书源: ' + deletedSource.name);
        }
    }
    /**
     * 跳转到新建书源页面
     */
    private navigateToAddSource(): void {
        try {
            // 创建路由参数对象，避免对象字面量类型错误
            const routerParams: RouterParams = {
                isEdit: false
            };
            const routerOptions: RouterOptions = {
                url: 'pages/BookSourceEditPage',
                params: routerParams
            };
            hilog.info(0x0000, TAG, '准备跳转到新建书源页面');
            router.pushUrl(routerOptions).then(() => {
                hilog.info(0x0000, TAG, '成功跳转到新建书源页面');
            }).catch((error: Error) => {
                hilog.error(0x0000, TAG, '跳转到新建书源页面失败: ' + error.message);
                // 显示错误提示
                const toastOptions: ToastOptions = {
                    message: '跳转失败: ' + error.message,
                    duration: 2000
                };
                this.getUIContext()
                    .getPromptAction()
                    .showToast(toastOptions);
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '创建路由参数时发生错误: ' + JSON.stringify(error));
            const toastOptions: ToastOptions = {
                message: '页面跳转出错',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(toastOptions);
        }
    }
    /**
     * 跳转到编辑书源页面
     * @param source 书源对象
     */
    private navigateToEditSource(source: BookSource): void {
        try {
            const sourceInfo: BookSourceInfo = this.createBookSourceInfoForEdit(source);
            const routerParams: RouterParams = {
                isEdit: true,
                sourceData: sourceInfo
            };
            const routerOptions: RouterOptions = {
                url: 'pages/BookSourceEditPage',
                params: routerParams
            };
            router.pushUrl(routerOptions).catch((error: Error) => {
                hilog.error(0x0000, TAG, '跳转到编辑书源页面失败: ' + error.message);
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '创建路由参数失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 为编辑页面创建书源信息对象
     * @param source 书源对象
     * @returns 书源信息对象
     */
    private createBookSourceInfoForEdit(source: BookSource): BookSourceInfo {
        const emptyRule: BookSourceRule = this.createEmptyRule();
        return {
            bookSourceName: source.name,
            bookSourceUrl: source.url,
            bookSourceGroup: source.group || '',
            bookSourceComment: source.comment || source.description,
            bookSourceType: source.type || 0,
            enabled: source.enabled,
            enabledCookieJar: source.enabledCookieJar !== false,
            enabledExplore: source.enabledExplore !== false,
            enabledReview: source.enabledReview || false,
            header: source.header || '',
            searchUrl: source.searchUrl || '',
            exploreUrl: source.exploreUrl || '',
            bookUrlPattern: source.bookUrlPattern || '',
            weight: source.weight || 0,
            customOrder: source.customOrder || 0,
            lastUpdateTime: Date.now(),
            respondTime: 0,
            ruleSearch: source.ruleSearch || emptyRule,
            ruleExplore: source.ruleExplore || emptyRule,
            ruleBookInfo: source.ruleBookInfo || emptyRule,
            ruleToc: source.ruleToc || emptyRule,
            ruleContent: source.ruleContent || emptyRule,
            ruleReview: source.ruleReview || emptyRule
        } as BookSourceInfo;
    }
    /**
     * 弹窗状态变化处理函数
     * @param event 状态变化事件
     */
    private handlePopupStateChange;
    /**
     * 创建弹窗配置选项
     * @returns 弹窗配置选项对象
     */
    private createPopupOptions(): PopupOptions {
        const options: PopupOptions = {
            builder: () => { this.popupWithButtonBuilder(); },
            placement: Placement.Bottom,
            maskColor: Color.Transparent,
            popupColor: Color.White,
            enableArrow: true,
            autoCancel: true,
            onStateChange: this.handlePopupStateChange
        };
        return options;
    }
    /**
     * 创建阴影配置选项
     * @returns 阴影配置选项对象
     */
    private createShadowOptions(): ShadowOptions {
        return {
            radius: 2,
            color: '#10000000',
            offsetY: 1
        };
    }
    /**
     * 创建边距配置选项
     * @returns 边距配置选项对象
     */
    private createMarginOptions(): MarginOptions {
        return {
            top: 4,
            bottom: 0,
            left: 0,
            right: 0
        };
    }
    /**
     * 创建内边距配置选项
     * @returns 内边距配置选项对象
     */
    private createPaddingOptions(): PaddingOptions {
        return {
            left: 16,
            right: 16,
            top: 0,
            bottom: 0
        };
    }
    /**
     * 创建特定边距配置选项
     * @returns 特定边距配置选项对象
     */
    private createSpecificMarginOptions(): MarginOptions {
        return {
            top: 44,
            bottom: 0,
            left: 0,
            right: 0
        };
    }
    /**
     * 创建卡片边距配置选项
     * @returns 卡片边距配置选项对象
     */
    private createCardMarginOptions(): MarginOptions {
        return {
            left: 16,
            right: 16,
            bottom: 12,
            top: 0
        };
    }
    /**
     * 创建文本边距配置选项
     * @returns 文本边距配置选项对象
     */
    private createTextMarginOptions(): MarginOptions {
        return {
            top: 4,
            bottom: 0,
            left: 0,
            right: 0
        };
    }
    /**
     * 创建按钮边距配置选项
     * @returns 按钮边距配置选项对象
     */
    private createButtonMarginOptions(): MarginOptions {
        return {
            left: 8,
            right: 0,
            top: 0,
            bottom: 0
        };
    }
    /**
     * 创建底部边距配置选项
     * @returns 底部边距配置选项对象
     */
    private createBottomMarginOptions(): MarginOptions {
        return {
            bottom: 8,
            top: 0,
            left: 0,
            right: 0
        };
    }
    /**
     * 创建顶部边距配置选项
     * @returns 顶部边距配置选项对象
     */
    private createTopMarginOptions(): MarginOptions {
        return {
            top: 12,
            bottom: 0,
            left: 0,
            right: 0
        };
    }
    /**
     * 创建列表内边距配置选项
     * @returns 列表内边距配置选项对象
     */
    private createListPaddingOptions(): PaddingOptions {
        return {
            left: 0,
            right: 0,
            top: 8,
            bottom: 8
        };
    }
    /**
     * 创建按钮内边距配置选项
     * @returns 按钮内边距配置选项对象
     */
    private createButtonPaddingOptions(): PaddingOptions {
        return {
            left: 12,
            right: 12,
            top: 4,
            bottom: 4
        };
    }
    /**
     * 创建大按钮内边距配置选项
     * @returns 大按钮内边距配置选项对象
     */
    private createLargeButtonPaddingOptions(): PaddingOptions {
        return {
            left: 20,
            right: 20,
            top: 8,
            bottom: 8
        };
    }
    /**
     * 创建菜单内边距配置选项
     * @returns 菜单内边距配置选项对象
     */
    private createMenuPaddingOptions(): PaddingOptions {
        return {
            left: 16,
            right: 16,
            top: 0,
            bottom: 0
        };
    }
    /**
     * 创建文本溢出配置选项
     * @returns 文本溢出配置选项对象
     */
    private createTextOverflowOptions(): TextOverflowOptions {
        return {
            overflow: TextOverflow.Ellipsis
        };
    }
    /**
     * 创建底部16边距配置选项
     * @returns 底部16边距配置选项对象
     */
    private createBottom16MarginOptions(): MarginOptions {
        return {
            bottom: 16,
            top: 0,
            left: 0,
            right: 0
        };
    }
    /**
     * 创建Progress配置选项
     * @returns Progress配置选项对象
     */
    private createProgressOptions(): ProgressOptions {
        return {
            type: ProgressType.Ring,
            value: 0
        };
    }
    /**
     * 创建Toggle配置选项
     * @param isOn 开关状态
     * @returns Toggle配置选项对象
     */
    private createToggleOptions(isOn: boolean): ToggleOptions {
        const options: ToggleOptions = {
            type: ToggleType.Switch,
            isOn: isOn
        };
        return options;
    }
    /**
     * 创建Image配置选项
     * @param src 图片资源
     * @returns Image配置选项对象
     */
    private createImageOptions(src: ResourceStr): ImageOptions {
        const options: ImageOptions = {
            src: src
        };
        return options;
    }
    /**
     * 创建Column配置选项
     * @returns Column配置选项对象
     */
    private createColumnOptions(): ColumnOptions {
        const options: ColumnOptions = {
            space: undefined
        };
        return options;
    }
    /**
     * 创建Row配置选项
     * @returns Row配置选项对象
     */
    private createRowOptions(): RowOptions {
        const options: RowOptions = {
            space: undefined
        };
        return options;
    }
    /**
     * 返回上一页
     */
    private goBack(): void {
        this.getUIContext().getRouter().back();
    }
    /**
     * 构建顶部导航栏
     */
    private buildHeader(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(this.getNavBarHeight());
            Row.padding(this.createPaddingOptions());
            Row.margin(this.createSpecificMarginOptions());
            Row.backgroundColor(Color.White);
            Row.shadow(this.createShadowOptions());
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 返回按钮
            Button.createWithChild();
            // 返回按钮
            Button.width(this.getButtonSize());
            // 返回按钮
            Button.height(this.getButtonSize());
            // 返回按钮
            Button.backgroundColor(Color.Transparent);
            // 返回按钮
            Button.onClick(() => {
                this.goBack();
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('‹');
            Text.fontSize(24);
            Text.fontColor('#2D3748');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        // 返回按钮
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create('书源管理');
            // 标题
            Text.fontSize(20);
            // 标题
            Text.fontWeight(FontWeight.Bold);
            // 标题
            Text.fontColor('#2D3748');
            // 标题
            Text.layoutWeight(1);
            // 标题
            Text.textAlign(TextAlign.Center);
        }, Text);
        // 标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 添加按钮
            Button.createWithChild();
            // 添加按钮
            Button.width(this.getButtonSize());
            // 添加按钮
            Button.height(this.getButtonSize());
            // 添加按钮
            Button.backgroundColor(Color.Transparent);
            // 添加按钮
            Button.onClick(() => {
                this.showAddMenu = !this.showAddMenu;
            });
            // 添加按钮
            Button.bindPopup({ value: this.showAddMenu, changeEvent: newValue => { this.showAddMenu = newValue; } }, this.createPopupOptions());
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('+');
            Text.fontSize(24);
            Text.fontColor('#2D3748');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        // 添加按钮
        Button.pop();
        Row.pop();
    }
    /**
     * 构建书源卡片
     */
    private buildBookSourceCard(source: BookSource, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(this.getCardPadding());
            Column.backgroundColor(Color.White);
            Column.borderRadius(8);
            Column.margin(this.createCardMarginOptions());
            Column.shadow(this.createShadowOptions());
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 书源信息行
            Row.create();
            // 书源信息行
            Row.width('100%');
            // 书源信息行
            Row.margin(this.createBottomMarginOptions());
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 书源名称
            Text.create(source.name);
            // 书源名称
            Text.fontSize(16);
            // 书源名称
            Text.fontWeight(FontWeight.Medium);
            // 书源名称
            Text.fontColor('#2D3748');
            // 书源名称
            Text.width('100%');
            // 书源名称
            Text.textAlign(TextAlign.Start);
        }, Text);
        // 书源名称
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 书源URL
            Text.create(source.url);
            // 书源URL
            Text.fontSize(12);
            // 书源URL
            Text.fontColor('#718096');
            // 书源URL
            Text.margin(this.createTextMarginOptions());
            // 书源URL
            Text.width('100%');
            // 书源URL
            Text.textAlign(TextAlign.Start);
            // 书源URL
            Text.maxLines(1);
            // 书源URL
            Text.textOverflow(this.createTextOverflowOptions());
        }, Text);
        // 书源URL
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 启用开关
            Toggle.create(this.createToggleOptions(source.enabled));
            // 启用开关
            Toggle.onChange((isOn: boolean) => {
                this.toggleBookSource(source);
            });
        }, Toggle);
        // 启用开关
        Toggle.pop();
        // 书源信息行
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 描述和更新时间
            Row.create();
            // 描述和更新时间
            Row.width('100%');
            // 描述和更新时间
            Row.margin(this.createBottomMarginOptions());
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(source.description);
            Text.fontSize(12);
            Text.fontColor('#4A5568');
            Text.layoutWeight(1);
            Text.maxLines(1);
            Text.textOverflow(this.createTextOverflowOptions());
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('更新: ' + source.lastUpdate);
            Text.fontSize(10);
            Text.fontColor('#A0AEC0');
        }, Text);
        Text.pop();
        // 描述和更新时间
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 操作按钮
            Row.create();
            // 操作按钮
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('测试');
            Button.fontSize(12);
            Button.fontColor('#3182CE');
            Button.backgroundColor('#EBF8FF');
            Button.borderRadius(this.getButtonBorderRadius());
            Button.padding(this.createButtonPaddingOptions());
            Button.onClick(() => {
                hilog.info(0x0000, TAG, '测试书源: ' + source.name);
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('编辑');
            Button.fontSize(12);
            Button.fontColor('#38A169');
            Button.backgroundColor('#C6F6D5');
            Button.borderRadius(this.getButtonBorderRadius());
            Button.padding(this.createButtonPaddingOptions());
            Button.margin(this.createButtonMarginOptions());
            Button.onClick(() => {
                this.navigateToEditSource(source);
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('删除');
            Button.fontSize(12);
            Button.fontColor('#E53E3E');
            Button.backgroundColor('#FED7D7');
            Button.borderRadius(this.getButtonBorderRadius());
            Button.padding(this.createButtonPaddingOptions());
            Button.onClick(() => {
                this.deleteBookSource(source.id);
            });
        }, Button);
        Button.pop();
        // 操作按钮
        Row.pop();
        Column.pop();
    }
    /**
     * 获取弹出菜单宽度
     * @returns 弹出菜单宽度
     */
    private getPopupMenuWidth(): number {
        return 160;
    }
    /**
     * 获取菜单项高度
     * @returns 菜单项高度
     */
    private getMenuItemHeight(): number {
        return 50;
    }
    /**
     * 获取按钮尺寸
     * @returns 按钮尺寸
     */
    private getButtonSize(): number {
        return 40;
    }
    /**
     * 获取导航栏高度
     * @returns 导航栏高度
     */
    private getNavBarHeight(): number {
        return 56;
    }
    /**
     * 获取卡片内边距
     * @returns 卡片内边距
     */
    private getCardPadding(): number {
        return 16;
    }
    /**
     * 获取按钮圆角半径
     * @returns 按钮圆角半径
     */
    private getButtonBorderRadius(): number {
        return 16;
    }
    /**
     * 获取卡片圆角半径
     * @returns 卡片圆角半径
     */
    private getCardBorderRadius(): number {
        return 8;
    }
    /**
     * 获取大按钮圆角半径
     * @returns 大按钮圆角半径
     */
    private getLargeButtonBorderRadius(): number {
        return 20;
    }
    /**
     * 构建弹出菜单
     */
    popupWithButtonBuilder(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width(160);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.height(50);
            Row.width('100%');
            Row.justifyContent(FlexAlign.Start);
            Row.alignItems(VerticalAlign.Center);
            Row.padding({ left: 16, right: 16, top: 0, bottom: 0 });
            Row.onClick(() => {
                this.showAddMenu = false;
                this.navigateToAddSource();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777264, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('新建书源');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.height(50);
            Row.width('100%');
            Row.justifyContent(FlexAlign.Start);
            Row.alignItems(VerticalAlign.Center);
            Row.padding({ left: 16, right: 16, top: 0, bottom: 0 });
            Row.onClick(() => {
                this.showAddMenu = false;
                this.importBookSources();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777266, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导入书源');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#F7FAFC');
        }, Column);
        // 顶部导航栏
        this.buildHeader.bind(this)();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 主要内容区域
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 加载状态
                        Column.create();
                        // 加载状态
                        Column.width('100%');
                        // 加载状态
                        Column.layoutWeight(1);
                        // 加载状态
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create(this.createProgressOptions());
                        Progress.width(this.getButtonSize());
                        Progress.height(this.getButtonSize());
                        Progress.color('#3182CE');
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载书源...');
                        Text.fontSize(14);
                        Text.fontColor('#718096');
                        Text.margin(this.createTopMarginOptions());
                    }, Text);
                    Text.pop();
                    // 加载状态
                    Column.pop();
                });
            }
            else if (this.bookSources.length === 0) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 空状态
                        Column.create();
                        // 空状态
                        Column.width('100%');
                        // 空状态
                        Column.layoutWeight(1);
                        // 空状态
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📚');
                        Text.fontSize(48);
                        Text.margin(this.createTopMarginOptions());
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无书源');
                        Text.fontSize(16);
                        Text.fontColor('#718096');
                        Text.margin(this.createBottom16MarginOptions());
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('添加书源');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor('#3182CE');
                        Button.borderRadius(20);
                        Button.padding(this.createLargeButtonPaddingOptions());
                        Button.onClick(() => {
                            this.navigateToAddSource();
                        });
                    }, Button);
                    Button.pop();
                    // 空状态
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 书源列表
                        List.create();
                        // 书源列表
                        List.width('100%');
                        // 书源列表
                        List.layoutWeight(1);
                        // 书源列表
                        List.padding(this.createListPaddingOptions());
                        // 书源列表
                        List.scrollBar(BarState.Off);
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const source = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    itemCreation2(elmtId, isInitialRender);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.buildBookSourceCard.bind(this)(source);
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.bookSources, forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                    // 书源列表
                    List.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "BookSourcePage";
    }
}
export { BookSourcePage };
registerNamedRoute(() => new BookSourcePage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/BookSourcePage", pageFullPath: "entry/src/main/ets/pages/BookSourcePage", integratedHsp: "false", moduleType: "followWithHap" });
