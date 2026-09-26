// Die Feuerstaebe ohne Spiel: laden wie beim Degen, schiessen, fliegen,
// einschlagen - fuer beide Staebe, und mit einem Stock nichts.
import { gemerkt, system, world } from "@minecraft/server";
await import("./main.js");

const explosionen = [], partikel = [], toene = [], baelle = [];
let blockBei = null, wesenBei = null;
const dimension = {
    spawnEntity: (typ, ort) => {
        const ball = { typ, id: "ball" + baelle.length, location: { ...ort }, isValid: true,
            teleport(z) { this.location = { ...z }; }, remove() { this.isValid = false; } };
        ball.dimension = dimension;
        baelle.push(ball);
        return ball;
    },
    spawnParticle: (n, ort) => partikel.push({ n, ort }),
    playSound: (n) => toene.push(n),
    createExplosion: (ort, wucht, opt) => explosionen.push({ ort, wucht, opt }),
    getBlockFromRay: (ort, r, o) => blockBei !== null && ort.z + r.z * o.maxDistance <= blockBei
        ? { block: { location: { x: 10, y: 65, z: blockBei - 1 } }, faceLocation: { x: 0.5, y: 0.5, z: 1 } }
        : undefined,
    getEntitiesFromRay: () => (wesenBei ? [{ entity: wesenBei, distance: 0.5 }] : []),
};
const eigenschaften = new Map([["fynn:rolle", "magier"], ["fynn:kraft", 100]]);
const leiste = [];
const spieler = {
    id: "fynn", dimension, inHand: "fynn:feuerstab_2", isSneaking: false,
    getDynamicProperty: (k) => eigenschaften.get(k),
    setDynamicProperty: (k, v) => eigenschaften.set(k, v),
    addEffect() {}, removeEffect() {},
    onScreenDisplay: { setActionBar: (t) => leiste.push(t.replace(/§./g, "")), setTitle() {} },
    location: { x: 10, y: 64, z: 10 },
    getViewDirection: () => ({ x: 0, y: 0, z: -1 }),       // Blick nach Norden
    getHeadLocation: () => ({ x: 10, y: 65.6, z: 10 }),
    getComponent(n) { return n === "minecraft:equippable"
        ? { getEquipment: () => ({ typeId: this.inHand }) } : undefined; },
};
world.getAllPlayers = () => [spieler];

const takte = gemerkt.takte.filter((t) => typeof t[0] === "function" && t[1] === 1).map((t) => t[0]);
const flammen = gemerkt.takte.filter((t) => typeof t[0] === "function" && t[1] === 4).pop()[0];
function tick(n = 1) { for (let i = 0; i < n; i++) { system.currentTick += 1; for (const f of takte) f(); } }
const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

system.currentTick = 100;
spieler.isSneaking = true; tick(8); spieler.isSneaking = false; tick(1);
pruefe("kurz geduckt: kein Schuss", baelle.length === 0);

spieler.isSneaking = true; tick(20);
pruefe("voll geladen: Zischen", toene.includes("mob.blaze.breathe"));
pruefe("und noch kein Schuss, solange geduckt", baelle.length === 0);
spieler.isSneaking = false; tick(1);
pruefe("beim Aufstehen fliegt ein fynn:feuerball", baelle.length === 1 && baelle[0].typ === "fynn:feuerball");
pruefe(`der Ball kostet 25 Mana (100 -> ${eigenschaften.get("fynn:kraft")})`, eigenschaften.get("fynn:kraft") === 75);

const vorher = baelle[0].location.z;
tick(3);
pruefe(`der Ball fliegt nach vorn (z ${vorher.toFixed(1)} -> ${baelle[0].location.z.toFixed(1)})`,
       baelle[0].location.z < vorher - 3);
blockBei = baelle[0].location.z - 1; tick(1); blockBei = null;
const e = explosionen[0];
pruefe("am Block schlaegt er ein", explosionen.length === 1 && !baelle[0].isValid);
pruefe("ohne Bloecke zu zerstoeren und ohne Brand", e && e.opt.breaksBlocks === false && e.opt.causesFire === false);

