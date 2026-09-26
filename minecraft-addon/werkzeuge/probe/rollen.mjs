// Die Rollen ohne Spiel: Altar antippen, waehlen, Staerke, Kraftleiste.
import { gemerkt, system, world } from "@minecraft/server";
import { letztesFenster, setzeAntwort } from "@minecraft/server-ui";
await import("./main.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }
const warte = () => new Promise((fertig) => setTimeout(fertig, 0));

// Beim Start meldet das Skript die Blockkomponente an.
const komponenten = new Map();
for (const f of gemerkt.ereignisse["system.startup"] ?? []) {
    f({ blockComponentRegistry: { registerCustomComponent: (n, k) => komponenten.set(n, k) } });
}
pruefe("die Komponente fynn:rollenwahl ist angemeldet", komponenten.has("fynn:rollenwahl"));

const eigenschaften = new Map();
const wirkungen = [], titel = [], leiste = [];
const spieler = {
    id: "fynn", isSneaking: false, location: { x: 0, y: 64, z: 0 },
    dimension: { playSound() {} },
    getDynamicProperty: (k) => eigenschaften.get(k),
    setDynamicProperty: (k, v) => eigenschaften.set(k, v),
    addEffect: (id, dauer, o) => wirkungen.push({ id, dauer, o }),
    removeEffect() {},
    onScreenDisplay: {
        setActionBar: (t) => leiste.push(t),
        setTitle: (t, o) => titel.push(t.replace(/§./g, "") + " " + o.subtitle.replace(/§./g, "")),
    },
};
world.getAllPlayers = () => [spieler];
const runden = (n) => gemerkt.takte.filter((t) => t[1] === n).map((t) => t[0]);

// Antippen: Das Fenster zeigt vier Rollen. Gewaehlt wird der Magier.
setzeAntwort(() => ({ canceled: false, selection: 1 }));
komponenten.get("fynn:rollenwahl").onPlayerInteract({ player: spieler });
await warte();
pruefe(`vier Knoepfe: ${letztesFenster.knoepfe.map((k) => k.beschriftung.split("\n")[0].replace(/§./g, "")).join(", ")}`,
       letztesFenster.knoepfe.length === 4);
pruefe("jeder Knopf hat ein Bild", letztesFenster.knoepfe.every((k) => k.bild?.startsWith("textures/")));
pruefe("Rolle gespeichert: magier", eigenschaften.get("fynn:rolle") === "magier");
pruefe(`Titel auf dem Bildschirm: "${titel[0]}"`, titel[0] === "Magier ist jetzt deine Rolle");
pruefe("feuerfest ohne Partikel", wirkungen.some((w) => w.id === "fire_resistance" && w.o.showParticles === false));
pruefe("halbe Kraft nach der Wahl", eigenschaften.get("fynn:kraft") === 50);

// Die Leiste: zehn Zeichen, fuenf volle blaue Kugeln (Feld 2), der Rest leer.
const zeile = leiste.at(-1);
const kugeln = [...zeile.split("§f")[1]].map((z) => z.charCodeAt(0) - 0xe300);
pruefe(`Leiste "${zeile.split(" ")[0].replace(/§./g, "")}" mit Feldern ${kugeln.join(",")}`,
       zeile.startsWith("§9Mana") && kugeln.join(",") === "2,2,2,2,2,0,0,0,0,0");

// Nachschub: sechs Runden (30 Ticks), jede zweite gibt dem Magier +2.
for (let i = 0; i < 6; i++) for (const f of runden(5)) f();
pruefe(`Mana waechst (50 -> ${eigenschaften.get("fynn:kraft")})`, eigenschaften.get("fynn:kraft") === 56);
const halbe = [...leiste.at(-1).split("§f")[1]].map((z) => z.charCodeAt(0) - 0xe300);
pruefe(`bei 56 eine halbe Kugel: ${halbe.join(",")}`, halbe[5] === 6);

// Nichts im Chat: keine sendMessage, nur Leiste und Titel.
pruefe("kein Chat", spieler.sendMessage === undefined);

// Wechsel zum Assassinen: ducken macht unsichtbar.
setzeAntwort(() => ({ canceled: false, selection: 3 }));
komponenten.get("fynn:rollenwahl").onPlayerInteract({ player: spieler });
await warte();
pruefe("Rolle jetzt assassine, Kraft wieder halb",
       eigenschaften.get("fynn:rolle") === "assassine" && eigenschaften.get("fynn:kraft") === 50);
wirkungen.length = 0;
spieler.isSneaking = true;
for (const f of runden(5)) f();
pruefe("geduckt unsichtbar", wirkungen.some((w) => w.id === "invisibility"));
spieler.isSneaking = false; wirkungen.length = 0;
for (const f of runden(5)) f();
pruefe("aufgestanden: nicht mehr", !wirkungen.some((w) => w.id === "invisibility"));
for (const f of runden(40)) f();
pruefe("Tempo als Staerke", wirkungen.some((w) => w.id === "speed"));

// Beschaeftigt: Das Fenster wird spaeter noch einmal versucht.
const vorher = gemerkt.takte.length;
setzeAntwort(() => ({ canceled: true, cancelationReason: "UserBusy" }));
komponenten.get("fynn:rollenwahl").onPlayerInteract({ player: spieler });
await warte();
pruefe("beschaeftigt: neuer Versuch geplant", gemerkt.takte.length === vorher + 1);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
