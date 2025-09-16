if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface RecommendPage_Params {
    novelList?: NovelInfo[];
    currentIndex?: number;
    isLoading?: boolean;
    errorMessage?: string;
}
import http from "@ohos:net.http";
import hilog from "@ohos:hilog";
import type common from "@ohos:app.ability.common";
import type Want from "@ohos:app.ability.Want";
const TAG: string = 'RecommendPage';
/**
 * 小说信息接口
 */
interface NovelInfo {
    cover: string; // 封面图片URL
    title: string; // 小说标题
    author: string; // 作者
    description: string; // 简介
    link: string; // 详情链接
}
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
        await this.loadRecommendNovels();
    }
    /**
     * 从笔趣阁网站加载推荐小说
     */
    private async loadRecommendNovels() {
        try {
            this.isLoading = true;
            this.errorMessage = '';
            // 创建HTTP请求
            let httpRequest = http.createHttp();
            let response = await httpRequest.request('https://www.bqg128.com/', {
                method: http.RequestMethod.GET,
                header: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (response.responseCode === 200) {
                const htmlContent = response.result.toString();
                this.parseNovelList(htmlContent);
            }
            else {
                hilog.error(0x0000, TAG, 'HTTP请求失败: ' + response.responseCode);
                this.errorMessage = '网络请求失败，请检查网络连接';
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载推荐小说失败: ' + JSON.stringify(error));
            this.errorMessage = '加载失败，请重试';
        }
        finally {
            this.isLoading = false;
        }
    }
    /**
     * 使用正则表达式解析HTML内容，提取热门小说信息
     * @param html HTML内容
     */
    private parseNovelList(html: string) {
        try {
            // 先打印HTML内容的一部分用于调试
            hilog.info(0x0000, TAG, 'HTML内容长度: ' + html.length);
            // 匹配 <div class="hot"> 区域内容，使用更精确的匹配
            const hotRegex = /<div class="hot">([\s\S]*?)<\/div>\s*<div class="top">/;
            const hotMatch = hotRegex.exec(html);
            if (!hotMatch) {
                hilog.warn(0x0000, TAG, '未找到热门小说区域，尝试备用匹配');
                // 备用匹配方案
                const hotRegexAlt = /<div class="hot">([\s\S]*?)(?=<div class="top"|$)/;
                const hotMatchAlt = hotRegexAlt.exec(html);
                if (!hotMatchAlt) {
                    this.errorMessage = '未找到热门小说数据';
                    return;
                }
                this.parseHotContent(hotMatchAlt[1]);
                return;
            }
            this.parseHotContent(hotMatch[1]);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '解析HTML失败: ' + JSON.stringify(error));
            this.errorMessage = '解析数据失败';
        }
    }
    /**
     * 解析热门区域内容
     * @param hotContent 热门区域HTML内容
     */
    private parseHotContent(hotContent: string) {
        try {
            hilog.info(0x0000, TAG, '热门区域内容长度: ' + hotContent.length);
            const novels: NovelInfo[] = [];
            // 使用更精确的正则表达式匹配完整的item结构
            const itemRegex = /<div class="item">[\s\S]*?<div class="image">[\s\S]*?<\/div>[\s\S]*?<dl>[\s\S]*?<\/dl>[\s\S]*?<\/div>/g;
            let itemMatch: RegExpExecArray | null;
            let count = 0;
            while ((itemMatch = itemRegex.exec(hotContent)) !== null && count < 4) {
                const itemContent = itemMatch[0]; // 使用完整匹配内容
                hilog.info(0x0000, TAG, `解析第${count + 1}个item，内容长度: ${itemContent.length}`);
                // 提取封面图片
                const coverRegex = /<img[^>]+src="([^"]+)"[^>]*>/;
                const coverMatch = coverRegex.exec(itemContent);
                const cover = coverMatch ? coverMatch[1] : '';
                // 提取小说标题和链接
                const titleRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
                let titleMatch: RegExpExecArray | null;
                let link = '';
                let title = '';
                // 找到dt标签内的a标签（第二个a标签通常是标题）
                let matchCount = 0;
                while ((titleMatch = titleRegex.exec(itemContent)) !== null) {
                    matchCount++;
                    if (matchCount === 2) { // 第二个a标签是标题
                        link = titleMatch[1];
                        title = titleMatch[2].trim();
                        break;
                    }
                }
                // 如果没找到第二个a标签，使用第一个
                if (!title && !link) {
                    titleRegex.lastIndex = 0; // 重置正则表达式
                    titleMatch = titleRegex.exec(itemContent);
                    if (titleMatch) {
                        link = titleMatch[1];
                        title = titleMatch[2].trim();
                    }
                }
                // 提取作者
                const authorRegex = /<span[^>]*>([^<]+)<\/span>/;
                const authorMatch = authorRegex.exec(itemContent);
                const author = authorMatch ? authorMatch[1].trim() : '未知作者';
                // 提取简介
                const descRegex = /<dd[^>]*>([^<]+)<\/dd>/;
                const descMatch = descRegex.exec(itemContent);
                const description = descMatch ? descMatch[1].trim() : '暂无简介';
                hilog.info(0x0000, TAG, `解析结果 - 标题: ${title}, 作者: ${author}, 链接: ${link}`);
                if (title && link) {
                    novels.push({
                        cover: cover.startsWith('http') ? cover : 'https://www.bqg128.com' + cover,
                        title: title,
                        author: author,
                        description: description,
                        link: link.startsWith('http') ? link : 'https://www.bqg128.com' + link
                    } as NovelInfo);
                    count++;
                }
            }
            this.novelList = novels.slice(0, 4); // 只取4本小说
            hilog.info(0x0000, TAG, '成功解析 ' + this.novelList.length + ' 本热门小说');
            // 打印解析结果用于调试
            this.novelList.forEach((novel, index) => {
                hilog.info(0x0000, TAG, `小说${index + 1}: ${novel.title} - ${novel.author}`);
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '解析热门内容失败: ' + JSON.stringify(error));
            this.errorMessage = '解析数据失败';
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
                                Image.borderRadius(12);
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
                                Column.borderRadius({ bottomLeft: 12, bottomRight: 12 });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(novel.title);
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
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
            Column.alignItems(HorizontalAlign.Center);
            Column.backgroundColor('#F1F3F5');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create('小说推荐');
            // 标题
            Text.fontSize(24);
            // 标题
            Text.fontWeight(FontWeight.Bold);
            // 标题
            Text.margin({ top: 20, bottom: 20 });
        }, Text);
        // 标题
        Text.pop();
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
                        Text.fontColor('#FF0000');
                        // 错误状态
                        Text.margin({ bottom: 16 });
                    }, Text);
                    // 错误状态
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
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
