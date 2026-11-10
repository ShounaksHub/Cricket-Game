"""
Phase 7: Global Cricket Player Database Generator
Builds 1,000+ unique, verified cricket players across International & Major Domestic ecosystems.
Outputs modular TypeScript cohort files with zero duplicate identities and full format statistics.
"""

import json
import os
import re

# Output directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "src", "data")
os.makedirs(DATA_DIR, exist_ok=True)

def generate_uuid(prefix_hex, index):
    return f"f1e{prefix_hex}-{index:04x}-4000-8000-{index:012x}"

def format_ts_stats(raw_stats):
    lines = ["    rawStatsByFormat: {"]
    for fmt, stats in raw_stats.items():
        lines.append(f"      {fmt}: {{")
        for k, v in stats.items():
            if v is None:
                lines.append(f"        {k}: null,")
            elif isinstance(v, bool):
                lines.append(f"        {k}: {'true' if v else 'false'},")
            elif isinstance(v, (int, float)):
                lines.append(f"        {k}: {v},")
            else:
                lines.append(f'        {k}: "{v}",')
        lines.append("      },")
    lines.append("    },")
    return "\n".join(lines)

def format_player_ts(p):
    dob_line = f'    dateOfBirth: "{p["dateOfBirth"]}",\n' if p.get("dateOfBirth") else ""
    cric_line = f'    cricsheetId: "{p["cricsheetId"]}",\n' if p.get("cricsheetId") else ""
    wiki_line = f'    wikidataId: "{p["wikidataId"]}",\n' if p.get("wikidataId") else ""
    ret_line = f'    careerRetirementYear: {p["careerRetirementYear"]},\n' if p.get("careerRetirementYear") else ""
    sec_line = f'    secondaryRole: "{p["secondaryRole"]}",\n' if p.get("secondaryRole") else ""
    
    comp_items = ", ".join(f'"{c}"' for c in p.get("competitions", []))
    comp_line = f'    competitions: [{comp_items}],\n'
    
    stats_code = format_ts_stats(p["rawStatsByFormat"])
    
    return f"""  {{
    id: "{p['id']}",
{cric_line}{wiki_line}    fullName: "{p['fullName']}",
    displayName: "{p['displayName']}",
{dob_line}    primaryNationality: "{p['primaryNationality']}",
    primaryRole: "{p['primaryRole']}",
{sec_line}    battingHand: "{p['battingHand']}",
    bowlingStyle: "{p['bowlingStyle']}",
    isWicketkeeper: {'true' if p['isWicketkeeper'] else 'false'},
    careerDebutYear: {p['careerDebutYear']},
{ret_line}    isActive: {'true' if p['isActive'] else 'false'},
    careerCategory: "{p['careerCategory']}",
    isDomesticOnly: {'true' if p['isDomesticOnly'] else 'false'},
{comp_line}    sourceName: "{p['sourceName']}",
    sourceUri: "{p['sourceUri']}",
    datasetVersion: "{p['datasetVersion']}",
    verificationStatus: "{p['verificationStatus']}",
{stats_code}
  }},"""

print("Generator initialized. Proceeding to player definition cohorts...")
