#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将目录下所有 Markdown 文件合并并导出为 PDF（使用 xhtml2pdf）
"""

import os
import re
import markdown
from xhtml2pdf import pisa
import io

# 文档目录
BASE_DIR = r"f:\CX_notes\cxDlogver\source\_posts\AI\AI团队赋能"

# 按顺序排列文件
MD_FILES = [
    "第一篇 AI Agent 开发报告.md",
    "第二篇 AI-DLC.md",
    "第三篇 AI-DLC 示例讲解.md",
    "第四篇 Spec-kit.md",
    "第五篇 Figma MCP.md",
    "第六篇 Codex、AGENTS、Spec Kit 协同流程规范及实践.md",
    "第七章 单Agent与多Agent实践.md",
]

OUTPUT_PDF = os.path.join(BASE_DIR, "AI团队赋能合集.pdf")
OUTPUT_MD = os.path.join(BASE_DIR, "AI团队赋能合集.md")


def read_md(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def merge_all_md():
    parts = []
    parts.append("# AI 团队赋能 — 完整合集\n\n")
    parts.append("> 本文档由以下七篇文章合并整理而成，涵盖 AI Agent 开发、AI-DLC、Spec Kit、Figma MCP 及多 Agent 实践等核心内容。\n\n")
    parts.append("---\n\n")

    for i, filename in enumerate(MD_FILES, 1):
        filepath = os.path.join(BASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f"警告：文件不存在 {filepath}")
            continue

        content = read_md(filepath)

        if i > 1:
            parts.append("\n\n---\n\n")

        # 调整标题层级
        adjusted = []
        for line in content.split('\n'):
            if line.startswith('###### '):
                adjusted.append('##### ' + line[7:])
            elif line.startswith('##### '):
                adjusted.append('#### ' + line[6:])
            elif line.startswith('#### '):
                adjusted.append('### ' + line[5:])
            elif line.startswith('### '):
                adjusted.append('## ' + line[4:])
            elif line.startswith('## '):
                adjusted.append('# ' + line[3:])
            else:
                adjusted.append(line)

        parts.append('\n'.join(adjusted))

    return '\n'.join(parts)


def find_chinese_font():
    """查找系统中可用的中文字体路径"""
    candidates = [
        r"C:\Windows\Fonts\msyh.ttc",   # 微软雅黑
        r"C:\Windows\Fonts\msyhbd.ttc",
        r"C:\Windows\Fonts\simsun.ttc",  # 宋体
        r"C:\Windows\Fonts\simhei.ttf",  # 黑体
        r"C:\Windows\Fonts\STFANGSO.TTF",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def main():
    print("正在合并 Markdown 文件...")
    merged_content = merge_all_md()

    # 保存合并的 MD
    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(merged_content)
    print(f"合并 MD 已保存：{OUTPUT_MD}")

    print("正在将 Markdown 转换为 HTML...")
    md_processor = markdown.Markdown(
        extensions=[
            'extra',
            'toc',
            'tables',
            'fenced_code',
        ],
        extension_configs={
            'toc': {'title': '目录'}
        }
    )
    html_body = md_processor.convert(merged_content)

    # 查找中文字体
    font_path = find_chinese_font()
    if font_path:
        font_path_normalized = font_path.replace("\\", "/")
        print(f"使用字体：{font_path}")
        font_face = f"""
        @font-face {{
            font-family: ChineseFont;
            src: url('file:///{font_path_normalized}');
        }}
        """
        base_font = "ChineseFont, Arial, sans-serif"
    else:
        print("未找到中文字体，使用系统默认字体")
        font_face = ""
        base_font = "Arial, sans-serif"

    css_style = f"""
        {font_face}

        @page {{
            size: A4;
            margin: 2cm 2.5cm;
        }}

        body {{
            font-family: {base_font};
            font-size: 10pt;
            line-height: 1.7;
            color: #2c3e50;
        }}

        h1 {{
            font-size: 18pt;
            color: #1a1a2e;
            border-bottom: 2pt solid #3498db;
            padding-bottom: 4pt;
            margin-top: 24pt;
            margin-bottom: 12pt;
            page-break-before: always;
        }}

        h1:first-of-type {{
            page-break-before: avoid;
        }}

        h2 {{
            font-size: 14pt;
            color: #2c3e50;
            border-bottom: 1pt solid #bdc3c7;
            padding-bottom: 3pt;
            margin-top: 18pt;
            margin-bottom: 8pt;
        }}

        h3 {{
            font-size: 12pt;
            color: #34495e;
            margin-top: 14pt;
            margin-bottom: 6pt;
        }}

        h4 {{
            font-size: 11pt;
            color: #555;
            margin-top: 10pt;
            margin-bottom: 4pt;
        }}

        h5 {{
            font-size: 10pt;
            color: #666;
            margin-top: 8pt;
            margin-bottom: 4pt;
        }}

        p {{
            margin: 0 0 7pt 0;
        }}

        blockquote {{
            border-left: 3pt solid #3498db;
            margin: 10pt 0;
            padding: 6pt 10pt;
            background-color: #f0f4f8;
            color: #555;
        }}

        code {{
            font-family: Courier, monospace;
            font-size: 9pt;
            background-color: #f4f4f4;
            padding: 0 2pt;
            color: #c0392b;
        }}

        pre {{
            background-color: #2b2b2b;
            color: #f8f8f2;
            padding: 8pt;
            margin: 8pt 0;
            font-size: 8.5pt;
            line-height: 1.4;
            page-break-inside: avoid;
        }}

        pre code {{
            background: none;
            color: #f8f8f2;
            padding: 0;
        }}

        ul, ol {{
            margin: 6pt 0 6pt 16pt;
            padding-left: 10pt;
        }}

        li {{
            margin-bottom: 3pt;
        }}

        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 8pt 0;
            font-size: 9pt;
            page-break-inside: avoid;
        }}

        th {{
            background-color: #3498db;
            color: white;
            padding: 5pt 8pt;
            text-align: left;
        }}

        td {{
            padding: 4pt 8pt;
            border: 0.5pt solid #ddd;
        }}

        tr:nth-child(even) td {{
            background-color: #f9f9f9;
        }}

        hr {{
            border: none;
            border-top: 1pt solid #ecf0f1;
            margin: 16pt 0;
        }}

        strong {{
            font-weight: bold;
        }}

        a {{
            color: #3498db;
        }}
    """

    html_full = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
{css_style}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

    print("正在生成 PDF，请稍候...")
    with open(OUTPUT_PDF, "wb") as pdf_file:
        result = pisa.CreatePDF(
            src=html_full,
            dest=pdf_file,
            encoding='utf-8'
        )

    if not result.err:
        size = os.path.getsize(OUTPUT_PDF)
        print(f"PDF 已成功生成：{OUTPUT_PDF}")
        print(f"文件大小：{size / 1024:.1f} KB")
    else:
        print(f"PDF 生成出错，错误代码：{result.err}")


if __name__ == "__main__":
    main()
