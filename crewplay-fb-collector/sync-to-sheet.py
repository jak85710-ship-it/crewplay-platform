#!/usr/bin/env python3
"""將 inbox 資料夾內的 JSON 批次檔自動寫入 Google 試算表。"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import gspread
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SHEET_ID = '1wBIDO4zPqB-4z4C1yPy-8CgOH-MInB36j7Tw46BR9VE'
COLUMNS = ['sport', 'arena_name', 'introduce', 'photo', 'assign_url', 'region', 'location']
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

ROOT = Path(__file__).resolve().parent
INBOX = ROOT / 'inbox'
DONE = ROOT / 'done'
CREDENTIALS = ROOT / 'credentials.json'
TOKEN = ROOT / 'token.json'


def get_client() -> gspread.Client:
    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS.exists():
                print('找不到 credentials.json，請先照 SETUP-SYNC.md 完成 Google Cloud 設定。')
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN.write_text(creds.to_json(), encoding='utf-8')
    return gspread.authorize(creds)


def load_existing_urls(sheet: gspread.Worksheet) -> set[str]:
    urls: set[str] = set()
    try:
        values = sheet.col_values(5)  # assign_url 在第 5 欄
    except Exception:
        return urls
    for value in values[1:]:
        url = str(value or '').strip()
        if url:
            urls.add(url)
    return urls


def row_values(item: dict) -> list[str]:
    return [str(item.get(col, '') or '') for col in COLUMNS]


def process_file(path: Path, sheet: gspread.Worksheet, existing_urls: set[str]) -> tuple[int, int]:
    data = json.loads(path.read_text(encoding='utf-8'))
    rows = data.get('rows') or []
    added = 0
    skipped = 0
    batch: list[list[str]] = []

    for item in rows:
        url = str(item.get('assign_url', '') or '').strip()
        if url and url in existing_urls:
            skipped += 1
            continue
        batch.append(row_values(item))
        if url:
            existing_urls.add(url)
        added += 1

    if batch:
        sheet.append_rows(batch, value_input_option='USER_ENTERED')

    return added, skipped


def main() -> None:
    INBOX.mkdir(exist_ok=True)
    DONE.mkdir(exist_ok=True)

    files = sorted(INBOX.glob('crewplay-batch-*.json'))
    if not files:
        print('inbox 資料夾沒有待處理的批次檔。')
        return

    client = get_client()
    sheet = client.open_by_key(SHEET_ID).sheet1
    existing_urls = load_existing_urls(sheet)

    total_added = 0
    total_skipped = 0

    for path in files:
        try:
            added, skipped = process_file(path, sheet, existing_urls)
            total_added += added
            total_skipped += skipped
            shutil.move(str(path), str(DONE / path.name))
            print(f'✓ {path.name}：寫入 {added} 筆，跳過重複 {skipped} 筆')
        except Exception as err:
            print(f'✗ {path.name} 失敗：{err}')

    print(f'完成：共寫入 {total_added} 筆，跳過重複 {total_skipped} 筆。')


if __name__ == '__main__':
    main()
