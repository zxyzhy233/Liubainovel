import relationalStore from "@ohos:data.relationalStore";
import hilog from "@ohos:hilog";
import { BookInfo } from "@bundle:liubai.yuedu.hos/entry/ets/common/BookInfo";
import type common from "@ohos:app.ability.common";
const TAG: string = 'BookDataManager';
const DB_NAME = 'BookShelf.db';
const TABLE_NAME = 'books';
const SQL_CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookName TEXT NOT NULL,
    author TEXT,
    filePath TEXT NOT NULL UNIQUE,
    coverPath TEXT,
    progress TEXT,
    lastReadTime INTEGER,
    resourceIndex INTEGER,
    domPos TEXT
  )
`;
class BookDataManager {
    private rdbStore: relationalStore.RdbStore | null = null;
    async init(context: common.UIAbilityContext): Promise<void> {
        if (this.rdbStore) {
            return;
        }
        try {
            const storeConfig: relationalStore.StoreConfig = {
                name: DB_NAME,
                securityLevel: relationalStore.SecurityLevel.S1
            };
            this.rdbStore = await relationalStore.getRdbStore(context, storeConfig);
            await this.rdbStore.executeSql(SQL_CREATE_TABLE);
            // Check if 'author' column exists
            const columns = await this.rdbStore.querySql(`PRAGMA table_info(${TABLE_NAME})`);
            let hasAuthorColumn = false;
            while (columns.goToNextRow()) {
                if (columns.getString(columns.getColumnIndex('name')) === 'author') {
                    hasAuthorColumn = true;
                    break;
                }
            }
            columns.close();
            // If 'author' column does not exist, add it
            if (!hasAuthorColumn) {
                await this.rdbStore.executeSql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN author TEXT`);
                hilog.info(0x0000, TAG, 'Database schema updated: added author column.');
            }
            hilog.info(0x0000, TAG, 'Database init success.');
        }
        catch (e) {
            hilog.error(0x0000, TAG, `Database init failed, error: ${e}`);
        }
    }
    async insertBook(book: BookInfo): Promise<number> {
        if (!this.rdbStore) {
            hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
            return -1;
        }
        const valueBucket: relationalStore.ValuesBucket = {
            bookName: book.bookName,
            author: book.author,
            filePath: book.filePath,
            coverPath: book.coverPath,
            progress: book.progress,
            lastReadTime: book.lastReadTime
        };
        try {
            const newRowId = await this.rdbStore.insert(TABLE_NAME, valueBucket);
            hilog.info(0x0000, TAG, `Insert book success, row id: ${newRowId}`);
            return newRowId;
        }
        catch (e) {
            hilog.error(0x0000, TAG, `Insert book failed, error: ${e}`);
            return -1;
        }
    }
    async queryAllBooks(): Promise<BookInfo[]> {
        if (!this.rdbStore) {
            hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
            return [];
        }
        const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
        try {
            const resultSet = await this.rdbStore.query(predicates);
            const books: BookInfo[] = [];
            if (resultSet.rowCount > 0) {
                while (resultSet.goToNextRow()) {
                    const book = new BookInfo();
                    book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
                    book.bookName = resultSet.getString(resultSet.getColumnIndex('bookName'));
                    book.author = resultSet.getString(resultSet.getColumnIndex('author'));
                    book.filePath = resultSet.getString(resultSet.getColumnIndex('filePath'));
                    book.coverPath = resultSet.getString(resultSet.getColumnIndex('coverPath'));
                    book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
                    book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
                    book.resourceIndex = resultSet.getLong(resultSet.getColumnIndex('resourceIndex'));
                    book.domPos = resultSet.getString(resultSet.getColumnIndex('domPos'));
                    books.push(book);
                }
            }
            resultSet.close();
            hilog.info(0x0000, TAG, 'Query all books success.');
            return books;
        }
        catch (e) {
            hilog.error(0x0000, TAG, `Query all books failed, error: ${e}`);
            return [];
        }
    }
    async queryBooksByName(bookName: string): Promise<BookInfo[]> {
        if (!this.rdbStore) {
            hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
            return [];
        }
        const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
        predicates.like('bookName', `%${bookName}%`);
        try {
            const resultSet = await this.rdbStore.query(predicates);
            const books: BookInfo[] = [];
            if (resultSet.rowCount > 0) {
                while (resultSet.goToNextRow()) {
                    const book = new BookInfo();
                    book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
                    book.bookName = resultSet.getString(resultSet.getColumnIndex('bookName'));
                    book.author = resultSet.getString(resultSet.getColumnIndex('author'));
                    book.filePath = resultSet.getString(resultSet.getColumnIndex('filePath'));
                    book.coverPath = resultSet.getString(resultSet.getColumnIndex('coverPath'));
                    book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
                    book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
                    book.resourceIndex = resultSet.getLong(resultSet.getColumnIndex('resourceIndex'));
                    book.domPos = resultSet.getString(resultSet.getColumnIndex('domPos'));
                    books.push(book);
                }
            }
            resultSet.close();
            hilog.info(0x0000, TAG, 'Query books by name success.');
            return books;
        }
        catch (e) {
            hilog.error(0x0000, TAG, `Query books by name failed, error: ${e}`);
            return [];
        }
    }
    /**
     * 更新书籍阅读记录（仅用于书架显示）
     * @param filePath 文件路径
     * @param chapterName 章节名（用于书架显示已读章节）
     */
    async updateBookReadingRecord(filePath: string, chapterName: string): Promise<void> {
        if (!this.rdbStore) {
            hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
            return;
        }
        try {
            const valueBucket: relationalStore.ValuesBucket = {
                progress: chapterName,
                lastReadTime: new Date().getTime()
            };
            const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
            predicates.equalTo('filePath', filePath);
            await this.rdbStore.update(valueBucket, predicates);
            hilog.info(0x0000, TAG, `Updated book reading record: ${filePath}, chapterName=${chapterName}`);
        }
        catch (err) {
            hilog.error(0x0000, TAG, `Failed to update book reading record: ${JSON.stringify(err)}`);
        }
    }
    /**
     * 更新书籍阅读进度（已废弃，保留用于兼容性）
     * @deprecated 使用 updateBookReadingRecord 替代
     */
    async updateBookProgress(filePath: string, resourceIndex: number, domPos: string, chapterName: string): Promise<void> {
        hilog.warn(0x0000, TAG, 'updateBookProgress is deprecated, use updateBookReadingRecord instead');
        await this.updateBookReadingRecord(filePath, chapterName);
    }
    async deleteBooksByIds(ids: number[]): Promise<void> {
        if (!this.rdbStore) {
            hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
            return;
        }
        if (!ids || ids.length === 0) {
            return;
        }
        const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
        predicates.in('id', ids);
        try {
            await this.rdbStore.delete(predicates);
            hilog.info(0x0000, TAG, `Delete books success, ids: ${ids.join(',')}`);
        }
        catch (e) {
            hilog.error(0x0000, TAG, `Delete books failed, error: ${e}`);
        }
    }
}
export const bookDataManager = new BookDataManager();
