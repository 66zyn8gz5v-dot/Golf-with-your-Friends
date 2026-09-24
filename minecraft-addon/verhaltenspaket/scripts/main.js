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

            // Ein paar Schlieren vor der Brust, sobald geladen ist. In
            // der Aussenansicht sieht man die Fechtstellung, in der
            // Ego-Ansicht aber nur die eigene Hand - dort waere der Ton
            // sonst das einzige Zeichen, und Toene gehen im Kampf unter.
            const blick = spieler.getViewDirection();
            const ort = spieler.location;
            spieler.dimension.spawnParticle("fynn:degen_schliere", {
                x: ort.x + blick.x * 0.8,
                y: ort.y + 1.4,
                z: ort.z + blick.z * 0.8,
            });
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

// ---------------------------------------------------------------------
// Die Schmelze: unten der Feuerkasten, oben der Tiegel.
// ---------------------------------------------------------------------
//
// Das Legieren macht der Tiegel selbst: Er traegt die Komponente
// minecraft:crafting_table und ist damit eine eigene Werkbank. Die
// bringt die Oberflaeche mit, die Fynn wollte - Felder zum Hineinlegen,
// ein Ergebnisfeld und links das Rezeptbuch, das alle Legierungen zeigt,
// auch die, fuer die man gerade nichts dabei hat. Dafuer braucht es kein
// Skript; es reicht, dass die Rezepte die Marke "fynn_tiegel" tragen.
//
// Hier bleibt nur der Feuerkasten. Er nimmt Kohle - in die Hand nehmen,
// antippen, fertig, ohne Fenster - und laesst den Tiegel darueber
// gluehen, solange er brennt.
//
// Was die Werkbank nicht kann: nachsehen, ob es unten brennt. Eine
// Oberflaeche, die Minecraft mitbringt, laesst sich nicht an eine
// Bedingung haengen. Das Feuer ist damit vorerst Stimmung, keine
// Voraussetzung. Soll es eine werden, braucht es einen Zwischenschritt,
// den man anfassen kann - etwa Glut, die der Feuerkasten herstellt und
// die im Rezept steht.

const FEUERKASTEN = "fynn:feuerkasten";
const TIEGEL = "fynn:schmelztiegel";

// Wie lange eine Sorte traegt, in Ticks. Zwanzig sind eine Sekunde.
// Ein Kohleblock sind neun Stuecke, haelt aber achtmal so lange -
// dieselbe Rechnung wie in Minecrafts Ofen.
const BRENNDAUER = 1200;
const SORTEN = {
    "minecraft:coal":       { name: "Kohle",      dauer: BRENNDAUER },
    "minecraft:charcoal":   { name: "Holzkohle",  dauer: BRENNDAUER },
    "minecraft:coal_block": { name: "Kohleblock", dauer: BRENNDAUER * 8 },
};

// Wo gerade gefeuert wird und bis wann. Der Schluessel ist der Ort als
// Text, weil sich Orte nicht als Schluessel vergleichen lassen.
const feuer = new Map();

function ortAlsText(dimension, ort) {
    return dimension.id + ":" + ort.x + "," + ort.y + "," + ort.z;
}

const BRENNT = (an) => (an ? "an" : "aus");

function anzuenden(block, an) {
    try {
        block.setPermutation(block.permutation.withState("fynn:brennt", BRENNT(an)));
    } catch (fehler) {
        console.warn(`Feuerkasten, Zustand: ${fehler}`);
    }
}

/** Der Tiegel ueber dem Feuerkasten bekommt die Hitze von unten. */
function gluehen(feuerkasten, an) {
    try {
        const oben = feuerkasten.above();
        if (!oben || oben.typeId !== TIEGEL) return;
        if (oben.permutation.getAllStates()["fynn:brennt"] === BRENNT(an)) return;
        oben.setPermutation(oben.permutation.withState("fynn:brennt", BRENNT(an)));
    } catch (fehler) {
        console.warn(`Tiegel: ${fehler}`);
    }
}

function nachlegen(block, art) {
    const schluessel = ortAlsText(block.dimension, block.location);
    const herd = feuer.get(schluessel);
    if (herd) {
        // Nachgelegt wird angehaengt, nicht ersetzt - sonst waere es ein
        // Verlust, waehrend er noch brennt nachzulegen.
        herd.bis += SORTEN[art].dauer;
        return Math.round((herd.bis - system.currentTick) / 20);
    }
    feuer.set(schluessel, {
        bis: system.currentTick + SORTEN[art].dauer,
        dimension: block.dimension,
        ort: block.location,
    });
    anzuenden(block, true);
    gluehen(block, true);
    block.dimension.playSound("fire.ignite", block.location, { volume: 0.6 });
    return Math.round(SORTEN[art].dauer / 20);
}

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    try {
        if (e.block?.typeId !== FEUERKASTEN) return;
        const gehalten = e.beforeItemStack;
        const schluessel = ortAlsText(e.block.dimension, e.block.location);

        if (!gehalten || !SORTEN[gehalten.typeId]) {
            // Ohne Kohle in der Hand nur sagen, wie es steht. Ein Fenster
            // dafuer aufzumachen waere zu viel fuer eine Auskunft.
            const herd = feuer.get(schluessel);
            const noch = herd ? Math.max(0, Math.round((herd.bis - system.currentTick) / 20)) : 0;
            e.player.onScreenDisplay.setActionBar(noch > 0
                ? `§6Der Feuerkasten brennt noch ${noch} Sekunden.`
                : "§7Der Feuerkasten ist kalt. Nimm Kohle in die Hand.");
            return;
        }

        const noch = nachlegen(e.block, gehalten.typeId);
        e.player.onScreenDisplay.setActionBar(`§6Brennt noch ${noch} Sekunden.`);

        // Im Kreativmodus nimmt Minecraft ohnehin nichts weg.
        if (e.player.getGameMode?.() === "creative") return;
        const hand = e.player.getComponent("minecraft:equippable")
            ?.getEquipmentSlot("Mainhand");
        if (!hand) return;
        if (gehalten.amount > 1) {
            const rest = gehalten.clone();
            rest.amount = gehalten.amount - 1;
            hand.setItem(rest);
        } else {
            hand.setItem(undefined);
        }
    } catch (fehler) {
        console.warn(`Feuerkasten: ${fehler}`);
    }
});

// Einmal je Sekunde reicht: Feuer, das auf den Tick genau ausgeht, merkt
// niemand, und zwanzigmal haeufiger nachsehen kostet nur Rechenzeit.
system.runInterval(() => {
    try {
        for (const [schluessel, herd] of feuer) {
            const block = herd.dimension.getBlock(herd.ort);
            if (!block || block.typeId !== FEUERKASTEN) {
                feuer.delete(schluessel);      // abgebaut
                continue;
            }
            if (system.currentTick >= herd.bis) {
                anzuenden(block, false);
                gluehen(block, false);
                feuer.delete(schluessel);
                continue;
            }
            gluehen(block, true);
        }
    } catch (fehler) {
        console.warn(`Feuerkasten, Runde: ${fehler}`);
    }
}, 20);
