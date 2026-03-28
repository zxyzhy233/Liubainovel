
/*
 reader_sdl_cached.c
 SDL2 + SDL2_ttf + SDL2_image 简易阅读器 Demo（带页面缓存与预渲染队列）

 主要改动：页面缓存（SDL_Texture）、LRU 驱逐、主循环渐进预渲染（避免跨线程 texture 操作）。
 目标：打开 20MB+ 文本也能快速翻页不卡顿（视可用内存与字体大小而定）。

 依赖：
   - SDL2, SDL2_ttf, SDL2_image
   - unzip (用于 EPUB 简易解析)
   - pdftotext (可选，用于 PDF 文本抽取)

 编译（Debian/Ubuntu）:
   sudo apt install libsdl2-dev libsdl2-ttf-dev libsdl2-image-dev
   gcc -std=c99 -O2 -o reader_sdl_cached reader_sdl_cached.c `sdl2-config --cflags --libs` -lSDL2_ttf -lSDL2_image

 运行:
   ./reader_sdl_cached book.txt
   ./reader_sdl_cached book.epub
   ./reader_sdl_cached book.pdf   (需要 pdftotext)

 键位:
   ← → : 翻页
   ↑ ↓ : 切章
   + / -: 改变字号
   l / L: 调整行距
   b    : 切换背景
   s    : 输入搜索关键词（在终端输入）
   g    : 跳页（在终端输入）
   q/Esc: 退出

 注意:
  - 本 Demo 为教学/原型级：EPUB/HTML 解析简化，不处理 CSS/复杂 HTML。
  - 页面缓存会占用显存与系统内存（纹理存储），请按机器内存调整 MAX_CACHE_BYTES / MAX_CACHE_PAGES。
*/

#define _XOPEN_SOURCE 700
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <locale.h>
#include <wchar.h>
#include <wctype.h>
#include <unistd.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/wait.h>

#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <SDL2/SDL_image.h>

/* ---------- small utilities ---------- */
char *read_stream_all(FILE *f) {
    size_t cap = 1<<16, len = 0;
    char *buf = malloc(cap);
    if (!buf) return NULL;
    size_t n;
    while ((n = fread(buf+len,1,4096,f)) > 0) {
        len += n;
        if (len + 4096 > cap) {
            cap *= 2;
            char *nb = realloc(buf, cap);
            if (!nb) { free(buf); return NULL; }
            buf = nb;
        }
    }
    buf[len]=0;
    return buf;
}
char *read_file_all(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    char *s = read_stream_all(f);
    fclose(f);
    return s;
}

/* ---------- strip html tags (very naive) ---------- */
char *strip_tags(const char *in) {
    size_t n = strlen(in);
    char *o = malloc(n+1);
    if (!o) return NULL;
    size_t oi = 0;
    int in_tag = 0;
    for (size_t i=0;i<n;i++) {
        unsigned char c = in[i];
        if (c == '<') { in_tag = 1; continue; }
        if (c == '>') { in_tag = 0; continue; }
        if (!in_tag) o[oi++] = in[i];
    }
    o[oi]=0;
    return o;
}

/* ---------- unzip helpers for epub ---------- */
char *unzip_p_entry(const char *epub_path, const char *entry) {
    char cmd[4096];
    snprintf(cmd, sizeof(cmd), "unzip -p '%s' '%s' 2>/dev/null", epub_path, entry);
    FILE *fp = popen(cmd, "r");
    if (!fp) return NULL;
    char *res = read_stream_all(fp);
    pclose(fp);
    return res;
}
char *unzip_read_container_fullpath(const char *epub_path) {
    char *cont = unzip_p_entry(epub_path, "META-INF/container.xml");
    if (!cont) return NULL;
    char *p = strstr(cont, "full-path");
    if (!p) { free(cont); return NULL; }
    p = strchr(p, '"');
    if (!p) { free(cont); return NULL; }
    p++;
    char *q = strchr(p, '"');
    if (!q) { free(cont); return NULL; }
    size_t len = q - p;
    char *path = malloc(len+1);
    memcpy(path, p, len); path[len]=0;
    free(cont);
    return path;
}

/* ---------- simple epub parse (naive) ---------- */
typedef struct {
    char *title;
    char *content;
} Chapter;
typedef struct {
    Chapter *items;
    size_t count;
} ChapterList;

/* xml attr helper */
static char *xml_get_attr_value(const char *s, const char *attr) {
    char pat[128]; snprintf(pat,sizeof(pat), "%s=\"", attr);
    char *p = strstr(s, pat);
    if (!p) return NULL;
    p += strlen(pat);
    char *q = strchr(p, '"');
    if (!q) return NULL;
    size_t len = q-p;
    char *v = malloc(len+1);
    memcpy(v,p,len); v[len]=0;
    return v;
}

