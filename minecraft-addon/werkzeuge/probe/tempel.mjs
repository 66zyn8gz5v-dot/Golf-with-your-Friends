// Der Starttempel ohne Spiel: bauen, ankommen, waehlen, ausruesten, springen,
// sicher landen, Tempel weg.
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
pruefe("rund: Mauer auf dem Rand", bei(0, 100, 8)?.typ === "minecraft:stone_brick_wall" && bei(-8, 100, 0)?.typ === "minecraft:stone_brick_wall"
       && bei(7, 99, 7) === undefined && bei(8, 99, 0)?.typ === "minecraft:stone_bricks");
pruefe("mit Dach und Glaskuppel", bei(4, 105, 4)?.typ === "minecraft:stone_bricks" && bei(0, 107, 0)?.typ === "minecraft:glass"
       && bei(0, 105, 0)?.typ === "minecraft:air");
pruefe("Mauerstuecke verbunden", bei(0, 100, 8)?.zustaende?.wall_connection_type_east === "short");
pruefe("Luft wird zuerst gesetzt, Altaere danach", plan[0].typ === "minecraft:air"
       && plan.findIndex((p) => p.typ === "fynn:tempelaltar") > plan.findLastIndex((p) => p.typ === "minecraft:air"));
pruefe("Mitte ist frei zum Stehen", bei(0, 100, 0)?.typ === "minecraft:air" && bei(0, 101, 0)?.typ === "minecraft:air");

