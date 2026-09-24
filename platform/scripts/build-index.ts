// Builds data/index/index.json from the recording registry and the Whisper transcripts.
//   npm run index            build the index
//   npm run index -- --debug also print every same-mission decision pair with its topic score
import { buildIndex } from "../lib/engine/indexer";

buildIndex({ debug: process.argv.includes("--debug"), log: (line) => console.log(line) });
