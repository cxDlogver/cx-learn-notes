#!/usr/bin/env python3
"""
打点数据上报脚本

Usage:
    # 使用默认生成的JSON数据上报
    python report_skill.py --skill "bam"

    # 指定更多参数
    python report_skill.py --skill "bam" --mode "Metadata" --source "test"

    # 从文件读取JSON数据上报
    python report_skill.py --file metrics.json

    # 直接传递JSON字符串
    python report_skill.py --json '{"report_info": {...}}'
"""

import argparse
import json
import os
import sys
from enum import Enum
from typing import Any, Optional

import requests


# 默认上报URL
DEFAULT_REPORT_URL = "https://ms-explorer.byted.org/explorer/v5/bam_skills/report"

# 环境变量名称
ENV_SOURCE = "EXEC_SOURCE"
ENV_SESSION_ID = "EXEC_SESSION_ID"


class Mode(str, Enum):
    """运行模式枚举"""
    FAST_CALL = "Fast call"
    LOCAL_MOCK = "Local mock"
    ENV_MODEL = "Env model"
    METADATA = "Metadata"
    IDL_CHECK = "idl-check"
    CODE_GEN = "Codegen"
    MOCK_RPC = "Mock rpc"
    MOCK_TOOL = "Mock tool"


# Skill支持的Mode映射
SKILL_MODES: dict[str, list[Mode]] = {
    "api-test": [Mode.FAST_CALL, Mode.LOCAL_MOCK, Mode.ENV_MODEL],
    "bam": [Mode.METADATA, Mode.IDL_CHECK, Mode.CODE_GEN],
    "api-mock": [Mode.MOCK_RPC, Mode.MOCK_TOOL],
    "bytedance-api-test": [Mode.FAST_CALL, Mode.LOCAL_MOCK, Mode.ENV_MODEL],
    "bytedance-bam": [Mode.METADATA, Mode.IDL_CHECK, Mode.CODE_GEN],
}


def get_available_modes(skill: str) -> list[str]:
    """获取指定skill支持的mode列表"""
    modes = SKILL_MODES.get(skill, list(Mode))
    return [m.value for m in modes]


def generate_metrics_data(
    skill: str,
    mode: str = "",
    source: str = "",
    version: str = "",
    session_id: str = "",
    customs: Optional[dict] = None,
) -> dict[str, Any]:
    """
    生成上报的JSON数据

    Args:
        skill: 技能名称 (必填)
        mode: 运行模式
        source: 来源
        version: 版本号
        session_id: 会话ID
        customs: 自定义字段

    Returns:
        dict: 生成的打点数据
    """
    data = {
        "report_info": {
            "skill": skill,
            "mode": mode,
            "source": source,
            "version": version,
            "session_id": session_id,
            "customs": customs or {}
        }
    }
    return data


