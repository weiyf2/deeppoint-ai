# -*- coding: utf-8 -*-
# Simplified async file writer - no wordcloud support

import asyncio
import csv
import json
import os
import pathlib
from typing import Dict, List
import aiofiles
from tools.utils import utils


class AsyncFileWriter:
    def __init__(self, platform: str, crawler_type: str):
        self.lock = asyncio.Lock()
        self.platform = platform
        self.crawler_type = crawler_type

    def _get_file_path(self, file_type: str, item_type: str) -> str:
        base_path = f"data/{self.platform}/{file_type}"
        pathlib.Path(base_path).mkdir(parents=True, exist_ok=True)
        file_name = f"{self.crawler_type}_{item_type}_{utils.get_current_date()}.{file_type}"
        return f"{base_path}/{file_name}"

    async def write_to_csv(self, item: Dict, item_type: str):
        file_path = self._get_file_path('csv', item_type)
        async with self.lock:
            file_exists = os.path.exists(file_path)
            async with aiofiles.open(file_path, 'a', newline='', encoding='utf-8-sig') as f:
                # aiofiles doesn't support csv.DictWriter directly, use manual approach
                if not file_exists:
                    header_line = ','.join(f'"{k}"' for k in item.keys()) + '\n'
                    await f.write(header_line)

                values = []
                for v in item.values():
                    if v is None:
                        values.append('')
                    elif isinstance(v, str):
                        # Escape quotes and wrap in quotes
                        values.append(f'"{v.replace(chr(34), chr(34)+chr(34))}"')
                    else:
                        values.append(f'"{v}"')
                row_line = ','.join(values) + '\n'
                await f.write(row_line)

    async def write_single_item_to_json(self, item: Dict, item_type: str):
        file_path = self._get_file_path('json', item_type)
        async with self.lock:
            existing_data = []
            if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        content = await f.read()
                        if content:
                            existing_data = json.loads(content)
                        if not isinstance(existing_data, list):
                            existing_data = [existing_data]
                    except json.JSONDecodeError:
                        existing_data = []

            existing_data.append(item)

            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(existing_data, ensure_ascii=False, indent=4))
