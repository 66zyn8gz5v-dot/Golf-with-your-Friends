// Die Erzpfeile: Eisen, Silber, Gold und Elektrum.
//
// Minecrafts Bogen verschiesst nur seine eigenen Pfeile. Darum der Umweg:
// Die Erzpfeile stecken in der Zweithand. Fliegt ein Pfeil aus dem Bogen
// (oder der Armbrust) eines Spielers, der dort Erzpfeile haelt, wird er
// zum Erzpfeil - er zieht eine Spur in der Farbe seiner Sorte und wirkt
// beim Treffer. Ein Erzpfeil wird verbraucht, und der gewoehnliche Pfeil,
// den Minecraft genommen hat, kommt zurueck ins Inventar.
//
// Einen gewoehnlichen Pfeil braucht es trotzdem: Ohne ihn laesst
// Minecraft den Bogen gar nicht erst spannen. Wer das vergisst, bekommt
// es ueber der Schnellleiste gesagt.

import { world, system, ItemStack } from "@minecraft/server";
import { hinweis } from "./rollen.js";
import { istHagelpfeil } from "./kampf.js";

const PFEIL = "minecraft:arrow";
const BOEGEN = new Set(["minecraft:bow", "minecraft:crossbow", "fynn:sturmbogen", "fynn:geweihbogen"]);

// Der Sturmbogen: Ein voll gespannter Schuss holt beim Einschlag einen
// Blitz herunter. "Voll gespannt" liest das Skript am Tempo des Pfeils ab
// - ein Bogen gibt ihm bei voller Spannung gut drei Bloecke je Tick mit,
// halb gespannt weniger als zwei. So gibt es den Blitz nicht fuer jedes
// Antippen.
const STURMBOGEN = "fynn:sturmbogen";
const STURM_TEMPO = 2.4;
const sturmpfeile = new Map();
const GEWEIHBOGEN = "fynn:geweihbogen";
const JAGD_EXTRA = 4;           // Schaden obendrauf, wenn ein wildes Tier getroffen wird
// Pfeile aus dem Geweihbogen, die noch fliegen.
const jagdpfeile = new Set();

// Je Sorte: die Spur im Flug und was beim Treffer geschieht.
const SORTEN = {
    "fynn:eisenpfeil": {
        spur: "minecraft:critical_hit_emitter",
        // Halb so viel noch einmal: Ein voll gespannter Bogen macht etwa
        // sechs, der Eisenpfeil also neun.
        treffer: (ziel, schuetze) => ziel.applyDamage(3, schaden(schuetze)),
    },
    "fynn:silberpfeil": {
        spur: "minecraft:endrod",
        treffer: (ziel, schuetze) => {
            if (!ziel.matches({ families: ["undead"] })) return;
            // Dreifach heisst: zweimal den Bogenschaden obendrauf.
            ziel.applyDamage(12, schaden(schuetze));
            ziel.dimension.spawnParticle("minecraft:endrod", mitte(ziel));
        },
    },
    "fynn:goldpfeil": {
        spur: "minecraft:villager_happy",
        treffer: (ziel) => ziel.addEffect("levitation", 40, { amplifier: 1 }),
    },
    "fynn:elektrumpfeil": {
        spur: "minecraft:blue_flame_particle",
        // Gelaehmt: fast stehen bleiben und schwach zuschlagen.
        treffer: (ziel, schuetze) => {
            ziel.applyDamage(2, schaden(schuetze));
            ziel.addEffect("slowness", 60, { amplifier: 3 });
            ziel.addEffect("weakness", 60, { amplifier: 0 });
        },
    },
};

function schaden(schuetze) {
    return schuetze ? { cause: "projectile", damagingEntity: schuetze } : { cause: "projectile" };
}

function mitte(wesen) {
    return { x: wesen.location.x, y: wesen.location.y + 1, z: wesen.location.z };
}

function lebt(wesen) {
    try {
        return typeof wesen.isValid === "function" ? wesen.isValid() : !!wesen.isValid;
    } catch (fehler) {
        return false;
    }
}

function kreativ(spieler) {
    // In der 2.0-Schnittstelle "Creative", frueher "creative".
    return String(spieler.getGameMode?.() ?? "").toLowerCase() === "creative";
}

// Fliegende Erzpfeile: Pfeil -> { sorte, schuetze }
const fliegend = new Map();
// Wer in diesem Tick schon einen Erzpfeil bezahlt hat. Eine Armbrust mit
// Mehrfachschuss verschiesst drei Pfeile, nimmt aber nur einen.
const bezahlt = new Map();

