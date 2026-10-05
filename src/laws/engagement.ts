import {math} from "../kernel/numerics";
export const contestProbability=(a:number,b:number)=>a+b===0?0:a*a/(a*a+b*b);
export const injuryProbability=(opposingFraction:number,loser:boolean,protection:number,duration:number)=>-math.expm1(-.5*opposingFraction*(loser?1.5:1)*duration/.04/(1+.5*protection));
