// Der Bandenchef ruft einmal nach Verstaerkung - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const b = await import("./banditen.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function chef(leben, luftUeberall = true) {
    const gerufen = [];
    const eigenschaften = new Map();
    const hinweise = [];
    return {
        typeId: "fynn:bandenchef", location: { x: 10.3, y: 64, z: -4.7 }, gerufen, hinweise,
        leben,
        getComponent: (n) => (n === "minecraft:health" ? { currentValue: leben, effectiveMax: 60 } : undefined),
        getDynamicProperty: (k) => eigenschaften.get(k),
        setDynamicProperty: (k, v) => eigenschaften.set(k, v),
        dimension: {
            getBlock: () => ({ isAir: luftUeberall }),
            spawnEntity: (typ, ort) => gerufen.push([typ, ort]),
            playSound() { },
            getPlayers: () => [{ onScreenDisplay: { setActionBar: (t) => hinweise.push(t) } }],
        },
    };
}

let c = chef(45);
pruefe("noch mehr als halbes Leben: kein Ruf", b.rufeVerstaerkung(c) === false && c.gerufen.length === 0);
c = chef(25);
pruefe("unter der Haelfte: ruft", b.rufeVerstaerkung(c) === true);
pruefe("zwei Banditen kommen", c.gerufen.length === 2 && c.gerufen.every(([t]) => t === "fynn:bandit"));
pruefe("nicht im Chef, sondern daneben", c.gerufen.every(([, o]) => Math.abs(o.x - 10.3) > 1 || Math.abs(o.z + 4.7) > 1));
pruefe("Spieler in der Naehe sehen es", c.hinweise.length === 1);
pruefe("ein zweiter Treffer: kein zweiter Ruf", b.rufeVerstaerkung(c) === false && c.gerufen.length === 2);
c = chef(20, false);
pruefe("kein Platz ringsum: trotzdem zwei", b.rufeVerstaerkung(c) === true && c.gerufen.length === 2);
pruefe("ein normaler Bandit ruft nicht", b.rufeVerstaerkung({ typeId: "fynn:bandit" }) === false);
const getroffen = gemerkt.ereignisse["entityHurt"].at(-1);
c = chef(10);
getroffen({ hurtEntity: c });
pruefe("ueber das Ereignis: ruft", c.gerufen.length === 2);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
