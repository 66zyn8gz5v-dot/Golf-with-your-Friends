// Probe: der Feueratem des Lindwurms - ohne Spiel.
const l = await import("./lindwurm.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

const gespawnt = [], toene = [], teilchen = [];
const dim = {
    spawnEntity(typ, ort) {
        const ball = { typeId: typ, ort, flug: null, besitzer: null,
            getComponent: () => ({ set owner(o) { ball.besitzer = o; }, shoot(v) { ball.flug = v; } }) };
        gespawnt.push(ball);
        return ball;
    },
    playSound: (n) => toene.push(n),
    spawnParticle: (n) => teilchen.push(n),
};
const spieler = { id: "s", typeId: "minecraft:player", isValid: true, location: { x: 0, y: 64, z: 20 } };
const drache = { id: "d", typeId: l.DRACHE, isValid: true, location: { x: 0, y: 80, z: 0 }, dimension: dim, eig: {},
    target: undefined, getViewDirection: () => ({ x: 0, y: 0, z: 1 }), setProperty(n, v) { this.eig[n] = v; } };

pruefe("Ohne Ziel: kein Feuer", l.atemTakt(drache, 0) === "fliegt" && !gespawnt.length);
drache.target = { ...spieler, location: { x: 0, y: 64, z: 60 } };
pruefe("Ziel zu weit weg: kein Feuer", l.atemTakt(drache, 5) === "fliegt");
drache.target = spieler;
pruefe("Ziel in Reichweite: er holt Luft", l.atemTakt(drache, 10, () => 0) === "holt Luft"
    && drache.eig["fynn:feuer"] === true && toene.includes("mob.enderdragon.growl"));
for (let t = 15; t <= 40; t += 5) l.atemTakt(drache, t, () => 0);
pruefe("... und speit vier Feuerbaelle", gespawnt.length === l.ATEM.schuesse
    && gespawnt.every((b) => b.typeId === "minecraft:small_fireball"));
pruefe("... auf das Ziel zu", gespawnt.every((b) => b.flug && b.flug.z > 0.5 && b.flug.y < 0));
pruefe("... als seine eigenen", gespawnt.every((b) => b.besitzer === drache));
pruefe("... mit Flammen", teilchen.includes("fynn:drachenfeuer"));
l.atemTakt(drache, 45, () => 0);
pruefe("Danach klappt das Maul zu", drache.eig["fynn:feuer"] === false);
pruefe("... und er braucht eine Pause", l.atemTakt(drache, 60, () => 0) === "fliegt" && gespawnt.length === 4);
pruefe("Nach der Pause wieder Feuer", l.atemTakt(drache, 10 + l.ATEM.pause[0] + 5, () => 0) === "holt Luft");
const m = l.maul(drache);
pruefe("Das Maul ist vorn am Kopf", m.z > drache.location.z + 3 && m.y > drache.location.y);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
