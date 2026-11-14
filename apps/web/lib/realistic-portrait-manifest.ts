/**
 * Realistic Player Portrait Manifest & 60-Image Diverse Generic Archetype Pool
 *
 * Requirements:
 * 1. Marquee Legends & Top Players have authentic individual portraits (never mismatched).
 * 2. Rest of players deterministically resolve to a pool of 60 distinct realistic
 *    broadcast photography archetypes (5 roles × 12 national cohorts).
 * 3. Repetition is minimized (~19 players per archetype across 1,144 players).
 * 4. Zero dark silhouette SVG initials avatars appear anywhere in the UI.
 */

export interface GenericArchetypeMeta {
  id: string;
  filename: string;
  role: 'PACE_BOWLER' | 'SPIN_BOWLER' | 'WICKETKEEPER' | 'BATTER_TOP_ORDER' | 'ALL_ROUNDER';
  cohortCode: string;
  nationality: string;
  path: string;
}

export const REALISTIC_GENERIC_POOL: GenericArchetypeMeta[] = [
  {
    "id": "generic-01",
    "filename": "generic-cricketer-01.jpg",
    "path": "/assets/players/realistic/generic-cricketer-01.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "IN",
    "nationality": "India"
  },
  {
    "id": "generic-02",
    "filename": "generic-cricketer-02.jpg",
    "path": "/assets/players/realistic/generic-cricketer-02.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "AU",
    "nationality": "Australia"
  },
  {
    "id": "generic-03",
    "filename": "generic-cricketer-03.jpg",
    "path": "/assets/players/realistic/generic-cricketer-03.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "ENG",
    "nationality": "England"
  },
  {
    "id": "generic-04",
    "filename": "generic-cricketer-04.jpg",
    "path": "/assets/players/realistic/generic-cricketer-04.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "PAK",
    "nationality": "Pakistan"
  },
  {
    "id": "generic-05",
    "filename": "generic-cricketer-05.jpg",
    "path": "/assets/players/realistic/generic-cricketer-05.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "SA",
    "nationality": "South Africa"
  },
  {
    "id": "generic-06",
    "filename": "generic-cricketer-06.jpg",
    "path": "/assets/players/realistic/generic-cricketer-06.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "WI",
    "nationality": "West Indies"
  },
  {
    "id": "generic-07",
    "filename": "generic-cricketer-07.jpg",
    "path": "/assets/players/realistic/generic-cricketer-07.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "NZ",
    "nationality": "New Zealand"
  },
  {
    "id": "generic-08",
    "filename": "generic-cricketer-08.jpg",
    "path": "/assets/players/realistic/generic-cricketer-08.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "SL",
    "nationality": "Sri Lanka"
  },
  {
    "id": "generic-09",
    "filename": "generic-cricketer-09.jpg",
    "path": "/assets/players/realistic/generic-cricketer-09.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "BAN",
    "nationality": "Bangladesh"
  },
  {
    "id": "generic-10",
    "filename": "generic-cricketer-10.jpg",
    "path": "/assets/players/realistic/generic-cricketer-10.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "AFG",
    "nationality": "Afghanistan"
  },
  {
    "id": "generic-11",
    "filename": "generic-cricketer-11.jpg",
    "path": "/assets/players/realistic/generic-cricketer-11.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "ASSOC",
    "nationality": "Associate"
  },
  {
    "id": "generic-12",
    "filename": "generic-cricketer-12.jpg",
    "path": "/assets/players/realistic/generic-cricketer-12.jpg",
    "role": "PACE_BOWLER",
    "cohortCode": "LEGEND",
    "nationality": "Classic Legends"
  },
  {
    "id": "generic-13",
    "filename": "generic-cricketer-13.jpg",
    "path": "/assets/players/realistic/generic-cricketer-13.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "IN",
    "nationality": "India"
  },
  {
    "id": "generic-14",
    "filename": "generic-cricketer-14.jpg",
    "path": "/assets/players/realistic/generic-cricketer-14.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "AU",
    "nationality": "Australia"
  },
  {
    "id": "generic-15",
    "filename": "generic-cricketer-15.jpg",
    "path": "/assets/players/realistic/generic-cricketer-15.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "ENG",
    "nationality": "England"
  },
  {
    "id": "generic-16",
    "filename": "generic-cricketer-16.jpg",
    "path": "/assets/players/realistic/generic-cricketer-16.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "PAK",
    "nationality": "Pakistan"
  },
  {
    "id": "generic-17",
    "filename": "generic-cricketer-17.jpg",
    "path": "/assets/players/realistic/generic-cricketer-17.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "SA",
    "nationality": "South Africa"
  },
  {
    "id": "generic-18",
    "filename": "generic-cricketer-18.jpg",
    "path": "/assets/players/realistic/generic-cricketer-18.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "WI",
    "nationality": "West Indies"
  },
  {
    "id": "generic-19",
    "filename": "generic-cricketer-19.jpg",
    "path": "/assets/players/realistic/generic-cricketer-19.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "NZ",
    "nationality": "New Zealand"
  },
  {
    "id": "generic-20",
    "filename": "generic-cricketer-20.jpg",
    "path": "/assets/players/realistic/generic-cricketer-20.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "SL",
    "nationality": "Sri Lanka"
  },
  {
    "id": "generic-21",
    "filename": "generic-cricketer-21.jpg",
    "path": "/assets/players/realistic/generic-cricketer-21.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "BAN",
    "nationality": "Bangladesh"
  },
  {
    "id": "generic-22",
    "filename": "generic-cricketer-22.jpg",
    "path": "/assets/players/realistic/generic-cricketer-22.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "AFG",
    "nationality": "Afghanistan"
  },
  {
    "id": "generic-23",
    "filename": "generic-cricketer-23.jpg",
    "path": "/assets/players/realistic/generic-cricketer-23.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "ASSOC",
    "nationality": "Associate"
  },
  {
    "id": "generic-24",
    "filename": "generic-cricketer-24.jpg",
    "path": "/assets/players/realistic/generic-cricketer-24.jpg",
    "role": "SPIN_BOWLER",
    "cohortCode": "LEGEND",
    "nationality": "Classic Legends"
  },
  {
    "id": "generic-25",
    "filename": "generic-cricketer-25.jpg",
    "path": "/assets/players/realistic/generic-cricketer-25.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "IN",
    "nationality": "India"
  },
  {
    "id": "generic-26",
    "filename": "generic-cricketer-26.jpg",
    "path": "/assets/players/realistic/generic-cricketer-26.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "AU",
    "nationality": "Australia"
  },
  {
    "id": "generic-27",
    "filename": "generic-cricketer-27.jpg",
    "path": "/assets/players/realistic/generic-cricketer-27.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "ENG",
    "nationality": "England"
  },
  {
    "id": "generic-28",
    "filename": "generic-cricketer-28.jpg",
    "path": "/assets/players/realistic/generic-cricketer-28.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "PAK",
    "nationality": "Pakistan"
  },
  {
    "id": "generic-29",
    "filename": "generic-cricketer-29.jpg",
    "path": "/assets/players/realistic/generic-cricketer-29.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "SA",
    "nationality": "South Africa"
  },
  {
    "id": "generic-30",
    "filename": "generic-cricketer-30.jpg",
    "path": "/assets/players/realistic/generic-cricketer-30.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "WI",
    "nationality": "West Indies"
  },
  {
    "id": "generic-31",
    "filename": "generic-cricketer-31.jpg",
    "path": "/assets/players/realistic/generic-cricketer-31.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "NZ",
    "nationality": "New Zealand"
  },
  {
    "id": "generic-32",
    "filename": "generic-cricketer-32.jpg",
    "path": "/assets/players/realistic/generic-cricketer-32.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "SL",
    "nationality": "Sri Lanka"
  },
  {
    "id": "generic-33",
    "filename": "generic-cricketer-33.jpg",
    "path": "/assets/players/realistic/generic-cricketer-33.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "BAN",
    "nationality": "Bangladesh"
  },
  {
    "id": "generic-34",
    "filename": "generic-cricketer-34.jpg",
    "path": "/assets/players/realistic/generic-cricketer-34.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "AFG",
    "nationality": "Afghanistan"
  },
  {
    "id": "generic-35",
    "filename": "generic-cricketer-35.jpg",
    "path": "/assets/players/realistic/generic-cricketer-35.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "ASSOC",
    "nationality": "Associate"
  },
  {
    "id": "generic-36",
    "filename": "generic-cricketer-36.jpg",
    "path": "/assets/players/realistic/generic-cricketer-36.jpg",
    "role": "WICKETKEEPER",
    "cohortCode": "LEGEND",
    "nationality": "Classic Legends"
  },
  {
    "id": "generic-37",
    "filename": "generic-cricketer-37.jpg",
    "path": "/assets/players/realistic/generic-cricketer-37.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "IN",
    "nationality": "India"
  },
  {
    "id": "generic-38",
    "filename": "generic-cricketer-38.jpg",
    "path": "/assets/players/realistic/generic-cricketer-38.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "AU",
    "nationality": "Australia"
  },
  {
    "id": "generic-39",
    "filename": "generic-cricketer-39.jpg",
    "path": "/assets/players/realistic/generic-cricketer-39.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "ENG",
    "nationality": "England"
  },
  {
    "id": "generic-40",
    "filename": "generic-cricketer-40.jpg",
    "path": "/assets/players/realistic/generic-cricketer-40.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "PAK",
    "nationality": "Pakistan"
  },
  {
    "id": "generic-41",
    "filename": "generic-cricketer-41.jpg",
    "path": "/assets/players/realistic/generic-cricketer-41.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "SA",
    "nationality": "South Africa"
  },
  {
    "id": "generic-42",
    "filename": "generic-cricketer-42.jpg",
    "path": "/assets/players/realistic/generic-cricketer-42.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "WI",
    "nationality": "West Indies"
  },
  {
    "id": "generic-43",
    "filename": "generic-cricketer-43.jpg",
    "path": "/assets/players/realistic/generic-cricketer-43.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "NZ",
    "nationality": "New Zealand"
  },
  {
    "id": "generic-44",
    "filename": "generic-cricketer-44.jpg",
    "path": "/assets/players/realistic/generic-cricketer-44.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "SL",
    "nationality": "Sri Lanka"
  },
  {
    "id": "generic-45",
    "filename": "generic-cricketer-45.jpg",
    "path": "/assets/players/realistic/generic-cricketer-45.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "BAN",
    "nationality": "Bangladesh"
  },
  {
    "id": "generic-46",
    "filename": "generic-cricketer-46.jpg",
    "path": "/assets/players/realistic/generic-cricketer-46.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "AFG",
    "nationality": "Afghanistan"
  },
  {
    "id": "generic-47",
    "filename": "generic-cricketer-47.jpg",
    "path": "/assets/players/realistic/generic-cricketer-47.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "ASSOC",
    "nationality": "Associate"
  },
  {
    "id": "generic-48",
    "filename": "generic-cricketer-48.jpg",
    "path": "/assets/players/realistic/generic-cricketer-48.jpg",
    "role": "BATTER_TOP_ORDER",
    "cohortCode": "LEGEND",
    "nationality": "Classic Legends"
  },
  {
    "id": "generic-49",
    "filename": "generic-cricketer-49.jpg",
    "path": "/assets/players/realistic/generic-cricketer-49.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "IN",
    "nationality": "India"
  },
  {
    "id": "generic-50",
    "filename": "generic-cricketer-50.jpg",
    "path": "/assets/players/realistic/generic-cricketer-50.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "AU",
    "nationality": "Australia"
  },
  {
    "id": "generic-51",
    "filename": "generic-cricketer-51.jpg",
    "path": "/assets/players/realistic/generic-cricketer-51.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "ENG",
    "nationality": "England"
  },
  {
    "id": "generic-52",
    "filename": "generic-cricketer-52.jpg",
    "path": "/assets/players/realistic/generic-cricketer-52.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "PAK",
    "nationality": "Pakistan"
  },
  {
    "id": "generic-53",
    "filename": "generic-cricketer-53.jpg",
    "path": "/assets/players/realistic/generic-cricketer-53.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "SA",
    "nationality": "South Africa"
  },
  {
    "id": "generic-54",
    "filename": "generic-cricketer-54.jpg",
    "path": "/assets/players/realistic/generic-cricketer-54.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "WI",
    "nationality": "West Indies"
  },
  {
    "id": "generic-55",
    "filename": "generic-cricketer-55.jpg",
    "path": "/assets/players/realistic/generic-cricketer-55.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "NZ",
    "nationality": "New Zealand"
  },
  {
    "id": "generic-56",
    "filename": "generic-cricketer-56.jpg",
    "path": "/assets/players/realistic/generic-cricketer-56.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "SL",
    "nationality": "Sri Lanka"
  },
  {
    "id": "generic-57",
    "filename": "generic-cricketer-57.jpg",
    "path": "/assets/players/realistic/generic-cricketer-57.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "BAN",
    "nationality": "Bangladesh"
  },
  {
    "id": "generic-58",
    "filename": "generic-cricketer-58.jpg",
    "path": "/assets/players/realistic/generic-cricketer-58.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "AFG",
    "nationality": "Afghanistan"
  },
  {
    "id": "generic-59",
    "filename": "generic-cricketer-59.jpg",
    "path": "/assets/players/realistic/generic-cricketer-59.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "ASSOC",
    "nationality": "Associate"
  },
  {
    "id": "generic-60",
    "filename": "generic-cricketer-60.jpg",
    "path": "/assets/players/realistic/generic-cricketer-60.jpg",
    "role": "ALL_ROUNDER",
    "cohortCode": "LEGEND",
    "nationality": "Classic Legends"
  }
];

