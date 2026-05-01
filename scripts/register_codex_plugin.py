#!/usr/bin/env python3
"""Register Open Image as a local Codex plugin."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("plugin_root")
    parser.add_argument("marketplace_file")
    return parser.parse_args()


def load_manifest(plugin_root: Path) -> dict:
    manifest_path = plugin_root / ".codex-plugin" / "plugin.json"
    if not manifest_path.exists():
        raise SystemExit(f"Missing Codex plugin manifest at {manifest_path}")
    with manifest_path.open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    plugin_name = manifest.get("name")
    if not isinstance(plugin_name, str) or not plugin_name:
        raise SystemExit(f"Codex plugin manifest is missing a valid name: {manifest_path}")
    return manifest


def ensure_personal_plugin_root(plugin_root: Path, plugin_name: str, home_root: Path) -> Path:
    link_dir = home_root / ".codex" / "plugins"
    link_dir.mkdir(parents=True, exist_ok=True)
    link_path = link_dir / plugin_name

    if plugin_root == link_path:
        return plugin_root

    if link_path.exists() or link_path.is_symlink():
        if not link_path.is_symlink():
            raise SystemExit(
                "Codex plugin install target already exists and is not a symlink: "
                f"{link_path}. Move it aside or remove it, then rerun the installer."
            )
        link_path.unlink()

    tmp_link = link_dir / f".{plugin_name}.tmp"
    if tmp_link.exists() or tmp_link.is_symlink():
        if tmp_link.is_dir() and not tmp_link.is_symlink():
            shutil.rmtree(tmp_link)
        else:
            tmp_link.unlink()

    tmp_link.symlink_to(plugin_root)
    os.replace(tmp_link, link_path)
    return link_path


def load_marketplace(marketplace_path: Path) -> dict:
    if not marketplace_path.exists():
        return {"name": "open-image-plugins", "plugins": []}

    try:
        with marketplace_path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid Codex marketplace JSON at {marketplace_path}: {exc}") from exc

    if not isinstance(data, dict):
        raise SystemExit(f"Codex marketplace must be a JSON object: {marketplace_path}")

    if not isinstance(data.get("plugins"), list):
        data["plugins"] = []
    if not isinstance(data.get("name"), str) or not data["name"]:
        data["name"] = "open-image-plugins"
    return data


def main() -> None:
    args = parse_args()
    home_root = Path.home().resolve()
    plugin_root = Path(args.plugin_root).expanduser().resolve()
    marketplace_path = Path(args.marketplace_file).expanduser().resolve()

    manifest = load_manifest(plugin_root)
    plugin_name = manifest["name"]
    source_root = ensure_personal_plugin_root(plugin_root, plugin_name, home_root)

    try:
        relative_source_root = source_root.relative_to(home_root)
    except ValueError as exc:
        raise SystemExit(
            "Codex plugin install path must live under "
            f"{home_root} so the personal marketplace can reference it: {source_root}"
        ) from exc

    entry = {
        "name": plugin_name,
        "source": {
            "source": "local",
            "path": f"./{relative_source_root.as_posix()}",
        },
        "policy": {
            "installation": "AVAILABLE",
            "authentication": "ON_INSTALL",
        },
        "category": "Creative",
    }

    data = load_marketplace(marketplace_path)
    merged_plugins = []
    updated = False
    for plugin in data["plugins"]:
        if isinstance(plugin, dict) and plugin.get("name") == plugin_name:
            merged = dict(plugin)
            merged.update(entry)
            merged_plugins.append(merged)
            updated = True
        else:
            merged_plugins.append(plugin)
    if not updated:
        merged_plugins.append(entry)
    data["plugins"] = merged_plugins

    marketplace_path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(
        prefix=f".{marketplace_path.name}.",
        dir=str(marketplace_path.parent),
        text=True,
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")
        os.replace(temp_path, marketplace_path)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


if __name__ == "__main__":
    main()

