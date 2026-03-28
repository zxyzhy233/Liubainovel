if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface RecommendPage_Params {
    novelList?: NovelInfo[];
    currentIndex?: number;
    isLoading?: boolean;
    errorMessage?: string;
}
import hilog from "@ohos:hilog";
import type common from "@ohos:app.ability.common";
import type Want from "@ohos:app.ability.Want";
import productViewManager from "@hms:core.appgalleryservice.productViewManager";
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
import type { NovelInfo } from '../models/BookSourceModel';
const TAG: string = 'RecommendPage';
class RecommendPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__novelList = new ObservedPropertyObjectPU([], this, "novelList");
        this.__currentIndex = new ObservedPropertySimplePU(0, this, "currentIndex");
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__errorMessage = new ObservedPropertySimplePU('', this, "errorMessage");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: RecommendPage_Params) {
        if (params.novelList !== undefined) {
            this.novelList = params.novelList;
        }
        if (params.currentIndex !== undefined) {
            this.currentIndex = params.currentIndex;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.errorMessage !== undefined) {
            this.errorMessage = params.errorMessage;
        }
    }
    updateStateVars(params: RecommendPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__novelList.purgeDependencyOnElmtId(rmElmtId);
        this.__currentIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__errorMessage.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__novelList.aboutToBeDeleted();
        this.__currentIndex.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__errorMessage.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __novelList: ObservedPropertyObjectPU<NovelInfo[]>; // 小说列表
    get novelList() {
        return this.__novelList.get();
    }
    set novelList(newValue: NovelInfo[]) {
        this.__novelList.set(newValue);
    }
    private __currentIndex: ObservedPropertySimplePU<number>; // 当前轮播图索引
    get currentIndex() {
        return this.__currentIndex.get();
    }
    set currentIndex(newValue: number) {
        this.__currentIndex.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>; // 加载状态
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __errorMessage: ObservedPropertySimplePU<string>; // 错误信息
    get errorMessage() {
        return this.__errorMessage.get();
    }
    set errorMessage(newValue: string) {
        this.__errorMessage.set(newValue);
    }
    /**
     * 页面显示时加载推荐小说
     */
    async aboutToAppear() {
        // 初始化书源管理器
        await this.initializeBookSourceManager();
        // 加载推荐小说
        await this.loadRecommendNovels();
    }
    /**
     * 初始化书源管理器
     */
    private async initializeBookSourceManager(): Promise<void> {
        try {
            const context = getContext(this) as common.UIAbilityContext;
            await bookSourceManager.initialize(context);
            hilog.info(0x0000, TAG, '书源管理器初始化成功');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '书源管理器初始化失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 使用书源管理器加载推荐小说
     */
    private async loadRecommendNovels(): Promise<void> {
        try {
            this.isLoading = true;
            this.errorMessage = '';
            hilog.info(0x0000, TAG, '开始通过书源管理器获取推荐小说');
            // 使用书源管理器获取推荐小说
            const result = await bookSourceManager.getRecommendNovels();
            if (result.success && result.data) {
                this.novelList = result.data.slice(0, 8); // 取前8本小说用于轮播
                hilog.info(0x0000, TAG, `成功获取 ${this.novelList.length} 本推荐小说，来源: ${result.source || '未知'}`);
                // 打印获取到的小说信息
                this.novelList.forEach((novel, index) => {
                    hilog.info(0x0000, TAG, `小说${index + 1}: ${novel.title} - ${novel.author}`);
                });
            }
            else {
                this.errorMessage = result.error || '获取推荐小说失败';
                hilog.error(0x0000, TAG, '获取推荐小说失败: ' + this.errorMessage);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载推荐小说异常: ' + JSON.stringify(error));
            this.errorMessage = '加载失败，请重试';
        }
        finally {
            this.isLoading = false;
        }
    }
    /**
     * 构建轮播图组件
     */
    private buildCarousel(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.novelList.length === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无数据');
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.create();
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.width('90%');
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.height(480);
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.vertical(false);
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.autoPlay(true);
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.interval(4000);
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.displayArrow(false);
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.effectMode(EdgeEffect.None);
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.indicator(new DotIndicator()
                            .itemWidth(6)
                            .itemHeight(6)
                            .selectedItemWidth(8)
                            .selectedItemHeight(8)
                            .color({ "id": 16777294, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }) // 未选中指示器颜色
                            .selectedColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }));
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.onChange((index: number) => {
                            this.currentIndex = index;
                        });
                    }, Swiper);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = (_item, index: number) => {
                            const novel = _item;
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 轮播图内容
                                Stack.create({ alignContent: Alignment.Bottom });
                                // 轮播图内容
                                Stack.height(480);
                                // 轮播图内容
                                Stack.width('90%');
                                // 轮播图内容
                                Stack.onClick(() => {
                                    // 点击跳转到小说详情
                                    this.openNovelDetail(novel);
                                });
                            }, Stack);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 小说封面
                                Image.create(novel.cover);
                                // 小说封面
                                Image.width('100%');
                                // 小说封面
                                Image.height(480);
                                // 小说封面
                                Image.objectFit(ImageFit.Cover);
                                // 小说封面
                                Image.borderRadius(20);
                            }, Image);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.create();
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.padding(16);
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.width('100%');
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.align(Alignment.Top);
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.backgroundColor('#80000000');
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.alignSelf(ItemAlign.End);
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.borderRadius({ bottomLeft: 20, bottomRight: 20 });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(novel.title);
                                Text.fontSize(20);
                                Text.fontWeight(FontWeight.Bold);
                                Text.fontColor('#FFFFFF');
                                Text.margin({ bottom: 8 });
                                Text.maxLines(1);
                                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('作者: ' + novel.author);
                                Text.fontSize(14);
                                Text.fontColor('#FFFFFF');
                                Text.margin({ bottom: 8 });
                                Text.opacity(0.9);
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(novel.description);
                                Text.fontSize(12);
                                Text.fontColor('#FFFFFF');
                                Text.maxLines(2);
                                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                Text.opacity(0.8);
                            }, Text);
                            Text.pop();
                            // 小说信息遮罩 - 与封面底部对齐
                            Column.pop();
                            // 轮播图内容
                            Stack.pop();
                        };
                        this.forEachUpdateFunction(elmtId, this.novelList, forEachItemGenFunction, (novel: NovelInfo) => novel.link, true, false);
                    }, ForEach);
                    ForEach.pop();
                    // 使用 Swiper 组件替代自定义轮播图
                    Swiper.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 刷新按钮
                        Button.createWithLabel('刷新推荐');
                        // 刷新按钮
                        Button.onClick(() => {
                            this.loadRecommendNovels();
                        });
                        // 刷新按钮
                        Button.margin({ top: 16 });
                        // 刷新按钮
                        Button.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 刷新按钮
                        Button.fontColor('#FFFFFF');
                        // 刷新按钮
                        Button.borderRadius(100);
                        // 刷新按钮
                        Button.width(120);
                        // 刷新按钮
                        Button.height(40);
                    }, Button);
                    // 刷新按钮
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 应用推荐
                        Row.create();
                        // 应用推荐
                        Row.width('90%');
                        // 应用推荐
                        Row.margin({ top: 16 });
                        // 应用推荐
                        Row.padding(14);
                        // 应用推荐
                        Row.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 应用推荐
                        Row.borderRadius(16);
                        // 应用推荐
                        Row.shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📖 应用推荐：');
                        Text.fontSize(14);
                        Text.margin({ right: 4 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('留白写作助手');
                        Text.fontSize(13);
                        Text.fontColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Text.fontWeight(FontWeight.Medium);
                        Text.decoration({ type: TextDecorationType.Underline, color: '#3D8A5A' });
                        Text.maxLines(1);
                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                        Text.layoutWeight(1);
                        Text.onClick(() => {
                            this.openAppStore();
                        });
                    }, Text);
                    Text.pop();
                    // 应用推荐
                    Row.pop();
                    Column.pop();
                });
            }
        }, If);
        If.pop();
    }
    /**
     * 打开应用市场-留白写作助手详情页
     */
    private openAppStore(): void {
        try {
            const context = getContext(this) as common.UIAbilityContext;
            const wantParam: Want = {
                parameters: { bundleName: 'com.liubai.ainovelasst' }
            };
            productViewManager.loadProduct(context, wantParam);
            hilog.info(0x0000, TAG, '成功拉起应用市场详情页');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '拉起应用市场失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 打开小说详情
     * @param novel 小说信息
     */
    private async openNovelDetail(novel: NovelInfo) {
        try {
            hilog.info(0x0000, TAG, '准备打开小说详情: ' + novel.title + ', 链接: ' + novel.link);
            // 获取应用上下文
            const context = getContext(this) as common.UIAbilityContext;
            // 创建Intent，使用系统浏览器打开小说详情页面
            const wantInfo: Want = {
                action: 'ohos.want.action.viewData',
                entities: ['entity.system.browsable'],
                uri: novel.link
            };
            // 启动浏览器
            await context.startAbility(wantInfo);
            hilog.info(0x0000, TAG, '成功打开小说详情页面');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '打开小说详情失败: ' + JSON.stringify(error));
            // 如果系统浏览器打开失败，尝试显示提示信息
            this.errorMessage = '无法打开浏览器，请检查系统设置';
            setTimeout(() => {
                this.errorMessage = '';
            }, 3000);
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部标题
            Row.create();
            // 顶部标题
            Row.width('100%');
            // 顶部标题
            Row.height(56);
            // 顶部标题
            Row.padding({ left: 16, right: 16 });
            // 顶部标题
            Row.margin({ top: 44 });
            // 顶部标题
            Row.justifyContent(FlexAlign.SpaceBetween);
            // 顶部标题
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('发现');
            Text.fontSize(26);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777352, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(22);
            Image.height(22);
            Image.fillColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.onClick(() => {
                this.loadRecommendNovels();
            });
        }, Image);
        // 顶部标题
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 加载中状态
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ value: 0, total: 100, type: ProgressType.Ring });
                        Progress.width(40);
                        Progress.height(40);
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载推荐小说...');
                        Text.margin({ top: 16 });
                    }, Text);
                    Text.pop();
                    // 加载中状态
                    Column.pop();
                });
            }
            else if (this.errorMessage) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 错误状态
                        Text.create(this.errorMessage);
                        // 错误状态
                        Text.fontColor({ "id": 16777310, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 错误状态
                        Text.margin({ bottom: 16 });
                    }, Text);
                    // 错误状态
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
                        Button.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Button.borderRadius(12);
                        Button.onClick(() => {
                            this.loadRecommendNovels();
                        });
                    }, Button);
                    Button.pop();
                });
            }
            else if (this.novelList.length === 0) {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 空状态
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无推荐小说');
                        Text.fontSize(16);
                        Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    // 空状态
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(3, () => {
                    // 显示轮播图
                    this.buildCarousel.bind(this)();
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
        return "RecommendPage";
    }
}
export { RecommendPage };
registerNamedRoute(() => new RecommendPage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/RecommendPage", pageFullPath: "entry/src/main/ets/pages/RecommendPage", integratedHsp: "false", moduleType: "followWithHap" });
