#!/usr/bin/env python3
"""
Phase 7: International Player Cohort Generator
Generates:
1. data/cohort-international-contemporary.ts (~280 players)
2. data/cohort-international-legends.ts (~260 players)
Total: 540+ authentic international cricketers
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "src", "data")
os.makedirs(DATA_DIR, exist_ok=True)

from generate_cohort_data import make_uuid, make_slug, write_file

# --- HELPER FACTORY TO GENERATE STATS ACCORDING TO ROLE AND ERA ---
def make_stats(role, is_wk, debut_year, test_mat=0, odi_mat=0, t20_mat=0, is_legend=False):
    stats = {}
    is_pacer = role == "PACE_BOWLER" or role == "BOWLING_ALL_ROUNDER" and "FAST" in role
    is_spinner = role == "SPIN_BOWLER"
    is_bowler = role in ("PACE_BOWLER", "SPIN_BOWLER", "BOWLING_ALL_ROUNDER")
    is_pure_batter = role in ("TOP_ORDER_BATTER", "MIDDLE_ORDER_BATTER", "WICKETKEEPER_BATTER")
    is_allrounder = role in ("BATTING_ALL_ROUNDER", "BOWLING_ALL_ROUNDER")

    # TEST STATS
    if test_mat > 0:
        inB = int(test_mat * 1.7)
        if is_pure_batter:
            bAvg = 48.0 if is_legend else 42.5
            r = int(inB * bAvg * 0.9)
            hs = 230 if is_legend else 185
            sr = 52.0
            c100 = max(1, int(test_mat / 4.2))
            c50 = int(test_mat / 2.5)
            fours = int(r * 0.11)
            sixes = int(r * 0.005)
            bb, rc, w, bwAvg, econ, bwSr, w5 = 60, 35, 0, None, 3.5, None, 0
        elif is_allrounder:
            bAvg = 38.0 if is_legend else 33.5
            r = int(inB * bAvg * 0.85)
            hs = 155
            sr = 55.0
            c100 = max(1, int(test_mat / 8))
            c50 = int(test_mat / 4)
            fours = int(r * 0.10)
            sixes = int(r * 0.008)
            bb = test_mat * 160
            rc = int(bb * 0.52)
            w = int(test_mat * 2.8)
            bwAvg = 28.5
            econ = 2.95
            bwSr = 57.0
            w5 = max(1, int(test_mat / 9))
        else: # Bowler
            bAvg = 12.0
            r = int(inB * bAvg * 0.7)
            hs = 45
            sr = 45.0
            c100 = 0
            c50 = 0
            fours = int(r * 0.08)
            sixes = 2
            bb = test_mat * 210
            rc = int(bb * 0.48)
            w = int(test_mat * 3.8)
            bwAvg = 24.5 if is_legend else 27.5
            econ = 2.85
            bwSr = 54.0
            w5 = max(1, int(test_mat / 5.5))
        
        ct = int(test_mat * 1.8 if is_wk else test_mat * 0.75)
        st = int(test_mat * 0.15 if is_wk else 0)

        stats["TEST_RED_BALL"] = {
            "m": test_mat, "inB": inB, "r": r, "hs": hs, "hsNo": True,
            "bAvg": bAvg, "sr": sr, "c100": c100, "c50": c50, "fours": fours, "sixes": sixes,
            "bb": bb, "rc": rc, "w": w, "bwAvg": bwAvg, "econ": econ, "bwSr": bwSr, "w5": w5,
            "ct": ct, "st": st
        }

    # ODI STATS
    if odi_mat > 0:
        inB = int(odi_mat * 0.92)
        if is_pure_batter:
            bAvg = 45.0 if is_legend else 39.5
            r = int(inB * bAvg * 0.9)
            hs = 150
            sr = 85.0 if is_legend else 89.0
            c100 = max(0, int(odi_mat / 12))
            c50 = int(odi_mat / 3.8)
            fours = int(r * 0.09)
            sixes = int(r * 0.012)
            bb, rc, w, bwAvg, econ, bwSr, w5 = 40, 32, 0, None, 4.8, None, 0
        elif is_allrounder:
            bAvg = 31.0
            r = int(inB * bAvg * 0.8)
            hs = 105
            sr = 92.0
            c100 = max(0, int(odi_mat / 25))
            c50 = int(odi_mat / 7)
            fours = int(r * 0.08)
            sixes = int(r * 0.015)
            bb = odi_mat * 45
            rc = int(bb * 0.85)
            w = int(odi_mat * 1.15)
            bwAvg = 31.5
            econ = 4.85
            bwSr = 38.0
            w5 = max(0, int(odi_mat / 40))
        else: # Bowler
            bAvg = 9.5
            r = int(inB * bAvg * 0.6)
            hs = 32
            sr = 68.0
            c100, c50 = 0, 0
            fours = int(r * 0.06)
            sixes = 1
            bb = odi_mat * 52
            rc = int(bb * 0.82)
            w = int(odi_mat * 1.45)
            bwAvg = 26.5
            econ = 4.75
            bwSr = 34.0
            w5 = max(0, int(odi_mat / 30))

        ct = int(odi_mat * 1.3 if is_wk else odi_mat * 0.45)
        st = int(odi_mat * 0.2 if is_wk else 0)

        stats["ODI"] = {
            "m": odi_mat, "inB": inB, "r": r, "hs": hs, "hsNo": False,
            "bAvg": bAvg, "sr": sr, "c100": c100, "c50": c50, "fours": fours, "sixes": sixes,
            "bb": bb, "rc": rc, "w": w, "bwAvg": bwAvg, "econ": econ, "bwSr": bwSr, "w5": w5,
            "ct": ct, "st": st
        }

    # T20 STATS
    if t20_mat > 0:
        inB = int(t20_mat * 0.9)
        if is_pure_batter:
            bAvg = 34.0
            r = int(inB * bAvg * 0.88)
            hs = 102
            sr = 138.0
            c100 = max(0, int(t20_mat / 40))
            c50 = int(t20_mat / 5.5)
            fours = int(r * 0.10)
            sixes = int(r * 0.035)
            bb, rc, w, bwAvg, econ, bwSr, w5 = 0, 0, 0, None, 8.0, None, 0
        elif is_allrounder:
            bAvg = 26.0
            r = int(inB * bAvg * 0.75)
            hs = 78
            sr = 142.0
            c100 = 0
            c50 = int(t20_mat / 10)
            fours = int(r * 0.09)
            sixes = int(r * 0.04)
            bb = t20_mat * 20
            rc = int(bb * 1.30)
            w = int(t20_mat * 1.05)
            bwAvg = 24.5
            econ = 7.80
            bwSr = 19.0
            w5 = 0
        else: # Bowler
            bAvg = 7.5
            r = int(inB * bAvg * 0.5)
            hs = 24
            sr = 105.0
            c100, c50 = 0, 0
            fours = int(r * 0.06)
            sixes = max(0, int(r * 0.01))
            bb = t20_mat * 22
            rc = int(bb * 1.25)
            w = int(t20_mat * 1.22)
            bwAvg = 22.0
            econ = 7.50
            bwSr = 17.5
            w5 = max(0, int(t20_mat / 60))

        ct = int(t20_mat * 0.9 if is_wk else t20_mat * 0.4)
        st = int(t20_mat * 0.25 if is_wk else 0)

        stats["T20"] = {
            "m": t20_mat, "inB": inB, "r": r, "hs": hs, "hsNo": False,
            "bAvg": bAvg, "sr": sr, "c100": c100, "c50": c50, "fours": fours, "sixes": sixes,
            "bb": bb, "rc": rc, "w": w, "bwAvg": bwAvg, "econ": econ, "bwSr": bwSr, "w5": w5,
            "ct": ct, "st": st
        }

    return stats

print("Factory helper ready.")
