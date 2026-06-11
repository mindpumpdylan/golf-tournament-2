export const TOURNAMENT_NAME = 'High Country Classic'
export const COURSE_NAME = 'Apple Mountain Golf Resort'
export const COURSE_LOCATION = 'Camino, CA'
export const CURRENT_YEAR = new Date().getFullYear()
export const PAR = 70

export const HOLES = [
  { number: 1,  name: 'GoldSeeker',      par: 4, handicap: 5,  yards: '331–418' },
  { number: 2,  name: 'Strike It Rich',  par: 3, handicap: 17, yards: '78–154'  },
  { number: 3,  name: 'Fade Away',       par: 4, handicap: 7,  yards: '278–382' },
  { number: 4,  name: "Cockeye's Cabin", par: 3, handicap: 15, yards: '109–170' },
  { number: 5,  name: 'Eternity',        par: 5, handicap: 3,  yards: '413–571' },
  { number: 6,  name: 'On the Rocks',    par: 4, handicap: 1,  yards: '345–449' },
  { number: 7,  name: 'Dogwood Lane',    par: 3, handicap: 11, yards: '122–200' },
  { number: 8,  name: 'Ante Up',         par: 4, handicap: 13, yards: '299–356' },
  { number: 9,  name: 'Pony Express',    par: 5, handicap: 9,  yards: '423–552' },
  { number: 10, name: 'Motherlode',      par: 4, handicap: 12, yards: '214–330' },
  { number: 11, name: "Dealer's Choice", par: 4, handicap: 4,  yards: '273–378' },
  { number: 12, name: 'Double Down',     par: 4, handicap: 2,  yards: '303–418' },
  { number: 13, name: 'Hope',            par: 3, handicap: 10, yards: '115–190' },
  { number: 14, name: 'Up and Away',     par: 4, handicap: 14, yards: '240–340' },
  { number: 15, name: 'Whiskey Bowl',    par: 3, handicap: 18, yards: '70–122'  },
  { number: 16, name: 'Mine Shaft',      par: 5, handicap: 8,  yards: '371–508' },
  { number: 17, name: 'Crystal View',    par: 3, handicap: 16, yards: '85–169'  },
  { number: 18, name: 'Gamble Creek',    par: 5, handicap: 6,  yards: '362–495' },
]

export const ALL_HOLES = HOLES.map(h => h.number)
