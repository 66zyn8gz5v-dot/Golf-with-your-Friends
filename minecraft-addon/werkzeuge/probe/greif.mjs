// Probe: der Greif fliegt, die Greifenfeder faengt.
const g = await import("./greif.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function greif(reiter, amBoden, v = { x: 0, y: 0, z: 0 }) {
    return { typeId: g.GREIF, isOnGround: amBoden, eig: {}, schuebe: [], effekte: [], v,
        dimension: { playSound() {} }, location: { x: 0, y: 80, z: 0 },
        getComponent: (n) => (n === "minecraft:rideable" ? { getRiders: () => (reiter ? [reiter] : []) } : undefined),
        getProperty(n) { return this.eig[n]; }, setProperty(n, w) { this.eig[n] = w; },
        getVelocity() { return this.v; }, applyImpulse(i) { this.schuebe.push(i); },
        addEffect(n) { this.effekte.push(n); } };
}
function reiter(blick, springt = false) {
    return { isJumping: springt, effekte: [], getViewDirection: () => blick, addEffect(n) { this.effekte.push(n); } };
}

pruefe("Ohne Reiter steht er", g.flugTakt(greif(undefined, true)) === "steht");
const oben = greif(undefined, false);
g.flugTakt(oben);
pruefe("In der Luft zeigt er, dass er fliegt", oben.eig["fynn:fliegt"] === true);
const r1 = reiter({ x: 0, y: 0, z: 1 }, true);
const g1 = greif(r1, true);
pruefe("Sprungtaste am Boden: er hebt ab", g.flugTakt(g1) === "hebt ab" && g1.schuebe[0].y > 0);
const r2 = reiter({ x: 1, y: 0, z: 0 });
const g2 = greif(r2, false);
pruefe("In der Luft fliegt er, wohin der Reiter schaut", g.flugTakt(g2) === "fliegt" && g2.schuebe[0].x > 0.05);
pruefe("... sanft, ohne abzustuerzen", g2.effekte.includes("slow_falling") && r2.effekte.includes("slow_falling"));
const r3 = reiter({ x: 0, y: -0.9, z: 0.4 });
const g3 = greif(r3, false);
g.flugTakt(g3);
pruefe("Schaut der Reiter nach unten, sinkt er", g3.schuebe[0].y < 0);
const g4 = greif(reiter({ x: 0, y: 0, z: 1 }, true), false, { x: 0, y: 0.8, z: 0 });
g.flugTakt(g4);
pruefe("Er steigt nicht endlos schnell", g4.schuebe.length === 1);
pruefe("Am Boden ohne Sprung laeuft er", g.flugTakt(greif(reiter({ x: 0, y: 0, z: 1 }), true)) === "laeuft");

const effekte = [];
const faellt = { isOnGround: false, isGliding: false, isInWater: false, getVelocity: () => ({ y: -1.2 }),
    addEffect: (n) => effekte.push(n),
    getComponent: (n) => (n === "minecraft:inventory"
        ? { container: { size: 36, getItem: (i) => (i === 3 ? { typeId: g.FEDER } : undefined) } }
        : { getEquipment: () => undefined }) };
pruefe("Mit der Greifenfeder: sanft landen", g.federTakt(faellt) && effekte.includes("slow_falling"));
const ohne = { ...faellt, getComponent: (n) => (n === "minecraft:inventory"
    ? { container: { size: 36, getItem: () => undefined } } : { getEquipment: () => undefined }) };
pruefe("Ohne Feder: nichts", !g.federTakt(ohne));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