/* parse manifest & spine naive */
typedef struct { char *id; char *href; } ManifestItem;
typedef struct { ManifestItem *items; size_t count; } Manifest;
static Manifest parse_manifest(const char *opf) {
    Manifest m = {NULL,0};
    const char *p = opf;
    while ((p = strstr(p, "<item")) != NULL) {
        const char *end = strchr(p, '>');
        if (!end) break;
        size_t seglen = end - p + 1;
        char *seg = malloc(seglen+1);
        memcpy(seg,p,seglen); seg[seglen]=0;
        char *id = xml_get_attr_value(seg, "id");
        char *href = xml_get_attr_value(seg, "href");
        if (id && href) {
            m.items = realloc(m.items, sizeof(ManifestItem)*(m.count+1));
            m.items[m.count].id = id;
            m.items[m.count].href = href;
            m.count++;
        } else { free(id); free(href); }
        free(seg);
        p = end+1;
    }
    return m;
}
static char **parse_spine(const char *opf, size_t *out_count) {
    *out_count = 0;
    char *sp = strstr(opf, "<spine");
    if (!sp) return NULL;
    char *close = strstr(sp, "</spine>");
    if (!close) close = sp;
    const char *p = sp;
    char **arr = NULL;
    while ((p = strstr(p, "<itemref")) != NULL && p < close) {
        char *end = strchr(p, '>');
        if (!end) break;
        size_t seglen = end - p + 1;
        char *seg = malloc(seglen+1);
        memcpy(seg,p,seglen); seg[seglen]=0;
        char *idref = xml_get_attr_value(seg, "idref");
        if (idref) {
            arr = realloc(arr, sizeof(char*)*(*out_count+1));
            arr[*out_count] = idref;
            (*out_count)++;
        }
        free(seg);
        p = end+1;
    }
    return arr;
}
static const char *manifest_resolve_href(const Manifest *m, const char *id) {
    for (size_t i=0;i<m->count;i++) if (strcmp(m->items[i].id, id)==0) return m->items[i].href;
    return NULL;
}
static char *path_join_base(const char *base, const char *rel) {
    if (!base || base[0]==0) return strdup(rel);
    size_t bl = strlen(base);
    if (base[bl-1] == '/') {
        char *res = malloc(bl + strlen(rel) + 1);
        sprintf(res, "%s%s", base, rel);
        return res;
    } else {
        char *res = malloc(bl + 1 + strlen(rel) + 1);
        sprintf(res, "%s/%s", base, rel);
        return res;
    }
}

static int parse_epub_simple(const char *path, ChapterList *out) {
    out->items = NULL; out->count = 0;
    char *opf_path = unzip_read_container_fullpath(path);
    if (!opf_path) return -1;
    char *opf = unzip_p_entry(path, opf_path);
    if (!opf) { free(opf_path); return -1; }
    char base[1024] = "";
    char *last = strrchr(opf_path, '/');
    if (last) {
        size_t bl = last - opf_path;
        strncpy(base, opf_path, bl); base[bl]=0;
    }
    Manifest m = parse_manifest(opf);
    size_t spine_count=0;
    char **spine = parse_spine(opf, &spine_count);
    for (size_t i=0;i<spine_count;i++) {
        const char *href_rel = manifest_resolve_href(&m, spine[i]);
        if (!href_rel) continue;
        char *href = path_join_base(base, href_rel);
        char *content = unzip_p_entry(path, href);
        if (!content) { free(href); continue; }
        char *title = NULL;
        char *pt = strstr(content, "<title");
        if (pt) {
            char *start = strchr(pt, '>');
            if (start) {
                start++;
                char *end = strstr(start, "</title>");
                if (end) {
                    size_t len = end-start;
                    title = malloc(len+1); memcpy(title,start,len); title[len]=0;
                }
            }
        }
        if (!title) {
            char *bn = strrchr(href, '/');
            if (bn) title = strdup(bn+1); else title = strdup(href);
        }
        char *body = NULL;
        char *pb = strcasestr(content, "<body");
        if (pb) {
            char *bstart = strchr(pb, '>');
            if (bstart) {
                bstart++;
                char *bend = strcasestr(bstart, "</body>");
                if (bend) {
                    size_t len = bend - bstart;
                    body = malloc(len+1); memcpy(body,bstart,len); body[len]=0;
                }
            }
        }
        if (!body) body = strdup(content);
        char *plain = strip_tags(body);
        free(body);
        out->items = realloc(out->items, sizeof(Chapter)*(out->count+1));
        out->items[out->count].title = title;
        out->items[out->count].content = plain;
        out->count++;
        free(content); free(href);
    }
    for (size_t i=0;i<m.count;i++) { free(m.items[i].id); free(m.items[i].href); }
    free(m.items);
    free(opf);
    free(opf_path);
    if (spine) { for (size_t i=0;i<spine_count;i++) free(spine[i]); free(spine); }
    return 0;
}

