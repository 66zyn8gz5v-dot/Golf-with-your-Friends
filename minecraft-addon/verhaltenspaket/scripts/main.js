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

import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

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
// Der Feuerkasten nimmt Kohle und brennt eine Weile. Der Tiegel darueber
// glueht mit, solange unter ihm gefeuert wird - er hat kein eigenes
// Feuer, er bekommt die Hitze von unten. Genau so hat Fynn es beschrieben,
// und genau so ist es auch gebaut: Der Tiegel fragt jeden Takt nach, was
// unter ihm steht.
//
// Was noch fehlt: die Metalle und das Legieren selbst. Das kommt, sobald
// entschieden ist, was womit was ergibt.

const FEUERKASTEN = "fynn:feuerkasten";
const TIEGEL = "fynn:schmelztiegel";

// Wie lange ein Stueck Kohle traegt, in Ticks. Sechzig Sekunden - so
// lange wie ein Ofen mit Holzkohle ungefaehr auch braucht.
const BRENNDAUER = 1200;

// Wo gerade gefeuert wird und bis wann. Der Schluessel ist der Ort als
// Text, weil sich Orte nicht als Schluessel vergleichen lassen.
const feuer = new Map();

function ortAlsText(dimension, ort) {
    return dimension.id + ":" + ort.x + "," + ort.y + "," + ort.z;
}

// Wie lange eine Sorte traegt. Ein Kohleblock sind neun Stuecke, haelt
// aber achtmal so lange - dieselbe Rechnung wie in Minecrafts Ofen.
const SORTEN = {
    "minecraft:coal":       { name: "Kohle",      bild: "textures/items/coal",        dauer: BRENNDAUER },
    "minecraft:charcoal":   { name: "Holzkohle",  bild: "textures/items/charcoal",    dauer: BRENNDAUER },
    "minecraft:coal_block": { name: "Kohleblock", bild: "textures/blocks/coal_block", dauer: BRENNDAUER * 8 },
};

function restzeit(schluessel) {
    const herd = feuer.get(schluessel);
    if (!herd) return 0;
    return Math.max(0, Math.round((herd.bis - system.currentTick) / 20));
}

/** Was der Spieler an Brennbarem dabei hat, je Sorte zusammengezaehlt. */
function vorratAnKohle(spieler) {
    const kiste = spieler.getComponent("minecraft:inventory")?.container;
    const gefunden = new Map();
    if (!kiste) return gefunden;
    for (let platz = 0; platz < kiste.size; platz++) {
        const stueck = kiste.getItem(platz);
        if (!stueck || !SORTEN[stueck.typeId]) continue;
        const bisher = gefunden.get(stueck.typeId);
        if (bisher) bisher.anzahl += stueck.amount;
        else gefunden.set(stueck.typeId, { anzahl: stueck.amount, platz });
    }
    return gefunden;
}

/** Ein Stueck der Sorte aus dem Inventar nehmen. Im Kreativmodus nicht. */
function kohleAbziehen(spieler, art) {
    if (spieler.getGameMode?.() === "creative") return true;
    const kiste = spieler.getComponent("minecraft:inventory")?.container;
    if (!kiste) return false;
    for (let platz = 0; platz < kiste.size; platz++) {
        const stueck = kiste.getItem(platz);
        if (!stueck || stueck.typeId !== art) continue;
        if (stueck.amount > 1) {
            const rest = stueck.clone();
            rest.amount = stueck.amount - 1;
            kiste.setItem(platz, rest);
        } else {
            kiste.setItem(platz, undefined);
        }
        return true;
    }
    return false;
}

function nachlegen(block, art) {
    const schluessel = ortAlsText(block.dimension, block.location);
    const dauer = SORTEN[art].dauer;
    const herd = feuer.get(schluessel);
    if (herd) {
        // Nachgelegt wird angehaengt, nicht ersetzt - sonst waere es ein
        // Verlust, waehrend er noch brennt nachzulegen.
        herd.bis += dauer;
        return;
    }
    feuer.set(schluessel, {
        bis: system.currentTick + dauer,
        dimension: block.dimension,
        ort: block.location,
    });
    anzuenden(block, true);
    block.dimension.playSound("fire.ignite", block.location, { volume: 0.6 });
}

