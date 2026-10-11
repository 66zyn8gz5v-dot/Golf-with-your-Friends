// Der Bandenchef pfeift nach Verstaerkung.
//
// Das kann keine Datei: Ein Ereignis beim Unterschreiten der halben
// Lebensleiste gibt es in den Komponenten nicht, und einmal gerufen darf er
// nicht jedes Mal wieder rufen - sonst waechst die Bande mit jedem Treffer.
// Darum merkt er sich das Rufen an sich selbst (dynamische Eigenschaft);
// so gilt es auch nach dem Neuladen der Welt noch.

import { world } from "@minecraft/server";

const CHEF = "fynn:bandenchef";
const GERUFEN = "fynn:gerufen";
// Um den Chef herum, damit die beiden nicht in ihm stehen.
const PLAETZE = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]];

function frei(dimension, ort) {
    try {
        const fuss = dimension.getBlock(ort);
        const kopf = dimension.getBlock({ x: ort.x, y: ort.y + 1, z: ort.z });
        return !!fuss && !!kopf && fuss.isAir && kopf.isAir;
    } catch (e) {
        return false;
    }
}

export function rufeVerstaerkung(chef) {
    if (chef?.typeId !== CHEF) return false;
    const leben = chef.getComponent("minecraft:health");
    if (!leben || leben.currentValue <= 0 || leben.currentValue > leben.effectiveMax / 2) return false;
    if (chef.getDynamicProperty(GERUFEN)) return false;
    chef.setDynamicProperty(GERUFEN, true);

    const dimension = chef.dimension;
    const { x, y, z } = chef.location;
    let gekommen = 0;
    for (const [dx, dz] of PLAETZE) {
        if (gekommen === 2) break;
        const ort = { x: Math.floor(x) + dx + 0.5, y: Math.floor(y), z: Math.floor(z) + dz + 0.5 };
        if (!frei(dimension, ort)) continue;
        dimension.spawnEntity("fynn:bandit", ort);
        gekommen++;
    }
    // Kein Platz ringsum (Hoehle, Dickicht): dann eben direkt beim Chef.
    for (; gekommen < 2; gekommen++) dimension.spawnEntity("fynn:bandit", chef.location);
    try {
        dimension.playSound("raid.horn", chef.location, { volume: 1.5, pitch: 1.4 });
    } catch (e) {
        // ohne Ton geht es auch
    }
    for (const spieler of dimension.getPlayers({ location: chef.location, maxDistance: 32 })) {
        spieler.onScreenDisplay?.setActionBar("§cDer Bandenchef pfeift nach Verstärkung!");
    }
    return true;
}

world.afterEvents.entityHurt.subscribe((e) => {
    try {
        if (e.hurtEntity?.typeId === CHEF) rufeVerstaerkung(e.hurtEntity);
    } catch (fehler) {
        console.warn(`Banditen, Verstaerkung: ${fehler}`);
    }
});
