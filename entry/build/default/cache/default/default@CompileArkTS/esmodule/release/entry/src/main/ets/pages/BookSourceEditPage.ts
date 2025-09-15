if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
import hilog from "@ohos:hilog";
import router from "@ohos:router";
const TAG: string = 'BookSourceEditPage';
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
 * 完整书源信息接口
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
    loginUrl?: string;
    concurrentRate?: string;
    loginCheckJs?: string;
    loginUi?: string;
    variableComment?: string;
}
/**
 * 页面参数接口
 */
interface PageParams {
    isEdit?: boolean;
    sourceData?: BookSourceInfo;
}
class BookSourceEditPage extends ViewV2 {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda, extraInfo) {
        super(parent, elmtId, extraInfo);
        this.isEdit = false;
        this.currentTab = 0;
        this.bookSourceName = '';
        this.bookSourceUrl = '';
        this.bookSourceGroup = '';
        this.bookSourceComment = '';
        this.bookSourceType = 0;
        this.sourceEnabled = true;
        this.enabledCookieJar = true;
        this.enabledExplore = true;
        this.enabledReview = false;
        this.header = '';
        this.searchUrl = '';
        this.exploreUrl = '';
        this.bookUrlPattern = '';
        this.weight = 0;
        this.customOrder = 0;
        this.searchAuthor = '';
        this.searchBookList = '';
        this.searchBookUrl = '';
        this.searchCoverUrl = '';
        this.searchName = '';
        this.searchLastChapter = '';
        this.searchKind = '';
        this.searchWordCount = '';
        this.searchCheckKeyWord = '';
        this.exploreAuthor = '';
        this.exploreBookList = '';
        this.exploreBookUrl = '';
        this.exploreCoverUrl = '';
        this.exploreName = '';
        this.exploreLastChapter = '';
        this.exploreKind = '';
        this.exploreWordCount = '';
        this.bookInfoAuthor = '';
        this.bookInfoCoverUrl = '';
        this.bookInfoIntro = '';
        this.bookInfoKind = '';
        this.bookInfoLastChapter = '';
        this.bookInfoName = '';
        this.bookInfoTocUrl = '';
        this.bookInfoWordCount = '';
        this.bookInfoInit = '';
        this.tocChapterList = '';
        this.tocChapterName = '';
        this.tocChapterUrl = '';
        this.tocNextTocUrl = '';
        this.contentContent = '';
        this.contentNextContentUrl = '';
        this.contentReplaceRegex = '';
        this.finalizeConstruction();
    }
    @Local
    isEdit: boolean; // 是否为编辑模式
    @Local
    currentTab: number; // 当前选中的标签页
    // 基本信息
    @Local
    bookSourceName: string;
    @Local
    bookSourceUrl: string;
    @Local
    bookSourceGroup: string;
    @Local
    bookSourceComment: string;
    @Local
    bookSourceType: number;
    @Local
    sourceEnabled: boolean;
    @Local
    enabledCookieJar: boolean;
    @Local
    enabledExplore: boolean;
    @Local
    enabledReview: boolean;
    @Local
    header: string;
    @Local
    searchUrl: string;
    @Local
    exploreUrl: string;
    @Local
    bookUrlPattern: string;
    @Local
    weight: number;
    @Local
    customOrder: number;
    // 搜索规则
    @Local
    searchAuthor: string;
    @Local
    searchBookList: string;
    @Local
    searchBookUrl: string;
    @Local
    searchCoverUrl: string;
    @Local
    searchName: string;
    @Local
    searchLastChapter: string;
    @Local
    searchKind: string;
    @Local
    searchWordCount: string;
    @Local
    searchCheckKeyWord: string;
    // 发现规则
    @Local
    exploreAuthor: string;
    @Local
    exploreBookList: string;
    @Local
    exploreBookUrl: string;
    @Local
    exploreCoverUrl: string;
    @Local
    exploreName: string;
    @Local
    exploreLastChapter: string;
    @Local
    exploreKind: string;
    @Local
    exploreWordCount: string;
    // 书籍信息规则
    @Local
    bookInfoAuthor: string;
    @Local
    bookInfoCoverUrl: string;
    @Local
    bookInfoIntro: string;
    @Local
    bookInfoKind: string;
    @Local
    bookInfoLastChapter: string;
    @Local
    bookInfoName: string;
    @Local
    bookInfoTocUrl: string;
    @Local
    bookInfoWordCount: string;
    @Local
    bookInfoInit: string;
    // 目录规则
    @Local
    tocChapterList: string;
    @Local
    tocChapterName: string;
    @Local
    tocChapterUrl: string;
    @Local
    tocNextTocUrl: string;
    // 内容规则
    @Local
    contentContent: string;
    @Local
    contentNextContentUrl: string;
    @Local
    contentReplaceRegex: string;
    /**
     * 页面显示时初始化数据
     */
    async aboutToAppear() {
        try {
            const params = router.getParams() as PageParams;
            if (params) {
                this.isEdit = params.isEdit || false;
                if (this.isEdit && params.sourceData) {
                    this.loadSourceData(params.sourceData);
                }
            }
            hilog.info(0x0000, TAG, `页面初始化完成，编辑模式: ${this.isEdit}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '页面初始化失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 加载书源数据到表单
     * @param sourceData 书源数据
     */
    private loadSourceData(sourceData: BookSourceInfo): void {
        // 基本信息
        this.bookSourceName = sourceData.bookSourceName || '';
        this.bookSourceUrl = sourceData.bookSourceUrl || '';
        this.bookSourceGroup = sourceData.bookSourceGroup || '';
        this.bookSourceComment = sourceData.bookSourceComment || '';
        this.bookSourceType = sourceData.bookSourceType || 0;
        this.sourceEnabled = sourceData.enabled !== false;
        this.enabledCookieJar = sourceData.enabledCookieJar !== false;
        this.enabledExplore = sourceData.enabledExplore !== false;
        this.enabledReview = sourceData.enabledReview || false;
        this.header = sourceData.header || '';
        this.searchUrl = sourceData.searchUrl || '';
        this.exploreUrl = sourceData.exploreUrl || '';
        this.bookUrlPattern = sourceData.bookUrlPattern || '';
        this.weight = sourceData.weight || 0;
        this.customOrder = sourceData.customOrder || 0;
        // 搜索规则
        if (sourceData.ruleSearch) {
            this.searchAuthor = sourceData.ruleSearch.author || '';
            this.searchBookList = sourceData.ruleSearch.bookList || '';
            this.searchBookUrl = sourceData.ruleSearch.bookUrl || '';
            this.searchCoverUrl = sourceData.ruleSearch.coverUrl || '';
            this.searchName = sourceData.ruleSearch.name || '';
            this.searchLastChapter = sourceData.ruleSearch.lastChapter || '';
            this.searchKind = sourceData.ruleSearch.kind || '';
            this.searchWordCount = sourceData.ruleSearch.wordCount || '';
            this.searchCheckKeyWord = sourceData.ruleSearch.checkKeyWord || '';
        }
        // 发现规则
        if (sourceData.ruleExplore) {
            this.exploreAuthor = sourceData.ruleExplore.author || '';
            this.exploreBookList = sourceData.ruleExplore.bookList || '';
            this.exploreBookUrl = sourceData.ruleExplore.bookUrl || '';
            this.exploreCoverUrl = sourceData.ruleExplore.coverUrl || '';
            this.exploreName = sourceData.ruleExplore.name || '';
            this.exploreLastChapter = sourceData.ruleExplore.lastChapter || '';
            this.exploreKind = sourceData.ruleExplore.kind || '';
            this.exploreWordCount = sourceData.ruleExplore.wordCount || '';
        }
        // 书籍信息规则
        if (sourceData.ruleBookInfo) {
            this.bookInfoAuthor = sourceData.ruleBookInfo.author || '';
            this.bookInfoCoverUrl = sourceData.ruleBookInfo.coverUrl || '';
            this.bookInfoIntro = sourceData.ruleBookInfo.intro || '';
            this.bookInfoKind = sourceData.ruleBookInfo.kind || '';
            this.bookInfoLastChapter = sourceData.ruleBookInfo.lastChapter || '';
            this.bookInfoName = sourceData.ruleBookInfo.name || '';
            this.bookInfoTocUrl = sourceData.ruleBookInfo.tocUrl || '';
            this.bookInfoWordCount = sourceData.ruleBookInfo.wordCount || '';
            this.bookInfoInit = sourceData.ruleBookInfo.init || '';
        }
        // 目录规则
        if (sourceData.ruleToc) {
            this.tocChapterList = sourceData.ruleToc.chapterList || '';
            this.tocChapterName = sourceData.ruleToc.chapterName || '';
            this.tocChapterUrl = sourceData.ruleToc.chapterUrl || '';
            this.tocNextTocUrl = sourceData.ruleToc.nextTocUrl || '';
        }
        // 内容规则
        if (sourceData.ruleContent) {
            this.contentContent = sourceData.ruleContent.content || '';
            this.contentNextContentUrl = sourceData.ruleContent.nextContentUrl || '';
            this.contentReplaceRegex = sourceData.ruleContent.replaceRegex || '';
        }
    }
    /**
     * 保存书源数据
     */
    private saveBookSource(): void {
        // 验证必填字段
        if (!this.bookSourceName.trim()) {
            hilog.warn(0x0000, TAG, '书源名称不能为空');
            return;
        }
        if (!this.bookSourceUrl.trim()) {
            hilog.warn(0x0000, TAG, '书源URL不能为空');
            return;
        }
        // 构建书源数据
        const sourceData: BookSourceInfo = {
            bookSourceName: this.bookSourceName.trim(),
            bookSourceUrl: this.bookSourceUrl.trim(),
            bookSourceGroup: this.bookSourceGroup.trim(),
            bookSourceComment: this.bookSourceComment.trim(),
            bookSourceType: this.bookSourceType,
            enabled: this.sourceEnabled,
            enabledCookieJar: this.enabledCookieJar,
            enabledExplore: this.enabledExplore,
            enabledReview: this.enabledReview,
            header: this.header.trim(),
            searchUrl: this.searchUrl.trim(),
            exploreUrl: this.exploreUrl.trim(),
            bookUrlPattern: this.bookUrlPattern.trim(),
            weight: this.weight,
            customOrder: this.customOrder,
            lastUpdateTime: Date.now(),
            respondTime: 0,
            ruleSearch: {
                author: this.searchAuthor.trim(),
                bookList: this.searchBookList.trim(),
                bookUrl: this.searchBookUrl.trim(),
                coverUrl: this.searchCoverUrl.trim(),
                name: this.searchName.trim(),
                lastChapter: this.searchLastChapter.trim(),
                kind: this.searchKind.trim(),
                wordCount: this.searchWordCount.trim(),
                checkKeyWord: this.searchCheckKeyWord.trim()
            },
            ruleExplore: {
                author: this.exploreAuthor.trim(),
                bookList: this.exploreBookList.trim(),
                bookUrl: this.exploreBookUrl.trim(),
                coverUrl: this.exploreCoverUrl.trim(),
                name: this.exploreName.trim(),
                lastChapter: this.exploreLastChapter.trim(),
                kind: this.exploreKind.trim(),
                wordCount: this.exploreWordCount.trim()
            },
            ruleBookInfo: {
                author: this.bookInfoAuthor.trim(),
                coverUrl: this.bookInfoCoverUrl.trim(),
                intro: this.bookInfoIntro.trim(),
                kind: this.bookInfoKind.trim(),
                lastChapter: this.bookInfoLastChapter.trim(),
                name: this.bookInfoName.trim(),
                tocUrl: this.bookInfoTocUrl.trim(),
                wordCount: this.bookInfoWordCount.trim(),
                init: this.bookInfoInit.trim()
            },
            ruleToc: {
                chapterList: this.tocChapterList.trim(),
                chapterName: this.tocChapterName.trim(),
                chapterUrl: this.tocChapterUrl.trim(),
                nextTocUrl: this.tocNextTocUrl.trim()
            },
            ruleContent: {
                content: this.contentContent.trim(),
                nextContentUrl: this.contentNextContentUrl.trim(),
                replaceRegex: this.contentReplaceRegex.trim()
            },
            ruleReview: {}
        };
        hilog.info(0x0000, TAG, `${this.isEdit ? '更新' : '保存'}书源: ${sourceData.bookSourceName}`);
        // 返回上一页并传递数据
        router.back({
            url: 'pages/BookSourcePage',
            params: {
                action: this.isEdit ? 'update' : 'add',
                sourceData: sourceData
            }
        });
    }
    /**
     * 返回上一页
     */
    private goBack(): void {
        router.back();
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
            Row.backgroundColor(Color.White);
            Row.shadow({
                radius: 2,
                color: '#10000000',
                offsetY: 1
            });
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
            Text.create(this.isEdit ? '编辑书源' : '新建书源');
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
            // 保存按钮
            Button.createWithLabel('保存');
            // 保存按钮
            Button.fontSize(16);
            // 保存按钮
            Button.fontColor('#3182CE');
            // 保存按钮
            Button.backgroundColor(Color.Transparent);
            // 保存按钮
            Button.onClick(() => {
                this.saveBookSource();
            });
        }, Button);
        // 保存按钮
        Button.pop();
        Row.pop();
    }
    /**
     * 构建标签页导航
     */
    private buildTabBar(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.scrollable(ScrollDirection.Horizontal);
            Scroll.scrollBar(BarState.Off);
            Scroll.width('100%');
            Scroll.padding({ left: 16, right: 16, top: 12, bottom: 12 });
            Scroll.backgroundColor(Color.White);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.justifyContent(FlexAlign.Start);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const tab = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(tab);
                    Text.fontSize(14);
                    Text.fontColor(this.currentTab === index ? '#3182CE' : '#718096');
                    Text.fontWeight(this.currentTab === index ? FontWeight.Medium : FontWeight.Normal);
                    Text.padding({ left: 12, right: 12, top: 8, bottom: 8 });
                    Text.borderRadius(16);
                    Text.backgroundColor(this.currentTab === index ? '#EBF8FF' : Color.Transparent);
                    Text.margin({ right: 8 });
                    Text.onClick(() => {
                        this.currentTab = index;
                    });
                }, Text);
                Text.pop();
            };
            this.forEachUpdateFunction(elmtId, ['基本信息', '搜索规则', '发现规则', '书籍信息', '目录规则', '内容规则'], forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        Row.pop();
        Scroll.pop();
    }
    /**
     * 构建输入框
     */
    private buildInputField(label: string, placeholder: string, value: string, onValueChange: (value: string) => void, multiline: boolean = false, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.margin({ bottom: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(label);
            Text.fontSize(14);
            Text.fontColor('#4A5568');
            Text.width('100%');
            Text.textAlign(TextAlign.Start);
            Text.margin({ bottom: 8 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (multiline) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        TextArea.create({ placeholder: placeholder, text: value });
                        TextArea.fontSize(16);
                        TextArea.backgroundColor('#F7FAFC');
                        TextArea.borderRadius(8);
                        TextArea.padding({ left: 12, right: 12, top: 12, bottom: 12 });
                        TextArea.height(80);
                        TextArea.onChange((value: string) => {
                            onValueChange(value);
                        });
                    }, TextArea);
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        TextInput.create({ placeholder: placeholder, text: value });
                        TextInput.fontSize(16);
                        TextInput.backgroundColor('#F7FAFC');
                        TextInput.borderRadius(8);
                        TextInput.padding({ left: 12, right: 12, top: 12, bottom: 12 });
                        TextInput.onChange((value: string) => {
                            onValueChange(value);
                        });
                    }, TextInput);
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    /**
     * 构建开关控件
     */
    private buildSwitchField(label: string, description: string, value: boolean, onValueChange: (value: boolean) => void, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(label);
            Text.fontSize(14);
            Text.fontColor('#4A5568');
            Text.width('100%');
            Text.textAlign(TextAlign.Start);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (description) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(description);
                        Text.fontSize(12);
                        Text.fontColor('#718096');
                        Text.width('100%');
                        Text.textAlign(TextAlign.Start);
                        Text.margin({ top: 4 });
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Toggle.create({ type: ToggleType.Switch, isOn: value });
            Toggle.onChange((isOn: boolean) => {
                onValueChange(isOn);
            });
        }, Toggle);
        Toggle.pop();
        Row.pop();
    }
    /**
     * 构建基本信息标签页
     */
    private buildBasicInfoTab(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(16);
        }, Column);
        this.buildInputField.bind(this)('书源名称 *', '请输入书源名称', this.bookSourceName, (value: string) => {
            this.bookSourceName = value;
        });
        this.buildInputField.bind(this)('书源URL *', '请输入书源URL', this.bookSourceUrl, (value: string) => {
            this.bookSourceUrl = value;
        });
        this.buildInputField.bind(this)('书源分组', '请输入书源分组', this.bookSourceGroup, (value: string) => {
            this.bookSourceGroup = value;
        });
        this.buildInputField.bind(this)('书源注释', '请输入书源注释', this.bookSourceComment, (value: string) => {
            this.bookSourceComment = value;
        }, true);
        this.buildInputField.bind(this)('搜索URL', '请输入搜索URL', this.searchUrl, (value: string) => {
            this.searchUrl = value;
        });
        this.buildInputField.bind(this)('发现URL', '请输入发现URL', this.exploreUrl, (value: string) => {
            this.exploreUrl = value;
        });
        this.buildInputField.bind(this)('书籍URL模式', '请输入书籍URL模式', this.bookUrlPattern, (value: string) => {
            this.bookUrlPattern = value;
        });
        this.buildInputField.bind(this)('请求头', '请输入请求头（JSON格式）', this.header, (value: string) => {
            this.header = value;
        }, true);
        this.buildSwitchField.bind(this)('启用书源', '是否启用此书源', this.sourceEnabled, (value: boolean) => {
            this.sourceEnabled = value;
        });
        this.buildSwitchField.bind(this)('启用Cookie', '是否启用Cookie管理', this.enabledCookieJar, (value: boolean) => {
            this.enabledCookieJar = value;
        });
        this.buildSwitchField.bind(this)('启用发现', '是否启用发现功能', this.enabledExplore, (value: boolean) => {
            this.enabledExplore = value;
        });
        this.buildSwitchField.bind(this)('启用评论', '是否启用评论功能', this.enabledReview, (value: boolean) => {
            this.enabledReview = value;
        });
        Column.pop();
    }
    /**
     * 构建搜索规则标签页
     */
    private buildSearchRuleTab(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(16);
        }, Column);
        this.buildInputField.bind(this)('书籍列表', '书籍列表选择器', this.searchBookList, (value: string) => {
            this.searchBookList = value;
        });
        this.buildInputField.bind(this)('书籍名称', '书籍名称选择器', this.searchName, (value: string) => {
            this.searchName = value;
        });
        this.buildInputField.bind(this)('作者', '作者选择器', this.searchAuthor, (value: string) => {
            this.searchAuthor = value;
        });
        this.buildInputField.bind(this)('书籍URL', '书籍URL选择器', this.searchBookUrl, (value: string) => {
            this.searchBookUrl = value;
        });
        this.buildInputField.bind(this)('封面URL', '封面URL选择器', this.searchCoverUrl, (value: string) => {
            this.searchCoverUrl = value;
        });
        this.buildInputField.bind(this)('最新章节', '最新章节选择器', this.searchLastChapter, (value: string) => {
            this.searchLastChapter = value;
        });
        this.buildInputField.bind(this)('分类', '分类选择器', this.searchKind, (value: string) => {
            this.searchKind = value;
        });
        this.buildInputField.bind(this)('字数', '字数选择器', this.searchWordCount, (value: string) => {
            this.searchWordCount = value;
        });
        this.buildInputField.bind(this)('关键词验证', '关键词验证规则', this.searchCheckKeyWord, (value: string) => {
            this.searchCheckKeyWord = value;
        });
        Column.pop();
    }
    /**
     * 构建发现规则标签页
     */
    private buildExploreRuleTab(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(16);
        }, Column);
        this.buildInputField.bind(this)('书籍列表', '书籍列表选择器', this.exploreBookList, (value: string) => {
            this.exploreBookList = value;
        });
        this.buildInputField.bind(this)('书籍名称', '书籍名称选择器', this.exploreName, (value: string) => {
            this.exploreName = value;
        });
        this.buildInputField.bind(this)('作者', '作者选择器', this.exploreAuthor, (value: string) => {
            this.exploreAuthor = value;
        });
        this.buildInputField.bind(this)('书籍URL', '书籍URL选择器', this.exploreBookUrl, (value: string) => {
            this.exploreBookUrl = value;
        });
        this.buildInputField.bind(this)('封面URL', '封面URL选择器', this.exploreCoverUrl, (value: string) => {
            this.exploreCoverUrl = value;
        });
        this.buildInputField.bind(this)('最新章节', '最新章节选择器', this.exploreLastChapter, (value: string) => {
            this.exploreLastChapter = value;
        });
        this.buildInputField.bind(this)('分类', '分类选择器', this.exploreKind, (value: string) => {
            this.exploreKind = value;
        });
        this.buildInputField.bind(this)('字数', '字数选择器', this.exploreWordCount, (value: string) => {
            this.exploreWordCount = value;
        });
        Column.pop();
    }
    /**
     * 构建书籍信息规则标签页
     */
    private buildBookInfoRuleTab(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(16);
        }, Column);
        this.buildInputField.bind(this)('书籍名称', '书籍名称选择器', this.bookInfoName, (value: string) => {
            this.bookInfoName = value;
        });
        this.buildInputField.bind(this)('作者', '作者选择器', this.bookInfoAuthor, (value: string) => {
            this.bookInfoAuthor = value;
        });
        this.buildInputField.bind(this)('封面URL', '封面URL选择器', this.bookInfoCoverUrl, (value: string) => {
            this.bookInfoCoverUrl = value;
        });
        this.buildInputField.bind(this)('简介', '简介选择器', this.bookInfoIntro, (value: string) => {
            this.bookInfoIntro = value;
        });
        this.buildInputField.bind(this)('分类', '分类选择器', this.bookInfoKind, (value: string) => {
            this.bookInfoKind = value;
        });
        this.buildInputField.bind(this)('最新章节', '最新章节选择器', this.bookInfoLastChapter, (value: string) => {
            this.bookInfoLastChapter = value;
        });
        this.buildInputField.bind(this)('目录URL', '目录URL选择器', this.bookInfoTocUrl, (value: string) => {
            this.bookInfoTocUrl = value;
        });
        this.buildInputField.bind(this)('字数', '字数选择器', this.bookInfoWordCount, (value: string) => {
            this.bookInfoWordCount = value;
        });
        this.buildInputField.bind(this)('初始化', '初始化脚本', this.bookInfoInit, (value: string) => {
            this.bookInfoInit = value;
        }, true);
        Column.pop();
    }
    /**
     * 构建目录规则标签页
     */
    private buildTocRuleTab(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(16);
        }, Column);
        this.buildInputField.bind(this)('章节列表', '章节列表选择器', this.tocChapterList, (value: string) => {
            this.tocChapterList = value;
        });
        this.buildInputField.bind(this)('章节名称', '章节名称选择器', this.tocChapterName, (value: string) => {
            this.tocChapterName = value;
        });
        this.buildInputField.bind(this)('章节URL', '章节URL选择器', this.tocChapterUrl, (value: string) => {
            this.tocChapterUrl = value;
        });
        this.buildInputField.bind(this)('下一页URL', '下一页URL选择器', this.tocNextTocUrl, (value: string) => {
            this.tocNextTocUrl = value;
        });
        Column.pop();
    }
    /**
     * 构建内容规则标签页
     */
    private buildContentRuleTab(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(16);
        }, Column);
        this.buildInputField.bind(this)('正文内容', '正文内容选择器', this.contentContent, (value: string) => {
            this.contentContent = value;
        });
        this.buildInputField.bind(this)('下一页URL', '下一页URL选择器', this.contentNextContentUrl, (value: string) => {
            this.contentNextContentUrl = value;
        });
        this.buildInputField.bind(this)('替换规则', '内容替换正则表达式', this.contentReplaceRegex, (value: string) => {
            this.contentReplaceRegex = value;
        }, true);
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
        // 标签页导航
        this.buildTabBar.bind(this)();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 内容区域
            Scroll.create();
            // 内容区域
            Scroll.layoutWeight(1);
            // 内容区域
            Scroll.scrollBar(BarState.Off);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.currentTab === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.buildBasicInfoTab.bind(this)();
                });
            }
            else if (this.currentTab === 1) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.buildSearchRuleTab.bind(this)();
                });
            }
            else if (this.currentTab === 2) {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.buildExploreRuleTab.bind(this)();
                });
            }
            else if (this.currentTab === 3) {
                this.ifElseBranchUpdateFunction(3, () => {
                    this.buildBookInfoRuleTab.bind(this)();
                });
            }
            else if (this.currentTab === 4) {
                this.ifElseBranchUpdateFunction(4, () => {
                    this.buildTocRuleTab.bind(this)();
                });
            }
            else if (this.currentTab === 5) {
                this.ifElseBranchUpdateFunction(5, () => {
                    this.buildContentRuleTab.bind(this)();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(6, () => {
                });
            }
        }, If);
        If.pop();
        Column.pop();
        // 内容区域
        Scroll.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "BookSourceEditPage";
    }
}
export { BookSourceEditPage };
registerNamedRoute(() => new BookSourceEditPage(undefined, {}), "", { bundleName: "com.example.readerkitdemo", moduleName: "entry", pagePath: "pages/BookSourceEditPage", pageFullPath: "entry/src/main/ets/pages/BookSourceEditPage", integratedHsp: "false", moduleType: "followWithHap" });