/**
 * Das Fenster am Feuerkasten.
 *
 * Ein Fach, in das man Kohle hineinzieht, gibt es fuer eigene Bloecke in
 * Bedrock nicht - Behaelter kann nur Mojang. Was geht, ist ein Formular
 * mit Knoepfen. Jeder Knopf traegt das Bild seiner Sorte, damit es sich
 * anfuehlt wie ein Fach und nicht wie eine Liste.
 */
function feuerkastenFenster(spieler, block) {
    const schluessel = ortAlsText(block.dimension, block.location);
    const noch = restzeit(schluessel);
    const heiss = block.above()?.typeId === TIEGEL;

    const zeilen = [];
    zeilen.push(noch > 0
        ? `§eEs brennt noch ${noch} Sekunden.`
        : "§7Der Kasten ist kalt.");
    if (heiss) {
        zeilen.push(noch > 0
            ? "§7Der Tiegel darueber glueht mit."
            : "§7Darueber steht ein Tiegel. Er wartet auf Hitze.");
    }

    const vorrat = vorratAnKohle(spieler);
    const fenster = new ActionFormData().title("Feuerkasten");

    if (vorrat.size === 0) {
        zeilen.push("");
        zeilen.push("§cDu hast nichts dabei, was brennt.");
        fenster.body(zeilen.join("\n"));
        fenster.button("Zumachen");
        return { fenster, arten: [] };
    }

    zeilen.push("");
    zeilen.push("§7Antippen legt ein Stueck nach.");
    fenster.body(zeilen.join("\n"));

    const arten = [];
    for (const [art, was] of vorrat) {
        const sorte = SORTEN[art];
        const sekunden = Math.round(sorte.dauer / 20);
        fenster.button(`${sorte.name} (${was.anzahl})\n§7+${sekunden} s`, sorte.bild);
        arten.push(art);
    }
    fenster.button("Zumachen");
    return { fenster, arten };
}

/**
 * Formulare lassen sich nicht zeigen, solange der Spieler noch mit etwas
 * anderem beschaeftigt ist - beim Antippen ist das regelmaessig der Fall.
 * Deshalb wird es erneut versucht, statt still zu scheitern.
 */
function fensterZeigen(spieler, block, versuche = 10) {
    const { fenster, arten } = feuerkastenFenster(spieler, block);
    fenster.show(spieler).then((antwort) => {
        if (antwort.canceled) {
            if (antwort.cancelationReason === FormCancelationReason.UserBusy && versuche > 0) {
                system.runTimeout(() => fensterZeigen(spieler, block, versuche - 1), 10);
            }
            return;
        }
        const art = arten[antwort.selection];
        if (!art) return;                     // "Zumachen"
        const jetzt = block.dimension.getBlock(block.location);
        if (!jetzt || jetzt.typeId !== FEUERKASTEN) return;   // inzwischen abgebaut
        if (!kohleAbziehen(spieler, art)) return;
        nachlegen(jetzt, art);
        // Gleich wieder aufmachen: Wer nachlegt, legt meistens mehrfach nach.
        system.runTimeout(() => fensterZeigen(spieler, jetzt), 4);
    }).catch((fehler) => console.warn(`Feuerkasten, Fenster: ${fehler}`));
}

/**
 * Hat der Block ein echtes Fach? Seit Regelfassung 1.26.20 kann ein
 * eigener Block eines haben (minecraft:block_entity mit container), und
 * Minecraft macht es beim Antippen von selbst auf - wie bei einer Kiste.
 * Dann hat das Formular nichts mehr zu suchen.
 */
function fachVon(block) {
    try {
        return block.getComponent("minecraft:inventory")?.container;
    } catch (fehler) {
        return undefined;
    }
}

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    try {
        if (e.block?.typeId !== FEUERKASTEN) return;
        merkeOfen(e.block);
        // Nur wenn kein Fach da ist, springt das Formular ein.
        if (fachVon(e.block)) return;
        system.run(() => fensterZeigen(e.player, e.block));
    } catch (fehler) {
        console.warn(`Feuerkasten: ${fehler}`);
    }
});

