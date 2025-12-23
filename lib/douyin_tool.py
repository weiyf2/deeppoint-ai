#!/usr/bin/env python3
"""
抖音工具 - 独立Python脚本版本
支持搜索视频、获取内容、查看评论等功能
基于DrissionPage进行网页自动化抓取
"""

import asyncio
import json
import time
import os
import sys
import argparse
import logging
import random
from datetime import datetime
from urllib.parse import quote
from typing import Dict, List, Optional
import re

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 尝试导入DrissionPage
try:
    from DrissionPage import ChromiumPage
    from DrissionPage.errors import ElementNotFoundError
    DRISSION_AVAILABLE = True
except ImportError:
    DRISSION_AVAILABLE = False
    logger.warning("DrissionPage未安装。请运行: pip install DrissionPage")

# 尝试导入BeautifulSoup
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    logger.warning("BeautifulSoup4未安装。请运行: pip install beautifulsoup4")


class DouyinApi:
    """抖音API封装类"""
    
    def __init__(self):
        self.page = None
        self.is_browser_open = False
    
    def init_browser(self):
        """初始化浏览器（增强反检测能力）"""
        if not DRISSION_AVAILABLE:
            raise ImportError("DrissionPage未安装，无法使用浏览器功能")

        if self.page is None:
            logger.info("正在初始化浏览器（反检测模式）...")

            try:
                # 配置浏览器选项
                from DrissionPage import ChromiumOptions
                options = ChromiumOptions()

                # 🔥 使用新无头模式（更难被检测）
                logger.info("启用新版headless模式（更难检测）")
                options.set_argument('--headless=new')

                # 🔥 核心反检测参数
                options.set_argument('--disable-blink-features=AutomationControlled')
                options.set_argument('--disable-features=TranslateUI')
                options.set_argument('--disable-features=BlinkGenPropertyTrees')

                # 排除自动化开关
                options.set_argument('--disable-infobars')
                options.set_argument('--excludeSwitches=enable-automation')
                options.set_argument('--useAutomationExtension=false')

                # Docker/Linux必需参数
                options.set_argument('--no-sandbox')
                options.set_argument('--disable-dev-shm-usage')
                options.set_argument('--disable-gpu')
                options.set_argument('--disable-software-rasterizer')

                # 🔥 窗口大小（使用常见分辨率）
                options.set_argument('--window-size=1920,1080')
                options.set_argument('--start-maximized')

                # 语言和平台设置
                options.set_argument('--lang=zh-CN')
                options.set_argument('--accept-lang=zh-CN,zh;q=0.9,en;q=0.8')

                # 禁用各种检测特征
                options.set_argument('--disable-notifications')
                options.set_argument('--disable-popup-blocking')
                options.set_argument('--disable-extensions')
                options.set_argument('--disable-background-networking')
                options.set_argument('--disable-sync')
                options.set_argument('--disable-translate')
                options.set_argument('--disable-features=TranslateUI')
                options.set_argument('--mute-audio')
                options.set_argument('--no-first-run')
                options.set_argument('--no-default-browser-check')
                options.set_argument('--disable-hang-monitor')
                options.set_argument('--disable-prompt-on-repost')
                options.set_argument('--disable-client-side-phishing-detection')
                options.set_argument('--disable-component-update')
                options.set_argument('--disable-default-apps')

                # 证书和安全
                options.set_argument('--ignore-certificate-errors')
                options.set_argument('--ignore-ssl-errors')
                options.set_argument('--allow-running-insecure-content')

                # 🔥 更真实的User-Agent
                options.set_user_agent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

                logger.info("创建ChromiumPage实例...")
                self.page = ChromiumPage(addr_or_opts=options)
                self.is_browser_open = True

                # 🔥 注入反检测脚本（隐藏webdriver特征）
                logger.info("注入反检测脚本...")
                try:
                    # 完整的反检测脚本 - 一次性注入
                    stealth_js = """
                    // 1. 隐藏webdriver属性
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });

                    // 2. 模拟真实的plugins数组
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => {
                            const plugins = [
                                {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
                                {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''},
                                {name: 'Native Client', filename: 'internal-nacl-plugin', description: ''}
                            ];
                            plugins.length = 3;
                            return plugins;
                        }
                    });

                    // 3. 模拟真实的languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['zh-CN', 'zh', 'en']
                    });

                    // 4. 完整的chrome对象
                    window.chrome = {
                        runtime: {
                            connect: function() {},
                            sendMessage: function() {},
                            onMessage: { addListener: function() {} }
                        },
                        loadTimes: function() {
                            return {
                                commitLoadTime: Date.now() / 1000 - 0.5,
                                connectionInfo: 'h2',
                                finishDocumentLoadTime: Date.now() / 1000 - 0.1,
                                finishLoadTime: Date.now() / 1000,
                                firstPaintAfterLoadTime: 0,
                                firstPaintTime: Date.now() / 1000 - 0.3,
                                navigationType: 'Other',
                                npnNegotiatedProtocol: 'h2',
                                requestTime: Date.now() / 1000 - 1,
                                startLoadTime: Date.now() / 1000 - 0.8,
                                wasAlternateProtocolAvailable: false,
                                wasFetchedViaSpdy: true,
                                wasNpnNegotiated: true
                            };
                        },
                        csi: function() {
                            return {
                                onloadT: Date.now(),
                                pageT: Date.now() - performance.timing.navigationStart,
                                startE: performance.timing.navigationStart,
                                tran: 15
                            };
                        },
                        app: {
                            isInstalled: false,
                            InstallState: {INSTALLED: 'installed', NOT_INSTALLED: 'not_installed'},
                            RunningState: {RUNNING: 'running', CANNOT_RUN: 'cannot_run'}
                        }
                    };

                    // 5. 隐藏自动化相关的属性
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
                    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

                    // 6. 修改permissions API
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                    );

                    // 7. 模拟真实的硬件并发数
                    Object.defineProperty(navigator, 'hardwareConcurrency', {
                        get: () => 8
                    });

                    // 8. 模拟真实的设备内存
                    Object.defineProperty(navigator, 'deviceMemory', {
                        get: () => 8
                    });

                    // 9. 隐藏自动化标记
                    Object.defineProperty(navigator, 'maxTouchPoints', {
                        get: () => 0
                    });

                    // 10. 修复 WebGL 指纹
                    const getParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === 37445) {
                            return 'Intel Inc.';
                        }
                        if (parameter === 37446) {
                            return 'Intel Iris OpenGL Engine';
                        }
                        return getParameter.apply(this, arguments);
                    };

                    console.log('Anti-detection script injected successfully');
                    """
                    self.page.run_js(stealth_js)
                    logger.info("反检测脚本注入成功")
                except Exception as js_error:
                    logger.warning(f"反检测脚本注入失败（可忽略）: {js_error}")

                logger.info("等待浏览器稳定...")
                time.sleep(3)

                logger.info("浏览器初始化完成（反检测模式）")

            except Exception as init_error:
                logger.error(f"浏览器初始化失败: {type(init_error).__name__}: {str(init_error)}")
                import traceback
                logger.error(f"详细错误:\n{traceback.format_exc()}")
                raise

        return self.page
    
    def close_browser(self):
        """关闭浏览器"""
        if self.page and self.is_browser_open:
            try:
                self.page.quit()
                logger.info("浏览器已关闭")
            except Exception as e:
                logger.error(f"关闭浏览器失败: {e}")
            finally:
                self.page = None
                self.is_browser_open = False
    
    def _check_for_captcha(self, page) -> bool:
        """检测页面是否出现验证码"""
        try:
            page_title = page.title or ""
            page_html = page.html[:5000] if page.html else ""  # 只取前5000字符检测

            # 验证码关键词列表
            captcha_indicators = [
                "验证码", "验证中间页", "captcha", "verify",
                "TTGCaptcha", "verifycenter", "滑块", "人机验证"
            ]

            for indicator in captcha_indicators:
                if indicator.lower() in page_title.lower() or indicator.lower() in page_html.lower():
                    logger.warning(f"⚠️ 检测到验证码特征: {indicator}")
                    return True

            # 检查是否有验证码iframe
            try:
                captcha_iframe = page.ele('css:iframe[src*="verify"]', timeout=1)
                if captcha_iframe:
                    logger.warning("⚠️ 检测到验证码iframe")
                    return True
            except:
                pass

            return False
        except Exception as e:
            logger.warning(f"验证码检测异常: {e}")
            return False

    def _inject_stealth_on_page(self, page):
        """在页面加载后再次注入反检测脚本"""
        try:
            stealth_js = """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            if (!window.chrome) {
                window.chrome = { runtime: {}, app: {}, csi: function(){}, loadTimes: function(){} };
            }
            """
            page.run_js(stealth_js)
        except:
            pass

    async def _enter_video_detail(self, page, video_url: str) -> bool:
        """进入视频详情页"""
        try:
            logger.info(f"进入视频详情页: {video_url}")
            page.get(video_url)
            await asyncio.sleep(random.uniform(3, 5))
            self._inject_stealth_on_page(page)

            # 检查是否成功加载
            page_title = page.title or ""
            if "验证" in page_title or "captcha" in page_title.lower():
                logger.warning("视频详情页触发验证码")
                return False

            logger.info(f"视频详情页加载成功，标题: {page_title}")
            return True
        except Exception as e:
            logger.error(f"进入视频详情页失败: {e}")
            return False

    async def _trigger_comments_load(self, page) -> bool:
        """触发评论加载 - 点击评论区域"""
        try:
            logger.info("尝试触发评论加载...")

            # 方法1: 点击评论图标/数字（右侧的评论按钮）
            comment_selectors = [
                'css:div[data-e2e="comment-icon"]',
                'css:div[class*="comment"]',
                'css:span[class*="comment"]',
                'css:div[data-e2e="feed-comment-icon"]',
            ]

            for selector in comment_selectors:
                try:
                    elem = page.ele(selector, timeout=2)
                    if elem:
                        logger.info(f"找到评论元素: {selector}")
                        elem.click()
                        await asyncio.sleep(2)
                        return True
                except:
                    continue

            # 方法2: 使用JavaScript点击评论区域
            try:
                page.run_js("""
                    const commentBtn = document.querySelector('[data-e2e="comment-icon"]')
                        || document.querySelector('[class*="comment-icon"]')
                        || document.querySelector('[class*="CommentIcon"]');
                    if (commentBtn) commentBtn.click();
                """)
                await asyncio.sleep(2)
                return True
            except:
                pass

            logger.warning("未找到评论触发元素，尝试直接滚动到评论区")
            return True  # 继续尝试

        except Exception as e:
            logger.error(f"触发评论加载失败: {e}")
            return False

    async def _click_continue_comments(self, page) -> bool:
        """点击"继续看评论"展开更多评论"""
        try:
            logger.info("尝试点击'继续看评论'...")

            # 从截图看到的选择器
            continue_selectors = [
                'css:div.related-video-card-login-guide__footer',
                'css:div[class*="footer-close"]',
                'css:div:contains("继续看评论")',
                'xpath://div[contains(text(), "继续看评论")]',
                'css:div[class*="login-guide"] div[class*="footer"]',
            ]

            for selector in continue_selectors:
                try:
                    elem = page.ele(selector, timeout=2)
                    if elem:
                        text = elem.text or ""
                        if "继续" in text or "评论" in text or elem:
                            logger.info(f"找到继续看评论元素: {selector}")
                            elem.click()
                            await asyncio.sleep(2)
                            return True
                except:
                    continue

            # 使用JavaScript查找并点击
            try:
                result = page.run_js("""
                    // 查找包含"继续看评论"的元素
                    const elements = document.querySelectorAll('div, span, p');
                    for (let elem of elements) {
                        if (elem.textContent && elem.textContent.includes('继续看评论')) {
                            elem.click();
                            return true;
                        }
                    }
                    // 查找登录引导的关闭/继续按钮
                    const footerClose = document.querySelector('[class*="footer-close"]')
                        || document.querySelector('[class*="login-guide"] [class*="footer"]');
                    if (footerClose) {
                        footerClose.click();
                        return true;
                    }
                    return false;
                """)
                if result:
                    logger.info("通过JS点击了继续看评论")
                    await asyncio.sleep(2)
                    return True
            except:
                pass

            logger.warning("未找到'继续看评论'按钮")
            return False

        except Exception as e:
            logger.error(f"点击继续看评论失败: {e}")
            return False

    def _clean_comment_text(self, raw_text: str) -> str:
        """清洗评论文本，移除用户名、时间、IP、操作按钮等无用信息"""
        if not raw_text:
            return ""

        text = raw_text.strip()

        # 1. 移除开头的用户名 (格式: @用户名 数字... 或 用户名 数字...)
        # 匹配: "@xxx 6 ..." 或 "xxx 数字 ..."
        text = re.sub(r'^@?[\u4e00-\u9fa5\w\-_□·.]+\s*\d*\s*\.{2,}\s*', '', text)

        # 2. 移除时间信息 (X分钟前, X小时前, X天前, X周前, X月前, X年前, 昨天, 刚刚)
        text = re.sub(r'\s*\d+[分小时天周月年]+前\s*', ' ', text)
        text = re.sub(r'\s*(昨天|刚刚|今天)\s*', ' ', text)

        # 3. 移除IP/地区信息 (·省份/城市)
        text = re.sub(r'\s*[·•]\s*[\u4e00-\u9fa5]{2,10}\s*', ' ', text)

        # 4. 移除操作按钮文本
        text = re.sub(r'\s*\d*\s*分享\s*', ' ', text)
        text = re.sub(r'\s*回复\s*', ' ', text)
        text = re.sub(r'\s*展开\d*条回复\s*', ' ', text)
        text = re.sub(r'\s*收起回复\s*', ' ', text)
        text = re.sub(r'\s*查看更多回复\s*', ' ', text)

        # 5. 移除点赞数 (单独的数字)
        text = re.sub(r'\s+\d+\s*$', '', text)
        text = re.sub(r'^\d+\s+', '', text)

        # 6. 移除"作者"标识
        text = re.sub(r'\s*作者\s*', ' ', text)

        # 7. 清理多余空白
        text = re.sub(r'\s+', ' ', text).strip()

        return text

    async def _extract_comments(self, page, max_comments: int = 50) -> List[Dict]:
        """提取评论数据"""
        comments = []

        try:
            logger.info("开始提取评论...")

            # 滚动评论区加载更多
            for scroll_i in range(3):
                try:
                    page.run_js("""
                        const commentContainer = document.querySelector('[class*="comment-list"]')
                            || document.querySelector('[class*="CommentList"]')
                            || document.querySelector('[data-e2e="comment-list"]');
                        if (commentContainer) {
                            commentContainer.scrollTop += 500;
                        } else {
                            window.scrollBy(0, 300);
                        }
                    """)
                    await asyncio.sleep(1)
                except:
                    pass

            # 使用JavaScript提取评论
            js_extract_comments = """
            (function() {
                const comments = [];

                // 查找评论项 - 根据截图中的class
                const commentItems = document.querySelectorAll(
                    '[data-e2e="comment-item"], ' +
                    '[class*="comment-item"], ' +
                    '[class*="CommentItem"], ' +
                    'div[class*="xzjbH9qV"]'
                );

                commentItems.forEach(function(item, index) {
                    try {
                        // 获取评论文本
                        let text = '';
                        const textElem = item.querySelector(
                            '[class*="comment-info-wrap"] span, ' +
                            '[class*="LvAtyU_f"] span, ' +
                            '[class*="j5WZzJdp"], ' +
                            'span[class*="sU2yAQQU"]'
                        );
                        if (textElem) {
                            text = textElem.textContent.trim();
                        }

                        // 如果没找到，尝试获取整个评论区域的文本
                        if (!text) {
                            const allSpans = item.querySelectorAll('span');
                            for (let span of allSpans) {
                                const spanText = span.textContent.trim();
                                if (spanText.length > 10 && spanText.length < 500) {
                                    text = spanText;
                                    break;
                                }
                            }
                        }

                        // 获取用户名
                        let username = '';
                        const userElem = item.querySelector(
                            '[class*="comment-item-avatar"], ' +
                            '[class*="VPtAXFCJ"], ' +
                            '[class*="author"], ' +
                            '[class*="name"]'
                        );
                        if (userElem) {
                            username = userElem.textContent.trim();
                        }

                        // 获取点赞数
                        let likes = '0';
                        const likesElem = item.querySelector('[class*="like"], [class*="count"]');
                        if (likesElem) {
                            const likesText = likesElem.textContent.trim();
                            if (/\\d/.test(likesText)) {
                                likes = likesText;
                            }
                        }

                        if (text && text.length > 2) {
                            comments.push({
                                text: text.substring(0, 500),
                                username: username || 'unknown',
                                likes: likes,
                                index: index
                            });
                        }
                    } catch(e) {}
                });

                return comments;
            })();
            """

            js_comments = page.run_js(js_extract_comments)

            if js_comments and len(js_comments) > 0:
                logger.info(f"JS提取到 {len(js_comments)} 条评论")
                for c in js_comments[:max_comments]:
                    raw_text = c.get('text', '')
                    # 清洗评论文本
                    cleaned_text = self._clean_comment_text(raw_text)
                    if cleaned_text and len(cleaned_text) > 2:
                        comments.append({
                            'text': cleaned_text,
                            'username': c.get('username', 'unknown'),
                            'likes': c.get('likes', '0'),
                            'collected_at': datetime.now().isoformat()
                        })
            else:
                logger.warning("JS未提取到评论，尝试备用方法...")

                # 备用方法：使用DrissionPage选择器
                try:
                    comment_elements = page.eles('css:div[data-e2e="comment-item"]', timeout=3)
                    if not comment_elements:
                        comment_elements = page.eles('css:div[class*="comment-item"]', timeout=2)

                    for elem in comment_elements[:max_comments]:
                        try:
                            raw_text = elem.text
                            if raw_text:
                                # 清洗评论文本
                                cleaned_text = self._clean_comment_text(raw_text[:500])
                                if cleaned_text and len(cleaned_text) > 5:
                                    comments.append({
                                        'text': cleaned_text,
                                        'username': 'unknown',
                                        'likes': '0',
                                        'collected_at': datetime.now().isoformat()
                                    })
                        except:
                            continue
                except Exception as e:
                    logger.warning(f"备用提取方法失败: {e}")

            logger.info(f"共提取到 {len(comments)} 条评论")

        except Exception as e:
            logger.error(f"提取评论失败: {e}")
            import traceback
            logger.error(traceback.format_exc())

        return comments

    async def _get_video_with_comments(self, page, video_info: Dict) -> Dict:
        """获取单个视频的详情和评论"""
        video_url = video_info.get('video_url', '')
        if not video_url:
            return video_info

        try:
            # 1. 进入视频详情页
            if not await self._enter_video_detail(page, video_url):
                logger.warning(f"无法进入视频详情页: {video_url}")
                return video_info

            # 2. 获取视频描述（如果有）
            try:
                desc_js = """
                    const descElem = document.querySelector('[class*="desc"], [class*="title"], [class*="caption"]');
                    return descElem ? descElem.textContent.trim() : '';
                """
                description = page.run_js(desc_js)
                if description:
                    video_info['description'] = description[:500]
            except:
                pass

            # 3. 触发评论加载
            await self._trigger_comments_load(page)

            # 4. 点击"继续看评论"（如果有登录弹窗）
            await self._click_continue_comments(page)

            # 5. 等待评论加载
            await asyncio.sleep(2)

            # 6. 提取评论
            comments = await self._extract_comments(page)
            video_info['comments'] = comments
            video_info['comment_count'] = len(comments)

            logger.info(f"视频 [{video_info.get('title', '')[:30]}] 获取到 {len(comments)} 条评论")

        except Exception as e:
            logger.error(f"获取视频评论失败: {e}")
            video_info['comments'] = []
            video_info['comment_count'] = 0

        return video_info

    async def search_videos(self, keyword: str, scroll_count: int = 5, delay: float = 2.0) -> List[Dict]:
        """搜索抖音视频（增强反检测版本）"""
        videos = []
        max_retries = 2  # 最大重试次数

        for retry in range(max_retries + 1):
            try:
                if retry > 0:
                    logger.info(f"🔄 第 {retry} 次重试...")
                    await asyncio.sleep(3)  # 重试前等待

                # 初始化浏览器
                logger.info("步骤1: 初始化浏览器")
                page = self.init_browser()
                logger.info("步骤1完成: 浏览器初始化成功")

                # 🔥 先访问抖音首页，模拟正常用户行为
                if retry == 0:
                    logger.info("步骤1.5: 先访问首页建立会话...")
                    try:
                        page.get("https://www.douyin.com/")
                        await asyncio.sleep(random.uniform(2, 4))
                        self._inject_stealth_on_page(page)
                    except:
                        pass

                # 构建搜索URL
                search_url = f"https://www.douyin.com/search/{quote(keyword)}?source=normal_search&type=video"
                logger.info(f"步骤2: 访问搜索页面: {search_url}")

                # 访问页面
                try:
                    logger.info("开始加载页面...")
                    page.get(search_url)
                    logger.info("页面加载完成")

                    # 页面加载后再次注入反检测脚本
                    self._inject_stealth_on_page(page)
                except Exception as page_error:
                    logger.error(f"页面加载失败: {type(page_error).__name__}: {str(page_error)}")
                    raise Exception(f"无法访问抖音搜索页面: {str(page_error)}")

                # 🔥 等待页面渲染（随机时间，更像人类）
                wait_time = random.uniform(5, 8)
                logger.info(f"等待页面渲染（{wait_time:.1f}秒）...")
                await asyncio.sleep(wait_time)

                # 🔥 检查页面标题和验证码
                try:
                    page_title = page.title
                    logger.info(f"页面标题: {page_title}")
                except Exception as title_err:
                    logger.warning(f"获取标题失败: {title_err}")
                    page_title = ""

                # 🔥 验证码检测
                if self._check_for_captcha(page):
                    logger.error("❌ 检测到验证码页面！")
                    if retry < max_retries:
                        logger.info("尝试关闭浏览器并重新初始化...")
                        self.close_browser()
                        continue  # 重试
                    else:
                        raise Exception("抖音触发了验证码机制，请稍后重试或使用其他IP")

                # 🔥 检查是否真的加载了搜索结果
                if "搜索" not in page_title and "抖音" not in page_title:
                    logger.warning(f"⚠️ 页面标题异常: {page_title}")

                # 🔥 直接提取数据
                logger.info("步骤3: 提取视频数据")
                seen_urls = set()
                videos = self._extract_video_data_direct(page, seen_urls)
                logger.info(f"步骤3完成: 共采集到 {len(videos)} 条视频数据")

                # 如果没有结果且未达到最大重试次数，重试
                if len(videos) == 0 and retry < max_retries:
                    logger.warning("未获取到视频数据，准备重试...")
                    self.close_browser()
                    continue

                break  # 成功获取数据，退出重试循环

            except Exception as e:
                logger.error(f"搜索视频失败: {type(e).__name__}: {str(e)}")
                import traceback
                logger.error(f"详细错误:\n{traceback.format_exc()}")
                if retry >= max_retries:
                    raise
                else:
                    self.close_browser()
                    continue
            finally:
                # 确保浏览器关闭
                if retry >= max_retries or len(videos) > 0:
                    logger.info("清理: 关闭浏览器")
                    self.close_browser()

        return videos

    async def search_videos_with_comments(self, keyword: str, max_videos: int = 10, max_comments_per_video: int = 30) -> List[Dict]:
        """搜索视频并获取每个视频的评论（深度抓取版本）"""
        videos_with_comments = []

        try:
            # 步骤1: 初始化浏览器
            logger.info("=" * 50)
            logger.info("开始深度抓取（含评论）")
            logger.info(f"关键词: {keyword}, 最大视频数: {max_videos}")
            logger.info("=" * 50)

            page = self.init_browser()

            # 步骤2: 先访问首页建立会话
            logger.info("步骤1: 访问首页建立会话...")
            try:
                page.get("https://www.douyin.com/")
                await asyncio.sleep(random.uniform(3, 5))
                self._inject_stealth_on_page(page)
            except:
                pass

            # 步骤3: 访问搜索页面获取视频列表
            search_url = f"https://www.douyin.com/search/{quote(keyword)}?source=normal_search&type=video"
            logger.info(f"步骤2: 访问搜索页面: {search_url}")

            page.get(search_url)
            await asyncio.sleep(random.uniform(5, 8))
            self._inject_stealth_on_page(page)

            # 检查验证码
            if self._check_for_captcha(page):
                raise Exception("搜索页面触发验证码，无法继续")

            # 步骤4: 提取视频列表
            logger.info("步骤3: 提取视频列表...")
            seen_urls = set()
            videos = self._extract_video_data_direct(page, seen_urls)
            logger.info(f"找到 {len(videos)} 个视频")

            if len(videos) == 0:
                logger.warning("未找到视频，请检查搜索关键词或反爬状态")
                return []

            # 限制视频数量
            videos_to_process = videos[:max_videos]
            logger.info(f"将处理 {len(videos_to_process)} 个视频的评论")

            # 步骤5: 逐个获取视频评论
            for idx, video in enumerate(videos_to_process):
                logger.info(f"\n{'='*30}")
                logger.info(f"处理视频 {idx+1}/{len(videos_to_process)}: {video.get('title', '')[:40]}...")

                try:
                    # 获取评论
                    video_with_comments = await self._get_video_with_comments(page, video.copy())
                    videos_with_comments.append(video_with_comments)

                    # 随机延迟，避免被检测
                    delay = random.uniform(3, 6)
                    logger.info(f"等待 {delay:.1f} 秒后处理下一个...")
                    await asyncio.sleep(delay)

                except Exception as e:
                    logger.error(f"处理视频失败: {e}")
                    video['comments'] = []
                    video['comment_count'] = 0
                    videos_with_comments.append(video)

            logger.info(f"\n{'='*50}")
            logger.info(f"深度抓取完成!")
            total_comments = sum(v.get('comment_count', 0) for v in videos_with_comments)
            logger.info(f"共处理 {len(videos_with_comments)} 个视频，获取 {total_comments} 条评论")
            logger.info("=" * 50)

        except Exception as e:
            logger.error(f"深度抓取失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
        finally:
            logger.info("清理: 关闭浏览器")
            self.close_browser()

        return videos_with_comments
    
    async def _scroll_and_collect_videos(self, page, scroll_count: int, delay: float) -> List[Dict]:
        """滚动页面并收集视频数据（使用直接选择器，避免获取完整HTML）"""
        collected = []
        seen_urls = set()

        try:
            # 【调试】获取初始页面状态
            logger.info("【调试】获取初始页面状态...")
            initial_height = page.run_js("return document.body.scrollHeight")
            logger.info(f"【调试】初始页面高度: {initial_height}")

            # 🔥 尝试先提取一次数据，看看选择器是否正确
            logger.info("【调试】测试选择器...")
            new_videos = self._extract_video_data_direct(page, seen_urls)
            collected.extend(new_videos)
            logger.info(f"【调试】初始提取到 {len(new_videos)} 条视频")

            last_height = initial_height

            for i in range(scroll_count):
                logger.info(f"正在滚动页面 {i+1}/{scroll_count}")

                # 🔥 模拟真实用户滚动：分多次滚动，而不是一次滚到底
                scroll_steps = random.randint(3, 5)  # 随机3-5次小滚动
                for step in range(scroll_steps):
                    scroll_amount = random.randint(300, 600)  # 随机滚动距离
                    page.run_js(f"window.scrollBy(0, {scroll_amount})")
                    await asyncio.sleep(random.uniform(0.3, 0.8))  # 随机短暂停顿

                # 随机等待时间，模拟真实用户阅读
                random_delay = delay + random.uniform(0, 1)
                logger.info(f"等待 {random_delay:.1f} 秒...")
                await asyncio.sleep(random_delay)

                # 检查是否到达底部
                new_height = page.run_js("return document.body.scrollHeight")
                logger.info(f"【调试】滚动后页面高度: {new_height}, 之前高度: {last_height}")

                # 🔥 直接提取视频数据（不获取HTML）
                new_videos = self._extract_video_data_direct(page, seen_urls)
                collected.extend(new_videos)
                logger.info(f"本次滚动新增 {len(new_videos)} 条视频，累计 {len(collected)} 条")

                if new_height == last_height:
                    logger.info("已到达页面底部")
                    break

                last_height = new_height

        except Exception as e:
            logger.error(f"滚动采集失败: {e}")
            import traceback
            logger.error(f"详细错误:\n{traceback.format_exc()}")

        return collected

    def _extract_video_data_direct(self, page, seen_urls: set) -> List[Dict]:
        """直接从页面元素提取视频数据（改进版本）"""
        videos = []

        try:
            # 🔥 方法1: 使用JavaScript直接提取所有视频链接（最可靠）
            logger.info("【方法1】使用JS提取视频数据...")
            try:
                js_extract = """
                (function() {
                    const results = [];
                    // 查找所有包含 /video/ 的链接
                    const links = document.querySelectorAll('a[href*="/video/"]');
                    links.forEach(function(link) {
                        const href = link.getAttribute('href');
                        if (href && href.includes('/video/')) {
                            // 获取标题 - 尝试多种方式
                            let title = '';

                            // 方式1: 查找链接内的标题元素
                            const titleElem = link.querySelector('p, span, div');
                            if (titleElem && titleElem.textContent) {
                                title = titleElem.textContent.trim();
                            }

                            // 方式2: 使用链接的title属性
                            if (!title && link.title) {
                                title = link.title.trim();
                            }

                            // 方式3: 使用链接的文本内容
                            if (!title && link.textContent) {
                                title = link.textContent.trim();
                            }

                            // 方式4: 查找父元素中的文本
                            if (!title || title.length < 5) {
                                const parent = link.closest('li') || link.closest('div');
                                if (parent) {
                                    const allText = parent.textContent || '';
                                    if (allText.length > 5 && allText.length < 500) {
                                        title = allText.trim();
                                    }
                                }
                            }

                            // 获取作者信息
                            let author = '';
                            const parent = link.closest('li') || link.closest('div');
                            if (parent) {
                                const authorElem = parent.querySelector('[class*="author"], [class*="name"], [class*="user"]');
                                if (authorElem) {
                                    author = authorElem.textContent.trim();
                                }
                            }

                            // 获取点赞数
                            let likes = '0';
                            if (parent) {
                                const likesElem = parent.querySelector('[class*="like"], [class*="count"]');
                                if (likesElem) {
                                    const likesText = likesElem.textContent.trim();
                                    if (/\\d/.test(likesText)) {
                                        likes = likesText;
                                    }
                                }
                            }

                            if (href && title && title.length > 3) {
                                results.push({
                                    href: href,
                                    title: title.substring(0, 200),
                                    author: author || 'unknown',
                                    likes: likes
                                });
                            }
                        }
                    });
                    return results;
                })();
                """
                js_results = page.run_js(js_extract)

                if js_results and len(js_results) > 0:
                    logger.info(f"【JS提取】找到 {len(js_results)} 条视频数据")

                    for item in js_results:
                        href = item.get('href', '')
                        if not href:
                            continue

                        # 处理URL
                        if href.startswith('//'):
                            video_url = 'https:' + href
                        elif href.startswith('/'):
                            video_url = 'https://www.douyin.com' + href
                        else:
                            video_url = href

                        # 去重
                        if video_url in seen_urls:
                            continue

                        video_data = {
                            'video_url': video_url,
                            'title': item.get('title', ''),
                            'author': item.get('author', 'unknown'),
                            'likes': item.get('likes', '0'),
                            'collected_at': datetime.now().isoformat()
                        }

                        videos.append(video_data)
                        seen_urls.add(video_url)

                        if len(videos) <= 5:
                            logger.info(f"【调试】视频 {len(videos)}: {video_data.get('title', '')[:50]}")

                    if len(videos) > 0:
                        logger.info(f"【JS方法成功】共提取到 {len(videos)} 条有效视频")
                        return videos

            except Exception as js_error:
                logger.warning(f"JS提取失败: {js_error}")

            # 🔥 方法2: 使用DrissionPage选择器（备用方案）
            logger.info("【方法2】使用选择器提取...")

            # 更精确的选择器列表
            selectors = [
                'css:a[href*="/video/"]',  # 直接找视频链接
                'css:li a[href*="/video/"]',  # li中的视频链接
                'css:div[class*="video"] a',  # 视频容器中的链接
                'css:ul li',  # 列表项
            ]

            video_elements = []
            used_selector = ""

            for selector in selectors:
                try:
                    logger.info(f"【调试】尝试选择器: {selector}")
                    elements = page.eles(selector, timeout=3)
                    if elements and len(elements) > 0:
                        # 过滤：只保留包含/video/链接的元素
                        valid_elements = []
                        for elem in elements[:100]:  # 最多检查100个
                            try:
                                href = elem.attr('href') or ''
                                if '/video/' in href:
                                    valid_elements.append(elem)
                                else:
                                    # 检查子元素
                                    sub_link = elem.ele('css:a[href*="/video/"]', timeout=0.3)
                                    if sub_link:
                                        valid_elements.append(elem)
                            except:
                                continue

                        if valid_elements:
                            logger.info(f"【选择器 {selector}】找到 {len(valid_elements)} 个有效视频元素")
                            video_elements = valid_elements
                            used_selector = selector
                            break
                        else:
                            logger.info(f"【选择器 {selector}】找到 {len(elements)} 个元素，但无有效视频")
                except Exception as sel_error:
                    logger.warning(f"选择器 {selector} 失败: {sel_error}")
                    continue

            if not video_elements:
                logger.warning("【失败】所有选择器都未找到有效视频元素")
                # 🔥 调试：保存页面HTML用于分析
                try:
                    page_html = page.html[:10000] if page.html else ""
                    if "验证" in page_html or "captcha" in page_html.lower():
                        logger.error("❌ 页面包含验证码相关内容")
                    logger.info(f"【调试】页面HTML前500字符: {page_html[:500]}")
                except:
                    pass
                return []

            logger.info(f"准备解析 {len(video_elements)} 个元素")

            # 解析每个元素
            for idx, item in enumerate(video_elements[:50]):  # 最多处理50个
                try:
                    video_data = {}

                    # 获取链接
                    href = item.attr('href')
                    if not href or '/video/' not in href:
                        # 尝试查找子链接
                        try:
                            link_elem = item.ele('css:a[href*="/video/"]', timeout=0.3)
                            if link_elem:
                                href = link_elem.attr('href')
                        except:
                            continue

                    if not href or '/video/' not in href:
                        continue

                    # 处理URL
                    if href.startswith('//'):
                        video_url = 'https:' + href
                    elif href.startswith('/'):
                        video_url = 'https://www.douyin.com' + href
                    else:
                        video_url = href

                    # 去重
                    if video_url in seen_urls:
                        continue

                    video_data['video_url'] = video_url

                    # 获取标题
                    try:
                        text = item.text
                        if text and len(text.strip()) > 3:
                            video_data['title'] = text.strip()[:200]
                    except:
                        pass

                    video_data['collected_at'] = datetime.now().isoformat()
                    video_data['likes'] = '0'
                    video_data['author'] = 'unknown'

                    if video_data.get('title'):
                        videos.append(video_data)
                        seen_urls.add(video_url)
                        if len(videos) <= 5:
                            logger.info(f"【调试】视频 {len(videos)}: {video_data.get('title', '')[:50]}")

                except Exception as item_error:
                    logger.debug(f"解析元素 {idx} 失败: {item_error}")
                    continue

            logger.info(f"【成功】共提取到 {len(videos)} 条有效视频")

        except Exception as e:
            logger.error(f"直接提取视频数据失败: {e}")
            import traceback
            logger.error(f"详细错误:\n{traceback.format_exc()}")

        return videos

    def _extract_video_data(self, html_source: str, seen_urls: set) -> List[Dict]:
        """从HTML中提取视频数据"""
        if not BS4_AVAILABLE:
            logger.warning("BeautifulSoup4未安装，跳过数据提取")
            return []

        videos = []

        try:
            soup = BeautifulSoup(html_source, 'html.parser')

            # 查找视频项目容器
            video_items = soup.select('li.SwZLHMKk')
            logger.info(f"【选择器 li.SwZLHMKk】找到 {len(video_items)} 个视频项目")

            # 【调试】如果没找到，尝试其他选择器
            if len(video_items) == 0:
                logger.warning("【调试】未找到 li.SwZLHMKk，尝试查找其他可能的选择器...")
                # 尝试查找所有的li标签
                all_li = soup.find_all('li', limit=10)
                logger.info(f"【调试】找到 {len(all_li)} 个li标签")
                if all_li:
                    for idx, li in enumerate(all_li[:3]):  # 只显示前3个
                        logger.info(f"【调试】li[{idx}] classes: {li.get('class', [])}")

                # 尝试查找包含视频的其他常见选择器
                alt_selectors = [
                    'li[class*="video"]',
                    'div[class*="video"]',
                    'a[href*="/video/"]',
                    'ul li',
                ]
                for selector in alt_selectors:
                    items = soup.select(selector)
                    if items:
                        logger.info(f"【调试】选择器 '{selector}' 找到 {len(items)} 个元素")
                        break
            
            for item in video_items:
                try:
                    video_data = {}
                    
                    # 提取标题
                    title_elem = item.select_one('div.VDYK8Xd7')
                    if title_elem:
                        video_data['title'] = title_elem.get_text(strip=True)
                    
                    # 提取作者
                    author_elem = item.select_one('span.MZNczJmS')
                    if author_elem:
                        video_data['author'] = author_elem.get_text(strip=True)
                    
                    # 提取视频链接
                    link_elem = item.select_one('a.hY8lWHgA')
                    if link_elem:
                        href = link_elem.get('href', '')
                        if href.startswith('//'):
                            video_url = 'https:' + href
                        else:
                            video_url = href
                        video_data['video_url'] = video_url
                    else:
                        continue  # 没有链接就跳过
                    
                    # 去重检查
                    if video_data.get('video_url') in seen_urls:
                        continue
                    
                    # 提取发布时间
                    time_elem = item.select_one('span.faDtinfi')
                    if time_elem:
                        video_data['publish_time'] = time_elem.get_text(strip=True)
                    
                    # 提取点赞数
                    likes_elem = item.select_one('span.cIiU4Muu')
                    if likes_elem:
                        video_data['likes'] = likes_elem.get_text(strip=True)
                    else:
                        video_data['likes'] = '0'
                    
                    # 添加采集时间
                    video_data['collected_at'] = datetime.now().isoformat()
                    
                    # 只添加有标题的视频
                    if video_data.get('title'):
                        videos.append(video_data)
                        seen_urls.add(video_data.get('video_url'))
                
                except Exception as e:
                    logger.error(f"提取单个视频数据失败: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"解析HTML失败: {e}")
        
        return videos


class DouyinTool:
    """抖音工具主类"""
    
    def __init__(self):
        self.api = DouyinApi()
    
    async def search_videos(self, keywords: str, scroll_count: int = 5) -> str:
        """搜索视频并返回格式化结果"""
        try:
            logger.info(f'搜索关键词: {keywords}')
            videos = await self.api.search_videos(keywords, scroll_count)
            
            result = f"搜索结果 - {keywords}：\n\n"
            
            if videos:
                for i, video in enumerate(videos[:20]):  # 最多显示20条
                    title = video.get('title', 'N/A')
                    author = video.get('author', 'N/A')
                    likes = video.get('likes', '0')
                    url = video.get('video_url', '')
                    
                    result += f"{i+1}. {title}\n"
                    result += f"   作者: {author}\n"
                    result += f"   点赞数: {likes}\n"
                    result += f"   链接: {url}\n\n"
            else:
                result = f"未找到与 \"{keywords}\" 相关的视频"
            
            return result
        
        except Exception as e:
            logger.error(f"搜索视频失败: {e}")
            return f"搜索失败: {str(e)}"
    
    async def search_videos_raw(self, keywords: str, scroll_count: int = 5, limit: int = 20) -> Dict:
        """搜索视频并返回原始数据（用于程序调用）"""
        try:
            logger.info(f'搜索关键词: {keywords}, 限制: {limit}条')
            videos = await self.api.search_videos(keywords, scroll_count)
            
            # 限制返回数量
            videos = videos[:limit]
            
            # 提取文本内容
            raw_texts = []
            for video in videos:
                # 添加标题
                if video.get('title'):
                    raw_texts.append(video['title'])
                
                # 可以在这里添加更多内容提取逻辑
                # 例如视频描述、评论等（需要进一步实现）
            
            return {
                'videos': videos,
                'raw_texts': raw_texts,
                'count': len(videos)
            }

        except Exception as e:
            logger.error(f"搜索视频失败: {e}")
            raise

    async def search_videos_with_comments(self, keywords: str, max_videos: int = 10, max_comments: int = 30) -> Dict:
        """搜索视频并获取评论（深度抓取版本）"""
        try:
            logger.info(f'深度搜索关键词: {keywords}, 最大视频数: {max_videos}')
            videos = await self.api.search_videos_with_comments(keywords, max_videos, max_comments)

            # 提取所有文本（标题+评论）
            raw_texts = []
            all_comments = []

            for video in videos:
                # 添加标题
                if video.get('title'):
                    raw_texts.append(video['title'])

                # 添加描述
                if video.get('description'):
                    raw_texts.append(video['description'])

                # 添加评论
                comments = video.get('comments', [])
                for comment in comments:
                    comment_text = comment.get('text', '')
                    if comment_text:
                        raw_texts.append(comment_text)
                        all_comments.append({
                            'video_title': video.get('title', ''),
                            'comment_text': comment_text,
                            'username': comment.get('username', 'unknown'),
                            'likes': comment.get('likes', '0')
                        })

            total_comments = sum(v.get('comment_count', 0) for v in videos)

            return {
                'videos': videos,
                'raw_texts': raw_texts,
                'all_comments': all_comments,
                'video_count': len(videos),
                'comment_count': total_comments
            }

        except Exception as e:
            logger.error(f"深度搜索失败: {e}")
            raise


async def main():
    """主函数"""
    # 确保stdout和stderr使用UTF-8编码
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8')

    parser = argparse.ArgumentParser(description='抖音工具 - 独立Python脚本版本')
    parser.add_argument('--action', type=str, required=True,
                        choices=['search', 'search-raw', 'search-with-comments'],
                        help='操作类型: search(格式化输出), search-raw(原始数据), search-with-comments(含评论深度抓取)')
    parser.add_argument('--keywords', type=str, help='搜索关键词')
    parser.add_argument('--scroll-count', type=int, default=5, help='滚动次数（默认5次）')
    parser.add_argument('--limit', type=int, default=20, help='返回结果数量限制（默认20条）')
    parser.add_argument('--max-videos', type=int, default=10, help='深度抓取时的最大视频数（默认10）')
    parser.add_argument('--max-comments', type=int, default=30, help='每个视频的最大评论数（默认30）')

    args = parser.parse_args()

    # 检查依赖
    if not DRISSION_AVAILABLE:
        print("错误: DrissionPage未安装", file=sys.stderr)
        print("请运行: pip install DrissionPage", file=sys.stderr)
        sys.exit(1)

    if not BS4_AVAILABLE:
        print("错误: BeautifulSoup4未安装", file=sys.stderr)
        print("请运行: pip install beautifulsoup4", file=sys.stderr)
        sys.exit(1)

    # 初始化工具
    tool = DouyinTool()

    try:
        if args.action == 'search':
            if not args.keywords:
                print("错误: 搜索操作需要提供 --keywords 参数", file=sys.stderr)
                sys.exit(1)
            result = await tool.search_videos(args.keywords, args.scroll_count)
            print(result)

        elif args.action == 'search-raw':
            if not args.keywords:
                print("错误: 搜索操作需要提供 --keywords 参数", file=sys.stderr)
                sys.exit(1)
            result = await tool.search_videos_raw(args.keywords, args.scroll_count, args.limit)
            # 确保输出UTF-8编码的JSON到stdout
            print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.action == 'search-with-comments':
            if not args.keywords:
                print("错误: 搜索操作需要提供 --keywords 参数", file=sys.stderr)
                sys.exit(1)
            logger.info(f"开始深度抓取，关键词: {args.keywords}")
            result = await tool.search_videos_with_comments(
                args.keywords,
                max_videos=args.max_videos,
                max_comments=args.max_comments
            )
            # 输出结果
            print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        logger.error(f"操作失败: {e}")
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

