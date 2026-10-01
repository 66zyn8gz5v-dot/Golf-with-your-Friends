// Obst an den Baeumen: waechst von selbst an natuerlichen Blaettern,
// reift in vier Stufen und laesst sich ernten, ohne das Laub abzubauen.
// Block, Modelle und Bilder baut werkzeuge/obst_bauen.py.

import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";

const OBST = "fynn:obst";

// Welcher Baum was traegt.
export const BAUM = {
    "minecraft:oak_leaves": "apfel",
    "minecraft:birch_leaves": "birne",
    "minecraft:cherry_leaves": "pfirsich",
    "minecraft:acacia_leaves": "pfirsich",
    "minecraft:dark_oak_leaves": "pflaume",
};
export const FRUCHT = {
    apfel: "minecraft:apple",
    birne: "fynn:birne",
    pfirsich: "fynn:pfirsich",
    pflaume: "fynn:pflaume",
};

// Wie oft gesucht wird: alle fuenf Sekunden je Spieler 40 Stellen in
// 24 Bloecken Umkreis. Findet sich darunter ein freier Platz unter
// natuerlichem Laub, setzt eine Bluete mit dieser Chance an.
const SUCHE_TAKT = 100;
const SUCHE_STELLEN = 40;
const SUCHE_WEITE = 24;
const ANSETZEN = 0.2;
const JE_RUNDE = 2;

export function obstFuer(blatt) {
    if (!blatt) return undefined;
    const sorte = BAUM[blatt.typeId];
    if (!sorte) return undefined;
    // Nur an Baeumen, die gewachsen sind - nicht an Blaettern, die jemand
    // selbst gesetzt hat.
    try {
        if (blatt.permutation.getState("persistent_bit")) return undefined;
    } catch (e) {
        // Blaetter ohne diesen Zustand gelten als natuerlich
    }
    return sorte;
}

export function setzeBluete(dimension, ort, sorte) {
    const block = dimension.getBlock(ort);
    if (!block?.isAir) return false;
    block.setPermutation(BlockPermutation.resolve(OBST, { "fynn:sorte": sorte, "fynn:reife": 0 }));
    return true;
}

export function suche(spieler, wurf = Math.random) {
    let gesetzt = 0;
    const dimension = spieler.dimension;
    const mitte = spieler.location;
    for (let i = 0; i < SUCHE_STELLEN && gesetzt < JE_RUNDE; i++) {
        const ort = {
            x: Math.floor(mitte.x + (wurf() * 2 - 1) * SUCHE_WEITE),
            y: Math.floor(mitte.y + (wurf() * 2 - 1) * 10),
            z: Math.floor(mitte.z + (wurf() * 2 - 1) * SUCHE_WEITE),
        };
        let blatt;
        try {
            blatt = dimension.getBlock(ort);
        } catch (e) {
            continue;           // nicht geladen
        }
        const sorte = obstFuer(blatt);
        if (!sorte || wurf() >= ANSETZEN) continue;
        if (setzeBluete(dimension, { x: ort.x, y: ort.y - 1, z: ort.z }, sorte)) gesetzt++;
    }
    return gesetzt;
}

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            suche(spieler);
        } catch (fehler) {
            console.warn(`Obst, Suche: ${fehler}`);
        }
    }
}, SUCHE_TAKT);

// ------------------------------------------------------------ Wachsen und ernten

export function wachse(block, wurf = Math.random) {
    const oben = block.above();
    // Ohne Laub darueber faellt die Frucht ab - reif als Frucht, sonst nichts.
    if (!oben || !BAUM[oben.typeId]) {
        abfallen(block);
        return "ab";
    }
    const reife = block.permutation.getState("fynn:reife");
    if (reife < 3 && wurf() < 0.6) {
        block.setPermutation(block.permutation.withState("fynn:reife", reife + 1));
        return "reift";
    }
    return "wartet";
}

export function abfallen(block) {
    const p = block.permutation;
    if (p.getState("fynn:reife") === 3) {
        block.dimension.spawnItem(new ItemStack(FRUCHT[p.getState("fynn:sorte")], 1), block.center());
    }
    block.setPermutation(BlockPermutation.resolve("minecraft:air"));
}

export function ernte(block, spieler) {
    const p = block.permutation;
    if (p.getState("fynn:reife") !== 3) {
        spieler?.onScreenDisplay?.setActionBar("§7Noch nicht reif.");
        return false;
    }
    const sorte = p.getState("fynn:sorte");
    const anzahl = Math.random() < 0.3 ? 2 : 1;
    block.dimension.spawnItem(new ItemStack(FRUCHT[sorte], anzahl), block.center());
    try {
        block.dimension.playSound("block.sweet_berry_bush.pick", block.center(), { volume: 0.8, pitch: 1.1 });
    } catch (e) {
        // ohne Ton geht es auch
    }
    // Am Zweig setzt gleich eine neue, kleine Frucht an.
    block.setPermutation(p.withState("fynn:reife", 1));
    return true;
}

system.beforeEvents.startup.subscribe((e) => {
    e.blockComponentRegistry.registerCustomComponent("fynn:obst", {
        onTick(ereignis) {
            try {
                wachse(ereignis.block);
            } catch (fehler) {
                console.warn(`Obst, Wachsen: ${fehler}`);
            }
        },
        onPlayerInteract(ereignis) {
            system.run(() => {
                try {
                    ernte(ereignis.block, ereignis.player);
                } catch (fehler) {
                    console.warn(`Obst, Ernte: ${fehler}`);
                }
            });
        },
    });
});

// Wer eine reife Frucht abschlaegt statt sie zu pfluecken, bekommt sie auch.
world.afterEvents.playerBreakBlock.subscribe((e) => {
    try {
        const p = e.brokenBlockPermutation;
        if (p?.type?.id !== OBST || p.getState("fynn:reife") !== 3) return;
        e.dimension.spawnItem(new ItemStack(FRUCHT[p.getState("fynn:sorte")], 1), e.block.center());
    } catch (fehler) {
        console.warn(`Obst, Abschlagen: ${fehler}`);
    }
});