// Der Zustand traegt seit Regelfassung 1.26.20 Woerter statt true und
// false - Wahrheitswerte sind dort nicht mehr erlaubt.
const BRENNT = (an) => (an ? "an" : "aus");

function anzuenden(block, an) {
    try {
        block.setPermutation(block.permutation.withState("fynn:brennt", BRENNT(an)));
    } catch (fehler) {
        console.warn(`Feuerkasten, Zustand: ${fehler}`);
    }
}

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
            const brennt = system.currentTick < herd.bis;
            if (!brennt) {
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


// ---------------------------------------------------------------------
// Der Tiegel: zwei Metalle hinein, eine Legierung heraus.
//
// Was drinliegt, steht in einer Welt-Eigenschaft je Ort. Eine Map im
// Skript waere einfacher, aber sie waere beim naechsten Weltstart leer -
// und ein Ofen, der ueber Nacht vergisst, was er haelt, frisst Barren.
// ---------------------------------------------------------------------

/** Wie viel von einer Sorte hineinpasst. */
const FASST = 8;

/**
 * Die Rezepte. Was hier steht, bestimmt zugleich, welche Metalle der
 * Tiegel ueberhaupt annimmt - er soll nichts schlucken, mit dem er
 * nichts anfangen kann.
 */
const REZEPTE = [
    {
        name: "Elektrum",
        zutaten: { "minecraft:gold_ingot": 1, "fynn:silberbarren": 1 },
        ergibt: "fynn:elektrumbarren",
        anzahl: 2,
        dauer: 100,     // fuenf Sekunden
    },
];

const METALLE = {
    "minecraft:gold_ingot": { name: "Gold", bild: "textures/items/gold_ingot" },
    "fynn:silberbarren": { name: "Silber", bild: "textures/items/silberbarren" },
    "fynn:elektrumbarren": { name: "Elektrum", bild: "textures/items/elektrumbarren" },
};

function nimmtAn(art) {
    return REZEPTE.some((r) => r.zutaten[art] !== undefined);
}

function metallName(art) {
    return METALLE[art]?.name ?? art;
}

// --- Was im Tiegel liegt ---------------------------------------------

function tiegelSchluessel(block) {
    return "tiegel:" + ortAlsText(block.dimension, block.location);
}

const LEER = () => ({ metalle: {}, schmilzt: null, fertig: null });

function tiegelLesen(block) {
    try {
        const roh = world.getDynamicProperty(tiegelSchluessel(block));
        if (typeof roh !== "string") return LEER();
        const stand = JSON.parse(roh);
        return {
            metalle: stand.metalle ?? {},
            schmilzt: stand.schmilzt ?? null,
            fertig: stand.fertig ?? null,
        };
    } catch (fehler) {
        console.warn(`Tiegel, Lesen: ${fehler}`);
        return LEER();
    }
}

function tiegelSchreiben(block, stand) {
    try {
        const leer = Object.keys(stand.metalle).length === 0
            && !stand.schmilzt && !stand.fertig;
        world.setDynamicProperty(tiegelSchluessel(block),
            leer ? undefined : JSON.stringify(stand));
    } catch (fehler) {
        console.warn(`Tiegel, Schreiben: ${fehler}`);
    }
}

/**
 * Den Stand holen und dabei nachziehen, was inzwischen fertig geworden
 * ist. Der Zeitpunkt steht in der Eigenschaft, nicht in einem Timer -
 * so wird auch abgerechnet, wenn die Welt zwischendurch zu war.
 */
function tiegelStand(block) {
    const stand = tiegelLesen(block);
    if (stand.schmilzt && system.currentTick >= stand.schmilzt.bis) {
        stand.fertig = {
            art: stand.schmilzt.art,
            anzahl: (stand.fertig?.art === stand.schmilzt.art ? stand.fertig.anzahl : 0)
                + stand.schmilzt.anzahl,
        };
        stand.schmilzt = null;
        tiegelSchreiben(block, stand);
    }
    return stand;
}

function glueht(block) {
    try {
        return block.permutation.getState("fynn:brennt") === "an";
    } catch (fehler) {
        return false;
    }
}

// --- Rechnen ---------------------------------------------------------

/** Wie oft ein Rezept aus dem laeuft, was drinliegt. */
function wieOft(rezept, metalle) {
    let mal = Infinity;
    for (const [art, menge] of Object.entries(rezept.zutaten)) {
        mal = Math.min(mal, Math.floor((metalle[art] ?? 0) / menge));
    }
    return Number.isFinite(mal) ? mal : 0;
}

function inventarGeben(spieler, art, anzahl) {
    const kiste = spieler.getComponent("minecraft:inventory")?.container;
    if (!kiste) return false;
    let rest = anzahl;
    while (rest > 0) {
        const haufen = Math.min(rest, 64);
        const stueck = new ItemStack(art, haufen);
        // Passt nichts mehr hinein, faellt der Rest vor die Fuesse -
        // besser als ihn verschwinden zu lassen.
        const uebrig = kiste.addItem(stueck);
        if (uebrig) {
            spieler.dimension.spawnItem(uebrig, spieler.location);
        }
        rest -= haufen;
    }
    return true;
}

function metallAbziehen(spieler, art) {
    if (spieler.getGameMode?.() === "creative") return true;
    const kiste = spieler.getComponent("minecraft:inventory")?.container;
    if (!kiste) return false;
    for (let platz = 0; platz < kiste.size; platz++) {
        const stueck = kiste.getItem(platz);
        if (!stueck || stueck.typeId !== art) continue;
        if (stueck.amount > 1) {
            const rest = stueck.clone();
            rest.amount = stueck.amount - 1;
            kiste.setItem(platz, rest);
        } else {
            kiste.setItem(platz, undefined);
        }
        return true;
    }
    return false;
}

/** Was der Spieler an einlegbaren Metallen dabei hat. */
function vorratAnMetall(spieler) {
    const kiste = spieler.getComponent("minecraft:inventory")?.container;
    const gefunden = new Map();
    if (!kiste) return gefunden;
    for (let platz = 0; platz < kiste.size; platz++) {
        const stueck = kiste.getItem(platz);
        if (!stueck || !nimmtAn(stueck.typeId)) continue;
        gefunden.set(stueck.typeId, (gefunden.get(stueck.typeId) ?? 0) + stueck.amount);
    }
    return gefunden;
}

// --- Das Fenster am Tiegel -------------------------------------------

function tiegelFenster(spieler, block) {
    const stand = tiegelStand(block);
    const heiss = glueht(block);
    const fenster = new ActionFormData().title("Schmelztiegel");
    const zeilen = [];
    const knoepfe = [];   // was jeder Knopf tut, in derselben Reihenfolge

    // Kopf: was drinliegt.
    const drin = Object.entries(stand.metalle).filter(([, n]) => n > 0);
    if (drin.length === 0) {
        // "Leer" nur, wenn wirklich nichts los ist. Waehrend etwas
        // schmilzt, sind die Zutaten zwar verbraucht - aber dann steht
        // unten, was gerade passiert, und "leer" darueber verwirrt nur.
        if (!stand.schmilzt && !stand.fertig) zeilen.push("§7Der Tiegel ist leer.");
    } else {
        zeilen.push("§fDrin liegen:");
        for (const [art, anzahl] of drin) {
            zeilen.push(`  §e${anzahl}§f × ${metallName(art)}`);
        }
    }
    zeilen.push(heiss ? "§6Er glueht." : "§7Er ist kalt - unten muss Kohle brennen.");

    if (stand.schmilzt) {
        const noch = Math.max(0, Math.round((stand.schmilzt.bis - system.currentTick) / 20));
        zeilen.push("");
        zeilen.push(`§6Es schmilzt noch ${noch} Sekunden.`);
    }

    if (stand.fertig) {
        zeilen.push("");
        zeilen.push(`§aFertig: ${stand.fertig.anzahl} × ${metallName(stand.fertig.art)}`);
        fenster.button(`Herausnehmen\n§7${stand.fertig.anzahl} × ${metallName(stand.fertig.art)}`,
            METALLE[stand.fertig.art]?.bild);
        knoepfe.push({ tun: "holen" });
    }

    // Einlegen - nur, wenn gerade nichts schmilzt.
    if (!stand.schmilzt) {
        for (const [art, dabei] of vorratAnMetall(spieler)) {
            const schon = stand.metalle[art] ?? 0;
            if (schon >= FASST) continue;
            fenster.button(`${metallName(art)} einlegen\n§7dabei: ${dabei}, drin: ${schon}/${FASST}`,
                METALLE[art]?.bild);
            knoepfe.push({ tun: "einlegen", art });
        }

        for (const rezept of REZEPTE) {
            const mal = wieOft(rezept, stand.metalle);
            if (mal < 1) continue;
            const braucht = Object.entries(rezept.zutaten)
                .map(([a, m]) => `${m * mal} ${metallName(a)}`).join(" + ");
            fenster.button(`${rezept.name} schmelzen\n§7${braucht} → ${rezept.anzahl * mal}`,
                METALLE[rezept.ergibt]?.bild);
            knoepfe.push({ tun: "schmelzen", rezept, mal });
        }
    }

    if (drin.length > 0 && !stand.schmilzt) {
        fenster.button("Alles zurueckholen");
        knoepfe.push({ tun: "leeren" });
    }
    fenster.button("Zumachen");
    knoepfe.push({ tun: "zu" });

    fenster.body(zeilen.join("\n"));
    return { fenster, knoepfe };
}

function tiegelZeigen(spieler, block, versuche = 10) {
    const { fenster, knoepfe } = tiegelFenster(spieler, block);
    fenster.show(spieler).then((antwort) => {
        if (antwort.canceled) {
            if (antwort.cancelationReason === FormCancelationReason.UserBusy && versuche > 0) {
                system.runTimeout(() => tiegelZeigen(spieler, block, versuche - 1), 10);
            }
            return;
        }
        const wahl = knoepfe[antwort.selection];
        if (!wahl || wahl.tun === "zu") return;

        const jetzt = block.dimension.getBlock(block.location);
        if (!jetzt || jetzt.typeId !== TIEGEL) return;
        const stand = tiegelStand(jetzt);

        if (wahl.tun === "holen" && stand.fertig) {
            inventarGeben(spieler, stand.fertig.art, stand.fertig.anzahl);
            stand.fertig = null;
            tiegelSchreiben(jetzt, stand);

        } else if (wahl.tun === "einlegen") {
            const schon = stand.metalle[wahl.art] ?? 0;
            if (schon < FASST && metallAbziehen(spieler, wahl.art)) {
                stand.metalle[wahl.art] = schon + 1;
                tiegelSchreiben(jetzt, stand);
                jetzt.dimension.playSound("random.pop", jetzt.location, { volume: 0.5 });
            }

        } else if (wahl.tun === "leeren") {
            for (const [art, anzahl] of Object.entries(stand.metalle)) {
                if (anzahl > 0) inventarGeben(spieler, art, anzahl);
            }
            stand.metalle = {};
            tiegelSchreiben(jetzt, stand);

        } else if (wahl.tun === "schmelzen") {
            if (!glueht(jetzt)) {
                spieler.sendMessage("§cDer Tiegel ist kalt. Leg unten Kohle nach.");
            } else {
                const { rezept, mal } = wahl;
                for (const [art, menge] of Object.entries(rezept.zutaten)) {
                    stand.metalle[art] -= menge * mal;
                    if (stand.metalle[art] <= 0) delete stand.metalle[art];
                }
                stand.schmilzt = {
                    art: rezept.ergibt,
                    anzahl: rezept.anzahl * mal,
                    bis: system.currentTick + rezept.dauer,
                };
                tiegelSchreiben(jetzt, stand);
                jetzt.dimension.playSound("random.fizz", jetzt.location, { volume: 0.7 });
            }
        }
        // Wieder aufmachen: Einlegen macht man mehrfach, und nach dem
        // Schmelzen will man sehen, wie lange es noch dauert.
        system.runTimeout(() => tiegelZeigen(spieler, jetzt), 4);
    }).catch((fehler) => console.warn(`Tiegel, Fenster: ${fehler}`));
}

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    try {
        if (e.block?.typeId !== TIEGEL) return;
        merkeOfen(e.block);
        if (fachVon(e.block)) return;
        system.run(() => tiegelZeigen(e.player, e.block));
    } catch (fehler) {
        console.warn(`Tiegel: ${fehler}`);
    }
});

