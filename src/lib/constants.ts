export const TOURNAMENT_NAME = 'High Country Classic'
export const COURSE_NAME = 'Apple Mountain Golf Resort'
export const COURSE_LOCATION = 'Camino, CA'
export const CURRENT_YEAR = new Date().getFullYear()
export const PAR = 70

export const PAR3_HOLES = [
  { number: 2, name: 'Strike It Rich', yards: '78–154' },
  { number: 4, name: "Cockeye's Cabin", yards: '109–170' },
  { number: 7, name: 'Dogwood Lane', yards: '122–200' },
  { number: 13, name: 'Hope', yards: '115–190' },
  { number: 15, name: 'Whiskey Bowl', yards: '70–122' },
  { number: 17, name: 'Crystal View', yards: '85–169' },
]

export const ALL_HOLES = Array.from({ length: 18 }, (_, i) => i + 1)