world.afterEvents.entitySpawn.subscribe((e) => {
    try {
        const pfeil = e.entity;
        if (pfeil?.typeId !== PFEIL || istHagelpfeil(pfeil.id)) return;
        const schuetze = pfeil.getComponent("minecraft:projectile")?.owner;
        if (schuetze?.typeId !== "minecraft:player") return;
        const ausruestung = schuetze.getComponent("minecraft:equippable");
        const bogen = ausruestung?.getEquipment("Mainhand");
        if (!BOEGEN.has(bogen?.typeId)) return;
        if (bogen.typeId === GEWEIHBOGEN) jagdpfeile.add(pfeil.id);
        if (bogen.typeId === STURMBOGEN) {
            const v = pfeil.getVelocity?.() ?? { x: 0, y: 0, z: 0 };
            if (Math.hypot(v.x, v.y, v.z) >= STURM_TEMPO) {
                sturmpfeile.set(pfeil.id, pfeil);
                schuetze.dimension.playSound("item.trident.thunder", schuetze.location, { volume: 0.3, pitch: 1.6 });
            }
        }
        const links = ausruestung.getEquipment("Offhand");
        if (!links || !SORTEN[links.typeId]) return;

        fliegend.set(pfeil.id, { pfeil, sorte: links.typeId, schuetze });
        if (bezahlt.get(schuetze.id) === system.currentTick) return;
        bezahlt.set(schuetze.id, system.currentTick);
        if (kreativ(schuetze)) return;

        // Einen Erzpfeil nehmen ...
        if (links.amount > 1) {
            const rest = links.clone();
            rest.amount = links.amount - 1;
            ausruestung.setEquipment("Offhand", rest);
        } else {
            ausruestung.setEquipment("Offhand", undefined);
        }
        // ... und den gewoehnlichen zurueckgeben - ausser Unendlichkeit
        // hat ihn ohnehin nicht verbraucht.
        const unendlich = bogen.getComponent("minecraft:enchantable")?.getEnchantment("infinity");
        if (!unendlich) {
            const uebrig = schuetze.getComponent("minecraft:inventory")?.container?.addItem(new ItemStack(PFEIL, 1));
            if (uebrig) schuetze.dimension.spawnItem(uebrig, schuetze.location);
        }
    } catch (fehler) {
        console.warn(`Erzpfeile, Schuss: ${fehler}`);
    }
});

function blitz(dimension, ort) {
    try {
        dimension.spawnEntity("minecraft:lightning_bolt", ort);
    } catch (fehler) {
        console.warn(`Sturmbogen, Blitz: ${fehler}`);
    }
}

world.afterEvents.projectileHitEntity.subscribe((e) => {
    const sturm = sturmpfeile.get(e.projectile?.id);
    if (sturm) {
        sturmpfeile.delete(e.projectile.id);
        const ziel = e.getEntityHit()?.entity;
        blitz(e.dimension, ziel?.location ?? e.location);
    }
});

world.afterEvents.projectileHitEntity.subscribe((e) => {
    try {
        const flug = fliegend.get(e.projectile?.id);
        if (!flug) return;
        fliegend.delete(e.projectile.id);
        const ziel = e.getEntityHit()?.entity;
        if (ziel && lebt(ziel)) SORTEN[flug.sorte].treffer(ziel, lebt(flug.schuetze) ? flug.schuetze : undefined);
    } catch (fehler) {
        console.warn(`Erzpfeile, Treffer: ${fehler}`);
    }
});

// Der Elchgeweihbogen ist ein Jagdbogen: Seine Pfeile treffen wilde Tiere
// (alles aus tiere_bauen.py, Familie fynn_tier) haerter.
world.afterEvents.projectileHitEntity.subscribe((e) => {
    try {
        if (!jagdpfeile.delete(e.projectile?.id)) return;
        const ziel = e.getEntityHit()?.entity;
        if (ziel && lebt(ziel) && ziel.matches?.({ families: ["fynn_tier"] })) {
            ziel.applyDamage(JAGD_EXTRA);
        }
    } catch (fehler) {
        console.warn(`Geweihbogen, Treffer: ${fehler}`);
    }
});

world.afterEvents.projectileHitBlock.subscribe((e) => {
    jagdpfeile.delete(e.projectile?.id);
    fliegend.delete(e.projectile?.id);
    if (sturmpfeile.has(e.projectile?.id)) {
        sturmpfeile.delete(e.projectile.id);
        blitz(e.dimension, e.location);
    }
});

// Die Spur, jeden zweiten Tick. Pfeile, die es nicht mehr gibt, fallen
// dabei aus der Liste.
system.runInterval(() => {
    for (const [kennung, flug] of fliegend) {
        try {
            if (!lebt(flug.pfeil)) {
                fliegend.delete(kennung);
                continue;
            }
            flug.pfeil.dimension.spawnParticle(SORTEN[flug.sorte].spur, flug.pfeil.location);
        } catch (fehler) {
            fliegend.delete(kennung);
        }
    }
}, 2);

// Erzpfeile in der Zweithand, Bogen in der Hand, aber kein gewoehnlicher
// Pfeil dabei: Dann spannt Minecraft nicht, und ohne Hinweis saehe das aus
// wie ein Fehler.
system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            const ausruestung = spieler.getComponent("minecraft:equippable");
            if (!BOEGEN.has(ausruestung?.getEquipment("Mainhand")?.typeId)) continue;
            if (!SORTEN[ausruestung.getEquipment("Offhand")?.typeId]) continue;
            if (kreativ(spieler)) continue;
            const inventar = spieler.getComponent("minecraft:inventory")?.container;
            if (!inventar) continue;
            let pfeile = 0;
            for (let i = 0; i < inventar.size; i++) {
                if (inventar.getItem(i)?.typeId === PFEIL) pfeile += 1;
            }
            if (pfeile === 0) {
                hinweis(spieler, "§7Für Erzpfeile braucht der Bogen einen normalen Pfeil im Inventar. Er wird nicht verbraucht.", 60);
            }
        } catch (fehler) {
            console.warn(`Erzpfeile, Hinweis: ${fehler}`);
        }
    }
}, 40);