/* ---------- txt chapter parsing ---------- */
#include <regex.h>
static int is_heading_line(const char *s) {
    if (!s) return 0;
    regex_t preg;
    regcomp(&preg, "(第.{1,10}章|CHAPTER[ \\t]+[0-9]+|Chapter[ \\t]+[0-9]+)", REG_ICASE|REG_NOSUB|REG_NEWLINE);
    int r = regexec(&preg, s, 0, NULL, 0) == 0;
    regfree(&preg);
    return r;
}
static void parse_txt_chapters(const char *text, ChapterList *out) {
    out->items = NULL; out->count = 0;
    char *copy = strdup(text);
    char *p = copy;
    char *saveptr;
    size_t *offsets = NULL; size_t offsets_count=0, offsets_cap=0;
    size_t base_off = 0;
    char *line;
    while ((line = strtok_r(p, "\n", &saveptr)) != NULL) {
        if (is_heading_line(line)) {
            char *found = strstr(text + base_off, line);
            if (found) {
                size_t off = found - text;
                if (offsets_count + 1 > offsets_cap) {
                    offsets_cap = offsets_cap ? offsets_cap*2 : 8;
                    offsets = realloc(offsets, sizeof(size_t)*offsets_cap);
                }
                offsets[offsets_count++] = off;
                base_off = off + strlen(line);
            }
        }
        p = NULL;
    }
    if (offsets_count > 0) {
        for (size_t i=0;i<offsets_count;i++) {
            size_t start = offsets[i];
            size_t end = (i+1<offsets_count) ? offsets[i+1] : strlen(text);
            while (start < end && (text[start]=='\n' || text[start]=='\r' || text[start]==' ' || text[start]=='\t')) start++;
            while (end > start && (text[end-1]=='\n' || text[end-1]=='\r')) end--;
            size_t len = end - start;
            char *seg = malloc(len+1);
            memcpy(seg, text+start, len); seg[len]=0;
            char *nl = strchr(seg, '\n');
            char *title;
            if (nl) {
                size_t tlen = nl - seg;
                title = malloc(tlen+1); memcpy(title, seg, tlen); title[tlen]=0;
            } else title = strdup("章节");
            out->items = realloc(out->items, sizeof(Chapter)*(out->count+1));
            out->items[out->count].title = title;
            out->items[out->count].content = seg;
            out->count++;
        }
    } else {
        const char *cur = text;
        while (*cur) {
            while (*cur && (*cur=='\n' || *cur=='\r')) cur++;
            if (!*cur) break;
            const char *next = strstr(cur, "\n\n");
            if (!next) next = cur + strlen(cur);
            size_t len = next - cur;
            char *seg = malloc(len+1);
            memcpy(seg, cur, len); seg[len]=0;
            char titlebuf[64]; snprintf(titlebuf,sizeof(titlebuf),"段落 %zu", out->count+1);
            out->items = realloc(out->items, sizeof(Chapter)*(out->count+1));
            out->items[out->count].title = strdup(titlebuf);
            out->items[out->count].content = seg;
            out->count++;
            cur = next;
            if (*cur) cur += 2;
        }
    }
    free(offsets); free(copy);
}

/* ---------- pdf extraction using pdftotext ---------- */
static char *extract_text_from_pdf(const char *path) {
    char cmd[4096];
    snprintf(cmd, sizeof(cmd), "pdftotext '%s' - 2>/dev/null", path);
    FILE *fp = popen(cmd, "r");
    if (!fp) return NULL;
    char *s = read_stream_all(fp);
    pclose(fp);
    return s;
}

/* ---------- layout: text -> lines ----------
   Similar to previous: generate lines[] by word/CJK-aware breaking using TTF_SizeUTF8 measurement.
*/
typedef struct {
    char **lines;
    size_t line_count;
} LaidOut;
static void free_layout(LaidOut *lo) {
    if (!lo) return;
    for (size_t i=0;i<lo->line_count;i++) free(lo->lines[i]);
    free(lo->lines); lo->lines=NULL; lo->line_count=0;
}

