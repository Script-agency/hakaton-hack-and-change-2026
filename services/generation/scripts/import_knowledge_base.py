from __future__ import annotations

import argparse
import asyncio
import hashlib
import io
import zipfile
from pathlib import Path, PurePosixPath

import httpx

CATEGORY_LABELS = {
    "00-reference": "Справочные материалы",
    "10-energy": "Энергетика",
    "20-products": "Продукты",
}
SUPPORTED_EXTENSIONS = (".md", ".txt", ".pdf", ".docx", ".html", ".htm")


def load_candidates(archive_path: Path) -> list[tuple[str, bytes]]:
    if archive_path.is_dir():
        return [
            (path.relative_to(archive_path).as_posix(), path.read_bytes())
            for path in sorted(archive_path.rglob("*"))
            if path.is_file() and not any(part.startswith(".") for part in path.relative_to(archive_path).parts)
        ]

    with zipfile.ZipFile(archive_path) as archive:
        candidates = [
            (member.filename, archive.read(member))
            for member in sorted(archive.infolist(), key=lambda item: item.filename)
            if not member.is_dir() and not member.filename.startswith("__MACOSX/")
        ]

    # Support archives with a single wrapper directory, e.g. knowledge-base/00-reference/a.md.
    roots = {PurePosixPath(name).parts[0] for name, _ in candidates if PurePosixPath(name).parts}
    if len(roots) == 1:
        root = next(iter(roots))
        if all(len(PurePosixPath(name).parts) > 1 for name, _ in candidates):
            candidates = [(PurePosixPath(name).relative_to(root).as_posix(), data) for name, data in candidates]
    return candidates


async def import_archive(
    base_url: str,
    token: str,
    archive_path: Path,
    publish: bool,
    skip_existing: bool,
) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url=base_url.rstrip("/"), headers=headers, timeout=120) as client:
        response = await client.get("/admin/knowledge/categories")
        response.raise_for_status()
        categories = {item["slug"]: int(item["id"]) for item in response.json().get("items", [])}

        candidates = load_candidates(archive_path)
        for relative_name, data in candidates:
            if not relative_name.lower().endswith(SUPPORTED_EXTENSIONS):
                continue
            parts = PurePosixPath(relative_name).parts
            if len(parts) < 2:
                print(f"skip (no category folder): {relative_name}")
                continue

            slug = parts[0].lower()
            if slug not in categories:
                label = CATEGORY_LABELS.get(slug, parts[0].replace("-", " ").replace("_", " ").title())
                response = await client.post(
                    "/admin/knowledge/categories",
                    json={"name": label, "slug": slug, "description": f"Импортировано из {parts[0]}"},
                )
                response.raise_for_status()
                categories[slug] = int(response.json()["item"]["id"])

            checksum = hashlib.sha256(data).hexdigest()
            if skip_existing:
                existing: list[dict] = []
                offset = 0
                while True:
                    response = await client.get(
                        "/admin/knowledge/documents",
                        params={"categoryId": categories[slug], "limit": 100, "offset": offset},
                    )
                    response.raise_for_status()
                    page = response.json().get("items", [])
                    existing.extend(page)
                    if len(page) < 100:
                        break
                    offset += len(page)
                if any(item.get("checksum") == checksum for item in existing):
                    print(f"skip (already imported): {relative_name}")
                    continue

            filename = PurePosixPath(relative_name).name
            response = await client.post(
                "/admin/knowledge/documents",
                data={
                    "title": PurePosixPath(filename).stem,
                    "category_id": str(categories[slug]),
                    "status": "published" if publish else "draft",
                },
                files={"file": (filename, io.BytesIO(data), "application/octet-stream")},
            )
            response.raise_for_status()
            result = response.json()["item"]
            print(f"imported #{result['id']}: {relative_name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a categorized knowledge-base ZIP or directory via the admin API")
    parser.add_argument("archive", type=Path)
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--token", required=True)
    parser.add_argument("--publish", action="store_true", help="Publish imported documents immediately")
    parser.add_argument("--skip-existing", action="store_true", help="Skip files with an already imported SHA-256 checksum")
    args = parser.parse_args()
    asyncio.run(import_archive(args.base_url, args.token, args.archive, args.publish, args.skip_existing))


if __name__ == "__main__":
    main()
