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
import { angriffErlaubt, hinweis, verbrauche } from "./rollen.js";
import "./kampf.js";
import "./pfeile.js";

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
            hinweis(e.player, noch > 0
                ? `§6Der Feuerkasten brennt noch ${noch} Sekunden.`
                : "§7Der Feuerkasten ist kalt. Nimm Kohle in die Hand.");
            return;
        }

        const noch = nachlegen(e.block, gehalten.typeId);
        hinweis(e.player, `§6Brennt noch ${noch} Sekunden.`);

        // Im Kreativmodus nimmt Minecraft ohnehin nichts weg. Die
        // 2.0-Schnittstelle schreibt den Modus gross ("Creative"), die
        // alte klein - verglichen wird darum ohne Gross und Klein.
        if (String(e.player.getGameMode?.() ?? "").toLowerCase() === "creative") return;
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

// ---------------------------------------------------------------------
// Die Feuerstaebe: Flammen in der Hand und Feuerbaelle auf Knopfdruck.
// ---------------------------------------------------------------------
//
// Aufgeladen wird wie beim Degen: ducken und geduckt bleiben, bis es
// zischt und die Flammen auflodern - beim Aufstehen fliegt der Ball.
// Fynn wollte es ausdruecklich so. Gezaehlt wird der Zustand "duckt
// sich", nicht die Taste, aus demselben Grund wie beim Degen: Auf dem
// iPad meldet Minecraft die Taste nur fuer einen Tick.
//
// Die erste Fassung schoss beim Benutzen (antippen und halten). Das ist
// raus; die Staebe tragen dafuer auch kein use_modifiers mehr.
//
// Der Flug ist hier gerechnet, nicht Minecrafts Geschossen ueberlassen.
// Die erste Fassung hat den Ball mit der Geschoss-Schnittstelle
// abgeschossen - im Spiel blieb er neben dem Spieler in der Luft haengen,
// und wer hineinlief, brannte. Jetzt schaut der Ball jeden Tick mit einem
// Strahl eine Flugweite voraus: Ist dort ein Block oder ein Wesen, schlaegt
// er ein, sonst rueckt er vor.
//
// Feuerbaelle sind Sache des Magiers: Nur er kann sie aufladen, und jeder
// kostet ihn Mana. Schwingen kann den Stab jeder.
//
// Der Einschlag ist eine Explosion - Schaden, Rueckstoss, Knall -, aber
// ohne Bloecke zu zerstoeren und ohne Brand in der Welt. Ein Fehlschuss
// soll kein Haus sprengen oder abfackeln. Was direkt getroffen wird,
// brennt.

const FEUERSTAEBE = new Set(["fynn:feuerstab", "fynn:feuerstab_2"]);
const FEUERBALL = "fynn:feuerball";
const TEMPO = 1.2;              // Bloecke je Tick
const FLUGZEIT = 60;            // Ticks, dann verpufft er - gut 70 Bloecke
const WUCHT = 1.6;              // Explosion; ein Creeper hat 3
const BRANDDAUER = 5;           // Sekunden, die ein Getroffener brennt
const LADEZEIT_FEUER = 20;      // Ticks geduckt, eine Sekunde
const SPERRE = 18;              // Ticks zwischen zwei Schuessen
const KOSTEN_FEUER = 25;        // Mana je Ball: vier aus voller Leiste
const letzterSchuss = new Map();
const feuerLaden = new Map();   // Spieler -> Ticks geduckt
const fluege = new Map();

function haeltFeuerstab(spieler) {
    return FEUERSTAEBE.has(spieler.getComponent("minecraft:equippable")
        ?.getEquipment("Mainhand")?.typeId);
}

// In der 2.0-Schnittstelle ist isValid eine Eigenschaft, frueher eine
// Methode. Beides abfangen kostet nichts.
function lebt(wesen) {
    try {
        return typeof wesen.isValid === "function" ? wesen.isValid() : !!wesen.isValid;
    } catch (fehler) {
        return false;
    }
}

function flamme(dimension, ort, streuung) {
    dimension.spawnParticle("minecraft:basic_flame_particle", {
        x: ort.x + (Math.random() - 0.5) * streuung,
        y: ort.y + (Math.random() - 0.5) * streuung,
        z: ort.z + (Math.random() - 0.5) * streuung,
    });
}

function schiessen(spieler) {
    const jetzt = system.currentTick;
    if (jetzt - (letzterSchuss.get(spieler.id) ?? -SPERRE) < SPERRE) return;
    if (!angriffErlaubt(spieler, "magier", KOSTEN_FEUER)) return;
    letzterSchuss.set(spieler.id, jetzt);
    verbrauche(spieler, KOSTEN_FEUER);

    const blick = spieler.getViewDirection();
    const kopf = spieler.getHeadLocation();
    // Etwas vor dem Kopf starten, sonst trifft der Ball den Schuetzen.
    const start = {
        x: kopf.x + blick.x * 1.2,
        y: kopf.y + blick.y * 1.2 - 0.2,
        z: kopf.z + blick.z * 1.2,
    };
    const ball = spieler.dimension.spawnEntity(FEUERBALL, start);
    fluege.set(ball.id, { ball, richtung: blick, schuetze: spieler, alter: 0 });
    spieler.dimension.playSound("mob.blaze.shoot", start, { volume: 0.8 });
    for (let i = 0; i < 6; i++) flamme(spieler.dimension, start, 0.4);
}

