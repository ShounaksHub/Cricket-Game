"""Refresh international raw career stats from an official Cricsheet JSON archive.

This intentionally handles only international Test, ODI and T20 matches. Domestic
competitions have different scopes and must not be merged into the engine formats.
The script preserves player UUIDs and updates only the raw-stat fields calculated
from deliveries.
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any


FORMATS = {"Test": "TEST_RED_BALL", "ODI": "ODI", "T20": "T20"}
COHORTS = (
    "cohort-international-contemporary.ts",
    "cohort-international-legends.ts",
)
STAT_FIELDS = (
    "matchesPlayed", "inningsBatted", "runsScored", "highestScore",
    "isHighestScoreNotOut", "battingAverage", "strikeRate", "centuries",
    "halfCenturies", "fours", "sixes", "ballsBowled", "runsConceded",
    "wicketsTaken", "bowlingAverage", "economyRate", "bowlingStrikeRate",
    "fiveWicketHauls", "catchesTaken", "stumpingsMade",
)


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def empty_stats() -> dict[str, Any]:
    return {
        "matchesPlayed": 0, "inningsBatted": 0, "runsScored": 0,
        "highestScore": 0, "isHighestScoreNotOut": False,
        "battingAverage": None, "strikeRate": None, "centuries": 0,
        "halfCenturies": 0, "fours": 0, "sixes": 0, "ballsBowled": 0,
        "runsConceded": 0, "wicketsTaken": 0, "bowlingAverage": None,
        "economyRate": None, "bowlingStrikeRate": None,
        "fiveWicketHauls": 0, "catchesTaken": 0, "stumpingsMade": 0,
        "_outs": 0, "_batBalls": 0, "_bowlingInnings": [],
    }


def add_match(stats: dict[str, Any], player: str, match: dict[str, Any], fmt: str) -> None:
    info = match["info"]
    participants = {name for names in info.get("players", {}).values() for name in names}
    if player in participants:
        stats["matchesPlayed"] += 1

    batting_totals: dict[str, dict[str, Any]] = {}
    bowling: dict[str, dict[str, int]] = defaultdict(lambda: {"balls": 0, "runs": 0, "wickets": 0})

    for innings in match.get("innings", []):
        batting: dict[str, dict[str, Any]] = {}
        batters: set[str] = set()
        for over in innings.get("overs", []):
            for delivery in over.get("deliveries", []):
                batter = delivery.get("batter")
                non_striker = delivery.get("non_striker")
                bowler = delivery.get("bowler")
                if batter not in batting:
                    batting[batter] = {"runs": 0, "balls": 0, "fours": 0, "sixes": 0, "out": False}
                if batter:
                    batters.add(batter)
                if non_striker:
                    batters.add(non_striker)
                runs = delivery.get("runs", {})
                batter_runs = int(runs.get("batter", 0))
                extras = delivery.get("extras", {})
                batting[batter]["runs"] += batter_runs
                if "wides" not in extras and "noballs" not in extras:
                    batting[batter]["balls"] += 1
                if batter_runs == 4:
                    batting[batter]["fours"] += 1
                elif batter_runs == 6:
                    batting[batter]["sixes"] += 1
                if batter not in batting_totals:
                    batting_totals[batter] = {"runs": 0, "balls": 0, "fours": 0, "sixes": 0}
                batting_totals[batter]["runs"] += batter_runs
                batting_totals[batter]["balls"] += 1 if "wides" not in extras and "noballs" not in extras else 0
                batting_totals[batter]["fours"] += 1 if batter_runs == 4 else 0
                batting_totals[batter]["sixes"] += 1 if batter_runs == 6 else 0
                if bowler:
                    b = bowling[bowler]
                    b["runs"] += batter_runs + int(extras.get("wides", 0)) + int(extras.get("noballs", 0))
                    if "wides" not in extras and "noballs" not in extras:
                        b["balls"] += 1
                for wicket in delivery.get("wickets", []):
                    dismissed = wicket.get("player_out")
                    if dismissed in batting:
                        batting[dismissed]["out"] = True
                    kind = wicket.get("kind", "")
                    if kind not in {"run out", "retired hurt", "retired out", "obstructing the field"}:
                        if bowler:
                            bowling[bowler]["wickets"] += 1
                    fielders = {fielder.get("name") for fielder in wicket.get("fielders", []) if isinstance(fielder, dict)}
                    if player in fielders and kind == "caught":
                        stats["catchesTaken"] += 1
                    if player in fielders and kind == "stumped":
                        stats["stumpingsMade"] += 1
        if player in batters:
            stats["inningsBatted"] += 1
        for batter, row in batting.items():
            if batter not in batting_totals:
                continue
            batting_totals[batter]["out"] = batting_totals[batter].get("out", False) or row["out"]
            if row["runs"] >= 100:
                if batter == player:
                    stats["centuries"] += 1
            elif row["runs"] >= 50 and batter == player:
                stats["halfCenturies"] += 1
            if batter == player and row["runs"] > stats["highestScore"]:
                stats["highestScore"] = row["runs"]
                stats["isHighestScoreNotOut"] = not row["out"]
        if player in bowling:
            stats["_bowlingInnings"].append(bowling[player]["wickets"])

    if player in batting_totals:
        row = batting_totals[player]
        stats["runsScored"] += row["runs"]
        stats["_batBalls"] += row["balls"]
        stats["fours"] += row["fours"]
        stats["sixes"] += row["sixes"]
        # Dismissals are counted from the match events so two-innings Tests are handled.
        stats["_outs"] += sum(1 for innings in match.get("innings", []) for over in innings.get("overs", []) for delivery in over.get("deliveries", []) for wicket in delivery.get("wickets", []) if wicket.get("player_out") == player)
    if player in bowling:
        stats["ballsBowled"] += bowling[player]["balls"]
        stats["runsConceded"] += bowling[player]["runs"]
        stats["wicketsTaken"] += bowling[player]["wickets"]
def finalize(stats: dict[str, Any]) -> dict[str, Any]:
    outs = stats.pop("_outs")
    bat_balls = stats.pop("_batBalls")
    bowling_innings = stats.pop("_bowlingInnings")
    stats["fiveWicketHauls"] = sum(1 for wickets in bowling_innings if wickets >= 5)
    stats["battingAverage"] = round(stats["runsScored"] / outs, 2) if outs else None
    stats["strikeRate"] = round(stats["runsScored"] * 100 / bat_balls, 2) if bat_balls else None
    stats["bowlingAverage"] = round(stats["runsConceded"] / stats["wicketsTaken"], 2) if stats["wicketsTaken"] else None
    stats["economyRate"] = round(stats["runsConceded"] * 6 / stats["ballsBowled"], 2) if stats["ballsBowled"] else None
    stats["bowlingStrikeRate"] = round(stats["ballsBowled"] / stats["wicketsTaken"], 2) if stats["wicketsTaken"] else None
    return stats


def brace_end(text: str, start: int) -> int:
    depth = 0
    quote = None
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"`":
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index + 1
    raise ValueError("Unclosed object")


def update_cohort(path: Path, aggregates: dict[str, dict[str, dict[str, Any]]], apply: bool) -> tuple[int, list[str]]:
    text = path.read_text(encoding="utf-8")
    names = {norm(name): name for name in re.findall(r"fullName:\s*['\"]([^'\"]+)", text)}
    changed = 0
    changed_names: list[str] = []
    starts = [m.start() for m in re.finditer(r"^  \{\n    id:", text, re.MULTILINE)]
    for start in reversed(starts):
        end = brace_end(text, text.find("{", start))
        block = text[start:end]
        name_match = re.search(r"fullName:\s*['\"]([^'\"]+)", block)
        if not name_match or norm(name_match.group(1)) not in aggregates:
            continue
        player_name = name_match.group(1)
        player_aggs = aggregates[norm(player_name)]
        block_changed = False
        for fmt, values in player_aggs.items():
            fmt_start_match = re.search(rf"\n      {fmt}: \{{", block)
            if not fmt_start_match:
                continue
            fmt_start = fmt_start_match.start() + 1
            fmt_object_start = block.find("{", fmt_start)
            fmt_end = brace_end(block, fmt_object_start)
            fmt_block = block[fmt_start:fmt_end]
            current_match = re.search(r"\n\s+matchesPlayed:\s*(\d+)", fmt_block)
            if current_match and values["matchesPlayed"] < int(current_match.group(1)):
                continue
            for field in STAT_FIELDS:
                value = values[field]
                rendered = "null" if value is None else ("true" if value is True else "false" if value is False else str(value))
                pattern = rf"(\n\s+{re.escape(field)}:\s*)[^,\n]+"
                replacement, count = re.subn(pattern, rf"\g<1>{rendered}", fmt_block, count=1)
                if count:
                    fmt_block = replacement
                    block_changed = True
            block = block[:fmt_start] + fmt_block + block[fmt_end:]
        if block_changed:
            block = re.sub(r"datasetVersion:\s*['\"]cricsheet-[^'\"]+['\"]", "datasetVersion: 'cricsheet-2026-11-03'", block)
            text = text[:start] + block + text[end:]
            changed += 1
            changed_names.append(player_name)
    if apply and changed:
        path.write_text(text, encoding="utf-8")
    return changed, sorted(changed_names)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True, type=Path)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    cohort_paths = [args.repo / "packages/data-ingestion/src/data" / name for name in COHORTS]
    names: dict[str, str] = {}
    for path in cohort_paths:
        names.update({norm(n): n for n in re.findall(r"fullName:\s*['\"]([^'\"]+)", path.read_text(encoding="utf-8"))})

    aggregates: dict[str, dict[str, dict[str, Any]]] = defaultdict(lambda: defaultdict(empty_stats))
    matches_seen = 0
    with zipfile.ZipFile(args.zip) as archive:
        for filename in archive.namelist():
            if not filename.endswith(".json"):
                continue
            match = json.loads(archive.read(filename))
            info = match.get("info", {})
            if info.get("team_type") != "international":
                continue
            fmt = FORMATS.get(info.get("match_type"))
            if not fmt:
                continue
            matches_seen += 1
            source_names = {name for players in info.get("players", {}).values() for name in players}
            known = {norm(name): name for name in source_names if norm(name) in names}
            for source_name in known.values():
                add_match(aggregates[norm(names[norm(source_name)])][fmt], source_name, match, fmt)
    finalized = {key: {fmt: finalize(stats) for fmt, stats in formats.items()} for key, formats in aggregates.items()}
    report = {"snapshot": "cricsheet-2026-11-03", "matchesSeen": matches_seen, "playersMatched": len(finalized), "cohorts": {}}
    for path in cohort_paths:
        changed, player_names = update_cohort(path, finalized, args.apply)
        report["cohorts"][path.name] = {"recordsChanged": changed, "players": player_names}
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
