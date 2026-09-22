// Der Sprungstoss des Degens.
//
// Alles andere am Sternenpaket sind Beschreibungen, die Minecraft liest.
// Das hier ist das erste Stueck, das mitlaeuft, waehrend gespielt wird -
// und zwar, weil es keinen anderen Weg gibt: Einen Spieler nach vorn zu
// schieben kann keine Gegenstands-Komponente. Es gibt keine dafuer.
//
// Was hier steht, muss vorsichtig geschrieben sein. Ein Fehler in dieser
// Datei laesst nicht nur den Stoss ausfallen, sondern kann das ganze
// Verhaltenspaket mitreissen - und damit Silbererz, Sternenklinge und
// alles andere. Deshalb faengt jeder Abschnitt seine Fehler selbst ab.

import { world, system } from "@minecraft/server";

const DEGEN = "fynn:degen";

// Wie lange gehalten werden muss, in Ticks. Zwanzig Ticks sind eine
// Sekunde; zwoelf sind lang genug, dass es sich nach Ausholen anfuehlt,
// und kurz genug, dass es mitten im Kampf zu schaffen ist.
const LADEZEIT = 12;

// Wie weit der Stoss traegt. Zwei Bloecke, wie gewuenscht - der Wert ist
// keine Entfernung, sondern eine Kraft, und zwei Bloecke sind das, was
// dabei ungefaehr herauskommt.
const WEITE = 2.0;

// Ein wenig Hoehe muss mit dazu. Ohne sie bleibt der Spieler am Boden
// kleben und rutscht nur, statt nach vorn zu setzen.
const HOEHE = 0.25;

// Der Aufschlag auf den Grundschaden des Degens.
const EXTRA = 5;

// Wer gerade laedt, und seit wann. Der Schluessel ist die Kennung des
// Spielers, damit im Mehrspielerbetrieb nicht einer den Stoss des
// anderen ausloest.
const laedt = new Map();

world.afterEvents.itemStartUse.subscribe((e) => {
    if (e.itemStack?.typeId !== DEGEN) return;
    laedt.set(e.source.id, system.currentTick);
});

/**
 * Das Ende der Ladung - egal, wodurch sie endet.
 *
 * Minecraft meldet drei verschiedene Enden: losgelassen, abgebrochen,
 * oder die Ladezeit des Gegenstands ist abgelaufen. Welches davon kommt,
 * haengt daran, wie lange gehalten wurde. Deshalb hoert dieser Abschnitt
 * auf alle drei und merkt sich, dass er schon ausgeloest hat.
 */
function ladungEndet(e) {
    try {
        if (e.itemStack?.typeId !== DEGEN) return;
        const spieler = e.source;
        const beginn = laedt.get(spieler.id);
        laedt.delete(spieler.id);
        if (beginn === undefined) return;
        if (system.currentTick - beginn < LADEZEIT) return;

        // Nur geduckt. So bleibt der gewoehnliche Schlag unberuehrt -
        // wer einfach nur zuschlaegt, soll nicht durch die Gegend
        // geschossen werden.
        if (!spieler.isSneaking) return;

        stossen(spieler);
    } catch (fehler) {
        // Ein Fehler hier darf den Rest des Pakets nicht mitnehmen.
        console.warn(`Degen, Ladung: ${fehler}`);
    }
}

world.afterEvents.itemReleaseUse.subscribe(ladungEndet);
world.afterEvents.itemStopUse.subscribe(ladungEndet);
world.afterEvents.itemCompleteUse.subscribe(ladungEndet);

function stossen(spieler) {
    const blick = spieler.getViewDirection();

    // Nur die waagerechte Richtung. Ohne das schiesst ein Blick nach oben
    // den Spieler in den Himmel und ein Blick nach unten in den Boden.
    const laenge = Math.sqrt(blick.x * blick.x + blick.z * blick.z) || 1;
    spieler.applyKnockback(
        { x: (blick.x / laenge) * WEITE, z: (blick.z / laenge) * WEITE },
        HOEHE,
    );

    spieler.dimension.playSound("mob.ravager.roar", spieler.location,
        { volume: 0.3, pitch: 1.8 });

    // Der Schaden kommt vier Ticks spaeter, wenn der Spieler schon
    // unterwegs ist. Sofort getroffen wuerde nur, wer schon vorher in
    // Reichweite stand - und das waere kein Sturmangriff, sondern ein
    // gewoehnlicher Schlag.
    system.runTimeout(() => treffen(spieler, blick), 4);
}

function treffen(spieler, blick) {
    try {
        const ort = spieler.location;
        const ziele = spieler.dimension.getEntities({
            location: {
                x: ort.x + blick.x * 2,
                y: ort.y + 1,
                z: ort.z + blick.z * 2,
            },
            maxDistance: 2.5,
            excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        });
        for (const ziel of ziele) {
            if (ziel.id === spieler.id) continue;
            ziel.applyDamage(EXTRA, {
                cause: "entityAttack",
                damagingEntity: spieler,
            });
        }
    } catch (fehler) {
        console.warn(`Degen, Treffer: ${fehler}`);
    }
}