/**
 * Wird der Tiegel abgebaut, faellt heraus, was drinliegt. Sonst waeren
 * die Barren weg - und eine Eigenschaft bliebe als Muell in der Welt
 * stehen, fuer einen Block, den es nicht mehr gibt.
 */
world.afterEvents.playerBreakBlock.subscribe((e) => {
    try {
        if (e.brokenBlockPermutation?.type?.id !== TIEGEL) return;
        const block = e.block;
        const stand = tiegelLesen(block);
        const alles = { ...stand.metalle };
        for (const teil of [stand.schmilzt, stand.fertig]) {
            if (teil) alles[teil.art] = (alles[teil.art] ?? 0) + teil.anzahl;
        }
        for (const [art, anzahl] of Object.entries(alles)) {
            for (let rest = anzahl; rest > 0; rest -= 64) {
                e.dimension.spawnItem(new ItemStack(art, Math.min(rest, 64)),
                    block.center ? block.center() : block.location);
            }
        }
        world.setDynamicProperty(tiegelSchluessel(block), undefined);
    } catch (fehler) {
        console.warn(`Tiegel, Abbau: ${fehler}`);
    }
});


// ---------------------------------------------------------------------
// Der Ofen mit echten Faechern.
//
// Seit Regelfassung 1.26.20 kann ein eigener Block ein Fach tragen, und
// Minecraft macht es beim Antippen von selbst auf. Damit liegt die Kohle
// im Feuerkasten und die Metalle im Tiegel - wie bei Mojangs Ofen, nur
// auf zwei Bloecke verteilt.
//
// Ein Haken bleibt: Wird etwas ins Fach gelegt, sagt das niemand an. Es
// gibt kein Ereignis dafuer. Also wird jede Sekunde nachgesehen - aber
// nur bei den Oefen, von denen wir wissen. Die Liste steht in der Welt,
// damit sie einen Neustart uebersteht.
// ---------------------------------------------------------------------