/* build lines using font measurement */
static LaidOut layout_text_to_lines(const char *text, TTF_Font *font, int avail_w, int line_spacing) {
    LaidOut out = {NULL,0};
    if (!font) return out;
    const char *p = text;
    char curline[8192]; curline[0]=0; int curlen=0;
    while (*p) {
        if (*p == '\r') { p++; continue; }
        if (*p == '\n') {
            if (curlen > 0) {
                out.lines = realloc(out.lines, sizeof(char*)*(out.line_count+1));
                out.lines[out.line_count++] = strdup(curline);
                curline[0]=0; curlen=0;
            }
            out.lines = realloc(out.lines, sizeof(char*)*(out.line_count+1));
            out.lines[out.line_count++] = strdup("");
            p++; continue;
        }
        if ((unsigned char)*p < 0x80) {
            const char *q = p;
            while (*q && *q != ' ' && *q != '\n' && *q != '\t') q++;
            size_t toklen = q - p;
            char tok[512]; if (toklen >= sizeof(tok)) toklen = sizeof(tok)-1;
            memcpy(tok, p, toklen); tok[toklen]=0;
            char test[8192];
            if (curlen==0) snprintf(test, sizeof(test), "%s", tok);
            else snprintf(test, sizeof(test), "%s %s", curline, tok);
            int w,h; TTF_SizeUTF8(font, test, &w, &h);
            if (w <= avail_w) {
                if (curlen==0) { snprintf(curline,sizeof(curline),"%s",tok); curlen=strlen(curline); }
                else { strncat(curline," ",sizeof(curline)-strlen(curline)-1); strncat(curline,tok,sizeof(curline)-strlen(curline)-1); curlen=strlen(curline); }
            } else {
                if (curlen>0) {
                    out.lines = realloc(out.lines, sizeof(char*)*(out.line_count+1));
                    out.lines[out.line_count++] = strdup(curline);
                    curline[0]=0; curlen=0;
                }
                int tw,th; TTF_SizeUTF8(font, tok, &tw, &th);
                if (tw <= avail_w) {
                    strcpy(curline, tok); curlen = strlen(curline);
                } else {
                    // break token by characters (ASCII)
                    size_t start = 0; size_t tlen_all = strlen(tok);
                    while (start < tlen_all) {
                        size_t take = 1;
                        char sub[512];
                        while (start + take <= tlen_all) {
                            size_t t = take; memcpy(sub, tok+start, t); sub[t]=0;
                            TTF_SizeUTF8(font, sub, &tw, &th);
                            if (tw > avail_w) { if (take==1) { /*still >*/ } break; }
                            take++;
                        }
                        size_t good = (take==1)?1:(take-1);
                        char piece[512]; memcpy(piece, tok+start, good); piece[good]=0;
                        out.lines = realloc(out.lines, sizeof(char*)*(out.line_count+1));
                        out.lines[out.line_count++] = strdup(piece);
                        start += good;
                    }
                    curline[0]=0; curlen=0;
                }
            }
            p = q;
        } else {
            const unsigned char *up = (const unsigned char*)p;
            int bytes = 1;
            if ((up[0] & 0xF8) == 0xF0) bytes = 4;
            else if ((up[0] & 0xF0) == 0xE0) bytes = 3;
            else if ((up[0] & 0xE0) == 0xC0) bytes = 2;
            char tok[8]; memcpy(tok, p, bytes); tok[bytes]=0;
            char test[8192];
            if (curlen==0) snprintf(test,sizeof(test),"%s",tok);
            else snprintf(test,sizeof(test),"%s%s",curline,tok);
            int w,h; TTF_SizeUTF8(font, test, &w, &h);
            if (w <= avail_w) {
                strncat(curline, tok, sizeof(curline)-strlen(curline)-1);
                curlen = strlen(curline);
            } else {
                if (curlen > 0) {
                    out.lines = realloc(out.lines, sizeof(char*)*(out.line_count+1));
                    out.lines[out.line_count++] = strdup(curline);
                    curline[0]=0; curlen=0;
                }
                strncat(curline, tok, sizeof(curline)-strlen(curline)-1);
                curlen = strlen(curline);
            }
            p += bytes;
        }
    }
    if (curlen > 0) {
        out.lines = realloc(out.lines, sizeof(char*)*(out.line_count+1));
        out.lines[out.line_count++] = strdup(curline);
    }
    return out;
}

/* ---------- paginate lines into pages ---------- */
typedef struct {
    size_t *starts;
    size_t count;
} PagesIndex;
static PagesIndex paginate_lines_to_pages(const LaidOut *lo, int lines_per_page) {
    PagesIndex pi = {NULL,0};
    if (!lo || lo->line_count == 0) {
        pi.starts = malloc(sizeof(size_t)); pi.starts[0] = 0; pi.count = 1; return pi;
    }
    size_t total = lo->line_count;
    size_t idx = 0;
    while (idx < total) {
        pi.starts = realloc(pi.starts, sizeof(size_t)*(pi.count+1));
        pi.starts[pi.count++] = idx;
        idx += lines_per_page;
    }
    return pi;
}

/* ---------- page cache implementation (LRU) ---------- */
typedef struct {
    int chapter;
    size_t page;
    SDL_Texture *tex;   // rendered page texture (window-sized)
    size_t tex_bytes;   // estimated memory bytes (w*h*4)
    unsigned long last_use; // for LRU
} CacheEntry;

typedef struct {
    CacheEntry *entries;
    size_t count;
    size_t capacity;
    size_t total_bytes;
} CachePool;

static CachePool cache_pool = {NULL,0,0,0};
static unsigned long global_tick = 1;
static size_t MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200MB default
static size_t MAX_CACHE_PAGES = 1000; // upper bound to avoid runaway

