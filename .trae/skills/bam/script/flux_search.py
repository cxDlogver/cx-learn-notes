#!/usr/bin/env python3
"""
Flux Knowledge Search Script
用于从知识库动态获取 Markdown 文档内容
"""

import argparse
import json
import os
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: requests module not found. Please install it with: pip install requests")
    sys.exit(1)


FLUX_SEARCH_URL = "http://assert.byted.org/knowledge-process-agent/flux_search"

DEFAULT_KNOWLEDGE_KEYS = ["knowledge_idl_spec_library"]

# Collection keys 映射
COLLECTION_KEYS_MAP = {
    "thrift": ["collection_thrift_idl_spec"],
    "protobuf": ["collection_protobuf_idl_spec"],
}

DEFAULT_IDL_TYPE = "thrift"


def search_knowledge(
    query: str,
    knowledge_keys: list = None,
    collection_keys: list = None,
    idl_type: str = None,
    limit: int = 1,
    full_content: bool = True,
    session_id: str = None,
) -> dict:
    """
    执行知识库搜索请求

    Args:
        query: 搜索查询字符串
        knowledge_keys: 知识库 key 列表
        collection_keys: 集合 key 列表
        idl_type: IDL 类型 (thrift 或 protobuf)
        limit: 返回结果数量限制
        full_content: 是否返回完整内容
        session_id: 会话 ID

    Returns:
        API 响应字典
    """
    if knowledge_keys is None:
        knowledge_keys = DEFAULT_KNOWLEDGE_KEYS

    # 根据 idl_type 或 collection_keys 确定最终的 collection_keys
    if collection_keys is None:
        if idl_type is None:
            idl_type = DEFAULT_IDL_TYPE
        collection_keys = COLLECTION_KEYS_MAP.get(idl_type, COLLECTION_KEYS_MAP[DEFAULT_IDL_TYPE])

    if session_id is None:
        session_id = f"flux_search_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    payload = {
        "query": query,
        "caller": "flux_search",
        "session_id": session_id,
        "knowledge_keys": knowledge_keys,
        "collection_keys": collection_keys,
        "full_content": full_content,
        "limit": limit
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            FLUX_SEARCH_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None


def download_from_tos(tos_url: str, timeout: int = 60) -> str:
    """
    从 TOS URL 下载文件内容

    Args:
        tos_url: TOS 文件 URL
        timeout: 请求超时时间

    Returns:
        文件内容字符串
    """
    try:
        print(f"Downloading from TOS: {tos_url}")
        response = requests.get(tos_url, timeout=timeout)
        response.raise_for_status()
        # 尝试解码为 UTF-8
        return response.content.decode("utf-8")
    except requests.exceptions.RequestException as e:
        print(f"Failed to download from TOS: {e}")
        return None
    except UnicodeDecodeError as e:
        print(f"Failed to decode TOS content as UTF-8: {e}")
        return None


def extract_tos_url(response: dict) -> str:
    """
    从响应中提取 TOS URL

    Args:
        response: API 响应字典

    Returns:
        TOS URL 字符串，如果没有则返回 None
    """
    if not response:
        return None

    # 尝试从不同路径提取 TOS URL
    # 路径 1: data[0].tos_url
    if "data" in response:
        data = response["data"]
        if isinstance(data, list) and len(data) > 0:
            item = data[0]
            # 检查多种可能的字段名
            for key in ["tos_url", "tosUrl", "url", "file_url", "download_url"]:
                if key in item and item[key]:
                    return item[key]
        elif isinstance(data, dict):
            for key in ["tos_url", "tosUrl", "url", "file_url", "download_url"]:
                if key in data and data[key]:
                    return data[key]

    # 路径 2: result.tos_url
    if "result" in response:
        result = response["result"]
        if isinstance(result, dict):
            for key in ["tos_url", "tosUrl", "url", "file_url", "download_url"]:
                if key in result and result[key]:
                    return result[key]

    return None


def extract_markdown_content(response: dict, prefer_tos: bool = True) -> tuple:
    """
    从响应中提取 Markdown 内容

    Args:
        response: API 响应字典
        prefer_tos: 是否优先从 TOS 下载

    Returns:
        (content, source) 元组，source 表示内容来源 ("tos", "response", "json")
    """
    if not response:
        return None, None

    # 优先尝试从 TOS URL 下载
    if prefer_tos:
        tos_url = extract_tos_url(response)
        if tos_url:
            content = download_from_tos(tos_url)
            if content:
                return content, "tos"

    # 尝试从响应中直接提取内容
    if "data" in response:
        data = response["data"]
        if isinstance(data, list) and len(data) > 0:
            item = data[0]
            for key in ["content", "markdown", "text"]:
                if key in item and item[key]:
                    return item[key], "response"
        elif isinstance(data, dict):
            for key in ["content", "markdown", "text"]:
                if key in data and data[key]:
                    return data[key], "response"

    # 如果无法提取特定字段，返回整个响应的 JSON 格式
    return json.dumps(response, ensure_ascii=False, indent=2), "json"


def save_to_file(content: str, output_path: str) -> bool:
    """
    保存内容到文件
    
    Args:
        content: 要保存的内容
        output_path: 输出文件路径
    
    Returns:
        是否保存成功
    """
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"Content saved to: {output_path}")
        return True
    except IOError as e:
        print(f"Failed to save file: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="从 Flux 知识库搜索并获取 Markdown 文档"
    )
    parser.add_argument(
        "-q", "--query",
        required=True,
        help="搜索查询字符串"
    )
    parser.add_argument(
        "-k", "--knowledge-keys",
        nargs="+",
        default=DEFAULT_KNOWLEDGE_KEYS,
        help="知识库 key 列表"
    )
    parser.add_argument(
        "-t", "--type",
        choices=["thrift", "protobuf"],
        default=DEFAULT_IDL_TYPE,
        help="IDL 类型: thrift 或 protobuf (默认: thrift)"
    )
    parser.add_argument(
        "-c", "--collection-keys",
        nargs="+",
        help="集合 key 列表 (如果指定，则忽略 --type 参数)"
    )
    parser.add_argument(
        "-l", "--limit",
        type=int,
        default=1,
        help="返回结果数量限制 (默认: 1)"
    )
    parser.add_argument(
        "-o", "--output",
        help="输出文件路径 (如果不指定，则打印到标准输出)"
    )
    parser.add_argument(
        "--no-full-content",
        action="store_true",
        help="不返回完整内容"
    )
    parser.add_argument(
        "-s", "--session-id",
        help="会话 ID"
    )
    parser.add_argument(
        "--no-tos",
        action="store_true",
        help="不从 TOS 下载，直接使用响应中的内容"
    )

    args = parser.parse_args()

    # 执行搜索
    print(f"Searching for: {args.query}")
    print(f"IDL type: {args.type}")
    response = search_knowledge(
        query=args.query,
        knowledge_keys=args.knowledge_keys,
        collection_keys=args.collection_keys,
        idl_type=args.type,
        limit=args.limit,
        full_content=not args.no_full_content,
        session_id=args.session_id
    )

    if not response:
        print("No response received")
        sys.exit(1)

    # 提取 Markdown 内容
    content, source = extract_markdown_content(
        response,
        prefer_tos=not args.no_tos
    )

    if content:
        print(f"Content source: {source}")

    if args.output:
        if content:
            save_to_file(content, args.output)
        else:
            print("No content to save")
            sys.exit(1)
    else:
        print("\n" + "=" * 50 + "\n")
        if content:
            print(content)
        else:
            print("No content extracted")


if __name__ == "__main__":
    main()
