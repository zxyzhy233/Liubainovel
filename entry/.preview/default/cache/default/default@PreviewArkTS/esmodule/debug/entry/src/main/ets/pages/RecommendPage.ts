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
                        Column.debugLine("entry/src/main/ets/pages/RecommendPage.ets(95:7)", "entry");
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无数据');
                        Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(96:9)", "entry");
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/RecommendPage.ets(99:7)", "entry");
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 使用 Swiper 组件替代自定义轮播图
                        Swiper.create();
                        Swiper.debugLine("entry/src/main/ets/pages/RecommendPage.ets(101:9)", "entry");
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
                            .itemWidth(8)
                            .itemHeight(8)
                            .selectedItemWidth(12)
                            .selectedItemHeight(8)
                            .color('#80808080') // 未选中指示器颜色
                            .selectedColor('#FFFF0000'));
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
                                Stack.debugLine("entry/src/main/ets/pages/RecommendPage.ets(104:13)", "entry");
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
                                Image.debugLine("entry/src/main/ets/pages/RecommendPage.ets(106:15)", "entry");
                                // 小说封面
                                Image.width('100%');
                                // 小说封面
                                Image.height(480);
                                // 小说封面
                                Image.objectFit(ImageFit.Cover);
                                // 小说封面
                                Image.borderRadius(12);
                            }, Image);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 小说信息遮罩 - 与封面底部对齐
                                Column.create();
                                Column.debugLine("entry/src/main/ets/pages/RecommendPage.ets(113:15)", "entry");
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
                                Column.borderRadius({ bottomLeft: 12, bottomRight: 12 });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(novel.title);
                                Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(114:17)", "entry");
                                Text.fontSize(18);
                                Text.fontWeight(FontWeight.Bold);
                                Text.fontColor('#FFFFFF');
                                Text.margin({ bottom: 8 });
                                Text.maxLines(1);
                                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('作者: ' + novel.author);
                                Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(122:17)", "entry");
                                Text.fontSize(14);
                                Text.fontColor('#FFFFFF');
                                Text.margin({ bottom: 8 });
                                Text.opacity(0.9);
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(novel.description);
                                Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(128:17)", "entry");
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
                        Button.debugLine("entry/src/main/ets/pages/RecommendPage.ets(169:9)", "entry");
                        // 刷新按钮
                        Button.onClick(() => {
                            this.loadRecommendNovels();
                        });
                        // 刷新按钮
                        Button.margin({ top: 16 });
                        // 刷新按钮
                        Button.backgroundColor('#007AFF');
                        // 刷新按钮
                        Button.fontColor('#FFFFFF');
                        // 刷新按钮
                        Button.borderRadius(8);
                        // 刷新按钮
                        Button.width(120);
                        // 刷新按钮
                        Button.height(40);
                    }, Button);
                    // 刷新按钮
                    Button.pop();
                    Column.pop();
                });
            }
        }, If);
        If.pop();
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
            Column.debugLine("entry/src/main/ets/pages/RecommendPage.ets(218:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#F1F3F5');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部标题
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/RecommendPage.ets(220:7)", "entry");
            // 顶部标题
            Row.width('100%');
            // 顶部标题
            Row.height(56);
            // 顶部标题
            Row.padding({ left: 16, right: 16 });
            // 顶部标题
            Row.margin({ top: 44 });
            // 顶部标题
            Row.justifyContent(FlexAlign.Start);
            // 顶部标题
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('小说推荐');
            Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(221:9)", "entry");
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#2D3748');
        }, Text);
        Text.pop();
        // 顶部标题
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 加载中状态
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/RecommendPage.ets(236:9)", "entry");
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ value: 0, total: 100, type: ProgressType.Ring });
                        Progress.debugLine("entry/src/main/ets/pages/RecommendPage.ets(237:11)", "entry");
                        Progress.width(40);
                        Progress.height(40);
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载推荐小说...');
                        Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(240:11)", "entry");
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
                        Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(245:9)", "entry");
                        // 错误状态
                        Text.fontColor('#9F6548');
                        // 错误状态
                        Text.margin({ bottom: 16 });
                    }, Text);
                    // 错误状态
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
                        Button.debugLine("entry/src/main/ets/pages/RecommendPage.ets(248:9)", "entry");
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
                        Column.debugLine("entry/src/main/ets/pages/RecommendPage.ets(254:9)", "entry");
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无推荐小说');
                        Text.debugLine("entry/src/main/ets/pages/RecommendPage.ets(255:11)", "entry");
                        Text.fontSize(16);
                        Text.fontColor('#808080');
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
