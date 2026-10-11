// Wenn Tiere aufeinandertreffen.
//
// Fynn (4.77): "Die Tiere sollen ein bisschen mehr miteinander und
// untereinander interagieren. Zum Beispiel der Wal jagt ja diesen
// Riesenkalmar." Wer wen jagt, vor wem wer flieht und wer sich wehrt, steht
// in den Tierdateien (werkzeuge/tiere_bauen.py: jagt, flieht, verteidigt).
// Was sich dort nicht sagen laesst, macht dieses Skript: Der Kampf zwischen
// Wal und Riesenkalmar soll man sehen und hoeren.
//
// * Rammt der Wal den Kalmar, stoesst der eine Wolke Tinte aus und wird
//   fuer einen Moment schneller - er versucht zu entkommen.
// * Packt der Kalmar den Wal, umschlingt er ihn mit den Armen: Der Wal wird
//   langsam, bis er sich losreisst.

import { world } from "@minecraft/server";

export const WAL = "fynn:wal";
export const KALMAR = "fynn:riesenkalmar";

export function walRammt(kalmar) {
    const o = kalmar.location;
    try {
        kalmar.dimension.spawnParticle("fynn:tintenwolke", { x: o.x, y: o.y + 0.6, z: o.z });
        kalmar.dimension.playSound("mob.squid.ink_squirt", o, { volume: 1.5, pitch: 0.6 });
        // Im Schutz der Tinte schiesst er davon.
        kalmar.addEffect("speed", 40, { amplifier: 2, showParticles: false });
    } catch (e) { /* egal */ }
    return "tinte";
}

export function kalmarUmschlingt(wal) {
    try {
        wal.addEffect("slowness", 60, { amplifier: 3, showParticles: false });
        wal.dimension.playSound("mob.squid.hurt", wal.location, { volume: 1.2, pitch: 0.5 });
        wal.dimension.spawnParticle("minecraft:bubble_column_up_particle", wal.location);
    } catch (e) { /* egal */ }
    return "umschlungen";
}

world.afterEvents.entityHurt.subscribe((e) => {
    try {
        const taeter = e.damageSource?.damagingEntity;
        const opfer = e.hurtEntity;
        if (!taeter || !opfer) return;
        if (taeter.typeId === WAL && opfer.typeId === KALMAR) walRammt(opfer);
        else if (taeter.typeId === KALMAR && opfer.typeId === WAL) kalmarUmschlingt(opfer);
    } catch (fehler) {
        console.warn(`Begegnungen: ${fehler}`);
    }
});
