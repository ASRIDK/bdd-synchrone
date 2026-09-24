// Text normalisation shared by indexing and search, so a question and a transcript are
// tokenised the same way. Handles English and French, accents, ticket numbers and acronyms.
import type { GlossaryEntry } from "./types";

const STOPWORDS = new Set(
  (
    // English
    "a an and are as at be been but by can could did do does doing for from had has have how i if in into is it its " +
    "just let me my no not now of on once or our out over so than that the their them then there these they this " +
    "those to too up us was we were what when where which while who whom why will with would you your yes ok okay " +
    "about after again all also am any because before being both each few further here more most much must nor only " +
    "other own same she he her him his should some such very should've thing things say said tell told know per via " +
    // French
    "au aux avec ce ces c est dans de des du elle en et eux il ils je la le les leur lui ma mais me meme mes moi mon " +
    "ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous " +
    "ete etre avoir fait faire alors donc oui non ca cette cet ici tout tous toute toutes plus moins tres bien " +
    "a l d j n s t y"
  ).split(" "),
);

// Words that shape a question but carry no topic: ignored when checking whether the archive
// knows the topic of a question at all.
const QUESTION_WORDS = new Set(
  (
    "which what whats who whose when where why how many much does did do is are was were will would should could can " +
    "tell explain summarise summarize everything anything something know learned learn happen happened happens " +
    "decide decided decision current currently now today still latest new mission team use used using " +
    "quel quelle quels quelles quand comment pourquoi combien"
  ).split(" "),
);

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Light suffix stripping, applied identically to questions and transcripts, so that
// "caused"/"cause", "switches"/"switch", "installed"/"install" meet on the same token.
function stem(token: string): string {
  if (/\d/.test(token) || token.length <= 3) return token;
  let t = token;
  if (t.endsWith("ies") && t.length > 4) t = t.slice(0, -3) + "y";
  else if (t.endsWith("sses")) t = t.slice(0, -2);
  else if (t.endsWith("ches") || t.endsWith("shes") || t.endsWith("xes")) t = t.slice(0, -2);
  else if (t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us")) t = t.slice(0, -1);
  else if (t.endsWith("x") && t.length > 4) t = t.slice(0, -1);
  if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
  if (t.endsWith("e") && t.length > 4) t = t.slice(0, -1);
  return t;
}

// "TR4821" and "TR-4821" both become "tr 4821"; "RT1" becomes "rt 1".
function splitLettersDigits(text: string): string {
  return text.replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2");
}

export type Canonicalizer = (text: string) => string;

// Replaces known mis-hearings and variants by the glossary term, on both sides of the search.
// "trust store" and "truststore" become the same token.
export function makeCanonicalizer(glossary: GlossaryEntry[]): Canonicalizer {
  const rules: Array<[RegExp, string]> = [];
  for (const entry of glossary) {
    const target = normalize(entry.term).replace(/[^a-z0-9]+/g, "");
    for (const alias of [entry.term, ...entry.aliases, ...(entry.misheard ?? [])]) {
      const pattern = normalize(alias)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^a-z0-9]*");
      if (pattern) rules.push([new RegExp(`\\b${pattern}\\b`, "g"), ` ${target} `]);
    }
  }
  return (text: string) => {
    let out = normalize(text);
    for (const [re, target] of rules) out = out.replace(re, target);
    return out;
  };
}

export function tokenize(text: string, canon?: Canonicalizer): string[] {
  const base = splitLettersDigits(canon ? canon(text) : normalize(text));
  return base
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
}

const QUESTION_STEMS = new Set([...QUESTION_WORDS].map(stem));

export function topicTokens(text: string, canon?: Canonicalizer): string[] {
  return tokenize(text, canon).filter((t) => (t.length >= 3 || /\d/.test(t)) && !QUESTION_WORDS.has(t) && !QUESTION_STEMS.has(t));
}

// Whisper sometimes returns a long run-on segment without punctuation. For display, keep a
// window of words around the decision cue; the full text stays in the index and transcript.
const CUE = /\b(the decision is|decision|decided|agreed|we go with|from today|from now on|the rule is|we replace|replaces|we reduce|we keep|we change|a partir de maintenant|on change)\b/;
export function excerpt(text: string, maxWords = 24): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords + 6) return text;
  let cueWord = 0;
  let chars = 0;
  const m = CUE.exec(normalize(text));
  if (m) {
    for (let i = 0; i < words.length; i++) {
      if (chars >= m.index) {
        cueWord = i;
        break;
      }
      chars += words[i].length + 1;
    }
  }
  const start = Math.max(0, cueWord - 3);
  const end = Math.min(words.length, start + maxWords);
  return `${start > 0 ? "... " : ""}${words.slice(start, end).join(" ")}${end < words.length ? " ..." : ""}`;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