static void cache_init(size_t max_bytes, size_t max_pages) {
    cache_pool.entries = NULL; cache_pool.count = 0; cache_pool.capacity = 0; cache_pool.total_bytes = 0;
    MAX_CACHE_BYTES = max_bytes;
    MAX_CACHE_PAGES = max_pages;
}
static void cache_free_all() {
    for (size_t i=0;i<cache_pool.count;i++) {
        if (cache_pool.entries[i].tex) SDL_DestroyTexture(cache_pool.entries[i].tex);
        free(cache_pool.entries[i].chapter ? NULL : NULL); // no-op
    }
    free(cache_pool.entries);
    cache_pool.entries = NULL; cache_pool.count = 0; cache_pool.capacity = 0; cache_pool.total_bytes = 0;
}
static void cache_evict_if_needed() {
    while ((cache_pool.total_bytes > MAX_CACHE_BYTES || cache_pool.count > MAX_CACHE_PAGES) && cache_pool.count > 0) {
        // find LRU (smallest last_use)
        size_t lru_idx = 0;
        unsigned long min = cache_pool.entries[0].last_use;
        for (size_t i=1;i<cache_pool.count;i++) {
            if (cache_pool.entries[i].last_use < min) { min = cache_pool.entries[i].last_use; lru_idx = i; }
        }
        // evict
        if (cache_pool.entries[lru_idx].tex) {
            SDL_DestroyTexture(cache_pool.entries[lru_idx].tex);
            cache_pool.total_bytes -= cache_pool.entries[lru_idx].tex_bytes;
        }
        // remove entry by swapping last
        cache_pool.entries[lru_idx] = cache_pool.entries[cache_pool.count-1];
        cache_pool.count--;
    }
}
static SDL_Texture *cache_get_texture(int chapter, size_t page) {
    for (size_t i=0;i<cache_pool.count;i++) {
        if (cache_pool.entries[i].chapter == chapter && cache_pool.entries[i].page == page) {
            cache_pool.entries[i].last_use = ++global_tick;
            return cache_pool.entries[i].tex;
        }
    }
    return NULL;
}
static void cache_put_texture(int chapter, size_t page, SDL_Texture *tex, size_t bytes) {
    // if exists, replace
    for (size_t i=0;i<cache_pool.count;i++) {
        if (cache_pool.entries[i].chapter == chapter && cache_pool.entries[i].page == page) {
            if (cache_pool.entries[i].tex) { SDL_DestroyTexture(cache_pool.entries[i].tex); cache_pool.total_bytes -= cache_pool.entries[i].tex_bytes; }
            cache_pool.entries[i].tex = tex;
            cache_pool.entries[i].tex_bytes = bytes;
            cache_pool.entries[i].last_use = ++global_tick;
            cache_pool.total_bytes += bytes;
            cache_evict_if_needed();
            return;
        }
    }
    // append
    if (cache_pool.count + 1 > cache_pool.capacity) {
        cache_pool.capacity = cache_pool.capacity ? cache_pool.capacity * 2 : 32;
        cache_pool.entries = realloc(cache_pool.entries, sizeof(CacheEntry)*cache_pool.capacity);
    }
    cache_pool.entries[cache_pool.count].chapter = chapter;
    cache_pool.entries[cache_pool.count].page = page;
    cache_pool.entries[cache_pool.count].tex = tex;
    cache_pool.entries[cache_pool.count].tex_bytes = bytes;
    cache_pool.entries[cache_pool.count].last_use = ++global_tick;
    cache_pool.count++;
    cache_pool.total_bytes += bytes;
    cache_evict_if_needed();
}
static void cache_remove_chapter(int chapter) {
    size_t i = 0;
    while (i < cache_pool.count) {
        if (cache_pool.entries[i].chapter == chapter) {
            if (cache_pool.entries[i].tex) { SDL_DestroyTexture(cache_pool.entries[i].tex); cache_pool.total_bytes -= cache_pool.entries[i].tex_bytes; }
            cache_pool.entries[i] = cache_pool.entries[cache_pool.count-1];
            cache_pool.count--;
        } else i++;
    }
}

/* ---------- rendering one page into a texture ---------- */
static SDL_Texture *render_page_to_texture(SDL_Renderer *ren, int win_w, int win_h, SDL_Texture *bg_tex,
    TTF_Font *font, const LaidOut *lo, size_t start_line, int lines_per_page, int padding, int line_height,
    SDL_Color fg, SDL_Color hl_color, const char *highlight)
{
    // create target texture
    SDL_Texture *tex = SDL_CreateTexture(ren, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_TARGET, win_w, win_h);
    if (!tex) return NULL;
    // estimate bytes
    // set render target
    SDL_SetRenderTarget(ren, tex);
    // draw background
    if (bg_tex) {
        SDL_Rect dst = {0,0,win_w,win_h};
        SDL_RenderCopy(ren, bg_tex, NULL, &dst);
    } else {
        SDL_SetRenderDrawColor(ren, 255,255,255,255);
        SDL_RenderClear(ren);
    }
    // draw text lines
    int y = padding;
    for (int i=0;i<lines_per_page;i++) {
        size_t li = start_line + i;
        if (li >= lo->line_count) break;
        const char *line = lo->lines[li];
        // highlight occurrences: draw rects behind matches
        if (highlight && highlight[0]!=0) {
            const char *p = line;
            while (p && *p) {
                char *found = strstr(p, highlight);
                if (!found) break;
                // measure prefix width
                char prebuf[4096]; int prelen = found - line;
                if (prelen > 0) { memcpy(prebuf, line, prelen); prebuf[prelen]=0; }
                else prebuf[0]=0;
                int pre_w, pre_h; TTF_SizeUTF8(font, prebuf, &pre_w, &pre_h);
                // measure match width
                char matchbuf[256]; size_t hl_len = strlen(highlight);
                if (hl_len >= sizeof(matchbuf)) hl_len = sizeof(matchbuf)-1;
                memcpy(matchbuf, found, hl_len); matchbuf[hl_len]=0;
                int match_w, match_h; TTF_SizeUTF8(font, matchbuf, &match_w, &match_h);
                SDL_Rect r = { padding + pre_w, y, match_w, line_height };
                SDL_SetRenderDrawColor(ren, hl_color.r, hl_color.g, hl_color.b, hl_color.a);
                SDL_RenderFillRect(ren, &r);
                p = found + hl_len;
            }
        }
        if (line[0] != 0) {
            SDL_Surface *surf = TTF_RenderUTF8_Blended(font, line, fg);
            if (surf) {
                SDL_Texture *t = SDL_CreateTextureFromSurface(ren, surf);
                if (t) {
                    SDL_Rect dst = { padding, y, surf->w, surf->h };
                    SDL_RenderCopy(ren, t, NULL, &dst);
                    SDL_DestroyTexture(t);
                }
                SDL_FreeSurface(surf);
            }
        }
        y += line_height;
    }
    // finalize
    SDL_SetRenderTarget(ren, NULL);
    return tex;
}

