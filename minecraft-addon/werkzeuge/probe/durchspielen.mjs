// Den ganzen Weg am Tiegel durchspielen: einlegen, schmelzen, warten,
// herausnehmen - und am Ende abbauen, waehrend noch etwas drinliegt.
import { gemerkt, system } from "@minecraft/server";
import { letztesFenster, setzeAntwort } from "@minecraft/server-ui";
await import("./main.js");

const TIEGEL = "fynn:schmelztiegel";
const ort = { x: 10, y: 70, z: -5 };
let glueht = false;
const gefallen = [];

const dimension = {
  id: "minecraft:overworld",
  getBlock: () => block,
  spawnItem: (s) => gefallen.push(`${s.amount} x ${s.typeId}`),
  playSound: () => {},
};
const block = {
  typeId: TIEGEL, location: ort, dimension,
  center: () => ort,
  permutation: { getState: (n) => (n === "fynn:brennt" ? glueht : undefined),
                 getAllStates: () => ({ "fynn:brennt": glueht }) },
  setPermutation: () => {},
  above: () => null, below: () => null,
};

// Ein Spieler mit Gold und Silber im Gepaeck.
const faecher = [
  { typeId: "minecraft:gold_ingot", amount: 3 },
  { typeId: "fynn:silberbarren", amount: 5 },
];
const kiste = {
  size: 36,
  getItem: (i) => faecher[i] ? { ...faecher[i], clone() { return { ...this }; } } : undefined,
  setItem: (i, s) => { if (s === undefined) faecher[i] = null; else faecher[i] = { typeId: s.typeId, amount: s.amount }; },
  addItem: (s) => { faecher.push({ typeId: s.typeId, amount: s.amount }); return undefined; },
};
const spieler = {
  name: "Fynn", location: ort, dimension,
  getComponent: (n) => (n === "minecraft:inventory" ? { container: kiste } : undefined),
  getGameMode: () => "survival",
  sendMessage: (t) => console.log("   Nachricht:", t.replace(/§./g, "")),
};

const antippen = gemerkt.ereignisse["playerInteractWithBlock"];
const abbauen = gemerkt.ereignisse["playerBreakBlock"];

function zeige(ueberschrift) {
  console.log("\n--- " + ueberschrift + " ---");
  console.log(letztesFenster.text.replace(/§./g, ""));
  letztesFenster.knoepfe.forEach((k, i) =>
    console.log(`   [${i}] ` + k.beschriftung.replace(/§./g, "").replace(/\n/g, " | ")));
}

// Einen Knopf waehlen, dessen Beschriftung passt.
const durchatmen = () => new Promise((r) => setImmediate(r));

async function tippe(suche) {
  let gewaehlt = -1;
  setzeAntwort((f) => {
    gewaehlt = f.knoepfe.findIndex((k) => k.beschriftung.includes(suche));
    if (gewaehlt < 0) return { canceled: true, cancelationReason: "UserClosed" };
    return { canceled: false, selection: gewaehlt };
  });
  for (const f of antippen) f({ block, player: spieler });
  await durchatmen();
  return gewaehlt;
}

async function aufmachen() {
  setzeAntwort(() => ({ canceled: true, cancelationReason: "UserClosed" }));
  for (const f of antippen) f({ block, player: spieler });
  await durchatmen();
}

await aufmachen();
zeige("Tiegel, kalt und leer");

console.log("\n>>> zweimal Gold, zweimal Silber einlegen");
await tippe("Gold einlegen"); await tippe("Gold einlegen");
await tippe("Silber einlegen"); await tippe("Silber einlegen");
await aufmachen();
zeige("nach dem Einlegen");
console.log("   Gepaeck:", JSON.stringify(faecher.filter(Boolean)));

console.log("\n>>> Schmelzen versuchen, solange er kalt ist");
await tippe("Elektrum schmelzen");

console.log("\n>>> Feuer an, dann schmelzen");
glueht = true;
await tippe("Elektrum schmelzen");
await aufmachen();
zeige("waehrend es schmilzt");

console.log("\n>>> fuenf Sekunden weiter");
system.currentTick += 100;
await aufmachen();
zeige("fertig");

console.log("\n>>> herausnehmen");
await tippe("Herausnehmen");
console.log("   Gepaeck:", JSON.stringify(faecher.filter(Boolean)));

console.log("\n>>> noch ein Gold einlegen, dann den Tiegel abbauen");
await tippe("Gold einlegen");
for (const f of abbauen) f({ block, dimension, brokenBlockPermutation: { type: { id: TIEGEL } } });
console.log("   herausgefallen:", gefallen);
