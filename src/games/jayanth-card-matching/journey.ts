const sectionStages: Record<number, readonly number[]> = {
  5: [1,1,2,3,3,4,4,5,5,5],
  6: [1,1,2,3,3,4,4,5,5,6],
  10: [1,2,3,4,5,6,7,8,9,10],
}
const names: Record<number, readonly string[]> = {
  5: ['Our neighbourhood','The park','Marina Bay Sands','Gardens by the Bay','The bay and Singapore Flyer'],
  6: ['Our neighbourhood','The park','Marina Bay Sands','Gardens by the Bay','Singapore Flyer','The waterfront'],
  10: ['Our neighbourhood','HDB windows','The park','Marina Bay Sands towers','The SkyPark','Supertree trunks','Supertree gardens','Singapore Flyer','Flyer cabins','The waterfront'],
}
export function journeyProgress(matches: number, sessionLength = 0) {
  const total = sessionLength === 5 || sessionLength === 10 ? sessionLength : 6
  const stage = matches > 0 ? (matches - 1) % total + 1 : 0
  return { total, stage, sections: sectionStages[total], name: stage ? names[total][stage - 1] : 'A new journey awaits' }
}
export function illuminatedLandmarks(matches: number): number { return journeyProgress(matches).stage }