// --- Die Welt
const gesetzt = [], befehle = [], figuren = [];
let bodenNah = false;
const dimension = {
    id: "minecraft:overworld",
    getBlock: () => ({}),
    setBlockType: (ort, typ) => gesetzt.push({ ort, typ }),
    setBlockPermutation: (ort, perm) => gesetzt.push({ ort, typ: perm.typ, zustaende: perm.zustaende }),
    spawnEntity: (typ, ort) => {
        const f = { typ, ort, marken: [], setRotation(r) { this.drehung = r; }, addTag(t) { this.marken.push(t); },
                    remove() { this.weg = true; } };
        figuren.push(f);
        return f;
    },
    getEntities: (o) => figuren.filter((f) => !f.weg && o.tags.every((t) => f.marken.includes(t))),
    getBlockFromRay: () => (bodenNah ? {} : undefined),
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
        isOnGround: true, isInWater: false,
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
pruefe(`Tempel gebaut bei y ${mitte.y} (ganz oben)`, mitte.y === 290 && gesetzt.length === plan.length);
pruefe("vier Statuen mit Namen", figuren.length === 4 && figuren.every((f) => f.typ === "fynn:statue" && f.marken.length === 1));
pruefe("die Ritterstatue traegt Ritterhelm, Steinschwert und Schild",
       ["slot.armor.head 0 fynn:ritterhelm", "slot.weapon.mainhand 0 minecraft:stone_sword", "slot.weapon.offhand 0 minecraft:shield"]
           .every((t) => befehle.some((b) => b.includes("fynn_statue_ritter") && b.endsWith(t))));
pruefe("die Magierstatue den Zauberhut", befehle.some((b) => b.includes("fynn_statue_magier") && b.endsWith("fynn:magierhut")));
pruefe("die Bogenschuetzenstatue Kapuze und Wams des Waldlaeufers",
       ["slot.armor.head 0 fynn:waldlaeuferkapuze", "slot.armor.chest 0 fynn:waldlaeuferwams"]
           .every((t) => befehle.some((b) => b.includes("fynn_statue_bogenschuetze") && b.endsWith(t))));
pruefe(`Spieler steht in der Mitte (${fynn.location.x}, ${fynn.location.y}, ${fynn.location.z})`,
       fynn.location.x === 10.5 && fynn.location.y === 290 && fynn.location.z === -20.5);
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
pruefe("wieder Ueberleben, noch oben", fynn.modus === "Survival" && fynn.location.y === 290);
pruefe(`Titel: ${fynn.onScreenDisplay.letzter}`, fynn.onScreenDisplay.letzter.includes("Spring"));
const tor = gesetzt.slice(-63);
pruefe("das Tor in der Mitte ist offen (3 x 3, sieben tief)",
       tor.length === 63 && tor.every((b) => b.typ === "minecraft:air" && Math.abs(b.ort.x - 10) <= 1 && b.ort.y < 290));

// --- Der Sprung
const sturz = gemerkt.takte.find(([f]) => f.name === "sturzTakt")[0];
world.getAllPlayers = () => [fynn];
fynn.location = { x: 10.5, y: 250, z: -20.5 };
fynn.isOnGround = false;
fynn.wirkungen.length = 0;
const vorAbbau = gesetzt.length;
sturz();
pruefe("im Fall: Resistenz V", fynn.wirkungen.includes("resistance") && fynn.eigenschaften.get("fynn:sturz") === true);
pruefe("niemand mehr oben: Tempel abgebaut, Statuen weg",
       world.getDynamicProperty("fynn:tempel_steht") === false && figuren.every((f) => f.weg)
       && gesetzt.length - vorAbbau > 400 && gesetzt.slice(vorAbbau).every((b) => b.typ === "minecraft:air"));
pruefe("noch weit oben: kein Fallschirm", !fynn.wirkungen.includes("slow_falling"));
bodenNah = true;
sturz();
pruefe("nah am Boden: langsames Fallen", fynn.wirkungen.includes("slow_falling"));
fynn.isOnGround = true;
sturz();
pruefe(`gelandet: ${fynn.onScreenDisplay.letzter}`, fynn.eigenschaften.get("fynn:sturz") === undefined
       && fynn.onScreenDisplay.letzter.includes("Gelandet"));
bodenNah = false;
world.getAllPlayers = () => [];

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
pruefe("zweiter Spieler: der Tempel entsteht neu, an derselben Stelle",
       lea.location.x === 10.5 && lea.location.y === 290 && gesetzt.length === bloecke + plan.length
       && world.getDynamicProperty("fynn:tempel_steht") === true);

// Ein Mitspieler steht noch oben: dann nur das Tor zu, der Tempel bleibt.
const tom = neuerSpieler("tom");
tom.location = { x: 12, y: 290, z: -19 };
lea.location = { x: 10.5, y: 250, z: -20.5 };
lea.isOnGround = false;
world.getAllPlayers = () => [lea, tom];
const vorTor = gesetzt.length;
sturz();
pruefe("Mitspieler oben: Tempel bleibt, Tor wieder zu",
       world.getDynamicProperty("fynn:tempel_steht") === true
       && gesetzt.length - vorTor === plan.filter((b) => Math.abs(b.ort.x) <= 1 && Math.abs(b.ort.z) <= 1
           && b.ort.y < 100 && b.typ !== "minecraft:air").length
       && gesetzt.slice(vorTor).every((b) => b.typ !== "minecraft:air"));
world.getAllPlayers = () => [];

// Schnee auf dem Tempel wird weggeraeumt.
const weg = [];
const altesGetBlock = dimension.getBlock;
dimension.getBlock = (o) => (o.x === 12 && o.y === 290 && o.z === -18
    ? { typeId: "minecraft:snow_layer", setType: (t) => weg.push(t) } : {});
gemerkt.takte.find(([f]) => f.name === "schneeWeg")[0]();
pruefe("Schnee auf dem Tempelboden: weggeraeumt", weg.length === 1 && weg[0] === "minecraft:air");
dimension.getBlock = altesGetBlock;

// Ein eckiger Tempel (4.32) wird gegen den runden getauscht.
world.setDynamicProperty("fynn:tempel_bauart", undefined);
const vorUmbau = gesetzt.length;
tom.location = { x: 15, y: 290, z: -20 };
world.getAllPlayers = () => [tom];
gemerkt.takte.find(([f]) => f.name === "eckigZuRund")[0]();
pruefe("eckig zu rund: abgebaut, neu gebaut, Mitspieler in die Mitte",
       world.getDynamicProperty("fynn:tempel_bauart") === 2 && gesetzt.length - vorUmbau > plan.length
       && tom.location.x === 10.5 && tom.location.z === -20.5);
world.getAllPlayers = () => [];

// Ein alter Tempel (bis 4.28, 50 ueber dem Spawn) wird aufgeraeumt.
world.setDynamicProperty("fynn:tempel", JSON.stringify({ x: 0, y: 114, z: 0 }));
world.setDynamicProperty("fynn:tempel_steht", undefined);
gemerkt.takte.find(([f]) => f.name === "alterTempelWeg")[0]();
pruefe("alter Tempel: abgebaut und vergessen", world.getDynamicProperty("fynn:tempel") === undefined
       && world.getDynamicProperty("fynn:tempel_steht") === false);

// Beim Wiederbeleben (nicht das erste Erscheinen): nichts
const vorher2 = spaeter.length;
for (const f of gemerkt.ereignisse["playerSpawn"]) f({ player: neuerSpieler("x"), initialSpawn: false });
pruefe("Wiederbeleben: kein Tempel", spaeter.length === vorher2);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