def load_json_from_file(file_path: str) -> dict:
    """从文件加载JSON数据"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file {file_path}: {e}")
        sys.exit(1)


def load_json_from_string(json_str: str) -> dict:
    """从字符串解析JSON数据"""
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON string: {e}")
        sys.exit(1)


def report_metrics(
    url: str,
    data: dict,
    headers: Optional[dict] = None,
    timeout: int = 10
) -> bool:
    """
    上报打点数据

    Args:
        url: 上报接口URL
        data: 要上报的JSON数据
        headers: 自定义请求头
        timeout: 请求超时时间(秒)

    Returns:
        bool: 上报是否成功
    """
    default_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if headers:
        default_headers.update(headers)

    try:
        response = requests.post(
            url,
            json=data,
            headers=default_headers,
            timeout=timeout
        )
        response.raise_for_status()

        print(f"Report success: {response.status_code}")
        print(f"Response: {response.text}")
        return True

    except requests.exceptions.Timeout:
        print(f"Error: Request timeout after {timeout}s")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"Error: Connection failed: {e}")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"Error: HTTP error: {e}")
        print(f"Response body: {response.text}")
        return False
    except Exception as e:
        print(f"Error: Unexpected error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="打点数据上报脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --skill "api-test"                    # 基础上报
  %(prog)s --skill "api-test" --mode "Local mock" --version "0.0.1"
  %(prog)s --skill "api-test" --custom "key1=123" --custom "key2=value"
  %(prog)s --file metrics.json                   # 从文件读取JSON上报
  %(prog)s --json '{"report_info": {...}}'       # 直接传递JSON字符串
  %(prog)s --dry-run                             # 预览数据，不实际上报
        """
    )
    parser.add_argument(
        "--file", "-f",
        help="JSON数据文件路径"
    )
    parser.add_argument(
        "--json", "-j",
        help="JSON字符串数据"
    )
    parser.add_argument(
        "--skill", "-s",
        required=False,
        default="api-test",
        help="技能名称 (必填)，支持: api-test, bam, api-mock, bytedance-api-test, bytedance-bam"
    )
    parser.add_argument(
        "--mode", "-m",
        default="Local mock",
        help="运行模式，根据skill不同支持的值: api-test=[Fast call, Local mock, Env model], bam=[Metadata, idl-check], api-mock=[Mock rpc, Mock tool], bytedance-api-test=[Fast call, Local mock, Env model], bytedance-bam=[Metadata, idl-check]"
    )
    parser.add_argument(
        "--source",
        default=os.environ.get(ENV_SOURCE, ""),
        help=f"来源 (默认: 环境变量 {ENV_SOURCE} 或 '')"
    )
    parser.add_argument(
        "--version", "-v",
        default="0.0.1",
        help="版本号"
    )
    parser.add_argument(
        "--session-id",
        default=os.environ.get(ENV_SESSION_ID, ""),
        help=f"会话ID (默认: 环境变量 {ENV_SESSION_ID})"
    )
    parser.add_argument(
        "--custom", "-c",
        action="append",
        help="自定义字段，格式: 'key=value'，可多次使用，例如: -c 'test1=111' -c 'test2=222'"
    )
    parser.add_argument(
        "--header", "-H",
        action="append",
        help="自定义请求头，格式: 'Key: Value'，可多次使用"
    )
    parser.add_argument(
        "--timeout", "-t",
        type=int,
        default=10,
        help="请求超时时间(秒)，默认10"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印数据，不实际上报"
    )

    args = parser.parse_args()

    # 验证mode是否在skill支持的范围内
    available_modes = get_available_modes(args.skill)
    if args.mode not in available_modes:
        print(f"Warning: Invalid mode '{args.mode}' for skill '{args.skill}'")
        print(f"Available modes: {', '.join(available_modes)}")

    # 加载或生成JSON数据
    if args.file:
        data = load_json_from_file(args.file)
    elif args.json:
        data = load_json_from_string(args.json)
    else:
        # 解析自定义字段
        customs = {}
        if args.custom:
            for item in args.custom:
                if '=' in item:
                    key, value = item.split('=', 1)
                    # 尝试转换为数字或布尔值
                    value = value.strip()
                    if value.isdigit():
                        value = int(value)
                    elif value.lower() == 'true':
                        value = True
                    elif value.lower() == 'false':
                        value = False
                    customs[key.strip()] = value

        # 默认生成数据
        data = generate_metrics_data(
            skill=args.skill,
            mode=args.mode,
            source=args.source,
            version=args.version,
            session_id=args.session_id,
            customs=customs if customs else None,
        )

    # 解析自定义请求头
    headers = {}
    if args.header:
        for h in args.header:
            if ':' in h:
                key, value = h.split(':', 1)
                headers[key.strip()] = value.strip()

    print(f"Data: {json.dumps(data, ensure_ascii=False, indent=2)}")

    if args.dry_run:
        print("\n[Dry-run mode] 不执行实际上报")
        return

    # 执行上报
    success = report_metrics(
        url=DEFAULT_REPORT_URL,
        data=data,
        headers=headers if headers else None,
        timeout=args.timeout
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
