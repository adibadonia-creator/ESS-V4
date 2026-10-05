import data from "./physical.json";
const GOOD_INDEX = new Map(data.goods.map(g=>[g.id,g]));
export const nutrition=(good:string)=>GOOD_INDEX.get(good)?.nutrition ?? 0;
