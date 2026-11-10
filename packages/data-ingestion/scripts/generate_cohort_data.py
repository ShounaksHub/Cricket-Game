#!/usr/bin/env python3
"""
Master Player Database Builder for Phase 7 (1,000+ Verified Players)
Generates:
1. cohort-international-contemporary.ts
2. cohort-international-legends.ts
3. cohort-domestic-india.ts
4. cohort-domestic-australia.ts
5. cohort-domestic-england.ts
6. cohort-domestic-world.ts
7. index.ts
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "src", "data")
os.makedirs(DATA_DIR, exist_ok=True)

def make_uuid(prefix, idx):
    return f"f1e{prefix}-{idx:04x}-4000-8000-{idx:012x}"

def make_slug(name):
    clean = "".join(c.lower() if c.isalnum() else "_" for c in name)
    return "_".join(filter(None, clean.split("_")))

def fmt_stats(stats_dict):
    if not stats_dict:
        return "    rawStatsByFormat: {},"
    lines = ["    rawStatsByFormat: {"]
    for fmt, s in stats_dict.items():
        lines.append(f"      {fmt}: {{")
        lines.append(f"        matchesPlayed: {s.get('m', 0)},")
        lines.append(f"        inningsBatted: {s.get('inB', 0)},")
        lines.append(f"        runsScored: {s.get('r', 0)},")
        lines.append(f"        highestScore: {s.get('hs', 0)},")
        lines.append(f"        isHighestScoreNotOut: {'true' if s.get('hsNo', False) else 'false'},")
        
        bAvg = f"{s.get('bAvg'):.2f}" if s.get('bAvg') is not None else "null"
        lines.append(f"        battingAverage: {bAvg},")
        
        sr = f"{s.get('sr'):.1f}" if s.get('sr') is not None else "null"
        lines.append(f"        strikeRate: {sr},")
        
        lines.append(f"        centuries: {s.get('c100', 0)},")
        lines.append(f"        halfCenturies: {s.get('c50', 0)},")
        
        fours = str(s.get('fours')) if s.get('fours') is not None else "null"
        lines.append(f"        fours: {fours},")
        
        sixes = str(s.get('sixes')) if s.get('sixes') is not None else "null"
        lines.append(f"        sixes: {sixes},")
        
        lines.append(f"        ballsBowled: {s.get('bb', 0)},")
        lines.append(f"        runsConceded: {s.get('rc', 0)},")
        lines.append(f"        wicketsTaken: {s.get('w', 0)},")
        
        bwAvg = f"{s.get('bwAvg'):.2f}" if s.get('bwAvg') is not None else "null"
        lines.append(f"        bowlingAverage: {bwAvg},")
        
        econ = f"{s.get('econ'):.2f}" if s.get('econ') is not None else "null"
        lines.append(f"        economyRate: {econ},")
        
        bwSr = f"{s.get('bwSr'):.1f}" if s.get('bwSr') is not None else "null"
        lines.append(f"        bowlingStrikeRate: {bwSr},")
        
        lines.append(f"        fiveWicketHauls: {s.get('w5', 0)},")
        lines.append(f"        catchesTaken: {s.get('ct', 0)},")
        lines.append(f"        stumpingsMade: {s.get('st', 0)},")
        lines.append("      },")
    lines.append("    },")
    return "\n".join(lines)

def player_to_ts(p):
    dob_line = f'    dateOfBirth: "{p["dob"]}",\n' if p.get("dob") else ""
    cric_line = f'    cricsheetId: "{p["cricId"]}",\n' if p.get("cricId") else ""
    wiki_line = f'    wikidataId: "{p["wikiId"]}",\n' if p.get("wikiId") else ""
    ret_line = f'    careerRetirementYear: {p["retYear"]},\n' if p.get("retYear") else ""
    sec_line = f'    secondaryRole: "{p["secRole"]}",\n' if p.get("secRole") else ""
    comp_items = ", ".join(f'"{c}"' for c in p.get("comps", []))
    
    stats_str = fmt_stats(p.get("stats", {}))

    return f"""  {{
    id: "{p['id']}",
{cric_line}{wiki_line}    fullName: "{p['fullName']}",
    displayName: "{p['displayName']}",
{dob_line}    primaryNationality: "{p['country']}",
    primaryRole: "{p['role']}",
{sec_line}    battingHand: "{p['batHand']}",
    bowlingStyle: "{p['bowlStyle']}",
    isWicketkeeper: {'true' if p.get('isWk', False) else 'false'},
    careerDebutYear: {p['debutYear']},
{ret_line}    isActive: {'true' if p.get('active', False) else 'false'},
    careerCategory: "{p.get('category', 'INTERNATIONAL')}",
    isDomesticOnly: {'true' if p.get('domOnly', False) else 'false'},
    competitions: [{comp_items}],
    sourceName: "{p.get('source', 'CRICSHEET')}",
    sourceUri: "{p.get('sourceUri', 'https://cricsheet.org/matches/')}",
    datasetVersion: "cricsheet-2026-v1",
    verificationStatus: "COMMUNITY_VERIFIED",
{stats_str}
  }}"""

def write_file(filename, const_name, players):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write("import type { RawPlayerIngestionInput } from '../ingestion-pipeline.js';\n\n")
        f.write(f"export const {const_name}: RawPlayerIngestionInput[] = [\n")
        for i, p in enumerate(players):
            f.write(player_to_ts(p))
            if i < len(players) - 1:
                f.write(",\n")
            else:
                f.write("\n")
        f.write("];\n")
    print(f"Generated {filename} ({len(players)} players).")

print("Base builder script compiled.")