const OEFEN_LISTE = "oefen";

function oefenLesen() {
    try {
        const roh = world.getDynamicProperty(OEFEN_LISTE);
        return typeof roh === "string" ? JSON.parse(roh) : [];
    } catch (fehler) {
        return [];
    }
}

function oefenSchreiben(liste) {
    try {
        world.setDynamicProperty(OEFEN_LISTE,
            liste.length ? JSON.stringify(liste.slice(-200)) : undefined);
    } catch (fehler) {
        console.warn(`Oefen, Liste: ${fehler}`);
    }
}

function merkeOfen(block) {
    try {
        const eintrag = { d: block.dimension.id, x: block.location.x,
                          y: block.location.y, z: block.location.z };
        const liste = oefenLesen();
        if (liste.some((o) => o.d === eintrag.d && o.x === eintrag.x
                           && o.y === eintrag.y && o.z === eintrag.z)) return;
        liste.push(eintrag);
        oefenSchreiben(liste);
    } catch (fehler) {
        console.warn(`Oefen, Merken: ${fehler}`);
    }
}

world.afterEvents.playerPlaceBlock.subscribe((e) => {
    try {
        if (e.block?.typeId === FEUERKASTEN || e.block?.typeId === TIEGEL) {
            merkeOfen(e.block);
        }
    } catch (fehler) {
        console.warn(`Oefen, Setzen: ${fehler}`);
    }
});

