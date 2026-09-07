// Shared content for Make the Cut. The bomb UI adapter is not connected yet.
import {hash} from './daily.mjs?v=4';
export const BOMB_THEMES=[
 {id:'food',label:'food',villain:'Baron Von Biscuit',words:[['EGG','HAM'],['PEAR','CAKE'],['BREAD','PASTA'],['CARROT','BANANA'],['BISCUIT','SAUSAGE'],['SANDWICH','MEATBALL']]},
 {id:'animals',label:'animals',villain:'Professor Pawprint',words:[['CAT','DOG'],['BEAR','LION'],['OTTER','TIGER'],['RABBIT','MONKEY'],['DOLPHIN','GIRAFFE'],['ELEPHANT','ANTELOPE']]},
 {id:'garden',label:'gardens',villain:'Count Compost',words:[['IVY','ELM'],['ROSE','FERN'],['TULIP','SPADE'],['FLOWER','SHOVEL'],['COMPOST','SEEDBED'],['DAFFODIL','BLUEBELL']]},
 {id:'music',label:'music',villain:'Maestro Mayhem',words:[['POP','RAP'],['JAZZ','SONG'],['FLUTE','PIANO'],['GUITAR','RHYTHM'],['TRUMPET','PICCOLO'],['TROMBONE','CLARINET']]},
 {id:'travel',label:'travel',villain:'Captain Detour',words:[['CAR','BUS'],['TAXI','ROAD'],['TRAIN','PLANE'],['TICKET','VOYAGE'],['AIRPORT','JOURNEY'],['PASSPORT','SUITCASE']]},
 {id:'sea',label:'the sea',villain:'Admiral Ink',words:[['COD','EEL'],['CRAB','SURF'],['CORAL','SHARK'],['OYSTER','SALMON'],['DOLPHIN','OCTOPUS'],['SEAHORSE','STARFISH']]},
 {id:'weather',label:'weather',villain:'Doctor Drizzle',words:[['SUN','FOG'],['RAIN','HAIL'],['CLOUD','STORM'],['BREEZE','SHOWER'],['THUNDER','CYCLONE'],['SUNSHINE','BLIZZARD']]},
 {id:'colours',label:'colours',villain:'The Purple Menace',words:[['RED','TAN'],['BLUE','PINK'],['GREEN','WHITE'],['YELLOW','ORANGE'],['CRIMSON','SCARLET'],['LAVENDER','BURGUNDY']]}
];
export function themedBomb(day,dictionary){
 const ordinal=Math.floor(Date.parse(`${day}T12:00:00Z`)/86400000),theme=BOMB_THEMES[((ordinal%8)+8)%8],variant=Math.floor(ordinal/8)%64;
 const words=theme.words.map((pair,i)=>pair[(variant>>i)&1]);
 if(words.some((w,i)=>w.length!==i+3||dictionary&&!dictionary.has(w)))throw new Error('Theme requires six validated words of lengths 3–8.');
 return {schemaVersion:1,gameId:'make-the-cut',day,themeId:theme.id,villain:theme.villain,briefing:`Greetings, Agent. ${theme.villain} planted this bomb. Our intel reveals an obsession with ${theme.label}. All six codes relate to ${theme.label}.`,words,seed:hash(`bomb:${day}`)};
}
