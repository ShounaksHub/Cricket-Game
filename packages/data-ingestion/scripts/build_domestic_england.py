#!/usr/bin/env python3
"""
Generate cohort-domestic-england.ts (~130 players)
County Championship, Vitality T20 Blast, and The Hundred specialists.
"""

from build_domestic_base import make_uuid, make_slug, make_domestic_stats, write_cohort

ENG_DOMESTIC_RAW = [
    # (fullName, displayName, role, batHand, bowlStyle, isWk, debutYear, retYear, active, comps, fc, la, t20, elite)
    # County Stalwarts & Multi-Decade Legends
    ("Graeme Hick", "G. Hick", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 1983, 2008, False, ["County Championship", "T20 Blast"], 526, 651, 48, True),
    ("Mark Ramprakash", "M. Ramprakash", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 1987, 2012, False, ["County Championship"], 461, 356, 30, True),
    ("John Crawley", "J. Crawley", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 1990, 2009, False, ["County Championship"], 337, 271, 34, True),
    ("Mal Loye", "M. Loye", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 1991, 2011, False, ["County Championship", "T20 Blast"], 271, 314, 58, True),
    ("Darren Stevens", "D. Stevens", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 1997, 2022, False, ["County Championship", "T20 Blast"], 342, 362, 219, True),
    ("Keith Barker", "K. Barker", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2009, None, True, ["County Championship", "T20 Blast"], 182, 92, 54, True),
    ("Samit Patel", "S. Patel", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2002, None, True, ["County Championship", "T20 Blast", "The Hundred", "PSL"], 305, 260, 394, True),
    ("James Vince", "J. Vince", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2009, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL", "PSL"], 208, 142, 382, True),
    ("Joe Denly", "J. Denly", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2004, None, True, ["County Championship", "T20 Blast", "BBL", "PSL"], 268, 194, 285, True),
    ("Alex Davies", "A. Davies", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2011, None, True, ["County Championship", "T20 Blast", "The Hundred"], 138, 74, 142, True),
    ("Luke Fletcher", "L. Fletcher", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2008, None, True, ["County Championship", "T20 Blast"], 158, 88, 104, True),
    ("Steven Finn domestic", "S. Finn (Domestic)", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2005, 2023, False, ["County Championship", "T20 Blast"], 164, 118, 112, True),
    ("Toby Roland-Jones", "T. Roland-Jones", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2010, None, True, ["County Championship", "T20 Blast"], 152, 68, 92, True),
    ("Ryan Higgins", "R. Higgins", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2014, None, True, ["County Championship", "T20 Blast", "The Hundred"], 108, 52, 114, True),
    ("David Payne", "D. Payne", "PACE_BOWLER", "RIGHT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2010, None, True, ["County Championship", "T20 Blast", "BBL", "The Hundred"], 124, 78, 168, True),
    ("Richard Gleeson", "R. Gleeson", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2015, None, True, ["T20 Blast", "The Hundred", "BBL", "County Championship"], 38, 18, 115, True),
    ("Adam Lyth", "A. Lyth", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2007, None, True, ["County Championship", "T20 Blast", "The Hundred"], 242, 140, 195, True),
    ("Sam Robson", "S. Robson", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2009, None, True, ["County Championship", "T20 Blast"], 204, 82, 34, True),
    ("Will Smeed", "W. Smeed", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2020, None, True, ["T20 Blast", "The Hundred", "PSL"], 1, 8, 98, True),
    ("Tom Banton", "T. Banton", "WICKETKEEPER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", True, 2017, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL"], 54, 48, 156, True),
    ("Jordan Cox", "J. Cox", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2019, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL"], 56, 26, 122, True),
    ("Tom Abell", "T. Abell", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2014, None, True, ["County Championship", "T20 Blast", "The Hundred"], 138, 48, 112, True),
    ("Lewis Gregory", "L. Gregory", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2010, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL"], 132, 88, 198, True),
    ("Craig Overton domestic", "C. Overton (Domestic)", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2012, None, True, ["County Championship", "T20 Blast"], 134, 68, 98, True),
    ("Jamie Overton domestic", "J. Overton (Domestic)", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2012, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL"], 98, 48, 124, True),
    ("Dom Bess", "D. Bess", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2016, None, True, ["County Championship", "T20 Blast"], 112, 42, 64, True),
    ("Matt Parkinson", "M. Parkinson", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2016, None, True, ["County Championship", "T20 Blast", "The Hundred"], 62, 34, 112, True),
    ("Callum Parkinson", "C. Parkinson", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2016, None, True, ["County Championship", "T20 Blast"], 88, 38, 92, True),
    ("Liam Dawson", "L. Dawson", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2007, None, True, ["County Championship", "T20 Blast", "The Hundred", "PSL", "BBL"], 208, 168, 278, True),
    ("Mason Crane", "M. Crane", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["County Championship", "T20 Blast", "The Hundred"], 68, 42, 102, False),
    ("Tom Helm", "T. Helm", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2013, None, True, ["County Championship", "T20 Blast", "The Hundred"], 76, 44, 98, False),
    ("Sam Cook", "S. Cook", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2017, None, True, ["County Championship", "T20 Blast", "The Hundred"], 88, 26, 68, True),
    ("Jamie Porter", "J. Porter", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2014, None, True, ["County Championship", "T20 Blast"], 132, 28, 42, True),
    ("Wayne Madsen", "W. Madsen", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2009, None, True, ["County Championship", "T20 Blast", "The Hundred", "PSL"], 224, 138, 178, True),
    ("Leus du Plooy", "L. du Plooy", "TOP_ORDER_BATTER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2019, None, True, ["County Championship", "T20 Blast", "The Hundred", "SA20"], 94, 62, 126, True),
    ("Billy Godleman", "B. Godleman", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2005, 2023, False, ["County Championship", "T20 Blast"], 232, 114, 76, True),
    ("Alex Hughes", "A. Hughes", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2011, 2022, False, ["County Championship", "T20 Blast"], 84, 52, 92, False),
    ("Anuj Dal", "A. Dal", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2018, None, True, ["County Championship", "T20 Blast"], 76, 32, 48, True),
    ("Matt Critchley", "M. Critchley", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["County Championship", "T20 Blast", "The Hundred"], 134, 68, 148, True),
    ("George Garton", "G. Garton", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_FAST", False, 2016, None, True, ["County Championship", "T20 Blast", "The Hundred", "IPL"], 32, 34, 94, True),
    ("Delray Rawlins", "D. Rawlins", "BATTING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2017, None, True, ["County Championship", "T20 Blast"], 48, 38, 86, False),
    ("Luke Wright", "L. Wright", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2004, 2023, False, ["County Championship", "T20 Blast", "BBL", "IPL"], 145, 218, 344, True),
    ("Chris Nash", "C. Nash", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2002, 2020, False, ["County Championship", "T20 Blast"], 208, 156, 172, True),
    ("Ed Joyce domestic", "E. Joyce (Domestic)", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_MEDIUM", False, 1999, 2018, False, ["County Championship", "T20 Blast"], 255, 238, 92, True),
    ("Murray Goodwin", "M. Goodwin", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", False, 1994, 2014, False, ["County Championship"], 320, 290, 84, True),
    ("James Kirtley", "J. Kirtley", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 1995, 2010, False, ["County Championship", "T20 Blast"], 182, 185, 38, True),
    ("Kabir Ali", "K. Ali", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 1999, 2015, False, ["County Championship", "T20 Blast"], 164, 168, 76, True),
    ("Vikram Solanki", "V. Solanki", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 1995, 2015, False, ["County Championship", "T20 Blast", "IPL"], 325, 382, 142, True),
    ("Daryl Mitchell", "D. Mitchell (Worcs)", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2005, 2021, False, ["County Championship", "T20 Blast"], 228, 134, 148, True),
    ("Brett D'Oliveira", "B. D'Oliveira", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2011, None, True, ["County Championship", "T20 Blast"], 148, 74, 138, True),
    ("Ed Barnard", "E. Barnard", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2015, None, True, ["County Championship", "T20 Blast"], 118, 64, 114, True),
    ("Charlie Morris", "C. Morris", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2014, 2023, False, ["County Championship"], 88, 38, 26, False),
    ("Josh Tongue", "J. Tongue", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2016, None, True, ["County Championship", "The Hundred"], 54, 16, 22, True),
    ("Dillon Pennington", "D. Pennington", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2018, None, True, ["County Championship", "T20 Blast", "The Hundred"], 58, 22, 54, True),
    ("Pat Brown", "P. Brown", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2017, None, True, ["T20 Blast", "The Hundred", "BBL"], 8, 14, 88, True),
    ("Joe Clarke", "J. Clarke", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", True, 2015, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL", "PSL"], 138, 62, 184, True),
    ("Ben Cox", "B. Cox", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2009, None, True, ["County Championship", "T20 Blast"], 164, 94, 146, True),
    ("Gareth Roderick", "G. Roderick", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2011, None, True, ["County Championship", "T20 Blast"], 138, 68, 68, False),
    ("Chris Dent", "C. Dent", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2009, None, True, ["County Championship", "T20 Blast"], 188, 84, 88, True),
    ("Miles Hammond", "M. Hammond", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2014, None, True, ["County Championship", "T20 Blast", "The Hundred"], 76, 42, 108, False),
    ("Jack Taylor", "J. Taylor", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2010, None, True, ["County Championship", "T20 Blast"], 108, 68, 128, False),
    ("Benny Howell", "B. Howell", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2010, None, True, ["T20 Blast", "The Hundred", "BPL", "PSL", "County Championship"], 76, 78, 212, True),
    ("Tom Smith", "T. Smith (Gloucs)", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2009, None, True, ["County Championship", "T20 Blast"], 68, 82, 148, False),
    ("Matt Taylor", "M. Taylor", "PACE_BOWLER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2013, None, True, ["County Championship", "T20 Blast"], 88, 48, 76, False),
    ("James Bracey", "J. Bracey", "WICKETKEEPER_BATTER", "LEFT_HAND", "NONE", True, 2016, None, True, ["County Championship", "T20 Blast"], 94, 44, 62, True),
    ("Ian Cockbain", "I. Cockbain", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2011, 2022, False, ["T20 Blast", "BBL", "County Championship"], 46, 54, 154, True),
    ("Liam Norwell", "L. Norwell", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2011, None, True, ["County Championship"], 118, 42, 38, True),
    ("Oliver Hannon-Dalby", "O. Hannon-Dalby", "PACE_BOWLER", "LEFT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2008, None, True, ["County Championship", "T20 Blast"], 142, 64, 88, True),
    ("Chris Rushworth", "C. Rushworth", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2010, None, True, ["County Championship", "T20 Blast"], 174, 52, 54, True),
    ("Ben Raine", "B. Raine", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2011, None, True, ["County Championship", "T20 Blast"], 132, 62, 114, True),
    ("Paul Coughlin", "P. Coughlin", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2012, None, True, ["County Championship", "T20 Blast", "The Hundred"], 72, 42, 84, False),
    ("Scott Borthwick", "S. Borthwick", "BATTING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2009, None, True, ["County Championship", "T20 Blast"], 208, 102, 134, True),
    ("Graham Clark", "G. Clark", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["County Championship", "T20 Blast"], 76, 52, 94, False),
    ("Alex Lees", "A. Lees", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2010, None, True, ["County Championship", "T20 Blast"], 178, 92, 104, True),
    ("Keaton Jennings domestic", "K. Jennings (Domestic)", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_MEDIUM", False, 2012, None, True, ["County Championship", "T20 Blast"], 182, 84, 112, True),
    ("Steven Croft", "S. Croft", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2005, None, True, ["County Championship", "T20 Blast"], 228, 172, 238, True),
    ("Luke Wells", "L. Wells", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2010, None, True, ["County Championship", "T20 Blast", "The Hundred"], 176, 58, 86, True),
    ("Haseeb Hameed", "H. Hameed", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["County Championship", "T20 Blast"], 124, 42, 44, True),
    ("Josh Bohannon", "J. Bohannon", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2018, None, True, ["County Championship", "T20 Blast"], 84, 32, 48, True),
    ("Tom Bailey", "T. Bailey", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2012, None, True, ["County Championship", "T20 Blast"], 118, 44, 48, True),
    ("Saqib Mahmood", "S. Mahmood", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2016, None, True, ["County Championship", "T20 Blast", "The Hundred", "PSL", "BBL"], 42, 34, 76, True),
    ("Matthew Fisher", "M. Fisher", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2013, None, True, ["County Championship", "T20 Blast"], 48, 28, 44, True),
    ("Ben Coad", "B. Coad", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2013, None, True, ["County Championship", "T20 Blast"], 82, 18, 22, True),
    ("Matthew Waite", "M. Waite", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2016, None, True, ["County Championship", "T20 Blast"], 44, 28, 54, False),
    ("Jordan Clark", "J. Clark", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2010, None, True, ["County Championship", "T20 Blast", "The Hundred"], 128, 82, 144, True),
    ("Rory Burns domestic", "R. Burns (Domestic)", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2011, None, True, ["County Championship", "T20 Blast"], 188, 76, 68, True),
    ("Dom Sibley domestic", "D. Sibley (Domestic)", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2013, None, True, ["County Championship", "T20 Blast"], 142, 62, 54, True),
    ("Mark Stoneman", "M. Stoneman", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2007, None, True, ["County Championship", "T20 Blast"], 248, 148, 102, True),
    ("Scott Steel", "S. Steel", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2019, None, True, ["T20 Blast", "County Championship"], 18, 14, 46, False),
    ("Ricardo Vasconcelos", "R. Vasconcelos", "WICKETKEEPER_BATTER", "LEFT_HAND", "NONE", True, 2018, None, True, ["County Championship", "T20 Blast"], 82, 38, 58, True),
    ("Rob Keogh", "R. Keogh", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2012, None, True, ["County Championship", "T20 Blast"], 138, 62, 74, True),
    ("Luke Procter", "L. Procter", "BATTING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_MEDIUM", False, 2010, None, True, ["County Championship", "T20 Blast"], 164, 68, 68, True),
    ("Saif Zaib", "S. Zaib", "BATTING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2015, None, True, ["County Championship", "T20 Blast"], 62, 34, 78, False),
    ("Ben Sanderson", "B. Sanderson", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2008, None, True, ["County Championship", "T20 Blast"], 138, 48, 86, True),
    ("Jack White", "J. White", "PACE_BOWLER", "RIGHT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2020, None, True, ["County Championship", "T20 Blast"], 42, 14, 22, False),
    ("Tom Kohler-Cadmore", "T. Kohler-Cadmore", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", True, 2013, None, True, ["County Championship", "T20 Blast", "PSL", "The Hundred", "IPL"], 98, 62, 185, True),
    ("Adam Hose", "A. Hose", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2015, None, True, ["T20 Blast", "The Hundred", "BBL"], 32, 28, 128, True),
    ("Ed Pollock", "E. Pollock", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2017, None, True, ["T20 Blast", "The Hundred"], 18, 12, 74, False),
    ("George Scrimshaw", "G. Scrimshaw", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2017, None, True, ["County Championship", "T20 Blast", "The Hundred"], 18, 16, 52, False),
    ("Henry Brookes", "H. Brookes", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2017, None, True, ["County Championship", "T20 Blast", "The Hundred"], 38, 18, 56, False),
    ("Dan Mousley", "D. Mousley", "BATTING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2019, None, True, ["County Championship", "T20 Blast", "The Hundred", "PSL"], 36, 18, 68, True),
    ("Jacob Bethell", "J. Bethell", "BATTING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2021, None, True, ["County Championship", "T20 Blast", "The Hundred"], 26, 16, 44, True),
    ("Rob Yates", "R. Yates", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2019, None, True, ["County Championship", "T20 Blast"], 68, 22, 48, True),
    ("Michael Burgess", "M. Burgess", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2016, None, True, ["County Championship", "T20 Blast", "The Hundred"], 88, 38, 62, False),
    ("Craig Miles", "C. Miles", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2011, None, True, ["County Championship", "T20 Blast"], 118, 42, 48, False),
    ("Danny Briggs", "D. Briggs", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2009, None, True, ["County Championship", "T20 Blast", "BBL", "The Hundred"], 138, 114, 238, True),
    ("Chris Wright", "C. Wright", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2004, None, True, ["County Championship", "T20 Blast"], 194, 98, 72, True),
    ("Nathan Sowter", "N. Sowter", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["T20 Blast", "The Hundred", "County Championship"], 28, 38, 124, True),
    ("Stephen Eskinazi", "S. Eskinazi", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", False, 2015, None, True, ["County Championship", "T20 Blast", "The Hundred", "BBL"], 98, 48, 92, True),
    ("Max Holden", "M. Holden", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2017, None, True, ["County Championship", "T20 Blast", "The Hundred"], 84, 28, 74, False),
    ("Martin Andersson", "M. Andersson", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2018, None, True, ["County Championship", "T20 Blast"], 54, 18, 52, False),
    ("Ethan Bamber", "E. Bamber", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2018, None, True, ["County Championship"], 64, 14, 4, True),
    ("Blake Cullen", "B. Cullen", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2020, None, True, ["County Championship", "T20 Blast", "The Hundred"], 14, 10, 32, False),
    ("Thilan Walallawita", "T. Walallawita", "SPIN_BOWLER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2020, None, True, ["County Championship", "T20 Blast"], 24, 12, 18, False),
    ("Jack Leaning", "J. Leaning", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2013, None, True, ["County Championship", "T20 Blast"], 138, 62, 108, True),
    ("Daniel Bell-Drummond", "D. Bell-Drummond", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2011, None, True, ["County Championship", "T20 Blast", "The Hundred"], 158, 112, 168, True),
    ("Matt Quinn", "M. Quinn", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2013, None, True, ["County Championship", "T20 Blast"], 58, 38, 64, False),
    ("Fred Klaassen", "F. Klaassen", "PACE_BOWLER", "RIGHT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2018, None, True, ["County Championship", "T20 Blast", "The Hundred"], 34, 48, 88, True),
    ("Grant Stewart", "G. Stewart", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2017, None, True, ["County Championship", "T20 Blast"], 56, 26, 68, False),
    ("Hamidullah Qadri", "H. Qadri", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2017, None, True, ["County Championship", "T20 Blast"], 32, 14, 16, False),
    ("Nathan Gilchrist", "N. Gilchrist", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2020, None, True, ["County Championship", "T20 Blast"], 34, 12, 14, False),
    ("Joey Evison", "J. Evison", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2019, None, True, ["County Championship", "T20 Blast"], 32, 22, 26, False),
    ("Tawanda Muyeye", "T. Muyeye", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2021, None, True, ["County Championship", "T20 Blast", "The Hundred"], 36, 12, 28, False),
]

seen = set()
unique_players = []
for p in ENG_DOMESTIC_RAW:
    norm = p[0].strip().lower()
    if norm not in seen:
        seen.add(norm)
        unique_players.append(p)

print(f"Staged {len(unique_players)} English domestic players.")

OBJECTS = []
for idx, item in enumerate(unique_players, 1):
    fullName, displayName, role, batHand, bowlStyle, isWk, debut, retYear, active, comps, fc, la, t20, elite = item
    pid = make_uuid(5, idx)
    cricId = f"eng_dom_{make_slug(fullName)}"
    stats = make_domestic_stats(role, isWk, fc, la, t20, elite)
    
    OBJECTS.append({
        "id": pid,
        "fullName": fullName,
        "displayName": displayName,
        "country": "England",
        "role": role,
        "batHand": batHand,
        "bowlStyle": bowlStyle,
        "isWk": isWk,
        "debutYear": debut,
        "retYear": retYear,
        "active": active,
        "category": "DOMESTIC_ONLY",
        "domOnly": True,
        "comps": comps,
        "cricId": cricId,
        "stats": stats,
    })

write_cohort("cohort-domestic-england.ts", "COHORT_DOMESTIC_ENGLAND", OBJECTS)