/** Ein Stueck aus einem Fach nehmen. */
function ausFachNehmen(fach, platz) {
    const stueck = fach.getItem(platz);
    if (!stueck) return undefined;
    if (stueck.amount > 1) {
        const rest = stueck.clone();
        rest.amount = stueck.amount - 1;
        fach.setItem(platz, rest);
    } else {
        fach.setItem(platz, undefined);
    }
    return stueck.typeId;
}

/** Kohle im Fach? Dann anzuenden. */
function feuerkastenTakt(block) {
    const fach = fachVon(block);
    if (!fach) return;
    const schluessel = ortAlsText(block.dimension, block.location);
    if (feuer.has(schluessel)) return;         // brennt schon
    const stueck = fach.getItem(0);
    if (!stueck || !SORTEN[stueck.typeId]) return;
    const art = ausFachNehmen(fach, 0);
    if (art) nachlegen(block, art);
}

/**
 * Zwei Metalle im Fach, und es glueht? Dann schmelzen. Das Ergebnis
 * kommt in dasselbe Fach zurueck, sobald Platz ist - so wie ein Ofen
 * sein Ergebnis auch dort ablegt, wo man es holt.
 */
function tiegelTakt(block) {
    const fach = fachVon(block);
    if (!fach) return;
    // Das letzte Fach gehoert dem Ergebnis, wie beim Ofen. Ohne eigenes
    // Fach blieb der Tiegel stecken, sobald beide Zutatenfaecher belegt
    // waren: Das Fertige hatte keinen Platz und wurde nie ausgegeben.
    const ERGEBNIS = fach.size - 1;
    const stand = tiegelStand(block);

    if (stand.fertig) {
        const drin = fach.getItem(ERGEBNIS);
        if (!drin || drin.typeId === stand.fertig.art) {
            const schon = drin ? drin.amount : 0;
            const passt = Math.min(stand.fertig.anzahl, 64 - schon);
            if (passt > 0) {
                fach.setItem(ERGEBNIS, new ItemStack(stand.fertig.art, schon + passt));
                stand.fertig.anzahl -= passt;
                if (stand.fertig.anzahl <= 0) stand.fertig = null;
                tiegelSchreiben(block, stand);
            }
        }
        return;
    }
    if (stand.schmilzt) return;
    if (!glueht(block)) return;

    // Was liegt in den Faechern?
    const drin = {};
    const plaetze = {};
    for (let platz = 0; platz < ERGEBNIS; platz++) {
        const stueck = fach.getItem(platz);
        if (!stueck || !nimmtAn(stueck.typeId)) continue;
        drin[stueck.typeId] = (drin[stueck.typeId] ?? 0) + stueck.amount;
        (plaetze[stueck.typeId] ??= []).push(platz);
    }

    for (const rezept of REZEPTE) {
        const mal = wieOft(rezept, drin);
        if (mal < 1) continue;
        // Nur einen Durchgang je Takt - so sieht man dem Ofen beim
        // Arbeiten zu, statt dass alles auf einen Schlag verschwindet.
        for (const [art, menge] of Object.entries(rezept.zutaten)) {
            let offen = menge;
            for (const platz of plaetze[art]) {
                while (offen > 0) {
                    const weg = ausFachNehmen(fach, platz);
                    if (!weg) break;
                    offen--;
                }
                if (offen <= 0) break;
            }
        }
        stand.schmilzt = {
            art: rezept.ergibt,
            anzahl: rezept.anzahl,
            bis: system.currentTick + rezept.dauer,
        };
        tiegelSchreiben(block, stand);
        block.dimension.playSound("random.fizz", block.location, { volume: 0.5 });
        return;
    }
}

system.runInterval(() => {
    try {
        const liste = oefenLesen();
        const bleiben = [];
        for (const o of liste) {
            let block;
            try {
                block = world.getDimension(o.d).getBlock({ x: o.x, y: o.y, z: o.z });
            } catch (fehler) {
                bleiben.push(o);      // Teil der Welt nicht geladen - spaeter wieder
                continue;
            }
            if (!block) { bleiben.push(o); continue; }
            if (block.typeId === FEUERKASTEN) { bleiben.push(o); feuerkastenTakt(block); }
            else if (block.typeId === TIEGEL) { bleiben.push(o); tiegelTakt(block); }
            // Steht dort nichts von uns mehr, faellt der Eintrag weg.
        }
        if (bleiben.length !== liste.length) oefenSchreiben(bleiben);
    } catch (fehler) {
        console.warn(`Oefen, Runde: ${fehler}`);
    }
}, 20);