spieler.inHand = "fynn:feuerstab";
spieler.isSneaking = true; tick(20); spieler.isSneaking = false; tick(1);
pruefe("Stab I laedt und schiesst genauso", baelle.length === 2);
let brennt = 0;
wesenBei = { id: "schwein", typeId: "minecraft:pig", location: { x: 10, y: 65, z: 7 }, isValid: true,
             setOnFire: (s) => { brennt = s; } };
tick(1); wesenBei = null;
pruefe("ein Schwein im Weg: Explosion, und es brennt", explosionen.length === 2 && brennt > 0);

spieler.isSneaking = true; tick(20); spieler.isSneaking = false; tick(1);
tick(70);
pruefe("ohne Ziel verpufft er nach seiner Flugzeit", baelle.length === 3 && !baelle[2].isValid && explosionen.length === 2);

// Wer kein Magier ist, laedt vergeblich - und bekommt gesagt, warum.
eigenschaften.set("fynn:rolle", "ritter");
spieler.inHand = "fynn:feuerstab_2";
system.currentTick += 40;
spieler.isSneaking = true; tick(20); spieler.isSneaking = false; tick(1);
pruefe("als Ritter: kein Ball", baelle.length === 3);
pruefe("und ein Hinweis ueber der Leiste", leiste.at(-1).includes("nur ein Magier"));

// Die Leiste steht jetzt bei 25: ein Ball noch, dann ist Schluss.
eigenschaften.set("fynn:rolle", "magier");
system.currentTick += 40;
spieler.isSneaking = true; tick(20); spieler.isSneaking = false; tick(1);
pruefe("mit den letzten 25 Mana: noch ein Ball", baelle.length === 4);
tick(70);
system.currentTick += 40;
spieler.isSneaking = true; tick(20); spieler.isSneaking = false; tick(1);
pruefe(`mit ${eigenschaften.get("fynn:kraft")} Mana: kein Ball mehr`, baelle.length === 4);
pruefe("Hinweis: zu wenig Mana", leiste.at(-1).includes("Zu wenig Mana"));
pruefe("die Leiste steht unter dem Hinweis, mit Kugeln", /Mana [\ue300-\ue3ff]{10}$/.test(leiste.at(-1)));

// --- Frostzepter: gleicher Flug, aber Kaelte statt Explosion
eigenschaften.set("fynn:rolle", "magier");
spieler.inHand = "fynn:frostzepter";
for (let i = 0; i < 200; i++) for (const [f, n] of gemerkt.takte) if (n === 5) f();
system.currentTick += 40;
const explosionenVorher = explosionen.length;
spieler.isSneaking = true; tick(20); spieler.isSneaking = false; tick(1);
const kugel = baelle.at(-1);
pruefe(`Frostzepter schiesst ${kugel.typ}`, kugel.typ === "fynn:frostkugel");
tick(2);
pruefe("Spur aus weissen Funken", partikel.at(-1).n === "minecraft:endrod");
const eis = { id: "eis", typeId: "minecraft:zombie", location: { x: 10, y: 65, z: 4 }, isValid: true,
    schaden: 0, wirkungen: [], applyDamage(n) { this.schaden += n; }, addEffect(id) { this.wirkungen.push(id); },
    setOnFire() { this.brennt = true; } };
dimension.getEntities = () => [eis];
wesenBei = eis; tick(1); wesenBei = null;
pruefe("Frost: keine Explosion, kein Feuer", explosionen.length === explosionenVorher && !eis.brennt);
pruefe(`Frost: ${eis.schaden} Schaden, fast eingefroren`, eis.schaden === 6
       && eis.wirkungen.includes("slowness") && eis.wirkungen.includes("mining_fatigue"));

spieler.inHand = "minecraft:stick";
spieler.isSneaking = true; tick(30); spieler.isSneaking = false; tick(1);
pruefe("mit einem Stock laedt nichts", baelle.length === 5);

for (const stab of ["fynn:feuerstab", "fynn:feuerstab_2", "fynn:frostzepter"]) {
    spieler.inHand = stab;
    const n = partikel.length; flammen(); const f = partikel.at(-1);
    pruefe(`Flammen rechts vor dem Kopf mit ${stab}`, partikel.length === n + 1 && f.ort.x > 10 && f.ort.z < 10);
}

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
