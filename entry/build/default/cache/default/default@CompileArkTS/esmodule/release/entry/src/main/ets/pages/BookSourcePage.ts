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
import type { BookSourceInfo as BookSourceInfoModel, BookSourceRule as BookSourceRuleModel, ImportResult } from '../models/BookSourceModel';
const TAG: string = 'BookSourcePage';
/**
 * 鹿析信息接口
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
    ruleSearch?: BookSourceRuleModel;
    ruleExplore?: BookSourceRuleModel;
    ruleBookInfo?: BookSourceRuleModel;
    ruleToc?: BookSourceRuleModel;
    ruleContent?: BookSourceRuleModel;
    ruleReview?: BookSourceRuleModel;
}
/**
 * 页面返回参数接口
 */
interface PageReturnParams {
    action?: string;
    sourceData?: BookSourceInfoModel;
}
/**
 * 弹窗状态变化事件接口
 */
interface PopupStateChangeEvent {
    isVisible: boolean;
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
    sourceData?: BookSourceInfoModel;
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
class BookSourcePage extends ViewV2 {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda, extraInfo) {
        super(parent, elmtId, extraInfo);
        this.bookSources = [];
        this.isLoading = false;
        this.showAddMenu = false;
        this.popupStateChangeListener = new PopupStateChangeListenerImpl();
        this.handlePopupStateChange = (event: PopupStateChangeEvent) => {
            this.popupStateChangeListener.onStateChange(event);
        };
        this.finalizeConstruction();
    }
    public resetStateVarsOnReuse(params: Object): void {
        this.bookSources = [];
        this.isLoading = false;
        this.showAddMenu = false;
    }
    @Local
    bookSources: BookSource[];
    @Local
    isLoading: boolean;
    @Local
    showAddMenu: boolean;
    // 创建弹窗状态变化监听器实例
    private popupStateChangeListener: PopupStateChangeListenerImpl;
    /**
     * 创建空规则对象
     * @returns 空的鹿析规则对象
     */
    private createEmptyRule(): BookSourceRuleModel {
        const emptyRule: BookSourceRuleModel = {
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
     * 创建鹿析对象
     * @param source 源数据
     * @param emptyRule 空规则对象
     * @param index 索引
     * @returns 鹿析对象
     */
    private createBookSource(source: BookSourceInfoModel, emptyRule: BookSourceRuleModel, index: number): BookSource {
        // 先创建规则对象，确保类型正确
        const ruleSearch: BookSourceRuleModel = source.ruleSearch !== undefined ? source.ruleSearch : emptyRule;
        const ruleExplore: BookSourceRuleModel = source.ruleExplore !== undefined ? source.ruleExplore : emptyRule;
        const ruleBookInfo: BookSourceRuleModel = source.ruleBookInfo !== undefined ? source.ruleBookInfo : emptyRule;
        const ruleToc: BookSourceRuleModel = source.ruleToc !== undefined ? source.ruleToc : emptyRule;
        const ruleContent: BookSourceRuleModel = source.ruleContent !== undefined ? source.ruleContent : emptyRule;
        const ruleReview: BookSourceRuleModel = source.ruleReview !== undefined ? source.ruleReview : emptyRule;
        // 创建鹿析对象
        const bookSource: BookSource = {
            id: Number(source.lastUpdateTime ?? (Date.now() + index)),
            name: source.bookSourceName,
            url: source.bookSourceUrl,
            enabled: source.enabled,
            description: source.bookSourceComment || source.bookSourceGroup || '默认鹿析',
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
        await this.handleReturnParams();
    }
    /**
     * 处理从编辑页面返回的参数
     */
    private async handleReturnParams(): Promise<void> {
        try {
            const params = router.getParams() as PageReturnParams;
            if (params && params.action && params.sourceData) {
                if (params.action === 'add') {
                    await this.addNewBookSource(params.sourceData);
                }
                else if (params.action === 'update') {
                    await this.updateBookSource(params.sourceData);
                }
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '处理返回参数失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 添加新鹿析
     * @param sourceData 鹿析数据
     */
    private async addNewBookSource(sourceData: BookSourceInfoModel): Promise<void> {
        try {
            // 使用BookSourceManager保存到持久化存储
            await bookSourceManager.addBookSource(sourceData);
            // 重新加载鹿析列表以更新UI
            await this.loadBookSources();
            hilog.info(0x0000, TAG, '添加新鹿析成功: ' + sourceData.bookSourceName);
            const successToastOptions: ToastOptions = {
                message: '鹿析添加成功',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(successToastOptions);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '添加新鹿析失败: ' + JSON.stringify(error));
            const errorToastOptions: ToastOptions = {
                message: '鹿析添加失败: ' + (error as Error).message,
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(errorToastOptions);
        }
    }
    /**
     * 更新鹿析
     * @param sourceData 鹿析数据
     */
    private async updateBookSource(sourceData: BookSourceInfoModel): Promise<void> {
        try {
            // 使用BookSourceManager更新鹿析
            await bookSourceManager.updateBookSource(sourceData);
            // 重新加载鹿析列表以更新UI
            await this.loadBookSources();
            hilog.info(0x0000, TAG, '更新鹿析成功: ' + sourceData.bookSourceName);
            const successToastOptions: ToastOptions = {
                message: '鹿析更新成功',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(successToastOptions);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '更新鹿析失败: ' + JSON.stringify(error));
            const errorToastOptions: ToastOptions = {
                message: '鹿析更新失败: ' + (error as Error).message,
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(errorToastOptions);
        }
    }
    /**
     * 初始化鹿析管理器
     */
    private async initializeBookSourceManager(): Promise<void> {
        try {
            this.isLoading = true;
            const context = getContext(this) as common.UIAbilityContext;
            await bookSourceManager.initialize(context);
            hilog.info(0x0000, TAG, '鹿析理器初始化成功');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '鹿析管理器初始化失败: ' + JSON.stringify(error));
            const toastOptions: ToastOptions = {
                message: '鹿析管理器初始化失败',
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
     * 加载鹿析数据
     */
    private async loadBookSources(): Promise<void> {
        try {
            this.isLoading = true;
            // 从鹿析管理器获取所有书源
            const allSources = bookSourceManager.getAllBookSources();
            // 转换为页面使用的BookSource格式
            const convertedSources: BookSource[] = [];
            // 创建空规则对象
            const emptyRule: BookSourceRuleModel = this.createEmptyRule();
            for (let i = 0; i < allSources.length; i++) {
                const source = allSources[i];
                const bookSource: BookSource = this.createBookSource(source, emptyRule, i);
                convertedSources.push(bookSource);
            }
            this.bookSources = convertedSources;
            hilog.info(0x0000, TAG, '从鹿析管理器加载了 ' + this.bookSources.length + ' 个鹿析');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载鹿析数据失败: ' + JSON.stringify(error));
            // 清空鹿析数组
            this.bookSources.splice(0, this.bookSources.length);
        }
        finally {
            this.isLoading = false;
        }
    }
    /**
     * 导入鹿析文件
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
                hilog.error(0x0000, TAG, '未选择鹿析文件');
                return;
            }
            // 获取文件路径
            let srcFile: string = decodeURI(documentSelectResult[0]);
            hilog.info(0x0000, TAG, '选择的鹿析文件: ' + srcFile);
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
            let bookSourcesData: BookSourceInfoModel[] = JSON.parse(jsonContent) as BookSourceInfoModel[];
            if (!Array.isArray(bookSourcesData)) {
                hilog.error(0x0000, TAG, '鹿析文件格式错误，应为数组格式');
                const toastOptions: ToastOptions = {
                    message: '鹿析文件格式错误',
                    duration: 2000
                };
                this.getUIContext()
                    .getPromptAction()
                    .showToast(toastOptions);
                return;
            }
            // 使用BookSourceManager批量导入鹿析
            const importResult: ImportResult = await bookSourceManager.importBookSources(bookSourcesData);
            // 重新加载鹿析列表以更新UI
            await this.loadBookSources();
            hilog.info(0x0000, TAG, `导入完成，成功: ${importResult.success}，失败: ${importResult.failed}`);
            let message = `成功导入 ${importResult.success} 个鹿析`;
            if (importResult.failed > 0) {
                message += `，失败 ${importResult.failed} 个`;
            }
            const successToastOptions: ToastOptions = {
                message: message,
                duration: 3000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(successToastOptions);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '导入鹿析失败: ' + JSON.stringify(error));
            const errorToastOptions: ToastOptions = {
                message: '导入鹿析失败',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(errorToastOptions);
        }
    }
    /**
     * 切换鹿析启用状态
     * @param source 鹿析对象
     */
    private async toggleBookSource(source: BookSource): Promise<void> {
        try {
            const newEnabled = !source.enabled;
            // 使用BookSourceManager保存状态变更
            await bookSourceManager.toggleBookSource(source.name, newEnabled);
            // 更新UI状态
            source.enabled = newEnabled;
            hilog.info(0x0000, TAG, `${source.name} 已${newEnabled ? '启用' : '禁用'}`);
            const successToastOptions: ToastOptions = {
                message: `${source.name} 已${newEnabled ? '启用' : '禁用'}`,
                duration: 1500
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(successToastOptions);
        }
        catch (error) {
            hilog.error(0x0000, TAG, `切换鹿析状态失败: ${(error as Error).message}`);
            const errorToastOptions: ToastOptions = {
                message: '切换鹿析状态失败',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(errorToastOptions);
        }
    }
    /**
     * 删除鹿析
     * @param sourceId 鹿析ID
     */
    private async deleteBookSource(sourceId: number): Promise<void> {
        try {
            const index = this.bookSources.findIndex(source => source.id === sourceId);
            if (index > -1) {
                const deletedSource = this.bookSources[index];
                // 使用BookSourceManager从持久化存储中删除
                await bookSourceManager.removeBookSource(deletedSource.name);
                // 从UI列表中移除
                this.bookSources.splice(index, 1);
                hilog.info(0x0000, TAG, '删除鹿析成功: ' + deletedSource.name);
                const successToastOptions: ToastOptions = {
                    message: `已删除鹿析: ${deletedSource.name}`,
                    duration: 2000
                };
                this.getUIContext()
                    .getPromptAction()
                    .showToast(successToastOptions);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, `删除鹿析失败: ${error}`);
            const errorToastOptions: ToastOptions = {
                message: '删除鹿析失败',
                duration: 2000
            };
            this.getUIContext()
                .getPromptAction()
                .showToast(errorToastOptions);
        }
    }
    /**
     * 跳转到新建鹿析页面
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
            hilog.info(0x0000, TAG, '准备跳转到新建鹿析页面');
            router.pushUrl(routerOptions).then(() => {
                hilog.info(0x0000, TAG, '成功跳转到新建鹿析页面');
            }).catch((error: Error) => {
                hilog.error(0x0000, TAG, '跳转到新建鹿析页面失败: ' + (error as Error).message);
                // 显示错误提示
                const toastOptions: ToastOptions = {
                    message: '跳转失败: ' + (error as Error).message,
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
     * 跳转到编辑鹿析页面
     * @param source 鹿析对象
     */
    private navigateToEditSource(source: BookSource): void {
        try {
            const sourceInfo: BookSourceInfoModel = this.createBookSourceInfoForEdit(source);
            const routerParams: RouterParams = {
                isEdit: true,
                sourceData: sourceInfo
            };
            const routerOptions: RouterOptions = {
                url: 'pages/BookSourceEditPage',
                params: routerParams
            };
            router.pushUrl(routerOptions).catch((error: Error) => {
                hilog.error(0x0000, TAG, '跳转到编辑鹿析页面失败: ' + (error as Error).message);
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '创建路由参数失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 为编辑页面创建鹿析信息对象
     * @param source 鹿析对象
     * @returns 鹿析信息对象
     */
    private createBookSourceInfoForEdit(source: BookSource): BookSourceInfoModel {
        const emptyRule: BookSourceRuleModel = this.createEmptyRule();
        const sourceInfo: BookSourceInfoModel = {
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
        };
        return sourceInfo;
    }
    /**
     * 弹窗状态变化处理函数
     * @param event 状态变化事件
     */
    private handlePopupStateChange;
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
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.margin({ top: 44 });
            Row.justifyContent(FlexAlign.Start);
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 返回按钮
            Button.createWithChild();
            // 返回按钮
            Button.width(40);
            // 返回按钮
            Button.height(40);
            // 返回按钮
            Button.backgroundColor(Color.Transparent);
            // 返回按钮
            Button.onClick(() => {
                this.goBack();
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('👈');
            Text.fontSize(20);
        }, Text);
        Text.pop();
        // 返回按钮
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create('鹿析管理');
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
            Button.width(40);
            // 添加按钮
            Button.height(40);
            // 添加按钮
            Button.backgroundColor(Color.Transparent);
            // 添加按钮
            Button.onClick(() => {
                this.showAddMenu = !this.showAddMenu;
            });
            // 添加按钮
            Button.bindPopup({ value: this.showAddMenu, changeEvent: newValue => { this.showAddMenu = newValue; } }, {
                builder: { builder: this.popupWithButtonBuilder.bind(this) },
                placement: Placement.Bottom,
                maskColor: Color.Transparent,
                popupColor: Color.White,
                enableArrow: true,
                autoCancel: true,
                onStateChange: this.handlePopupStateChange
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('➕');
            Text.fontSize(20);
        }, Text);
        Text.pop();
        // 添加按钮
        Button.pop();
        Row.pop();
    }
    /**
     * 构建鹿析卡片
     */
    private buildBookSourceCard(source: BookSource, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(12);
            Column.backgroundColor(Color.White);
            Column.borderRadius(8);
            Column.margin({ bottom: 8, top: 0 });
            Column.shadow({ radius: 2, color: '#10000000', offsetY: 1 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 鹿析信息行
            Row.create();
            // 鹿析信息行
            Row.width('100%');
            // 鹿析信息行
            Row.margin({ bottom: 8, top: 0, left: 0, right: 0 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 鹿析名称
            Text.create(source.name);
            // 鹿析名称
            Text.fontSize(16);
            // 鹿析名称
            Text.fontWeight(FontWeight.Medium);
            // 鹿析名称
            Text.fontColor('#2D3748');
            // 鹿析名称
            Text.width('100%');
            // 鹿析名称
            Text.textAlign(TextAlign.Start);
        }, Text);
        // 鹿析名称
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 鹿析URL
            Text.create(source.url);
            // 鹿析URL
            Text.fontSize(12);
            // 鹿析URL
            Text.fontColor('#718096');
            // 鹿析URL
            Text.margin({ top: 4, bottom: 0, left: 0, right: 0 });
            // 鹿析URL
            Text.width('100%');
            // 鹿析URL
            Text.textAlign(TextAlign.Start);
            // 鹿析URL
            Text.maxLines(1);
            // 鹿析URL
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        // 鹿析URL
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 启用开关
            Toggle.create({ type: ToggleType.Switch, isOn: source.enabled });
            // 启用开关
            Toggle.onChange(isOn => {
                this.toggleBookSource(source);
            });
        }, Toggle);
        // 启用开关
        Toggle.pop();
        // 鹿析信息行
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 描述和更新时间
            Row.create();
            // 描述和更新时间
            Row.width('100%');
            // 描述和更新时间
            Row.margin({ bottom: 8, top: 0, left: 0, right: 0 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(source.description);
            Text.fontSize(12);
            Text.fontColor('#4A5568');
            Text.layoutWeight(1);
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('更新: ' + (source.lastUpdate || ''));
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
            Button.borderRadius(16);
            Button.padding({ left: 12, right: 12, top: 4, bottom: 4 });
            Button.onClick(() => {
                hilog.info(0x0000, TAG, '测试鹿析: ' + source.name);
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('编辑');
            Button.fontSize(12);
            Button.fontColor('#38A169');
            Button.backgroundColor('#C6F6D5');
            Button.borderRadius(16);
            Button.padding({ left: 12, right: 12, top: 4, bottom: 4 });
            Button.margin({ left: 8, right: 0, top: 0, bottom: 0 });
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
            Button.borderRadius(16);
            Button.padding({ left: 12, right: 12, top: 4, bottom: 4 });
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
            Image.create({ "id": 16777268, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('新建鹿析');
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
            Image.create({ "id": 16777270, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导入鹿析');
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
                        Progress.create({ type: ProgressType.Ring, value: 0 });
                        Progress.width(40);
                        Progress.height(40);
                        Progress.color('#3182CE');
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载鹿析...');
                        Text.fontSize(14);
                        Text.fontColor('#718096');
                        Text.margin({ top: 12, bottom: 0, left: 0, right: 0 });
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
                        Text.create('🦌');
                        Text.fontSize(48);
                        Text.margin({ top: 12, bottom: 0, left: 0, right: 0 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无鹿析');
                        Text.fontSize(16);
                        Text.fontColor('#718096');
                        Text.margin({ bottom: 16, top: 0, left: 0, right: 0 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('添加鹿析');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor('#3182CE');
                        Button.borderRadius(20);
                        Button.padding({ left: 20, right: 20, top: 8, bottom: 8 });
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
                        // 鹿析列表
                        List.create();
                        // 鹿析列表
                        List.width('100%');
                        // 鹿析列表
                        List.layoutWeight(1);
                        // 鹿析列表
                        List.padding({ left: 0, right: 0, top: 8, bottom: 8 });
                        // 鹿析列表
                        List.scrollBar(BarState.Off);
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const source = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
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
                    // 鹿析列表
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
