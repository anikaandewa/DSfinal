import { MachineConfig, send, Action, assign } from "xstate";
import { LEMMAS } from "./wordbank"
import { LEGAL } from "./wordbank"

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

let listOfUsedWords: string[] = []

const findWord = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  listOfUsedWords.push(u)
  console.log(listOfUsedWords)
  let psi = u.substr(u.length - 1) // the last letter of the word provided by user
  let siupsiup = LEMMAS.filter((k) => k[0] === psi) // retrieves words from lemmas that start with the letter in psi
  const randIndex = Math.floor(Math.random() * siupsiup.length); // gives a random index among the retrieved words
  const word = siupsiup[randIndex];
  let unusedWords = LEMMAS.filter(word => !listOfUsedWords.includes(word))
  if (listOfUsedWords.includes(word))
  {
    if (!((unusedWords.filter(word => word.startsWith(psi))).length === 0)) {
    let word1 = unusedWords[Math.floor(Math.random() * unusedWords.length)]
    listOfUsedWords.push(word1)
    return [word1, (listOfUsedWords.length/2)]
  }
  return "My mind draws a blank. Victory is yours this day, mortal."
}
  else {
    listOfUsedWords.push(word)
    return [word, (listOfUsedWords.length/2)]
  }
};

const findErrors = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  console.log(listOfUsedWords)
  if (listOfUsedWords.length > 0) {
    let lastWord = listOfUsedWords[listOfUsedWords.length - 1];
  let lastLetter = lastWord[lastWord.length - 1];
  let firstLetter = u[0];
  if (!LEGAL.includes(u)) { 
    return ["not legal", (listOfUsedWords.length/2)];
  } 
  else if (firstLetter !== lastLetter) {
    return ["no match", (listOfUsedWords.length/2)];
  }
else {
  return false
}
  }
  if (!LEGAL.includes(u)) {
    return ["not legal", (listOfUsedWords.length/2)];
  }
else {
  return false
}
};

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        CLICK: "init",
      },
    },
    init: {
      on: {
        TTS_READY: "welcome",
        CLICK: "welcome",
      },
    },
    welcome: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "giveword",
            cond: (context) => findErrors(context, "title") === false,
            actions: assign({
              title: (context) => findWord(context, "title"),
            }),
          },
          {
            target: "endgame_nomatch_start",
            cond: (context) => findErrors(context, "title")[0] === "no match",
          },
          {
            target: "endgame_illegal_start",
            cond: (context) => findErrors(context, "title")[0] === "not legal",
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Welcome to the game of enchanted word chains, young mortal. You shall now spill the first word!"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    giveword: {
      id: "giveword",
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "giveword2",
            cond: (context) => findErrors(context, "title") === false,
            actions: assign({
              title: (context) => findWord(context, "title"),
            }),
          },
          {
            target: "endgame_nomatch",
            cond: (context) => findErrors(context, "title")[0] === "no match",
          },
          {
            target: "endgame_illegal",
            cond: (context) => findErrors(context, "title")[0] === "not legal",
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "#outOfTime",
      },
      states: {
        outOfTime: {
          id: "outOfTime",
          entry: send((context) => ({
              type: "SPEAK",
              value: `Tick-tock, your time has run out! You lose, my dear. Your pitiful score is ${context.title[1]}.`,
            })),
            },
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `${context.title[0]}`,
          })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    giveword2: {
      id: "giveword",
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "giveword",
            cond: (context) => findErrors(context, "title") === false,
            actions: assign({
              title: (context) => findWord(context, "title"),
            }),
          },
          {
            target: "endgame_nomatch",
            cond: (context) => findErrors(context, "title")[0] === "no match",
          },
          {
            target: "endgame_illegal",
            cond: (context) => findErrors(context, "title")[0] === "not legal",
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "#outOfTime",
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `${context.title[0]}`,
          })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    endgame_nomatch: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your feeble attempt didn't match my word. You lose, and your score shall be ${context.title[1]}`,
      })),
    },
    endgame_illegal: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Ha! Your puny word does not match my vast knowledge of the arcane lexicon. You lose, fool! Your score is ${context.title[1]}`,
      })),
    },
    endgame_nomatch_start: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your feeble attempt didn't match my word. You lose, and your score shall be 0`,
      })),
    },
    endgame_illegal_start: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Ha! Your puny word does not match my vast knowledge of the arcane lexicon. You lose, fool! Your score is 0`,
      })),
    },
  },
};