// Aufladen, jeden Tick: geduckt zaehlen, bei voller Ladung ein Zeichen,
// beim Aufstehen schiessen - wenn genug geladen war.
system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            const kennung = spieler.id;
            if (!haeltFeuerstab(spieler)) {
                feuerLaden.delete(kennung);
                continue;
            }
            if (spieler.isSneaking) {
                const stand = (feuerLaden.get(kennung) ?? 0) + 1;
                feuerLaden.set(kennung, stand);
                // Wer kein Magier ist oder zu wenig Mana hat, bekommt es
                // gesagt, sobald er voll geladen haette - und kein Zischen.
                if (stand === LADEZEIT_FEUER && angriffErlaubt(spieler, "magier", KOSTEN_FEUER)) {
                    // Geladen: ein Zischen und ein Aufflackern vor der
                    // Brust. In der Ego-Ansicht waere der Ton sonst das
                    // einzige Zeichen, und Toene gehen im Kampf unter.
                    spieler.dimension.playSound("mob.blaze.breathe", spieler.location,
                        { volume: 0.6, pitch: 1.4 });
                    const blick = spieler.getViewDirection();
                    const kopf = spieler.getHeadLocation();
                    for (let i = 0; i < 8; i++) {
                        flamme(spieler.dimension, {
                            x: kopf.x + blick.x * 0.9,
                            y: kopf.y - 0.3,
                            z: kopf.z + blick.z * 0.9,
                        }, 0.6);
                    }
                }
                continue;
            }
            const stand = feuerLaden.get(kennung) ?? 0;
            feuerLaden.delete(kennung);
            if (stand >= LADEZEIT_FEUER) schiessen(spieler);
        } catch (fehler) {
            console.warn(`Feuerstab, Laden: ${fehler}`);
        }
    }
}, 1);

function einschlag(flug, ort, getroffen) {
    const dimension = flug.ball.dimension;
    try {
        flug.ball.remove();
    } catch (fehler) {
        // schon weg - dann eben ohne Ball
    }
    dimension.createExplosion(ort, WUCHT, {
        breaksBlocks: false,
        causesFire: false,
        source: lebt(flug.schuetze) ? flug.schuetze : undefined,
    });
    if (getroffen && lebt(getroffen)) getroffen.setOnFire(BRANDDAUER, true);
}

system.runInterval(() => {
    for (const [kennung, flug] of fluege) {
        try {
            if (!lebt(flug.ball)) {
                fluege.delete(kennung);
                continue;
            }
            const ort = flug.ball.location;
            const dimension = flug.ball.dimension;
            const r = flug.richtung;

            // Was liegt auf dieser Flugweite im Weg? Durchlaessiges wie Gras
            // und Blumen zaehlt nicht, Wasser auch nicht.
            const block = dimension.getBlockFromRay(ort, r, {
                maxDistance: TEMPO, includeLiquidBlocks: false, includePassableBlocks: false,
            });
            const wesen = dimension.getEntitiesFromRay(ort, r, { maxDistance: TEMPO })
                .filter((t) => t.entity.id !== flug.ball.id
                    && t.entity.id !== flug.schuetze?.id
                    && t.entity.typeId !== FEUERBALL
                    && t.entity.typeId !== "minecraft:item"
                    && t.entity.typeId !== "minecraft:xp_orb")
                .sort((a, b) => a.distance - b.distance)[0];

            if (wesen) {
                fluege.delete(kennung);
                einschlag(flug, wesen.entity.location, wesen.entity);
                continue;
            }
            if (block) {
                fluege.delete(kennung);
                const b = block.block.location;
                const f = block.faceLocation;
                einschlag(flug, { x: b.x + f.x, y: b.y + f.y, z: b.z + f.z }, null);
                continue;
            }

            flug.alter += 1;
            if (flug.alter > FLUGZEIT) {
                fluege.delete(kennung);
                for (let i = 0; i < 5; i++) flamme(dimension, ort, 0.5);
                flug.ball.remove();
                continue;
            }
            const weiter = { x: ort.x + r.x * TEMPO, y: ort.y + r.y * TEMPO, z: ort.z + r.z * TEMPO };
            flug.ball.teleport(weiter);
            flamme(dimension, ort, 0.2);
        } catch (fehler) {
            fluege.delete(kennung);
            console.warn(`Feuerstab, Flug: ${fehler}`);
        }
    }
}, 1);

// Flammen, solange ein Stab in der Hand liegt. Sie entstehen in der Welt,
// nicht am Modell - rechts vor dem Kopf, wo der Stab von innen gesehen
// liegt. Von aussen sieht man sie an der Schulter des Traegers.
system.runInterval(() => {
    try {
        for (const spieler of world.getAllPlayers()) {
            if (!haeltFeuerstab(spieler)) continue;
            const blick = spieler.getViewDirection();
            const kopf = spieler.getHeadLocation();
            // Rechts neben der Blickrichtung: in Minecraft zeigt x nach
            // Osten und z nach Sueden, rechts von (x, z) liegt (-z, x).
            const laenge = Math.hypot(blick.x, blick.z) || 1;
            const rechts = { x: -blick.z / laenge, z: blick.x / laenge };
            flamme(spieler.dimension, {
                x: kopf.x + blick.x * 0.8 + rechts.x * 0.45,
                y: kopf.y - 0.25,
                z: kopf.z + blick.z * 0.8 + rechts.z * 0.45,
            }, 0.15);
        }
    } catch (fehler) {
        console.warn(`Feuerstab, Flammen: ${fehler}`);
    }
}, 4);
