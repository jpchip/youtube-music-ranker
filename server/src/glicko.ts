import Glicko2 from "glicko2";

const { Glicko2: Glicko2System } = Glicko2;

interface RatingData {
  rating: number;
  rd: number;
  vol: number;
}

interface UpdatedRatings {
  player1: RatingData;
  player2: RatingData;
}

/**
 * Processes a single match between two players and returns updated ratings.
 * outcome: 1 = player1 wins, 0 = player2 wins, 0.5 = draw
 */
export function processMatch(
  p1: RatingData,
  p2: RatingData,
  outcome: number
): UpdatedRatings {
  const ranking = new Glicko2System({
    tau: 0.5,
    rating: 1500,
    rd: 200,
    vol: 0.06,
  });

  const player1 = ranking.makePlayer(p1.rating, p1.rd, p1.vol);
  const player2 = ranking.makePlayer(p2.rating, p2.rd, p2.vol);

  ranking.updateRatings([[player1, player2, outcome]]);

  return {
    player1: {
      rating: player1.getRating(),
      rd: player1.getRd(),
      vol: player1.getVol(),
    },
    player2: {
      rating: player2.getRating(),
      rd: player2.getRd(),
      vol: player2.getVol(),
    },
  };
}