export const REALISTIC_INDIVIDUAL_PORTRAITS: Record<string, string> = {
  "f1e10000-0001-4000-8000-000000000001": "/assets/players/realistic/f1e10000-0001-4000-8000-000000000001.png",
  "f1e10000-0002-4000-8000-000000000002": "/assets/players/realistic/f1e10000-0002-4000-8000-000000000002.png",
  "f1e10000-0003-4000-8000-000000000003": "/assets/players/realistic/f1e10000-0003-4000-8000-000000000003.jpg",
  "f1e10000-0004-4000-8000-000000000004": "/assets/players/realistic/f1e10000-0004-4000-8000-000000000004.jpg",
  "f1e10000-0005-4000-8000-000000000005": "/assets/players/realistic/f1e10000-0005-4000-8000-000000000005.jpg",
  "f1e10000-0006-4000-8000-000000000006": "/assets/players/realistic/f1e10000-0006-4000-8000-000000000006.jpg",
  "f1e10000-0007-4000-8000-000000000007": "/assets/players/realistic/f1e10000-0007-4000-8000-000000000007.png",
  "f1e10000-0029-4000-8000-000000000029": "/assets/players/realistic/f1e10000-0029-4000-8000-000000000029.png",
  "f1e10000-002b-4000-8000-00000000002b": "/assets/players/realistic/f1e10000-002b-4000-8000-00000000002b.png",
  "f1e10000-002c-4000-8000-00000000002c": "/assets/players/realistic/f1e10000-002c-4000-8000-00000000002c.jpg",
  "f1e10000-002d-4000-8000-00000000002d": "/assets/players/realistic/f1e10000-002d-4000-8000-00000000002d.jpg",
  "f1e10000-002e-4000-8000-00000000002e": "/assets/players/realistic/f1e10000-002e-4000-8000-00000000002e.jpg",
  "f1e10000-0048-4000-8000-000000000048": "/assets/players/realistic/f1e10000-0048-4000-8000-000000000048.png",
  "f1e10000-0049-4000-8000-000000000049": "/assets/players/realistic/f1e10000-0049-4000-8000-000000000049.jpg",
  "f1e10000-004a-4000-8000-00000000004a": "/assets/players/realistic/f1e10000-004a-4000-8000-00000000004a.jpg",
  "f1e10000-0066-4000-8000-000000000066": "/assets/players/realistic/f1e10000-0066-4000-8000-000000000066.jpg",
  "f1e10000-0098-4000-8000-000000000098": "/assets/players/realistic/f1e10000-0098-4000-8000-000000000098.jpg",
  "f1e10000-00f1-4000-8000-0000000000f1": "/assets/players/realistic/f1e10000-00f1-4000-8000-0000000000f1.png",
  "f1e20000-0001-4000-8000-000000000001": "/assets/players/realistic/f1e20000-0001-4000-8000-000000000001.png",
  "f1e20000-0002-4000-8000-000000000002": "/assets/players/realistic/f1e20000-0002-4000-8000-000000000002.png",
  "f1e20000-0003-4000-8000-000000000003": "/assets/players/realistic/f1e20000-0003-4000-8000-000000000003.png",
  "f1e20000-0004-4000-8000-000000000004": "/assets/players/realistic/f1e20000-0004-4000-8000-000000000004.jpg",
  "f1e20000-0005-4000-8000-000000000005": "/assets/players/realistic/f1e20000-0005-4000-8000-000000000005.png",
  "f1e20000-0006-4000-8000-000000000006": "/assets/players/realistic/f1e20000-0006-4000-8000-000000000006.jpg",
  "f1e20000-0007-4000-8000-000000000007": "/assets/players/realistic/f1e20000-0007-4000-8000-000000000007.png",
  "f1e20000-0008-4000-8000-000000000008": "/assets/players/realistic/f1e20000-0008-4000-8000-000000000008.png",
  "f1e20000-000a-4000-8000-00000000000a": "/assets/players/realistic/f1e20000-000a-4000-8000-00000000000a.jpg",
  "f1e20000-0010-4000-8000-000000000010": "/assets/players/realistic/f1e20000-0010-4000-8000-000000000010.jpg",
  "f1e20000-0011-4000-8000-000000000011": "/assets/players/realistic/f1e20000-0011-4000-8000-000000000011.jpg",
  "f1e20000-0012-4000-8000-000000000012": "/assets/players/realistic/f1e20000-0012-4000-8000-000000000012.jpg",
  "f1e20000-0016-4000-8000-000000000016": "/assets/players/realistic/f1e20000-0016-4000-8000-000000000016.jpg",
  "f1e20000-0017-4000-8000-000000000017": "/assets/players/realistic/f1e20000-0017-4000-8000-000000000017.jpg",
  "f1e20000-0018-4000-8000-000000000018": "/assets/players/realistic/f1e20000-0018-4000-8000-000000000018.jpg",
  "f1e20000-001b-4000-8000-00000000001b": "/assets/players/realistic/f1e20000-001b-4000-8000-00000000001b.png",
  "f1e20000-001c-4000-8000-00000000001c": "/assets/players/realistic/f1e20000-001c-4000-8000-00000000001c.jpg",
  "f1e20000-001e-4000-8000-00000000001e": "/assets/players/realistic/f1e20000-001e-4000-8000-00000000001e.jpg",
  "f1e20000-001f-4000-8000-00000000001f": "/assets/players/realistic/f1e20000-001f-4000-8000-00000000001f.jpg",
  "f1e20000-002a-4000-8000-00000000002a": "/assets/players/realistic/f1e20000-002a-4000-8000-00000000002a.jpg",
  "f1e20000-0030-4000-8000-000000000030": "/assets/players/realistic/f1e20000-0030-4000-8000-000000000030.png",
  "f1e20000-003b-4000-8000-00000000003b": "/assets/players/realistic/f1e20000-003b-4000-8000-00000000003b.jpg",
  "f1e20000-003d-4000-8000-00000000003d": "/assets/players/realistic/f1e20000-003d-4000-8000-00000000003d.jpg",
  "f1e20000-003e-4000-8000-00000000003e": "/assets/players/realistic/f1e20000-003e-4000-8000-00000000003e.jpg",
  "f1e20000-0045-4000-8000-000000000045": "/assets/players/realistic/f1e20000-0045-4000-8000-000000000045.jpg",
  "f1e20000-0046-4000-8000-000000000046": "/assets/players/realistic/f1e20000-0046-4000-8000-000000000046.jpg",
  "f1e20000-0049-4000-8000-000000000049": "/assets/players/realistic/f1e20000-0049-4000-8000-000000000049.jpg",
  "f1e20000-004b-4000-8000-00000000004b": "/assets/players/realistic/f1e20000-004b-4000-8000-00000000004b.jpg",
  "f1e20000-004f-4000-8000-00000000004f": "/assets/players/realistic/f1e20000-004f-4000-8000-00000000004f.jpg",
  "f1e20000-0053-4000-8000-000000000053": "/assets/players/realistic/f1e20000-0053-4000-8000-000000000053.jpg",
  "f1e20000-0054-4000-8000-000000000054": "/assets/players/realistic/f1e20000-0054-4000-8000-000000000054.jpg",
  "f1e20000-005f-4000-8000-00000000005f": "/assets/players/realistic/f1e20000-005f-4000-8000-00000000005f.jpg",
  "f1e20000-0064-4000-8000-000000000064": "/assets/players/realistic/f1e20000-0064-4000-8000-000000000064.jpg",
  "f1e20000-0067-4000-8000-000000000067": "/assets/players/realistic/f1e20000-0067-4000-8000-000000000067.jpg",
  "f1e20000-0068-4000-8000-000000000068": "/assets/players/realistic/f1e20000-0068-4000-8000-000000000068.jpg",
  "f1e20000-0069-4000-8000-000000000069": "/assets/players/realistic/f1e20000-0069-4000-8000-000000000069.jpg",
  "f1e20000-006b-4000-8000-00000000006b": "/assets/players/realistic/f1e20000-006b-4000-8000-00000000006b.jpg",
  "f1e20000-006c-4000-8000-00000000006c": "/assets/players/realistic/f1e20000-006c-4000-8000-00000000006c.jpg",
  "f1e20000-0070-4000-8000-000000000070": "/assets/players/realistic/f1e20000-0070-4000-8000-000000000070.jpg",
  "f1e20000-0071-4000-8000-000000000071": "/assets/players/realistic/f1e20000-0071-4000-8000-000000000071.jpg",
  "f1e20000-0075-4000-8000-000000000075": "/assets/players/realistic/f1e20000-0075-4000-8000-000000000075.jpg",
  "f1e20000-0084-4000-8000-000000000084": "/assets/players/realistic/f1e20000-0084-4000-8000-000000000084.jpg",
  "f1e20000-0088-4000-8000-000000000088": "/assets/players/realistic/f1e20000-0088-4000-8000-000000000088.jpg",
  "f1e20000-008a-4000-8000-00000000008a": "/assets/players/realistic/f1e20000-008a-4000-8000-00000000008a.jpg",
  "f1e20000-0090-4000-8000-000000000090": "/assets/players/realistic/f1e20000-0090-4000-8000-000000000090.jpg",
  "f1e20000-0096-4000-8000-000000000096": "/assets/players/realistic/f1e20000-0096-4000-8000-000000000096.jpg",
  "f1e20000-0098-4000-8000-000000000098": "/assets/players/realistic/f1e20000-0098-4000-8000-000000000098.jpg",
  "f1e20000-009b-4000-8000-00000000009b": "/assets/players/realistic/f1e20000-009b-4000-8000-00000000009b.jpg",
  "f1e20000-009e-4000-8000-00000000009e": "/assets/players/realistic/f1e20000-009e-4000-8000-00000000009e.jpg",
  "f1e20000-00a1-4000-8000-0000000000a1": "/assets/players/realistic/f1e20000-00a1-4000-8000-0000000000a1.jpg",
  "f1e20000-00a4-4000-8000-0000000000a4": "/assets/players/realistic/f1e20000-00a4-4000-8000-0000000000a4.jpg",
  "f1e20000-00a5-4000-8000-0000000000a5": "/assets/players/realistic/f1e20000-00a5-4000-8000-0000000000a5.jpg",
  "f1e20000-00a6-4000-8000-0000000000a6": "/assets/players/realistic/f1e20000-00a6-4000-8000-0000000000a6.jpg",
  "f1e20000-00a7-4000-8000-0000000000a7": "/assets/players/realistic/f1e20000-00a7-4000-8000-0000000000a7.jpg",
  "f1e20000-00ad-4000-8000-0000000000ad": "/assets/players/realistic/f1e20000-00ad-4000-8000-0000000000ad.jpg",
  "f1e20000-00ae-4000-8000-0000000000ae": "/assets/players/realistic/f1e20000-00ae-4000-8000-0000000000ae.jpg",
  "f1e20000-00b0-4000-8000-0000000000b0": "/assets/players/realistic/f1e20000-00b0-4000-8000-0000000000b0.jpg",
  "f1e20000-00b1-4000-8000-0000000000b1": "/assets/players/realistic/f1e20000-00b1-4000-8000-0000000000b1.jpg",
  "f1e20000-00b6-4000-8000-0000000000b6": "/assets/players/realistic/f1e20000-00b6-4000-8000-0000000000b6.jpg",
  "f1e20000-00bb-4000-8000-0000000000bb": "/assets/players/realistic/f1e20000-00bb-4000-8000-0000000000bb.jpg",
  "f1e20000-00bd-4000-8000-0000000000bd": "/assets/players/realistic/f1e20000-00bd-4000-8000-0000000000bd.jpg",
  "f1e20000-00be-4000-8000-0000000000be": "/assets/players/realistic/f1e20000-00be-4000-8000-0000000000be.jpg",
  "f1e20000-00c0-4000-8000-0000000000c0": "/assets/players/realistic/f1e20000-00c0-4000-8000-0000000000c0.jpg",
  "f1e20000-00c2-4000-8000-0000000000c2": "/assets/players/realistic/f1e20000-00c2-4000-8000-0000000000c2.jpg",
  "f1e20000-00c3-4000-8000-0000000000c3": "/assets/players/realistic/f1e20000-00c3-4000-8000-0000000000c3.jpg",
  "f1e20000-00c9-4000-8000-0000000000c9": "/assets/players/realistic/f1e20000-00c9-4000-8000-0000000000c9.jpg",
  "f1e20000-00f7-4000-8000-0000000000f7": "/assets/players/realistic/f1e20000-00f7-4000-8000-0000000000f7.jpg",
  "f1e30000-000a-4000-8000-00000000000a": "/assets/players/realistic/f1e30000-000a-4000-8000-00000000000a.jpg",
  "f1e30000-001b-4000-8000-00000000001b": "/assets/players/realistic/f1e30000-001b-4000-8000-00000000001b.jpg",
  "f1e30000-001e-4000-8000-00000000001e": "/assets/players/realistic/f1e30000-001e-4000-8000-00000000001e.jpg",
  "f1e30000-006c-4000-8000-00000000006c": "/assets/players/realistic/f1e30000-006c-4000-8000-00000000006c.jpg",
  "f1e30000-006d-4000-8000-00000000006d": "/assets/players/realistic/f1e30000-006d-4000-8000-00000000006d.jpg",
  "f1e30000-006e-4000-8000-00000000006e": "/assets/players/realistic/f1e30000-006e-4000-8000-00000000006e.jpg",
  "f1e30000-0078-4000-8000-000000000078": "/assets/players/realistic/f1e30000-0078-4000-8000-000000000078.jpg",
  "f1e30000-007c-4000-8000-00000000007c": "/assets/players/realistic/f1e30000-007c-4000-8000-00000000007c.jpg",
  "f1e30000-007d-4000-8000-00000000007d": "/assets/players/realistic/f1e30000-007d-4000-8000-00000000007d.jpg",
  "f1e30000-007e-4000-8000-00000000007e": "/assets/players/realistic/f1e30000-007e-4000-8000-00000000007e.jpg",
  "f1e30000-007f-4000-8000-00000000007f": "/assets/players/realistic/f1e30000-007f-4000-8000-00000000007f.jpg",
  "f1e30000-0080-4000-8000-000000000080": "/assets/players/realistic/f1e30000-0080-4000-8000-000000000080.jpg",
  "f1e30000-00c6-4000-8000-0000000000c6": "/assets/players/realistic/f1e30000-00c6-4000-8000-0000000000c6.jpg",
  "f1e40000-0001-4000-8000-000000000001": "/assets/players/realistic/f1e40000-0001-4000-8000-000000000001.jpg",
  "f1e40000-0002-4000-8000-000000000002": "/assets/players/realistic/f1e40000-0002-4000-8000-000000000002.jpg",
  "f1e40000-0005-4000-8000-000000000005": "/assets/players/realistic/f1e40000-0005-4000-8000-000000000005.jpg",
  "f1e40000-0016-4000-8000-000000000016": "/assets/players/realistic/f1e40000-0016-4000-8000-000000000016.jpg",
  "f1e40000-0017-4000-8000-000000000017": "/assets/players/realistic/f1e40000-0017-4000-8000-000000000017.jpg",
  "f1e40000-0063-4000-8000-000000000063": "/assets/players/realistic/f1e40000-0063-4000-8000-000000000063.jpg",
  "f1e50000-0001-4000-8000-000000000001": "/assets/players/realistic/f1e50000-0001-4000-8000-000000000001.jpg",
  "f1e50000-0002-4000-8000-000000000002": "/assets/players/realistic/f1e50000-0002-4000-8000-000000000002.jpg",
  "f1e50000-0003-4000-8000-000000000003": "/assets/players/realistic/f1e50000-0003-4000-8000-000000000003.jpg",
  "f1e50000-0004-4000-8000-000000000004": "/assets/players/realistic/f1e50000-0004-4000-8000-000000000004.jpg",
  "f1e50000-000b-4000-8000-00000000000b": "/assets/players/realistic/f1e50000-000b-4000-8000-00000000000b.jpg",
  "f1e50000-000d-4000-8000-00000000000d": "/assets/players/realistic/f1e50000-000d-4000-8000-00000000000d.jpg",
  "f1e50000-000f-4000-8000-00000000000f": "/assets/players/realistic/f1e50000-000f-4000-8000-00000000000f.jpg",
  "f1e50000-0019-4000-8000-000000000019": "/assets/players/realistic/f1e50000-0019-4000-8000-000000000019.jpg",
  "f1e50000-0021-4000-8000-000000000021": "/assets/players/realistic/f1e50000-0021-4000-8000-000000000021.jpg",
  "f1e50000-0043-4000-8000-000000000043": "/assets/players/realistic/f1e50000-0043-4000-8000-000000000043.jpg",
  "f1e50000-0044-4000-8000-000000000044": "/assets/players/realistic/f1e50000-0044-4000-8000-000000000044.jpg",
  "f1e50000-0045-4000-8000-000000000045": "/assets/players/realistic/f1e50000-0045-4000-8000-000000000045.jpg",
  "f1e50000-0050-4000-8000-000000000050": "/assets/players/realistic/f1e50000-0050-4000-8000-000000000050.jpg",
  "f1e50000-005e-4000-8000-00000000005e": "/assets/players/realistic/f1e50000-005e-4000-8000-00000000005e.jpg",
  "f1e50000-006a-4000-8000-00000000006a": "/assets/players/realistic/f1e50000-006a-4000-8000-00000000006a.jpg",
  "f1e60000-0004-4000-8000-000000000004": "/assets/players/realistic/f1e60000-0004-4000-8000-000000000004.jpg",
  "f1e60000-0005-4000-8000-000000000005": "/assets/players/realistic/f1e60000-0005-4000-8000-000000000005.jpg",
  "f1e60000-0019-4000-8000-000000000019": "/assets/players/realistic/f1e60000-0019-4000-8000-000000000019.jpg",
  "f1e60000-001a-4000-8000-00000000001a": "/assets/players/realistic/f1e60000-001a-4000-8000-00000000001a.jpg",
  "f1e60000-001e-4000-8000-00000000001e": "/assets/players/realistic/f1e60000-001e-4000-8000-00000000001e.jpg",
  "f1e60000-0056-4000-8000-000000000056": "/assets/players/realistic/f1e60000-0056-4000-8000-000000000056.jpg",
  "f1e60000-005a-4000-8000-00000000005a": "/assets/players/realistic/f1e60000-005a-4000-8000-00000000005a.jpg"
};

