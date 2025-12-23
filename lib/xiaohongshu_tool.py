#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书工具 - 独立Python脚本版本
支持搜索笔记、获取内容、查看评论和发表评论等功能
"""

import asyncio
import json
import time
import os
import argparse
import logging
import sys
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from collections.abc import Mapping
from typing import Dict, Optional
import random
import execjs
from numbers import Integral
from typing import Iterable
from curl_cffi.requests import AsyncSession, Response

# 设置输出编码为UTF-8
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class XhsApi:
    """小红书API封装类"""

    def __init__(self, cookie: str):
        self._cookie = cookie
        self._base_url = "https://edith.xiaohongshu.com"
        self._headers = {
            'content-type': 'application/json;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        }

    def init_session(self):
        """初始化会话"""
        return AsyncSession(
            verify=True,
            impersonate="chrome124"
        )

    def _parse_cookie(self, cookie: str) -> Dict:
        """解析cookie字符串为字典"""
        cookie_dict = {}
        if cookie:
            pairs = cookie.split(';')
            for pair in pairs:
                if '=' in pair:
                    key, value = pair.strip().split('=', 1)
                    cookie_dict[key] = value
        return cookie_dict

    async def request(self, uri: str, session=None, method="GET", headers=None, params=None, data=None) -> Dict:
        """发送HTTP请求"""
        if session is None:
            session = self.init_session()
        if headers is None:
            headers = {}

        response: Response = await session.request(
            method=method,
            url=f"{self._base_url}{uri}",
            params=params,
            json=data,
            cookies=self._parse_cookie(self._cookie),
            quote=False,
            stream=True,
            headers=headers
        )

        content = await response.acontent()
        return json.loads(content)

    def base36encode(self, number: Integral, alphabet: Iterable[str] = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') -> str:
        """Base36编码"""
        base36 = ''
        alphabet = ''.join(alphabet)
        sign = '-' if number < 0 else ''
        number = abs(number)

        while number:
            number, i = divmod(number, len(alphabet))
            base36 = alphabet[i] + base36

        return sign + (base36 or alphabet[0])

    def search_id(self):
        """生成搜索ID"""
        e = int(time.time() * 1000) << 64
        t = int(random.uniform(0, 2147483646))
        return self.base36encode((e + t))

    def get_xs_xt(self, uri, data, cookie):
        """获取x-s和x-t签名参数"""
        current_directory = os.path.dirname(__file__)
        js_file_path = os.path.join(current_directory, "xhs_mcp", "api", "xhsvm.js")

        if not os.path.exists(js_file_path):
            raise FileNotFoundError(f"JS文件不存在: {js_file_path}")

        with open(js_file_path, 'r', encoding='utf-8') as f:
            js_code = f.read()

        return execjs.compile(js_code).call('GetXsXt', uri, data, cookie)

    async def get_me(self) -> Dict:
        """获取用户信息，用于检测cookie有效性"""
        uri = '/api/sns/web/v2/user/me'
        return await self.request(uri, method="GET")

    async def search_notes(self, keywords: str, limit: int = 20) -> Dict:
        """搜索笔记"""
        data = {
            "keyword": keywords,
            "page": 1,
            "page_size": limit,
            "search_id": self.search_id(),
            "sort": "general",
            "note_type": 0,
            "ext_flags": [],
            "geo": "",
            "image_formats": json.dumps(["jpg", "webp", "avif"], separators=(",", ":"))
        }
        return await self.request("/api/sns/web/v1/search/notes", method="POST", data=data)

    async def home_feed(self) -> Dict:
        """获取首页推荐"""
        data = {
            "category": "homefeed_recommend",
            "cursor_score": "",
            "image_formats": json.dumps(["jpg", "webp", "avif"], separators=(",", ":")),
            "need_filter_image": False,
            "need_num": 8,
            "num": 18,
            "note_index": 33,
            "refresh_type": 1,
            "search_key": "",
            "unread_begin_note_id": "",
            "unread_end_note_id": "",
            "unread_note_count": 0
        }
        uri = "/api/sns/web/v1/homefeed"
        headers = {
            'content-type': 'application/json;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        }
        xsxt = json.loads(self.get_xs_xt(uri, data, self._cookie))
        headers['x-s'] = xsxt['X-s']
        headers['x-t'] = str(xsxt['X-t'])
        return await self.request(uri, method="POST", headers=headers, data=data)

    async def get_note_content(self, note_id: str, xsec_token: str) -> Dict:
        """获取笔记内容"""
        data = {
            "source_note_id": note_id,
            "image_formats": ["jpg", "webp", "avif"],
            "extra": {"need_body_topic": "1"},
            "xsec_source": "pc_feed",
            "xsec_token": xsec_token
        }
        uri = "/api/sns/web/v1/feed"
        headers = {
            'content-type': 'application/json;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        }
        xsxt = json.loads(self.get_xs_xt(uri, data, self._cookie))
        headers['x-s'] = xsxt['X-s']
        headers['x-t'] = str(xsxt['X-t'])
        headers['x-s-common'] = '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'

        return await self.request(uri, method="POST", headers=headers, data=data)

    async def get_note_comments(self, note_id: str, xsec_token: str) -> Dict:
        """获取笔记评论"""
        uri = '/api/sns/web/v2/comment/page'
        params = {
            'note_id': note_id,
            'cursor': '',
            'top_comment_id': '',
            'image_formats': 'jpg,webp,avif',
            'xsec_token': xsec_token
        }
        return await self.request(uri, method="GET", params=params)

    async def post_comment(self, note_id: str, comment: str) -> Dict:
        """发表评论"""
        uri = '/api/sns/web/v1/comment/post'
        data = {
            "note_id": note_id,
            "content": comment,
            "at_users": []
        }
        headers = {
            'content-type': 'application/json;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        }
        xsxt = json.loads(self.get_xs_xt(uri, data, self._cookie))
        headers['x-s'] = xsxt['X-s']
        headers['x-t'] = str(xsxt['X-t'])
        return await self.request(uri, method="POST", headers=headers, data=data)


class XiaohongshuTool:
    """小红书工具主类"""

    def __init__(self, cookie: str):
        self.api = XhsApi(cookie)

    def get_note_id_token(self, url: str = None, note_ids: str = None):
        """从URL或note_ids提取note_id和xsec_token"""
        if note_ids is not None:
            note_id = note_ids[:24]
            xsec_token = note_ids[24:]
            return {"note_id": note_id, "xsec_token": xsec_token}

        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)

        note_id = parsed_url.path.split('/')[-1]
        xsec_token = None
        xsec_token_list = query_params.get('xsec_token', [None])
        if len(xsec_token_list) > 0:
            xsec_token = xsec_token_list[0]
        return {"note_id": note_id, "xsec_token": xsec_token}

    async def check_cookie(self) -> str:
        """检测cookie是否失效"""
        try:
            data = await self.api.get_me()
            if 'success' in data and data['success'] == True:
                return "COOKIE_VALID"
            else:
                return "COOKIE_INVALID"
        except Exception as e:
            logger.error(e)
            return "COOKIE_INVALID"

    async def home_feed(self) -> str:
        """获取首页推荐笔记"""
        data = await self.api.home_feed()
        result = "首页推荐结果：\n\n"

        if 'data' in data and 'items' in data['data'] and len(data['data']['items']) > 0:
            for i, item in enumerate(data['data']['items']):
                if 'note_card' in item and 'display_title' in item['note_card']:
                    title = item['note_card']['display_title']
                    liked_count = item['note_card']['interact_info']['liked_count']
                    url = f'https://www.xiaohongshu.com/explore/{item["id"]}?xsec_token={item["xsec_token"]}'
                    result += f"{i+1}. {title}\n   点赞数: {liked_count}\n   链接: {url}\n\n"
        else:
            cookie_status = await self.check_cookie()
            if "COOKIE_VALID" in cookie_status:
                result = "未找到相关的笔记"
            else:
                result = cookie_status

        return result

    async def search_notes(self, keywords: str) -> str:
        """搜索笔记"""
        data = await self.api.search_notes(keywords)
        logger.info(f'搜索关键词: {keywords}')
        result = f"搜索结果 - {keywords}：\n\n"

        if 'data' in data and 'items' in data['data'] and len(data['data']['items']) > 0:
            for i, item in enumerate(data['data']['items']):
                if 'note_card' in item and 'display_title' in item['note_card']:
                    title = item['note_card']['display_title']
                    liked_count = item['note_card']['interact_info']['liked_count']
                    url = f'https://www.xiaohongshu.com/explore/{item["id"]}?xsec_token={item["xsec_token"]}'
                    result += f"{i+1}. {title}\n   点赞数: {liked_count}\n   链接: {url}\n\n"
        else:
            cookie_status = await self.check_cookie()
            if "COOKIE_VALID" in cookie_status:
                result = f"未找到与 \"{keywords}\" 相关的笔记"
            else:
                result = cookie_status

        return result

    async def get_note_content(self, url: str) -> str:
        """获取笔记内容"""
        params = self.get_note_id_token(url=url)
        data = await self.api.get_note_content(**params)
        logger.info(f'获取笔记内容: {url}')

        result = ""
        if 'data' in data and 'items' in data['data'] and len(data['data']['items']) > 0:
            item = data['data']['items'][0]

            if 'note_card' in item and 'user' in item['note_card']:
                note_card = item['note_card']
                cover = ''
                if 'image_list' in note_card and len(note_card['image_list']) > 0:
                    if note_card['image_list'][0].get('url_pre'):
                        cover = note_card['image_list'][0]['url_pre']

                date_format = datetime.fromtimestamp(note_card.get('time', 0) / 1000)
                liked_count = item['note_card']['interact_info']['liked_count']
                comment_count = item['note_card']['interact_info']['comment_count']
                collected_count = item['note_card']['interact_info']['collected_count']

                url = f'https://www.xiaohongshu.com/explore/{params["note_id"]}?xsec_token={params["xsec_token"]}'
                result = f"标题: {note_card.get('title', '')}\n"
                result += f"作者: {note_card['user'].get('nickname', '')}\n"
                result += f"发布时间: {date_format}\n"
                result += f"点赞数: {liked_count}\n"
                result += f"评论数: {comment_count}\n"
                result += f"收藏数: {collected_count}\n"
                result += f"链接: {url}\n\n"
                result += f"内容:\n{note_card.get('desc', '')}\n"
                if cover:
                    result += f"\n封面: {cover}"
        else:
            cookie_status = await self.check_cookie()
            if "COOKIE_VALID" in cookie_status:
                result = "获取失败"
            else:
                result = cookie_status

        return result

    async def get_note_comments(self, url: str) -> str:
        """获取笔记评论"""
        params = self.get_note_id_token(url=url)
        data = await self.api.get_note_comments(**params)
        logger.info(f'获取评论: {url}')

        result = ""
        if 'data' in data and 'comments' in data['data'] and len(data['data']['comments']) > 0:
            for i, item in enumerate(data['data']['comments']):
                date_format = datetime.fromtimestamp(item['create_time'] / 1000)
                result += f"{i+1}. {item['user_info']['nickname']}（{date_format}）: {item['content']}\n\n"
        else:
            cookie_status = await self.check_cookie()
            if "COOKIE_VALID" in cookie_status:
                result = "暂无评论"
            else:
                result = cookie_status

        return result

    async def post_comment(self, note_id: str, comment: str) -> str:
        """发表评论"""
        response = await self.api.post_comment(note_id, comment)
        if 'success' in response and response['success'] == True:
            return "评论发布成功"
        else:
            cookie_status = await self.check_cookie()
            if "COOKIE_VALID" in cookie_status:
                return "评论发布失败"
            else:
                return cookie_status


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='小红书工具 - 独立Python脚本版本')
    parser.add_argument('--cookie', type=str, help='小红书Cookie', default=None)
    parser.add_argument('--action', type=str, required=True,
                        choices=['check', 'feed', 'search', 'content', 'comments', 'post'],
                        help='操作类型')
    parser.add_argument('--keywords', type=str, help='搜索关键词')
    parser.add_argument('--url', type=str, help='笔记URL')
    parser.add_argument('--note-id', type=str, help='笔记ID')
    parser.add_argument('--comment', type=str, help='评论内容')

    args = parser.parse_args()

    # 获取Cookie
    cookie = args.cookie or os.getenv('XHS_COOKIE')
    if not cookie:
        print("错误: 请提供小红书Cookie")
        print("可以通过 --cookie 参数或 XHS_COOKIE 环境变量提供")
        return

    # 初始化工具
    tool = XiaohongshuTool(cookie)

    try:
        if args.action == 'check':
            result = await tool.check_cookie()
            print(result)

        elif args.action == 'feed':
            result = await tool.home_feed()
            print(result)

        elif args.action == 'search':
            if not args.keywords:
                print("错误: 搜索操作需要提供 --keywords 参数")
                return
            result = await tool.search_notes(args.keywords)
            print(result)

        elif args.action == 'content':
            if not args.url:
                print("错误: 获取内容操作需要提供 --url 参数")
                return
            result = await tool.get_note_content(args.url)
            print(result)

        elif args.action == 'comments':
            if not args.url:
                print("错误: 获取评论操作需要提供 --url 参数")
                return
            result = await tool.get_note_comments(args.url)
            print(result)

        elif args.action == 'post':
            if not args.note_id or not args.comment:
                print("错误: 发表评论操作需要提供 --note-id 和 --comment 参数")
                return
            result = await tool.post_comment(args.note_id, args.comment)
            print(result)

    except Exception as e:
        logger.error(f"操作失败: {e}")
        print(f"错误: {e}")


if __name__ == "__main__":
    asyncio.run(main())