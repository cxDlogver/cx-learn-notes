from pathlib import Path


def main() -> None:
    current_dir = Path.cwd()
    print(f"当前目录: {current_dir}")
    print("目录内容:")

    for path in sorted(current_dir.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower())):
        entry_type = "目录" if path.is_dir() else "文件"
        print(f"- [{entry_type}] {path.name}")


if __name__ == "__main__":
    main()
