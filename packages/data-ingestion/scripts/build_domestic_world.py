#!/usr/bin/env python3
"""
Generate cohort-domestic-world.ts (~160 players)
South Africa, Pakistan, New Zealand, West Indies, Bangladesh, Sri Lanka domestic & Associate stalwarts.
"""

from build_domestic_base import make_uuid, make_slug, make_domestic_stats, write_cohort

WORLD_DOMESTIC_RAW = [
    # (fullName, displayName, country, role, batHand, bowlStyle, isWk, debutYear, retYear, active, comps, fc, la, t20, elite)
    # South Africa (CSA & SA20)
    ("Dale Benkenstein", "D. Benkenstein", "South Africa", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 1993, 2013, False, ["CSA 4-Day", "County Championship"], 300, 314, 52, True),
    ("Stiaan van Zyl", "S. van Zyl", "South Africa", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_MEDIUM", False, 2006, 2022, False, ["CSA 4-Day", "County Championship"], 164, 110, 78, True),
    ("Colin Ingram", "C. Ingram", "South Africa", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2004, None, True, ["SA20", "BBL", "T20 Blast", "PSL", "CPL"], 138, 182, 342, True),
    ("Beuran Hendricks", "B. Hendricks", "South Africa", "PACE_BOWLER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2010, None, True, ["CSA 4-Day", "SA20"], 94, 98, 128, True),
    ("Sisanda Magala", "S. Magala", "South Africa", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2010, None, True, ["SA20", "CSA 4-Day", "IPL"], 82, 112, 148, True),
    ("Junior Dala", "J. Dala", "South Africa", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2011, None, True, ["SA20", "CSA 4-Day"], 76, 78, 118, False),
    ("Wihan Lubbe", "W. Lubbe", "South Africa", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2012, None, True, ["SA20", "CSA 4-Day"], 72, 68, 92, False),
    ("Beyers Swanepoel", "B. Swanepoel", "South Africa", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2017, None, True, ["SA20", "CSA 4-Day"], 38, 32, 48, True),
    ("Matthew Breetzke", "M. Breetzke", "South Africa", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", True, 2016, None, True, ["SA20", "CSA 4-Day"], 58, 48, 88, True),
    ("Jordan Hermann", "J. Hermann", "South Africa", "TOP_ORDER_BATTER", "LEFT_HAND", "NONE", False, 2021, None, True, ["SA20", "CSA 4-Day"], 28, 22, 34, True),
    ("Dewald Brevis", "D. Brevis", "South Africa", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2021, None, True, ["SA20", "IPL", "CPL", "BBL", "MLC"], 14, 18, 76, True),
    ("Senuran Muthusamy", "S. Muthusamy", "South Africa", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2013, None, True, ["CSA 4-Day", "SA20"], 98, 72, 68, True),
    ("Marques Ackerman", "M. Ackerman", "South Africa", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2016, None, True, ["CSA 4-Day", "SA20"], 64, 42, 38, False),
    ("Grant Roelofsen", "G. Roelofsen", "South Africa", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2016, None, True, ["CSA 4-Day", "SA20", "T20 Blast"], 54, 52, 64, False),
    ("Rubin Hermann", "R. Hermann", "South Africa", "WICKETKEEPER_BATTER", "LEFT_HAND", "NONE", True, 2017, None, True, ["CSA 4-Day", "SA20"], 34, 28, 38, False),
    ("Patrick Kruger", "P. Kruger", "South Africa", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2015, None, True, ["SA20", "CSA 4-Day"], 48, 54, 78, True),
    ("Dayyaan Galiem", "D. Galiem", "South Africa", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2015, None, True, ["SA20", "CSA 4-Day"], 42, 44, 58, False),
    ("Evan Jones", "E. Jones", "South Africa", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2019, None, True, ["SA20", "CSA 4-Day"], 18, 22, 38, False),
    ("Eathan Bosch", "E. Bosch", "South Africa", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2017, None, True, ["SA20", "CSA 4-Day"], 46, 38, 64, True),
    ("Delano Potgieter", "D. Potgieter", "South Africa", "BATTING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2016, None, True, ["SA20", "CSA 4-Day"], 44, 40, 52, False),
    ("Corbin Bosch", "C. Bosch", "South Africa", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2014, None, True, ["SA20", "CSA 4-Day", "CPL", "PSL"], 36, 42, 78, False),
    ("Migael Pretorius", "M. Pretorius", "South Africa", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2016, None, True, ["SA20", "CSA 4-Day", "The Hundred"], 48, 36, 62, False),
    ("Ottniel Baartman", "O. Baartman", "South Africa", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2015, None, True, ["SA20", "CSA 4-Day"], 46, 48, 74, True),
    ("Malusi Siboto", "M. Siboto", "South Africa", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2008, None, True, ["CSA 4-Day", "SA20"], 112, 104, 118, False),
    ("Dane Paterson", "D. Paterson", "South Africa", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2009, None, True, ["CSA 4-Day", "County Championship"], 148, 102, 114, True),
    ("Hardus Viljoen", "H. Viljoen", "South Africa", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2008, None, True, ["CSA 4-Day", "SA20", "IPL", "PSL", "CPL"], 128, 98, 162, True),
    ("Rory Kleinveldt", "R. Kleinveldt", "South Africa", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2002, 2019, False, ["CSA 4-Day", "County Championship"], 156, 162, 114, True),
    ("Pieter Malan", "P. Malan", "South Africa", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2007, None, True, ["CSA 4-Day", "County Championship"], 188, 138, 76, True),

    # Pakistan (QeA & PSL)
    ("Fawad Alam domestic", "F. Alam (Domestic)", "Pakistan", "MIDDLE_ORDER_BATTER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2003, None, True, ["Quaid-e-Azam Trophy", "PSL"], 204, 198, 154, True),
    ("Kamran Akmal domestic", "K. Akmal (Domestic)", "Pakistan", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 1997, 2023, False, ["Quaid-e-Azam Trophy", "PSL"], 254, 268, 292, True),
    ("Khurram Manzoor", "K. Manzoor", "Pakistan", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2003, 2023, False, ["Quaid-e-Azam Trophy", "PSL"], 196, 164, 142, True),
    ("Aizaz Cheema", "A. Cheema", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2001, 2021, False, ["Quaid-e-Azam Trophy", "PSL"], 142, 118, 86, True),
    ("Tabish Khan", "T. Khan", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2002, 2022, False, ["Quaid-e-Azam Trophy"], 144, 76, 44, True),
    ("Sahibzada Farhan", "S. Farhan", "Pakistan", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", False, 2016, None, True, ["PSL", "Quaid-e-Azam Trophy"], 54, 48, 88, True),
    ("Mohammad Ali", "M. Ali (Pak)", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2018, None, True, ["PSL", "Quaid-e-Azam Trophy"], 38, 24, 38, True),
    ("Usama Mir", "U. Mir", "Pakistan", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2013, None, True, ["PSL", "The Hundred", "BBL", "BPL"], 26, 48, 134, True),
    ("Zaman Khan", "Z. Khan", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2021, None, True, ["PSL", "BBL", "The Hundred", "BPL"], 8, 14, 88, True),
    ("Ihsanullah", "Ihsanullah", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2022, None, True, ["PSL", "Quaid-e-Azam Trophy"], 7, 11, 26, True),
    ("Abbas Afridi", "A. Afridi", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2021, None, True, ["PSL", "Quaid-e-Azam Trophy"], 14, 18, 54, True),
    ("Shahnawaz Dahani", "S. Dahani", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2021, None, True, ["PSL", "Quaid-e-Azam Trophy"], 18, 22, 52, True),
    ("Saim Ayub domestic", "S. Ayub (Domestic)", "Pakistan", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2021, None, True, ["PSL", "CPL", "BPL"], 22, 28, 88, True),
    ("Haseebullah Khan", "H. Khan", "Pakistan", "WICKETKEEPER_BATTER", "LEFT_HAND", "NONE", True, 2022, None, True, ["PSL", "Quaid-e-Azam Trophy"], 18, 24, 32, False),
    ("Omair Yousuf", "O. Yousuf", "Pakistan", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", False, 2018, None, True, ["Quaid-e-Azam Trophy", "PSL"], 48, 38, 34, False),
    ("Huraira Mohammad", "M. Huraira", "Pakistan", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", False, 2021, None, True, ["Quaid-e-Azam Trophy"], 38, 18, 14, True),
    ("Kamran Ghulam", "K. Ghulam", "Pakistan", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2013, None, True, ["Quaid-e-Azam Trophy", "PSL"], 68, 62, 64, True),
    ("Tayyab Tahir", "T. Tahir", "Pakistan", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["Quaid-e-Azam Trophy", "PSL"], 52, 48, 56, False),
    ("Rohail Nazir", "R. Nazir", "Pakistan", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2018, None, True, ["Quaid-e-Azam Trophy", "PSL"], 42, 34, 44, False),
    ("Ammad Butt", "A. Butt", "Pakistan", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2014, None, True, ["PSL", "Quaid-e-Azam Trophy", "CPL"], 48, 62, 94, False),
    ("Hussain Talat", "H. Talat", "Pakistan", "BATTING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_MEDIUM", False, 2013, None, True, ["PSL", "Quaid-e-Azam Trophy"], 62, 78, 138, True),
    ("Anwar Ali", "A. Ali", "Pakistan", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2007, None, True, ["PSL", "Quaid-e-Azam Trophy"], 118, 142, 194, True),
    ("Bilawal Bhatti", "B. Bhatti", "Pakistan", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2008, None, True, ["Quaid-e-Azam Trophy", "PSL"], 98, 94, 98, False),
    ("Sohail Khan", "S. Khan", "Pakistan", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2007, 2023, False, ["Quaid-e-Azam Trophy", "PSL"], 128, 102, 134, True),

    # New Zealand (Plunket Shield & Super Smash)
    ("Michael Papps", "M. Papps", "New Zealand", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", True, 1999, 2018, False, ["Plunket Shield", "Super Smash"], 188, 162, 64, True),
    ("Peter Fulton", "P. Fulton", "New Zealand", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2001, 2017, False, ["Plunket Shield", "Super Smash"], 148, 142, 88, True),
    ("Jeet Raval domestic", "J. Raval (Domestic)", "New Zealand", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2008, None, True, ["Plunket Shield", "Super Smash"], 142, 68, 52, True),
    ("Hamish Bennett", "H. Bennett", "New Zealand", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2005, 2022, False, ["Plunket Shield", "Super Smash"], 82, 114, 98, True),
    ("Blair Tickner", "B. Tickner", "New Zealand", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2015, None, True, ["Plunket Shield", "Super Smash"], 72, 54, 88, True),
    ("Cole McConchie", "C. McConchie", "New Zealand", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2012, None, True, ["Plunket Shield", "Super Smash"], 78, 68, 108, True),
    ("Dane Cleaver", "D. Cleaver", "New Zealand", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2011, None, True, ["Plunket Shield", "Super Smash"], 74, 62, 92, True),
    ("Tom Bruce", "T. Bruce", "New Zealand", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2014, None, True, ["Plunket Shield", "Super Smash"], 78, 58, 104, True),
    ("Dean Foxcroft", "D. Foxcroft", "New Zealand", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2018, None, True, ["Super Smash", "Plunket Shield"], 32, 28, 52, True),
    ("Ben Sears", "B. Sears", "New Zealand", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2018, None, True, ["Super Smash", "Plunket Shield"], 24, 22, 44, True),
    ("William O'Rourke", "W. O'Rourke", "New Zealand", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2021, None, True, ["Plunket Shield", "Super Smash"], 18, 14, 22, True),
    ("Chad Bowes", "C. Bowes", "New Zealand", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2012, None, True, ["Plunket Shield", "Super Smash"], 88, 76, 88, True),
    ("Leo Carter", "L. Carter", "New Zealand", "MIDDLE_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2014, None, True, ["Plunket Shield", "Super Smash"], 64, 48, 68, False),
    ("Henry Shipley", "H. Shipley", "New Zealand", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2016, None, True, ["Plunket Shield", "Super Smash"], 38, 34, 46, False),
    ("Sean Solia", "S. Solia", "New Zealand", "BATTING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_MEDIUM", False, 2016, None, True, ["Plunket Shield", "Super Smash"], 54, 44, 62, False),
    ("Nathan Smith", "N. Smith (NZ)", "New Zealand", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2016, None, True, ["Plunket Shield", "Super Smash"], 52, 42, 54, True),

    # West Indies (Regional 4-Day & CPL)
    ("Devon Smith", "D. Smith", "West Indies", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 1999, 2022, False, ["Regional 4-Day", "CPL"], 228, 154, 38, True),
    ("Narsingh Deonarine", "N. Deonarine", "West Indies", "MIDDLE_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2000, 2016, False, ["Regional 4-Day", "CPL"], 148, 114, 38, True),
    ("Nikita Miller", "N. Miller", "West Indies", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2004, 2019, False, ["Regional 4-Day", "CPL"], 100, 94, 52, True),
    ("Veerasammy Permaul", "V. Permaul", "West Indies", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2007, None, True, ["Regional 4-Day", "CPL"], 138, 102, 88, True),
    ("Rahkeem Cornwall", "R. Cornwall", "West Indies", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2014, None, True, ["Regional 4-Day", "CPL"], 88, 62, 94, True),
    ("Chandrapaul Hemraj", "C. Hemraj", "West Indies", "TOP_ORDER_BATTER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2012, None, True, ["CPL", "Regional 4-Day"], 38, 36, 68, False),
    ("Raymon Reifer", "R. Reifer", "West Indies", "BATTING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2011, None, True, ["Regional 4-Day", "CPL"], 104, 76, 92, True),
    ("Kavem Hodge", "K. Hodge", "West Indies", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2012, None, True, ["Regional 4-Day", "CPL"], 68, 58, 42, True),
    ("Kevin Sinclair", "K. Sinclair", "West Indies", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2019, None, True, ["Regional 4-Day", "CPL"], 32, 28, 48, True),
    ("Kirk McKenzie", "K. McKenzie", "West Indies", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2020, None, True, ["Regional 4-Day", "CPL"], 18, 14, 12, False),
    ("Mikyle Louis", "M. Louis", "West Indies", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2024, None, True, ["Regional 4-Day"], 12, 6, 4, False),
    ("Matthew Forde", "M. Forde", "West Indies", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2022, None, True, ["CPL", "Regional 4-Day", "LPL"], 14, 16, 46, True),
    ("Anderson Phillip", "A. Phillip", "West Indies", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2017, None, True, ["Regional 4-Day", "CPL"], 38, 28, 38, False),
    ("Marquino Mindley", "M. Mindley", "West Indies", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2014, None, True, ["Regional 4-Day", "CPL"], 52, 24, 18, False),
    ("Yannic Cariah", "Y. Cariah", "West Indies", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2011, None, True, ["Regional 4-Day", "CPL"], 74, 48, 44, False),
    ("Tevin Imlach", "T. Imlach", "West Indies", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2018, None, True, ["Regional 4-Day", "CPL"], 28, 20, 16, False),
    ("Anthony Bramble", "A. Bramble", "West Indies", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2010, None, True, ["Regional 4-Day", "CPL"], 82, 48, 34, False),
    ("Chadwick Walton", "C. Walton", "West Indies", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2006, 2023, False, ["Regional 4-Day", "CPL", "BPL"], 94, 98, 178, True),
    ("Kennar Lewis", "K. Lewis", "West Indies", "TOP_ORDER_BATTER", "RIGHT_HAND", "NONE", True, 2011, None, True, ["CPL", "T10 League", "BPL"], 22, 28, 64, False),

    # Bangladesh & Sri Lanka (DPL, BPL, LPL)
    ("Tushar Imran", "T. Imran", "Bangladesh", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2000, 2021, False, ["National Cricket League", "DPL"], 182, 134, 18, True),
    ("Enamul Haque Jr", "E. Haque Jr", "Bangladesh", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2003, None, True, ["National Cricket League", "DPL"], 148, 112, 34, True),
    ("Jahurul Islam", "J. Islam", "Bangladesh", "WICKETKEEPER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", True, 2002, None, True, ["DPL", "BPL"], 138, 142, 94, True),
    ("Farhad Reza", "F. Reza", "Bangladesh", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2004, None, True, ["DPL", "BPL"], 134, 168, 128, True),
    ("Naeem Islam", "N. Islam", "Bangladesh", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2004, None, True, ["DPL", "BPL"], 144, 172, 74, True),
    ("Ariful Haque", "A. Haque", "Bangladesh", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_MEDIUM", False, 2008, None, True, ["BPL", "DPL"], 94, 114, 122, False),
    ("Nahid Rana", "N. Rana", "Bangladesh", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2021, None, True, ["BPL", "National Cricket League"], 18, 12, 16, True),
    ("Malinda Pushpakumara", "M. Pushpakumara", "Sri Lanka", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2006, None, True, ["Premier League (SL)", "LPL"], 152, 118, 54, True),
    ("Sachithra Senanayake", "S. Senanayake", "Sri Lanka", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2006, 2021, False, ["Premier League (SL)", "LPL", "IPL"], 108, 164, 114, True),
    ("Ashan Priyanjan", "A. Priyanjan", "Sri Lanka", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2008, None, True, ["Premier League (SL)", "LPL"], 148, 154, 98, True),
    ("Angelo Perera", "A. Perera", "Sri Lanka", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2009, None, True, ["Premier League (SL)", "LPL"], 124, 128, 86, True),
    ("Dhananjaya Lakshan", "D. Lakshan", "Sri Lanka", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2018, None, True, ["LPL", "Premier League (SL)"], 28, 38, 48, False),
    ("Nuwanidu Fernando", "N. Fernando", "Sri Lanka", "TOP_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2019, None, True, ["LPL", "Premier League (SL)"], 36, 42, 54, True),
    ("Vijayakanth Viyaskanth", "V. Viyaskanth", "Sri Lanka", "SPIN_BOWLER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2020, None, True, ["LPL", "IPL", "BPL"], 14, 18, 46, True),
    ("Minod Bhanuka", "M. Bhanuka", "Sri Lanka", "WICKETKEEPER_BATTER", "LEFT_HAND", "NONE", True, 2015, None, True, ["Premier League (SL)", "LPL"], 68, 64, 68, False),
    ("Lahiru Udara", "L. Udara", "Sri Lanka", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2013, None, True, ["Premier League (SL)", "LPL"], 78, 62, 58, False),

    # Associate Stalwarts & Global T20 Journeymen
    ("Ali Khan", "A. Khan (USA)", "USA", "PACE_BOWLER", "RIGHT_HAND", "RIGHT_ARM_FAST", False, 2016, None, True, ["CPL", "MLC", "PSL", "IPL"], 2, 18, 72, True),
    ("Saurabh Netravalkar", "S. Netravalkar", "USA", "PACE_BOWLER", "RIGHT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2013, None, True, ["MLC", "Ranji Trophy", "CPL"], 22, 54, 48, True),
    ("Monank Patel", "M. Patel", "USA", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2018, None, True, ["MLC"], 4, 52, 44, True),
    ("Steven Taylor", "S. Taylor (USA)", "USA", "TOP_ORDER_BATTER", "LEFT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2010, None, True, ["CPL", "MLC"], 10, 56, 58, True),
    ("Aaron Jones", "A. Jones", "USA", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2016, None, True, ["MLC", "CPL"], 16, 52, 46, True),
    ("Andries Gous", "A. Gous", "USA", "WICKETKEEPER_BATTER", "RIGHT_HAND", "NONE", True, 2013, None, True, ["MLC", "CSA 4-Day"], 64, 58, 54, True),
    ("Corey Anderson USA", "C. Anderson (USA)", "USA", "BATTING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2011, None, True, ["MLC", "IPL", "BBL", "Super Smash"], 68, 102, 174, True),
    ("Harmeet Singh USA", "H. Singh (USA)", "USA", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2009, None, True, ["MLC", "Ranji Trophy", "IPL"], 38, 34, 48, True),
    ("Shadley van Schalkwyk", "S. van Schalkwyk", "USA", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2008, None, True, ["MLC", "CSA 4-Day"], 84, 82, 64, False),
    ("Bilal Khan", "B. Khan (OMA)", "Oman", "PACE_BOWLER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2015, None, True, ["BPL", "International Associate"], 0, 48, 78, True),
    ("Zeeshan Maqsood", "Z. Maqsood", "Oman", "BATTING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_ORTHODOX", False, 2015, None, True, ["International Associate"], 0, 46, 68, True),
    ("Aqib Ilyas", "A. Ilyas", "Oman", "BATTING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_LEG_BREAK", False, 2015, None, True, ["International Associate"], 0, 32, 54, True),
    ("JJ Smit", "J.J. Smit", "Namibia", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2012, None, True, ["SA20", "PSL", "International Associate"], 24, 44, 58, True),
    ("Gerhard Erasmus", "G. Erasmus", "Namibia", "MIDDLE_ORDER_BATTER", "RIGHT_HAND", "RIGHT_ARM_OFF_BREAK", False, 2011, None, True, ["SA20", "International Associate"], 28, 48, 64, True),
    ("Ruben Trumpelmann", "R. Trumpelmann", "Namibia", "PACE_BOWLER", "RIGHT_HAND", "LEFT_ARM_FAST", False, 2017, None, True, ["CSA 4-Day", "SA20", "International Associate"], 22, 38, 48, True),
    ("David Wiese domestic", "D. Wiese (Domestic)", "Namibia", "BOWLING_ALL_ROUNDER", "RIGHT_HAND", "RIGHT_ARM_FAST_MEDIUM", False, 2005, None, True, ["SA20", "PSL", "CPL", "The Hundred", "IPL"], 84, 114, 356, True),
    ("Bernard Scholtz", "B. Scholtz", "Namibia", "SPIN_BOWLER", "RIGHT_HAND", "LEFT_ARM_ORTHODOX", False, 2008, None, True, ["CSA 4-Day", "International Associate"], 62, 56, 68, True),
    ("Jan Frylinck", "J. Frylinck", "Namibia", "BOWLING_ALL_ROUNDER", "LEFT_HAND", "LEFT_ARM_FAST_MEDIUM", False, 2011, None, True, ["CSA 4-Day", "International Associate"], 54, 52, 62, True),
    ("Michael van Lingen", "M. van Lingen", "Namibia", "TOP_ORDER_BATTER", "LEFT_HAND", "LEFT_ARM_MEDIUM", False, 2016, None, True, ["International Associate"], 14, 36, 32, False),
    ("Zane Green", "Z. Green", "Namibia", "WICKETKEEPER_BATTER", "LEFT_HAND", "NONE", True, 2013, None, True, ["International Associate"], 22, 38, 52, False),
]

seen = set()
unique_players = []
for p in WORLD_DOMESTIC_RAW:
    norm = p[0].strip().lower()
    if norm not in seen:
        seen.add(norm)
        unique_players.append(p)

print(f"Staged {len(unique_players)} Rest of World domestic players.")

OBJECTS = []
for idx, item in enumerate(unique_players, 1):
    fullName, displayName, country, role, batHand, bowlStyle, isWk, debut, retYear, active, comps, fc, la, t20, elite = item
    pid = make_uuid(6, idx)
    cricId = f"world_dom_{make_slug(fullName)}"
    stats = make_domestic_stats(role, isWk, fc, la, t20, elite)
    
    OBJECTS.append({
        "id": pid,
        "fullName": fullName,
        "displayName": displayName,
        "country": country,
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

write_cohort("cohort-domestic-world.ts", "COHORT_DOMESTIC_WORLD", OBJECTS)