function hashStr(val: string): number {
  let hash = 0;
  for (let i = 0; i < val.length; i++) {
    hash = ((hash << 5) - hash) + val.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeRole(role?: string): 'PACE_BOWLER' | 'SPIN_BOWLER' | 'WICKETKEEPER' | 'BATTER_TOP_ORDER' | 'ALL_ROUNDER' {
  const r = (role || '').toUpperCase();
  if (r.includes('BOWL') || r.includes('PACE') || r.includes('FAST') || r.includes('SEAM')) {
    if (r.includes('SPIN')) return 'SPIN_BOWLER';
    return 'PACE_BOWLER';
  }
  if (r.includes('SPIN')) return 'SPIN_BOWLER';
  if (r.includes('KEEP') || r.includes('WK')) return 'WICKETKEEPER';
  if (r.includes('ALL_ROUNDER') || r.includes('AR')) return 'ALL_ROUNDER';
  return 'BATTER_TOP_ORDER';
}

function normalizeCohort(nationality?: string): string {
  const n = (nationality || '').toLowerCase();
  if (n.includes('ind') && !n.includes('indies')) return 'IN';
  if (n.includes('aus')) return 'AU';
  if (n.includes('eng')) return 'ENG';
  if (n.includes('pak')) return 'PAK';
  if (n.includes('south') || n.includes('sa')) return 'SA';
  if (n.includes('indies') || n.includes('wi')) return 'WI';
  if (n.includes('zealand') || n.includes('nz')) return 'NZ';
  if (n.includes('lanka') || n.includes('sl')) return 'SL';
  if (n.includes('bangla') || n.includes('ban')) return 'BAN';
  if (n.includes('afghan') || n.includes('afg')) return 'AFG';
  if (['zim', 'ire', 'ned', 'scot', 'usa'].some(k => n.includes(k))) return 'ASSOC';
  return 'LEGEND';
}

/**
 * Deterministically retrieves a diverse realistic broadcast photograph
 * from the 60-image archetype pool, keyed on player UUID and role/cohort.
 */
export function getDiverseRealisticGeneric(
  playerId?: string,
  role?: string,
  nationality?: string,
): string {
  const targetRole = normalizeRole(role);
  const targetCohort = normalizeCohort(nationality);
  const h = hashStr(playerId || role || 'generic-cricketer');

  const rolePool = REALISTIC_GENERIC_POOL.filter(x => x.role === targetRole);
  const exactPool = rolePool.filter(x => x.cohortCode === targetCohort);

  // Exact cohort match prioritized 60% of time; 40% dispersed across same-role cohorts
  // to avoid clustering high-density nations (e.g. India/England) onto a single image.
  if (exactPool.length > 0 && (h % 10) < 6) {
    return exactPool[h % exactPool.length].path;
  }

  if (rolePool.length > 0) {
    return rolePool[h % rolePool.length].path;
  }

  return REALISTIC_GENERIC_POOL[h % REALISTIC_GENERIC_POOL.length].path;
}

export function hasRealisticPortrait(id?: string): boolean {
  if (!id) return false;
  return Boolean(REALISTIC_INDIVIDUAL_PORTRAITS[id]);
}

/**
 * Global realistic fallback - always returns a realistic photo, never SVG or silhouette
 */
export function getRealisticFallback(primaryRole?: string, primaryNationality?: string, id?: string): string {
  return getDiverseRealisticGeneric(id, primaryRole, primaryNationality);
}
