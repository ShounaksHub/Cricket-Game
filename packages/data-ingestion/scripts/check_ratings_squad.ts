import { VERIFIED_BENCHMARK_PLAYERS, ingestPlayerRecord } from '../src';

const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
for (const p of all) {
    if (['Ben Stokes', 'Jacques Kallis', 'Garfield Sobers', 'Ravindra Jadeja', 'Wasim Akram', 'Shane Warne', 'Jasprit Bumrah', 'Rohit Sharma'].includes(p.fullName)) {
        console.log(`${p.fullName}: T20 bowl=${p.ratings.T20.bowlingRating}, bat=${p.ratings.T20.battingRating}`);
    }
}
