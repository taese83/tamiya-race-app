const VENUE_COLOR_PALETTE = [
  '#1565c0', '#2e7d32', '#e65100', '#6a1b9a',
  '#ad1457', '#00695c', '#4527a0', '#546e7a',
]

/**
 * venues 배열 순서대로 팔레트 배정
 */
export function getVenueColors(venues: string[]): Map<string, string> {
  const map = new Map<string, string>()
  venues.forEach((venue, i) => {
    map.set(venue, VENUE_COLOR_PALETTE[i % VENUE_COLOR_PALETTE.length])
  })
  return map
}
