// Der Starttempel ohne Spiel: bauen, ankommen, waehlen, ausruesten, zurueck.
import { gemerkt, system, world } from "@minecraft/server";
import { letztesFenster, setzeAntwort } from "@minecraft/server-ui";
await import("./main.js");
const { bauplan, SEITEN } = await import("./tempel.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }
const warte = () => new Promise((fertig) => setTimeout(fertig, 0));
const spaeter = [];
system.runTimeout = (f) => spaeter.push(f);
const abarbeiten = () => { while (spaeter.length) spaeter.shift()(); };

const komponenten = new Map();
for (const f of gemerkt.ereignisse["system.startup"] ?? []) {
    f({ blockComponentRegistry: { registerCustomComponent: (n, k) => komponenten.set(n, k) } });
}
pruefe("Blockkomponente fynn:tempelwahl angemeldet", komponenten.has("fynn:tempelwahl"));

// --- Der Bauplan
const plan = bauplan({ x: 0, y: 100, z: 0 });
const bei = (x, y, z) => plan.filter((p) => p.ort.x === x && p.ort.y === y && p.ort.z === z).at(-1);
pruefe(`Bauplan: ${plan.length} Bloecke`, plan.length > 500);
for (const s of SEITEN) {
    const altar = bei(s.dx * 4, 100, s.dz * 4);
    pruefe(`Altar ${s.rolle}: Zustand ${altar?.zustaende?.["minecraft:cardinal_direction"]}`,
           altar?.typ === "fynn:tempelaltar" && altar.zustaende["fynn:rolle"] === s.rolle);
}
pruefe("Mitte: Quarz unter den Fuessen", bei(0, 99, 0)?.typ === "minecraft:chiseled_quartz_block");
pruefe("Mauer rundum", bei(3, 100, -7)?.typ === "minecraft:stone_brick_wall" && bei(-7, 100, 2)?.typ === "minecraft:stone_brick_wall");
pruefe("Luft wird zuerst gesetzt, Altaere danach", plan[0].typ === "minecraft:air"
       && plan.findIndex((p) => p.typ === "fynn:tempelaltar") > plan.findLastIndex((p) => p.typ === "minecraft:air"));
pruefe("Mitte ist frei zum Stehen", bei(0, 100, 0)?.typ === "minecraft:air" && bei(0, 101, 0)?.typ === "minecraft:air");

// --- Die Welt
const gesetzt = [], befehle = [], figuren = [];
const dimension = {
    id: "minecraft:overworld",
    getBlock: () => ({}),
    setBlockType: (ort, typ) => gesetzt.push({ ort, typ }),
    setBlockPermutation: (ort, perm) => gesetzt.push({ ort, typ: perm.typ, zustaende: perm.zustaende }),
    spawnEntity: (typ, ort) => {
        const f = { typ, ort, marken: [], setRotation(r) { this.drehung = r; }, addTag(t) { this.marken.push(t); } };
        figuren.push(f);
        return f;
    },
    runCommand: (b) => befehle.push(b),
    spawnItem() {},
    playSound() {},
};
world.getDimension = () => dimension;

function neuerSpieler(id) {
    const eigenschaften = new Map();
    const angezogen = {};
    const inventar = [];
    return {
        id, dimension, location: { x: 10.3, y: 64, z: -20.7 }, modus: "Survival", titel: [], wirkungen: [],
        eigenschaften, angezogen, inventar,
        getDynamicProperty: (k) => eigenschaften.get(k),
        setDynamicProperty: (k, v) => (v === undefined ? eigenschaften.delete(k) : eigenschaften.set(k, v)),
        getGameMode() { return this.modus; },
        setGameMode(m) { this.modus = m; },
        teleport(ort, o) { this.location = ort; this.sprung = o; },
        addEffect(id) { this.wirkungen.push(id); }, removeEffect() {},
        onScreenDisplay: { setActionBar() {}, setTitle(t) { this.letzter = t; } },
        getComponent(n) {
            if (n === "minecraft:equippable") return {
                getEquipment: (p) => (angezogen[p] ? { typeId: angezogen[p] } : undefined),
                setEquipment: (p, s) => { angezogen[p] = s?.typeId; },
            };
            if (n === "minecraft:inventory") return { container: { addItem: (s) => { inventar.push(s); } } };
        },
    };
}

// --- Ein neuer Spieler kommt an
const fynn = neuerSpieler("fynn");
world.getAllPlayers = () => [fynn];
for (const f of gemerkt.ereignisse["playerSpawn"]) f({ player: fynn, initialSpawn: true });
pruefe("nicht sofort - erst wenn die Welt geladen ist", spaeter.length === 1 && gesetzt.length === 0);
abarbeiten();
const mitte = JSON.parse(world.getDynamicProperty("fynn:tempel"));
pruefe(`Tempel gebaut bei y ${mitte.y} (50 ueber dem Spawn)`, mitte.y === 114 && gesetzt.length === plan.length);
pruefe("vier Statuen mit Namen", figuren.length === 4 && figuren.every((f) => f.typ === "fynn:statue" && f.marken.length === 1));
pruefe("die Ritterstatue traegt Ritterhelm, Schwert und Schild",
       ["slot.armor.head 0 fynn:ritterhelm", "slot.weapon.mainhand 0 fynn:ritterschwert", "slot.weapon.offhand 0 minecraft:shield"]
           .every((t) => befehle.some((b) => b.includes("fynn_statue_ritter") && b.endsWith(t))));
pruefe("die Magierstatue den Zauberhut", befehle.some((b) => b.includes("fynn_statue_magier") && b.endsWith("fynn:magierhut")));
pruefe(`Spieler steht in der Mitte (${fynn.location.x}, ${fynn.location.y}, ${fynn.location.z})`,
       fynn.location.x === 10.5 && fynn.location.y === 114 && fynn.location.z === -20.5);
pruefe("Abenteuermodus im Tempel", fynn.modus === "Adventure");
pruefe(`Titel: ${fynn.onScreenDisplay.letzter}`, fynn.onScreenDisplay.letzter.includes("Willkommen"));

// --- Erst umsehen, dann Magier werden
const altar = (rolle) => ({ permutation: { getState: () => rolle } });
setzeAntwort(() => ({ canceled: false, selection: 1 }));
komponenten.get("fynn:tempelwahl").onPlayerInteract({ player: fynn, block: altar("magier") });
await warte();
pruefe(`Fenster "${letztesFenster.titel.replace(/§./g, "")}" nennt die Ausruestung`, letztesFenster.text.includes("Magierrobe"));
pruefe("'Noch umsehen': nichts passiert", fynn.modus === "Adventure" && !fynn.eigenschaften.get("fynn:rolle"));

setzeAntwort(() => ({ canceled: false, selection: 0 }));
komponenten.get("fynn:tempelwahl").onPlayerInteract({ player: fynn, block: altar("magier") });
await warte();
pruefe("Rolle: magier", fynn.eigenschaften.get("fynn:rolle") === "magier");
pruefe("Magierrobe angezogen", fynn.angezogen.Head === "fynn:magierhut" && fynn.angezogen.Feet === "fynn:magierschuhe");
pruefe(`im Inventar: ${fynn.inventar.map((s) => s.typeId.replace(/.*:/, "")).join(", ")}`,
       fynn.inventar.some((s) => s.typeId === "fynn:feuerstab_2") && fynn.inventar.some((s) => s.typeId === "minecraft:bread"));
pruefe(`zurueck an den alten Platz (${fynn.location.x}, ${fynn.location.y}, ${fynn.location.z})`,
       fynn.location.x === 10.3 && fynn.location.y === 64 && fynn.location.z === -20.7);
pruefe("wieder Ueberleben, sanfte Landung", fynn.modus === "Survival" && fynn.wirkungen.includes("slow_falling"));

// Noch einmal zum Tempelaltar (etwa per Befehl hinauf): Rolle ja, Ausruestung nein.
const vorher = fynn.inventar.length;
komponenten.get("fynn:tempelwahl").onPlayerInteract({ player: fynn, block: altar("ritter") });
await warte();
pruefe("zweites Mal: nur die Rolle, keine Ausruestung",
       fynn.eigenschaften.get("fynn:rolle") === "ritter" && fynn.inventar.length === vorher
       && letztesFenster.text.includes("schon bekommen"));

// --- Wer schon eine Rolle hat, kommt nicht in den Tempel
const alt = neuerSpieler("alt");
alt.eigenschaften.set("fynn:rolle", "ritter");
for (const f of gemerkt.ereignisse["playerSpawn"]) f({ player: alt, initialSpawn: true });
pruefe("alter Spieler mit Rolle: kein Tempel", spaeter.length === 0 && alt.eigenschaften.get("fynn:gestartet") === true);

// --- Ein zweiter neuer Spieler: derselbe Tempel, kein Neubau
const lea = neuerSpieler("lea");
lea.location = { x: 500, y: 70, z: 500 };
const bloecke = gesetzt.length;
for (const f of gemerkt.ereignisse["playerSpawn"]) f({ player: lea, initialSpawn: true });
abarbeiten();
pruefe("zweiter Spieler: in denselben Tempel", lea.location.x === 10.5 && lea.location.y === 114 && gesetzt.length === bloecke);

// Beim Wiederbeleben (nicht das erste Erscheinen): nichts
const vorher2 = spaeter.length;
for (const f of gemerkt.ereignisse["playerSpawn"]) f({ player: neuerSpieler("x"), initialSpawn: false });
pruefe("Wiederbeleben: kein Tempel", spaeter.length === vorher2);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
