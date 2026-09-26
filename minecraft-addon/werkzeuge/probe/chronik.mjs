// Die Chronik der Bosse, durchgeblaettert - ohne Spiel.
import { letztesFenster, setzeAntwort } from "@minecraft/server-ui";
const c = await import("./chronik.js");
const k = await import("./boss_kern.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function spieler() {
    const eig = new Map();
    return { id: "s", getDynamicProperty: (n) => eig.get(n), setDynamicProperty: (n, v) => eig.set(n, v) };
}

const s = spieler();
pruefe("drei Bosse, jeder mit Ei als Bild", c.BOSSE.length === 3 && c.BOSSE.every((b) => b.bild.startsWith("textures/items/")));
pruefe("noch nichts besiegt", k.siegeVon(s, "fynn:roland") === 0);
k.merkeSiege([s], "fynn:roland");
k.merkeSiege([s], "fynn:roland");
k.merkeSiege([s], "fynn:frostmammut");
pruefe("zwei Siege ueber Roland, einer ueber Hrimgar", k.siegeVon(s, "fynn:roland") === 2 && k.siegeVon(s, "fynn:frostmammut") === 1);
pruefe("ein Spieler ohne Speicher zaehlt nicht, stuerzt aber nicht", k.siegeVon({}, "fynn:roland") === 0);

setzeAntwort(() => ({ canceled: true, cancelationReason: "UserClosed" }));
await c.zeigeChronik(s);
pruefe("Uebersicht: drei Knoepfe mit Bild", letztesFenster.knoepfe.length === 3 && letztesFenster.knoepfe.every((kn) => kn.bild));
pruefe("Uebersicht: besiegt 2 von 3", letztesFenster.text.includes("Besiegt: 2 von 3"));
pruefe("Knopf Roland: besiegt 2x", letztesFenster.knoepfe[0].beschriftung.includes("besiegt: 2"));
pruefe("Knopf Morvan: noch unbesiegt", letztesFenster.knoepfe[1].beschriftung.includes("noch unbesiegt"));

let schritt = 0;
setzeAntwort(() => (schritt++ === 0 ? { canceled: false, selection: 2 } : { canceled: true, cancelationReason: "UserClosed" }));
await c.zeigeChronik(s);
pruefe("Seite Hrimgar: Rufen, Tipp, Beute", letztesFenster.titel.includes("Hrimgar") && letztesFenster.text.includes("Frostruf")
    && letztesFenster.text.includes("Spring") && letztesFenster.text.includes("Frostzahn"));
pruefe("Seite Hrimgar: einmal besiegt", letztesFenster.text.includes("1× besiegt"));

// ---- Geschenk beim ersten Betreten
const fach = [];
const neu = spieler();
neu.getComponent = (n) => (n === "minecraft:inventory" ? { container: { addItem: (st) => fach.push(st.typeId) } } : undefined);
pruefe("erstes Betreten: die Chronik liegt im Inventar", c.schenke(neu) && fach.join() === "fynn:bosschronik");
pruefe("zweites Mal: kein zweites Buch", c.schenke(neu) === false && fach.length === 1);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