/* ---------- main ---------- */
int main(int argc, char **argv) {
    setlocale(LC_CTYPE, "");
    if (argc < 2) { fprintf(stderr,"Usage: %s <file.txt|file.epub|file.pdf>\n", argv[0]); return 1; }
    const char *path = argv[1];
    const char *ext = strrchr(path, '.');
    char extl[16] = "";
    if (ext) { strncpy(extl, ext+1, sizeof(extl)-1); for (char *p=extl; *p; p++) *p = tolower(*p); }

    ChapterList chapters = {NULL,0};
    if (strcmp(extl,"txt")==0) {
        char *txt = read_file_all(path);
        if (!txt) { fprintf(stderr,"failed open txt\n"); return 1; }
        parse_txt_chapters(txt, &chapters);
        free(txt);
    } else if (strcmp(extl,"epub")==0) {
        if (parse_epub_simple(path, &chapters) != 0) { fprintf(stderr,"epub parse failed (need unzip)\n"); return 1; }
    } else if (strcmp(extl,"pdf")==0) {
        char *txt = extract_text_from_pdf(path);
        if (!txt) { fprintf(stderr,"pdf extract failed (install pdftotext)\n"); return 1; }
        parse_txt_chapters(txt, &chapters);
        free(txt);
    } else { fprintf(stderr,"unsupported file type\n"); return 1; }
    if (chapters.count == 0) { fprintf(stderr,"no content\n"); return 1; }

    if (SDL_Init(SDL_INIT_VIDEO) != 0) { fprintf(stderr,"SDL_Init: %s\n", SDL_GetError()); return 1; }
    if (TTF_Init() != 0) { fprintf(stderr,"TTF_Init: %s\n", TTF_GetError()); SDL_Quit(); return 1; }
    IMG_Init(IMG_INIT_JPG|IMG_INIT_PNG);

    int win_w = 900, win_h = 700;
    SDL_Window *win = SDL_CreateWindow("SDL Reader Cached Demo", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, win_w, win_h, SDL_WINDOW_RESIZABLE);
    if (!win) { fprintf(stderr,"CreateWindow: %s\n", SDL_GetError()); TTF_Quit(); SDL_Quit(); return 1; }
    SDL_Renderer *ren = SDL_CreateRenderer(win, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC | SDL_RENDERER_TARGETTEXTURE);
    if (!ren) { fprintf(stderr,"CreateRenderer: %s\n", SDL_GetError()); SDL_DestroyWindow(win); TTF_Quit(); SDL_Quit(); return 1; }

    /* initial font & params */
    const char *font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
    int font_size = 20;
    int line_spacing = 6;
    TTF_Font *font = TTF_OpenFont(font_path, font_size);
    if (!font) {
        font = TTF_OpenFont("DejaVuSans.ttf", font_size);
        if (!font) fprintf(stderr,"Warning: cannot open font (%s)\n", TTF_GetError());
    }

    /* background texture optional */
    SDL_Texture *bg_tex = NULL;
    if (access("bg.png", F_OK) == 0) {
        SDL_Surface *s = IMG_Load("bg.png");
        if (s) { bg_tex = SDL_CreateTextureFromSurface(ren, s); SDL_FreeSurface(s); }
    }

    /* layout/pagination per chapter */
    LaidOut *layouts = calloc(chapters.count, sizeof(LaidOut));
    PagesIndex *pages = calloc(chapters.count, sizeof(PagesIndex));
    int padding = 20;
    int cur_ch = 0;
    size_t cur_page = 0;

    /* cache init */
    size_t max_cache_mb = 200;
    cache_init(max_cache_mb * 1024 * 1024, 1000);

    /* helper to rebuild a chapter layout and pages; clears cache for this chapter */
    auto rebuild_chapter = [&](int ch_idx, int winw, int winh) {
        // clear previous layout
        free_layout(&layouts[ch_idx]);
        if (pages[ch_idx].starts) { free(pages[ch_idx].starts); pages[ch_idx].starts = NULL; pages[ch_idx].count = 0; }
        cache_remove_chapter(ch_idx); // remove cached textures for this chapter
        if (!font) return;
        // re-open font at desired size in case changed
        if (font) { TTF_CloseFont(font); font = NULL; }
        font = TTF_OpenFont(font_path, font_size);
        if (!font) font = TTF_OpenFont("DejaVuSans.ttf", font_size);
        if (!font) return;
        int avail_w = winw - padding*2;
        int line_height = TTF_FontHeight(font) + line_spacing;
        LaidOut lo = layout_text_to_lines(chapters.items[ch_idx].content, font, avail_w, line_spacing);
        layouts[ch_idx] = lo;
        int lines_per_page = (winh - padding*2) / line_height;
        if (lines_per_page < 1) lines_per_page = 1;
        pages[ch_idx] = paginate_lines_to_pages(&layouts[ch_idx], lines_per_page);
        if (cur_page >= pages[ch_idx].count) cur_page = 0;
    };

    /* build initial layout for all chapters (so page counts available) */
    for (size_t i=0;i<chapters.count;i++) { layouts[i].lines=NULL; layouts[i].line_count=0; pages[i].starts=NULL; pages[i].count=0; }
    for (int i=0;i<(int)chapters.count;i++) rebuild_chapter(i, win_w, win_h);

    /* preload queue (store pairs chapter,page) */
    typedef struct { int ch; size_t page; } QItem;
    QItem *preq = NULL; size_t preq_count = 0;
    size_t PRELOAD_RADIUS = 3; // preload +/- pages
    int LINES_PER_PAGE = (font)?(TTF_FontHeight(font)+line_spacing): (font_size+line_spacing);

    /* utility: enqueue unique */
    auto enqueue_preload = [&](int ch, size_t page) {
        // only valid pages
        if (ch < 0 || ch >= (int)chapters.count) return;
        if (page >= pages[ch].count) return;
        // if already cached, skip
        if (cache_get_texture(ch, page)) return;
        for (size_t i=0;i<preq_count;i++) if (preq[i].ch==ch && preq[i].page==page) return;
        preq = realloc(preq, sizeof(QItem)*(preq_count+1));
        preq[preq_count].ch = ch; preq[preq_count].page = page; preq_count++;
    };

    /* schedule preloads around current page/chapter */
    auto schedule_preloads_around = [&](int ch, size_t page) {
        // clear existing queue
        free(preq); preq = NULL; preq_count = 0;
        for (int d = 1; d <= (int)PRELOAD_RADIUS; d++) {
            // next pages
            if (page + d < pages[ch].count) enqueue_preload(ch, page + d);
            if (page >= (size_t)d) enqueue_preload(ch, page - d);
        }
        // also prefetch next chapter first page
        if (ch + 1 < (int)chapters.count) enqueue_preload(ch+1, 0);
    };

    /* render one page to texture and put into cache (synchronous) */
    auto render_and_cache_page = [&](int ch, size_t page_idx) {
        if (ch < 0 || ch >= (int)chapters.count) return;
        if (page_idx >= pages[ch].count) return;
        // if already cached skip
        if (cache_get_texture(ch, page_idx)) return;
        int line_height = (font)? (TTF_FontHeight(font) + line_spacing) : (font_size + line_spacing);
        int lines_per_page = (win_h - padding*2) / line_height;
        size_t start_line = pages[ch].starts[page_idx];
        SDL_Texture *tex = render_page_to_texture(ren, win_w, win_h, bg_tex, font, &layouts[ch], start_line, lines_per_page, padding, line_height, (SDL_Color){0,0,0,255}, (SDL_Color){255,230,128,200}, NULL);
        if (!tex) return;
        size_t bytes = (size_t)win_w * (size_t)win_h * 4;
        cache_put_texture(ch, page_idx, tex, bytes);
    };

    /* initial current page render (ensure current in cache) */
    render_and_cache_page(cur_ch, cur_page);
    schedule_preloads_around(cur_ch, cur_page);

    /* main loop */
    int running = 1;
    SDL_Event ev;
    while (running) {
        /* first: if queue not empty, do one preload per loop iteration (idle pre-render) */
        if (preq_count > 0) {
            QItem item = preq[0];
            // pop front
            memmove(preq, preq+1, sizeof(QItem)*(preq_count-1));
            preq_count--;
            preq = realloc(preq, sizeof(QItem)*preq_count);
            // render if still not cached
            if (!cache_get_texture(item.ch, item.page)) render_and_cache_page(item.ch, item.page);
        }

        /* display current page from cache if exists, otherwise render synchronously and then display */
        SDL_Texture *page_tex = cache_get_texture(cur_ch, cur_page);
        if (!page_tex) {
            render_and_cache_page(cur_ch, cur_page);
            page_tex = cache_get_texture(cur_ch, cur_page);
        }
        if (page_tex) {
            // copy texture to renderer
            SDL_SetRenderTarget(ren, NULL);
            SDL_RenderCopy(ren, page_tex, NULL, NULL);
            SDL_RenderPresent(ren);
        } else {
            // fallback clear
            SDL_SetRenderDrawColor(ren,255,255,255,255); SDL_RenderClear(ren); SDL_RenderPresent(ren);
        }

        /* handle events */
        while (SDL_PollEvent(&ev)) {
            if (ev.type == SDL_QUIT) { running = 0; break; }
            else if (ev.type == SDL_WINDOWEVENT && ev.window.event == SDL_WINDOWEVENT_RESIZED) {
                win_w = ev.window.data1; win_h = ev.window.data2;
                // rebuild all chapters layouts (pages depend on window size)
                for (int i=0;i<(int)chapters.count;i++) rebuild_chapter(i, win_w, win_h);
                // clear cache entirely (textures invalid for new size)
                cache_free_all();
                // ensure current page rendered
                render_and_cache_page(cur_ch, cur_page);
                schedule_preloads_around(cur_ch, cur_page);
            } else if (ev.type == SDL_KEYDOWN) {
                SDL_Keycode k = ev.key.keysym.sym;
                if (k == SDLK_q || k == SDLK_ESCAPE) { running = 0; break; }
                else if (k == SDLK_RIGHT) {
                    if (cur_page + 1 < pages[cur_ch].count) {
                        cur_page++; render_and_cache_page(cur_ch, cur_page); schedule_preloads_around(cur_ch, cur_page);
                    }
                } else if (k == SDLK_LEFT) {
                    if (cur_page > 0) { cur_page--; render_and_cache_page(cur_ch, cur_page); schedule_preloads_around(cur_ch, cur_page); }
                } else if (k == SDLK_DOWN) {
                    if (cur_ch + 1 < (int)chapters.count) { cur_ch++; cur_page = 0; render_and_cache_page(cur_ch, cur_page); schedule_preloads_around(cur_ch, cur_page); }
                } else if (k == SDLK_UP) {
                    if (cur_ch > 0) { cur_ch--; cur_page = 0; render_and_cache_page(cur_ch, cur_page); schedule_preloads_around(cur_ch, cur_page); }
                } else if (k == SDLK_PLUS || k == SDLK_EQUALS) {
                    font_size += 2; if (font_size > 96) font_size = 96;
                    // force rebuild
                    for (int i=0;i<(int)chapters.count;i++) rebuild_chapter(i, win_w, win_h);
                    cache_free_all();
                    render_and_cache_page(cur_ch, cur_page);
                    schedule_preloads_around(cur_ch, cur_page);
                } else if (k == SDLK_MINUS) {
                    font_size -= 2; if (font_size < 8) font_size = 8;
                    for (int i=0;i<(int)chapters.count;i++) rebuild_chapter(i, win_w, win_h);
                    cache_free_all();
                    render_and_cache_page(cur_ch, cur_page);
                    schedule_preloads_around(cur_ch, cur_page);
                } else if (k == SDLK_l) {
                    line_spacing += 2; if (line_spacing > 40) line_spacing = 40;
                    for (int i=0;i<(int)chapters.count;i++) rebuild_chapter(i, win_w, win_h);
                    cache_free_all();
                    render_and_cache_page(cur_ch, cur_page);
                    schedule_preloads_around(cur_ch, cur_page);
                } else if (k == SDLK_L) {
                    line_spacing -= 2; if (line_spacing < 0) line_spacing = 0;
                    for (int i=0;i<(int)chapters.count;i++) rebuild_chapter(i, win_w, win_h);
                    cache_free_all();
                    render_and_cache_page(cur_ch, cur_page);
                    schedule_preloads_around(cur_ch, cur_page);
                } else if (k == SDLK_b) {
                    if (bg_tex) { SDL_DestroyTexture(bg_tex); bg_tex = NULL; }
                    else if (access("bg.jpg", F_OK) == 0) {
                        SDL_Surface *s = IMG_Load("bg.jpg");
                        if (s) { bg_tex = SDL_CreateTextureFromSurface(ren, s); SDL_FreeSurface(s); }
                    } else if (access("bg.png", F_OK) == 0) {
                        SDL_Surface *s = IMG_Load("bg.png");
                        if (s) { bg_tex = SDL_CreateTextureFromSurface(ren, s); SDL_FreeSurface(s); }
                    }
                    // changing background requires re-render current and queued pages
                    cache_remove_chapter(cur_ch); render_and_cache_page(cur_ch, cur_page); schedule_preloads_around(cur_ch, cur_page);
                } else if (k == SDLK_s) {
                    printf("\nSearch keyword: "); fflush(stdout);
                    char buf[256];
                    if (fgets(buf, sizeof(buf), stdin)) {
                        size_t l = strlen(buf); if (l>0 && buf[l-1]=='\n') buf[l-1]=0;
                        // For simplicity, apply highlight only to current chapter pages by clearing its cache and re-rendering current
                        // (full highlight indexing is left as an exercise)
                        cache_remove_chapter(cur_ch);
                        // temporarily render and cache pages with highlight (this code uses NULL highlight for simplicity)
                        render_and_cache_page(cur_ch, cur_page);
                        schedule_preloads_around(cur_ch, cur_page);
                    }
                } else if (k == SDLK_g) {
                    printf("\nGoto page (1-%zu): ", pages[cur_ch].count); fflush(stdout);
                    char buf[64];
                    if (fgets(buf, sizeof(buf), stdin)) {
                        int p = atoi(buf);
                        if (p>=1 && (size_t)p <= pages[cur_ch].count) { cur_page = p-1; render_and_cache_page(cur_ch, cur_page); schedule_preloads_around(cur_ch, cur_page); }
                    }
                }
            }
        }

        SDL_Delay(10);
    }

    /* cleanup */
    cache_free_all();
    for (size_t i=0;i<chapters.count;i++) {
        free(chapters.items[i].title); free(chapters.items[i].content);
    }
    free(chapters.items);
    for (size_t i=0;i<chapters.count;i++) free_layout(&layouts[i]);
    free(layouts);
    for (size_t i=0;i<chapters.count;i++) if (pages[i].starts) free(pages[i].starts);
    free(pages);
    if (bg_tex) SDL_DestroyTexture(bg_tex);
    if (font) TTF_CloseFont(font);
    SDL_DestroyRenderer(ren);
    SDL_DestroyWindow(win);
    IMG_Quit();
    TTF_Quit();
    SDL_Quit();
    return 0;
}