import type {
  PlayerProfile,
  MatchFormat,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';

export interface NationalTeamMeta {
  readonly id: string;
  readonly name: string;
  readonly flag: string;
}

export const SUPPORTED_NATIONAL_TEAMS: readonly NationalTeamMeta[] = [
  { id: 'India', name: 'India All-Time XI', flag: '🇮🇳' },
  { id: 'Australia', name: 'Australia All-Time XI', flag: '🇦🇺' },
  { id: 'England', name: 'England All-Time XI', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'West Indies', name: 'West Indies All-Time XI', flag: '🌴' },
  { id: 'South Africa', name: 'South Africa All-Time XI', flag: '🇿🇦' },
  { id: 'Pakistan', name: 'Pakistan All-Time XI', flag: '🇵🇰' },
  { id: 'New Zealand', name: 'New Zealand All-Time XI', flag: '🇳🇿' },
  { id: 'Sri Lanka', name: 'Sri Lanka All-Time XI', flag: '🇱🇰' },
];

export type SupportedNation = (typeof SUPPORTED_NATIONAL_TEAMS)[number]['id'];

export interface FormattedSquadSlot {
  playerId: string;
  battingOrder: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isDesignatedWicketkeeper: boolean;
  bowlingPriority: number | null;
}

/**
 * 2026 IPL Franchise Metadata & Complete Authentic Playing Squad Definitions
 * Based on official user-verified 2026 IPL auction & retention squads.
 */
export interface IPLTeamMeta {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly primaryColor: string;
  readonly homeGround: string;
  readonly captainName: string;
  readonly wicketkeeperName: string;
  readonly fullSquadSize: number;
  readonly canonicalRoster: readonly string[];
  readonly fullSquadList: readonly string[];
}

export const SUPPORTED_IPL_TEAMS: readonly IPLTeamMeta[] = [
  {
    id: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    primaryColor: '#da1a32',
    homeGround: 'M. Chinnaswamy Stadium, Bengaluru',
    captainName: 'Rajat Patidar',
    wicketkeeperName: 'Phil Salt',
    fullSquadSize: 29,
    canonicalRoster: [
      'Phil Salt',
      'Virat Kohli',
      'Devdutt Padikkal',
      'Rajat Patidar',
      'Tim David',
      'Jitesh Sharma',
      'Romario Shepherd',
      'Jacob Bethell',
      'Swapnil Singh',
      'Bhuvneshwar Kumar',
      'Josh Hazlewood',
    ],
    fullSquadList: [
      'Phil Salt', 'Virat Kohli', 'Devdutt Padikkal', 'Rajat Patidar', 'Tim David',
      'Jordan Cox', 'Jitesh Sharma', 'Romario Shepherd', 'Krunal Pandya', 'Jacob Bethell',
      'Kanishk Chouhan', 'Venkatesh Iyer', 'Swapnil Singh', 'Vihaan Malhotra', 'Mangesh Yadav',
      'Bhuvneshwar Kumar', 'Abhinandan Singh', 'Jacob Duffy', 'Suyash Sharma', 'Rasikh Dar Salam',
      'Nuwan Thushara', 'Satvik Deswal', 'Josh Hazlewood', 'Yash Dayal', 'Vicky Ostwal', 'Richard Gleeson',
    ],
  },
  {
    id: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    primaryColor: '#f26522',
    homeGround: 'Rajiv Gandhi International Cricket Stadium, Hyderabad',
    captainName: 'Pat Cummins',
    wicketkeeperName: 'Heinrich Klaasen',
    fullSquadSize: 28,
    canonicalRoster: [
      'Travis Head',
      'Abhishek Sharma',
      'Ishan Kishan',
      'Heinrich Klaasen',
      'Nitish Kumar Reddy',
      'Liam Livingstone',
      'Brydon Carse',
      'Pat Cummins',
      'Gerald Coetzee',
      'Jaydev Unadkat',
      'Dilshan Madushanka',
    ],
    fullSquadList: [
      'Abhishek Sharma', 'Travis Head', 'Ishan Kishan', 'Heinrich Klaasen', 'Aniket Verma',
      'Salil Arora', 'Smaran Ravichandran', 'Nitish Kumar Reddy', 'Harsh Dubey', 'Shivang Kumar',
      'Liam Livingstone', 'Brydon Carse', 'Kamindu Mendis', 'Harshal Patel', 'Jaydev Unadkat',
      'Eshan Malinga', 'David Payne', 'Sakib Hussain', 'Zeeshan Ansari', 'Shivam Mavi',
      'Amit Kumar', 'Praful Hinge', 'Pat Cummins', 'Krains Fuletra', 'Onkar Tukaram Tarmale',
      'Dilshan Madushanka', 'Gerald Coetzee', 'RS Ambrish',
    ],
  },
  {
    id: 'MI',
    name: 'Mumbai Indians',
    shortName: 'MI',
    primaryColor: '#004ba0',
    homeGround: 'Wankhede Stadium, Mumbai',
    captainName: 'Hardik Pandya',
    wicketkeeperName: 'Ryan Rickelton',
    fullSquadSize: 29,
    canonicalRoster: [
      'Rohit Sharma',
      'Ryan Rickelton',
      'Suryakumar Yadav',
      'Tilak Varma',
      'Hardik Pandya',
      'Will Jacks',
      'Mitchell Santner',
      'Shardul Thakur',
      'Trent Boult',
      'Jasprit Bumrah',
      'Keshav Maharaj',
    ],
    fullSquadList: [
      'Rohit Sharma', 'Ryan Rickelton', 'Suryakumar Yadav', 'Tilak Varma', 'Sherfane Rutherford',
      'Naman Dhir', 'Robin Minz', 'Danish Malewar', 'Quinton de Kock', 'Ruchit Ahir',
      'Hardik Pandya', 'Corbin Bosch', 'Raj Angad Bawa', 'Will Jacks', 'Mitchell Santner',
      'Mayank Rawat', 'Atharva Ankolekar', 'Krish Bhagat', 'Mahipal Lomror', 'Shardul Thakur',
      'Mayank Markande', 'Allah Mohammad Ghazanfar', 'Trent Boult', 'Jasprit Bumrah', 'Ashwani Kumar',
      'Deepak Chahar', 'Raghu Sharma', 'Mohammed Salahuddin Izhar', 'Keshav Maharaj',
    ],
  },
  {
    id: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    primaryColor: '#3a225d',
    homeGround: 'Eden Gardens, Kolkata',
    captainName: 'Ajinkya Rahane',
    wicketkeeperName: 'Finn Allen',
    fullSquadSize: 26,
    canonicalRoster: [
      'Finn Allen',
      'Ajinkya Rahane',
      'Angkrish Raghuvanshi',
      'Rinku Singh',
      'Rovman Powell',
      'Cameron Green',
      'Sunil Narine',
      'Rachin Ravindra',
      'Varun Chakaravarthy',
      'Vaibhav Arora',
      'Matheesha Pathirana',
    ],
    fullSquadList: [
      'Finn Allen', 'Ajinkya Rahane', 'Angkrish Raghuvanshi', 'Rinku Singh', 'Manish Pandey',
      'Tejasvi Dahiya', 'Rovman Powell', 'Rahul Tripathi', 'Sarthak Ranjan', 'Tim Seifert',
      'Luvnith Sisodia', 'Cameron Green', 'Ramandeep Singh', 'Anukul Roy', 'Sunil Narine',
      'Rachin Ravindra', 'Daksh Kamra', 'Varun Chakaravarthy', 'Vaibhav Arora', 'Blessing Muzarabani',
      'Kartik Tyagi', 'Saurabh Dubey', 'Umran Malik', 'Prashant Solanki', 'Matheesha Pathirana', 'Navdeep Saini',
    ],
  },
  {
    id: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    primaryColor: '#ea1a85',
    homeGround: 'Sawai Mansingh Stadium, Jaipur',
    captainName: 'Riyan Parag',
    wicketkeeperName: 'Dhruv Jurel',
    fullSquadSize: 26,
    canonicalRoster: [
      'Yashasvi Jaiswal',
      'Dhruv Jurel',
      'Shimron Hetmyer',
      'Riyan Parag',
      'Ravindra Jadeja',
      'Dasun Shanaka',
      'Jofra Archer',
      'Nandre Burger',
      'Ravi Bishnoi',
      'Tushar Deshpande',
      'Kuldeep Sen',
    ],
    fullSquadList: [
      'Yashasvi Jaiswal', 'Vaibhav Sooryavanshi', 'Dhruv Jurel', 'Shimron Hetmyer', 'Lhuan-dre Pretorius',
      'Donovan Ferreira', 'Ravi Singh', 'Shubham Dubey', 'Aman Rao Perala', 'Riyan Parag',
      'Ravindra Jadeja', 'Dasun Shanaka', 'Jofra Archer', 'Nandre Burger', 'Sandeep Sharma',
      'Ravi Bishnoi', 'Brijesh Sharma', 'Tushar Deshpande', 'Sushant Mishra', 'Vignesh Puthur',
      'Kuldeep Sen', 'Adam Milne', 'Yash Raj Punja', 'Kwena Maphaka', 'Yudhvir Singh Charak', 'Emanjot Singh Chahal',
    ],
  },
  {
    id: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    primaryColor: '#facc15',
    homeGround: 'M. A. Chidambaram Stadium, Chepauk',
    captainName: 'Ruturaj Gaikwad',
    wicketkeeperName: 'Sanju Samson',
    fullSquadSize: 26,
    canonicalRoster: [
      'Ruturaj Gaikwad',
      'Sanju Samson',
      'Sarfaraz Khan',
      'Dewald Brevis',
      'MS Dhoni',
      'Shivam Dube',
      'Jamie Overton',
      'Shreyas Gopal',
      'Noor Ahmad',
      'Matt Henry',
      'Spencer Johnson',
    ],
    fullSquadList: [
      'Sanju Samson', 'Ruturaj Gaikwad', 'Ayush Mhatre', 'Sarfaraz Khan', 'Kartik Sharma',
      'Urvil Patel', 'Dewald Brevis', 'MS Dhoni', 'Matthew Short', 'Shivam Dube',
      'Jamie Overton', 'Anshul Kamboj', 'Prashant Veer', 'Ramakrishna Ghosh', 'Aman Hakim Khan',
      'Zakary Foulkes', 'Shreyas Gopal', 'Macneil Noronha', 'Dian Forrester', 'Noor Ahmad',
      'Matt Henry', 'Syed Khaleel Ahmed', 'Rahul Chahar', 'Gurjapneet Singh', 'Mukesh Choudhary',
      'Akeal Hosein', 'Spencer Johnson', 'Akash Madhwal', 'Kuldip Yadav',
    ],
  },
  {
    id: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    primaryColor: '#dd1f2d',
    homeGround: 'Maharaja Yadavindra Singh Stadium, Mullanpur',
    captainName: 'Shreyas Iyer',
    wicketkeeperName: 'Prabhsimran Singh',
    fullSquadSize: 25,
    canonicalRoster: [
      'Prabhsimran Singh',
      'Shreyas Iyer',
      'Nehal Wadhera',
      'Shashank Singh',
      'Marcus Stoinis',
      'Marco Jansen',
      'Azmatullah Omarzai',
      'Harpreet Brar',
      'Yuzvendra Chahal',
      'Arshdeep Singh',
      'Lockie Ferguson',
    ],
    fullSquadList: [
      'Priyansh Arya', 'Prabhsimran Singh', 'Shreyas Iyer', 'Nehal Wadhera', 'Shashank Singh',
      'Vishnu Vinod', 'Harnoor Pannu', 'Cooper Connolly', 'Marcus Stoinis', 'Marco Jansen',
      'Praveen Dubey', 'Suryansh Shedge', 'Pyla Avinash', 'Azmatullah Omarzai', 'Mitchell Owen',
      'Musheer Khan', 'Xavier Bartlett', 'Vyshak Vijaykumar', 'Arshdeep Singh', 'Yuzvendra Chahal',
      'Harpreet Brar', 'Yash Thakur', 'Ben Dwarshuis', 'Lockie Ferguson', 'Vishal Nishad',
    ],
  },
  {
    id: 'GT',
    name: 'Gujarat Titans',
    shortName: 'GT',
    primaryColor: '#1c2833',
    homeGround: 'Narendra Modi Stadium, Ahmedabad',
    captainName: 'Shubman Gill',
    wicketkeeperName: 'Jos Buttler',
    fullSquadSize: 26,
    canonicalRoster: [
      'Shubman Gill',
      'Sai Sudharsan',
      'Jos Buttler',
      'Shahrukh Khan',
      'Rahul Tewatia',
      'Washington Sundar',
      'Glenn Phillips',
      'Rashid Khan',
      'Kagiso Rabada',
      'Mohammed Siraj',
      'Prasidh Krishna',
    ],
    fullSquadList: [
      'Sai Sudharsan', 'Shubman Gill', 'Jos Buttler', 'Shahrukh Khan', 'Rahul Tewatia',
      'Kumar Kushagra', 'Anuj Rawat', 'Tom Banton', 'Connor Esterhuizen', 'Washington Sundar',
      'Glenn Phillips', 'Jason Holder', 'Manav Suthar', 'Nishant Sindhu', 'Rashid Khan',
      'Kagiso Rabada', 'Ashok Sharma', 'Mohammed Siraj', 'Prasidh Krishna', 'Jayant Yadav',
      'Ishant Sharma', 'Sai Kishore', 'Arshad Khan', 'Gurnoor Singh Brar', 'Luke Wood', 'Kulwant Khejroliya',
    ],
  },
  {
    id: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    primaryColor: '#0057b7',
    homeGround: 'BRSABV Ekana Cricket Stadium, Lucknow',
    captainName: 'Rishabh Pant',
    wicketkeeperName: 'Rishabh Pant',
    fullSquadSize: 26,
    canonicalRoster: [
      'Rishabh Pant',
      'Nicholas Pooran',
      'Ayush Badoni',
      'Mitchell Marsh',
      'Aiden Markram',
      'Wanindu Hasaranga',
      'Arshin Kulkarni',
      'Mohammed Shami',
      'Anrich Nortje',
      'Avesh Khan',
      'Mayank Yadav',
    ],
    fullSquadList: [
      'Rishabh Pant', 'Nicholas Pooran', 'Ayush Badoni', 'Mukul Choudhary', 'Himmat Singh',
      'Akshat Raghuwanshi', 'Josh Inglis', 'Matthew Breetzke', 'Mitchell Marsh', 'Aiden Markram',
      'Abdul Samad', 'Shahbaz Ahamad', 'Arshin Kulkarni', 'Wanindu Hasaranga', 'Arjun Tendulkar',
      'George Linde', 'Mohsin Khan', 'Mohammad Shami', 'Anrich Nortje', 'Prince Yadav',
      'Digvesh Singh Rathi', 'Avesh Khan', 'Mayank Yadav', 'Akash Singh', 'M. Siddharth', 'Naman Tiwari',
    ],
  },
  {
    id: 'DC',
    name: 'Delhi Capitals',
    shortName: 'DC',
    primaryColor: '#004c97',
    homeGround: 'Arun Jaitley Stadium, Delhi',
    captainName: 'Axar Patel',
    wicketkeeperName: 'KL Rahul',
    fullSquadSize: 26,
    canonicalRoster: [
      'KL Rahul',
      'Pathum Nissanka',
      'Prithvi Shaw',
      'Tristan Stubbs',
      'David Miller',
      'Ashutosh Sharma',
      'Abishek Porel',
      'Axar Patel',
      'Kuldeep Yadav',
      'Mitchell Starc',
      'Mukesh Kumar',
    ],
    fullSquadList: [
      'KL Rahul', 'Pathum Nissanka', 'Nitish Rana', 'Sameer Rizvi', 'Tristan Stubbs',
      'David Miller', 'Ashutosh Sharma', 'Karun Nair', 'Abishek Porel', 'Prithvi Shaw',
      'Sahil Parakh', 'Ben Duckett', 'Axar Patel', 'Vipraj Nigam', 'Auqib Nabi Dar',
      'Ajay Mandal', 'Madhav Tiwari', 'Tripurana Vijay', 'Rehan Ahmed', 'Lungisani Ngidi',
      'Kuldeep Yadav', 'T. Natarajan', 'Mukesh Kumar', 'Dushmantha Chameera', 'Mitchell Starc', 'Kyle Jamieson',
    ],
  },
];

export type SupportedIPLTeamId = (typeof SUPPORTED_IPL_TEAMS)[number]['id'];

/**
 * Builds an authentic, role-balanced 11-player IPL Franchise Lineup from 2026 squads.
 */
export function buildIPLLineup(
  teamId: string,
  allPlayers: PlayerProfile[],
  _format: MatchFormat = 'T20',
): { lineup: FormattedSquadSlot[]; teamName: string } {
  const meta = SUPPORTED_IPL_TEAMS.find((t) => t.id === teamId) || SUPPORTED_IPL_TEAMS[0];

  // Map each player name in the canonical roster to the best matching player profile
  const chosenProfiles: PlayerProfile[] = [];
  const chosenIds = new Set<string>();

  for (const name of meta.canonicalRoster) {
    const cleanQuery = name.toLowerCase().replace(/domestic/g, '').trim();
    // 1. Direct or partial full name match
    let matched = allPlayers.find((p) => {
      const pName = p.fullName.toLowerCase();
      const pDisplay = p.displayName.toLowerCase();
      return pName.includes(cleanQuery) || pDisplay.includes(cleanQuery);
    });

    // 2. Fallback word match if not found
    if (!matched) {
      const words = cleanQuery.split(' ').filter((w) => w.length > 2);
      matched = allPlayers.find((p) => {
        const pName = p.fullName.toLowerCase();
        return words.every((w) => pName.includes(w));
      });
    }

    if (matched && !chosenIds.has(matched.id)) {
      chosenIds.add(matched.id);
      chosenProfiles.push(matched);
    }
  }

  // Backfill if any edge cases resulted in < 11
  if (chosenProfiles.length < 11) {
    for (const p of allPlayers) {
      if (!chosenIds.has(p.id)) {
        chosenIds.add(p.id);
        chosenProfiles.push(p);
        if (chosenProfiles.length === 11) break;
      }
    }
  }

  const lineup: FormattedSquadSlot[] = chosenProfiles.slice(0, 11).map((p, idx) => {
    const isWk =
      p.fullName.toLowerCase().includes(meta.wicketkeeperName.toLowerCase()) ||
      p.displayName.toLowerCase().includes(meta.wicketkeeperName.toLowerCase()) ||
      (idx === 0 && (p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER'));

    const isCapt =
      p.fullName.toLowerCase().includes(meta.captainName.toLowerCase()) ||
      p.displayName.toLowerCase().includes(meta.captainName.toLowerCase()) ||
      idx === 3;

    let bowlingPriority: number | null = null;
    if (idx >= 6) {
      // Bottom 5 slots are primary & secondary bowling options
      bowlingPriority = (idx - 5) as 1 | 2 | 3 | 4 | 5;
    } else if (
      p.primaryRole === 'BOWLING_ALL_ROUNDER' ||
      p.primaryRole === 'BATTING_ALL_ROUNDER'
    ) {
      bowlingPriority = 4;
    }

    return {
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: isCapt,
      isViceCaptain: idx === 1,
      isDesignatedWicketkeeper: isWk,
      bowlingPriority,
    };
  });

  return {
    lineup,
    teamName: meta.name,
  };
}

/**
 * Constructs an authentic, role-balanced 11-player National Playing XI
 * strictly containing cricketers from the chosen nation.
 */
export function buildNationalLineup(
  nation: string,
  allPlayers: PlayerProfile[],
  format: MatchFormat = 'T20',
): { lineup: FormattedSquadSlot[]; teamName: string } {
  const pool = allPlayers.filter(
    (p) => p.primaryNationality.toLowerCase() === nation.toLowerCase(),
  );

  const getRating = (p: PlayerProfile) => p.ratings[format]?.overallRating ?? 75;
  const getBatting = (p: PlayerProfile) => p.ratings[format]?.battingRating ?? 50;
  const getBowling = (p: PlayerProfile) => p.ratings[format]?.bowlingRating ?? 50;

  // 1. Wicketkeeper
  const keepers = pool
    .filter((p) => p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER')
    .sort((a, b) => getRating(b) - getRating(a));
  const wk = keepers[0] || pool.find((p) => p.isWicketkeeper) || pool[0];

  const selectedIds = new Set<string>([wk.id]);
  const selected: PlayerProfile[] = [wk];

  const pick = (candidates: PlayerProfile[], count: number) => {
    let picked = 0;
    for (const c of candidates) {
      if (picked >= count) break;
      if (!selectedIds.has(c.id)) {
        selectedIds.add(c.id);
        selected.push(c);
        picked++;
      }
    }
  };

  // 2. Pacers (aim for 3)
  const pacers = pool
    .filter((p) => p.primaryRole === 'PACE_BOWLER' || p.bowlingStyle.includes('FAST') || p.bowlingStyle.includes('MEDIUM'))
    .sort((a, b) => getBowling(b) - getBowling(a));
  pick(pacers, 3);

  // 3. Spinners (aim for 2)
  const spinners = pool
    .filter((p) => p.primaryRole === 'SPIN_BOWLER' || p.bowlingStyle.includes('BREAK') || p.bowlingStyle.includes('ORTHODOX'))
    .sort((a, b) => getBowling(b) - getBowling(a));
  pick(spinners, 2);

  // 4. All-Rounders (aim for 2)
  const allRounders = pool
    .filter((p) => p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER')
    .sort((a, b) => getRating(b) - getRating(a));
  pick(allRounders, 2);

  // 5. Specialist Batters
  const batters = pool
    .filter((p) => p.primaryRole === 'TOP_ORDER_BATTER' || p.primaryRole === 'MIDDLE_ORDER_BATTER')
    .sort((a, b) => getBatting(b) - getBatting(a));
  pick(batters, 11 - selected.length);

  // Backfill if needed
  const remaining = [...pool].sort((a, b) => getRating(b) - getRating(a));
  pick(remaining, 11 - selected.length);

  // Order batting lineup logically: Batters 1-5, Keeper 6-7, All-rounders 7-8, Bowlers 9-11
  const sortedLineup = [
    ...selected.filter((p) => p.primaryRole.includes('BATTER') && !p.isWicketkeeper).slice(0, 5),
    ...selected.filter((p) => p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER').slice(0, 1),
    ...selected.filter((p) => p.primaryRole.includes('ALL_ROUNDER')).slice(0, 2),
    ...selected.filter((p) => p.primaryRole.includes('BOWLER')).slice(0, 3),
  ];

  // Backfill any leftovers into sorted
  for (const s of selected) {
    if (!sortedLineup.includes(s)) sortedLineup.push(s);
  }

  const lineup: FormattedSquadSlot[] = sortedLineup.slice(0, 11).map((p, idx) => ({
    playerId: p.id,
    battingOrder: idx + 1,
    isCaptain: idx === 2,
    isViceCaptain: idx === 1,
    isDesignatedWicketkeeper: p.id === wk.id,
    bowlingPriority: idx >= 6 ? (idx - 5) : null,
  }));

  return {
    lineup,
    teamName: `${nation} All-Time XI`,
  };
}

/**
 * Constructs an authentic World XI where every single cricketer
 * comes from a distinct sovereign nation (Enforcing 1 Player / Nation Rule).
 */
export function buildWorldXILineup(
  allPlayers: PlayerProfile[],
  format: MatchFormat = 'T20',
): { lineup: FormattedSquadSlot[]; teamName: string; nationsUsed: string[] } {
  const getRating = (p: PlayerProfile) => p.ratings[format]?.overallRating ?? 75;

  const usedNations = new Set<string>();
  const chosen: PlayerProfile[] = [];

  const pickFromNation = (nation: string, predicate: (p: PlayerProfile) => boolean): boolean => {
    if (usedNations.has(nation.toLowerCase())) return false;
    const candidates = allPlayers
      .filter((p) => p.primaryNationality.toLowerCase() === nation.toLowerCase() && predicate(p))
      .sort((a, b) => getRating(b) - getRating(a));

    if (candidates.length > 0) {
      usedNations.add(nation.toLowerCase());
      chosen.push(candidates[0]);
      return true;
    }
    return false;
  };

  // 1. Wicketkeeper (e.g. Australia Gilchrist or India Dhoni or SA De Kock)
  pickFromNation('Australia', (p) => p.isWicketkeeper || p.primaryRole.includes('WICKETKEEPER'));

  // 2. Batters from powerhouse nations
  pickFromNation('India', (p) => p.primaryRole.includes('BATTER'));
  pickFromNation('West Indies', (p) => p.primaryRole.includes('BATTER'));
  pickFromNation('South Africa', (p) => p.primaryRole.includes('BATTER'));
  pickFromNation('New Zealand', (p) => p.primaryRole.includes('BATTER'));

  // 3. All-Rounders
  pickFromNation('England', (p) => p.primaryRole.includes('ALL_ROUNDER'));
  pickFromNation('Afghanistan', (p) => p.primaryRole.includes('ALL_ROUNDER') || p.primaryRole.includes('BOWLER'));

  // 4. Bowlers
  pickFromNation('Pakistan', (p) => p.primaryRole.includes('BOWLER'));
  pickFromNation('Sri Lanka', (p) => p.primaryRole.includes('BOWLER'));
  pickFromNation('Bangladesh', (p) => p.primaryRole.includes('BOWLER') || p.primaryRole.includes('ALL_ROUNDER'));
  pickFromNation('Zimbabwe', (p) => true);

  // If any nation failed, backfill with distinct nations
  if (chosen.length < 11) {
    const fallbackNations = ['Ireland', 'Netherlands', 'Scotland', 'Namibia', 'United States', 'Nepal'];
    for (const fn of fallbackNations) {
      if (chosen.length >= 11) break;
      pickFromNation(fn, () => true);
    }
  }

  const lineup: FormattedSquadSlot[] = chosen.slice(0, 11).map((p, idx) => ({
    playerId: p.id,
    battingOrder: idx + 1,
    isCaptain: idx === 1,
    isViceCaptain: idx === 0,
    isDesignatedWicketkeeper: idx === 0,
    bowlingPriority: idx >= 6 ? (idx - 5) : null,
  }));

  return {
    lineup,
    teamName: 'World XI (1 Per Nation)',
    nationsUsed: Array.from(usedNations),
  };
}
