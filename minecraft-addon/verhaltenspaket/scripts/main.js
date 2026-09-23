// Der Sprungstoss des Degens.
//
// Alles andere am Sternenpaket sind Beschreibungen, die Minecraft liest.
// Das hier ist das einzige Stueck, das mitlaeuft, waehrend gespielt wird -
// und zwar, weil es keinen anderen Weg gibt: Einen Spieler nach vorn zu
// schieben kann keine Gegenstands-Komponente. Es gibt keine dafuer.
//
// Ein Fehler in dieser Datei laesst nicht nur den Stoss ausfallen,
// sondern kann das ganze Verhaltenspaket mitreissen - mit Silbererz,
// Sternenklinge und allem anderen. Deshalb faengt jeder Abschnitt seine
// Fehler selbst ab.

import { world, system } from "@minecraft/server";

const DEGEN = "fynn:degen";

// Wie lange geduckt werden muss, in Ticks. Zwanzig sind eine Sekunde.
const LADEZEIT = 15;

// Wie weit der Stoss traegt: eine Kraft, keine Entfernung. Zwei ergeben
// ungefaehr zwei Bloecke.
const WEITE = 2.0;

// Etwas Hoehe muss dazu, sonst klebt der Spieler am Boden und rutscht nur.
const HOEHE = 0.25;

// Der Aufschlag auf den Grundschaden.
const EXTRA = 5;

// Damit der Stoss nicht in Dauerschleife geht.
const PAUSE = 60;

// Warum gezaehlt und nicht auf die Taste gehoert: Minecraft meldet zwar
// das Druecken der Duck-Taste, aber auf einem Tastfeld nur fuer einen
// einzigen Tick - danach gilt sie als losgelassen, auch wenn der Finger
// liegen bleibt. Auf dem iPad waere das Aufladen damit nie moeglich.
// Der Zustand "duckt sich gerade" stimmt dagegen immer, egal ob Finger
// oder Umschalttaste.
//
// Und warum das Ducken und nicht die Angriffstaste: Minecraft meldet von
// allen Tasten nur Springen und Ducken. Die Angriffstaste kommt im Skript
// gar nicht an.
const zaehler = new Map();
const bereit = new Set();
const pause = new Map();

system.runInterval(() => {
    try {
        for (const spieler of world.getAllPlayers()) {
            pruefeSpieler(spieler);
        }
    } catch (fehler) {
        console.warn(`Degen, Schleife: ${fehler}`);
    }
}, 1);

function pruefeSpieler(spieler) {
    const kennung = spieler.id;
    const inDerHand = spieler
        .getComponent("minecraft:equippable")
        ?.getEquipment("Mainhand")?.typeId === DEGEN;

    if (!inDerHand) {
        zaehler.delete(kennung);
        bereit.delete(kennung);
        return;
    }

    if (spieler.isSneaking) {
        const stand = (zaehler.get(kennung) ?? 0) + 1;
        zaehler.set(kennung, stand);

        // Ein Ton, sobald genug geladen ist - sonst muesste man raten,
        // wann es so weit ist.
        if (stand === LADEZEIT && !bereit.has(kennung)) {
            bereit.add(kennung);
            spieler.dimension.playSound("random.orb", spieler.location,
                { volume: 0.4, pitch: 1.6 });
        }
        return;
    }

    // Nicht mehr geduckt: War lange genug geladen, geht der Stoss los.
    const stand = zaehler.get(kennung) ?? 0;
    zaehler.delete(kennung);
    bereit.delete(kennung);
    if (stand < LADEZEIT) return;

    const letzte = pause.get(kennung) ?? -PAUSE;
    if (system.currentTick - letzte < PAUSE) return;
    pause.set(kennung, system.currentTick);

    stossen(spieler);
}

function stossen(spieler) {
    try {
        const blick = spieler.getViewDirection();

        // Nur die waagerechte Richtung. Sonst schiesst ein Blick nach oben
        // den Spieler in den Himmel und einer nach unten in den Boden.
        const laenge = Math.sqrt(blick.x * blick.x + blick.z * blick.z) || 1;
        spieler.applyKnockback(
            { x: (blick.x / laenge) * WEITE, z: (blick.z / laenge) * WEITE },
            HOEHE,
        );
        spieler.dimension.playSound("mob.ravager.roar", spieler.location,
            { volume: 0.3, pitch: 1.8 });
        schlieren(spieler, blick);

        // Der Schaden kommt vier Ticks spaeter, wenn der Spieler schon
        // unterwegs ist - sonst traefe nur, wer ohnehin schon in
        // Reichweite stand, und das waere kein Sturmangriff.
        system.runTimeout(() => treffen(spieler, blick), 4);
    } catch (fehler) {
        console.warn(`Degen, Stoss: ${fehler}`);
    }
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

/**
 * Die Luftschlieren entlang der Stosslinie.
 *
 * Nicht eine Wolke an einer Stelle, sondern sechs Puffs hintereinander
 * auf der Strecke, die der Degen nimmt. Erst dadurch wird daraus ein
 * Zug durch die Luft und kein Knall.
 *
 * Auf Brusthoehe, nicht auf Fusshoehe: "location" eines Spielers ist der
 * Punkt zwischen seinen Fuessen.
 */
function schlieren(spieler, blick) {
    try {
        const ort = spieler.location;
        for (let schritt = 1; schritt <= 6; schritt++) {
            const weite = schritt * 0.45;
            spieler.dimension.spawnParticle("fynn:degen_schliere", {
                x: ort.x + blick.x * weite,
                y: ort.y + 1.3 + blick.y * weite,
                z: ort.z + blick.z * weite,
            });
        }
    } catch (fehler) {
        console.warn(`Degen, Schlieren: ${fehler}`);
    }
}
