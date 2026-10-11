// Die Rollen: Ritter, Magier, Bogenschuetze, Assassine.
//
// Gewaehlt wird am Rollenaltar - antippen, ein Fenster mit vier Knoepfen.
// Die Rolle haengt am Spieler selbst (eine Eigenschaft, die Minecraft mit
// der Welt speichert), sie ueberlebt also Tod und Neustart. Wechseln geht
// jederzeit am Altar.
//
// Seit 4.67 kommen Kraft, Staerke und die aufgeladenen Angriffe von der
// Waffe in der Hand, nicht mehr von der Rolle (Fynn: "Die Effekte und
// Faehigkeiten sollen von Waffen ausgehen"). Die Rolle bestimmt noch die
// Startausruestung im Tempel und welche Leiste man sieht, wenn man keine
// Waffe haelt.
//
// Jede Kampfart hat eine Kraft, die sich von selbst auffuellt: der Magier
// Mana, die anderen Ausdauer, Fokus oder Schatten. Es ist ein Vorrat fuer
// alle Arten - wer die Waffe wechselt, nimmt ihn mit. Die aufgeladenen
// Angriffe kosten davon. Angezeigt wird sie als Kugelreihe ueber der
// Schnellleiste - nicht im Chat, das wollte Fynn ausdruecklich nicht.
// Die Kugeln sind Bilder aus font/glyph_E3.png, die an Stelle von
// Schriftzeichen stehen; mehr als diese eine Zeile ueber der
// Schnellleiste laesst sich ohne Umbau der Spieloberflaeche nicht
// beschreiben.
//
// Dazu gibt jede Waffenart eine kleine Staerke, solange man die Waffe in
// der Hand haelt. Aufgefrischt wird sie jede halbe Sekunde mit anderthalb
// Sekunden Dauer: Sie laeuft nie aus, verschwindet aber kurz nach dem
// Wegstecken der Waffe.

import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { artInDerHand, waffeInDerHand } from "./waffenarten.js";
import { fehlendeWerte, kostenRabatt, kraftBonus } from "./faehigkeiten.js";

export const ROLLENALTAR = "fynn:rollenaltar";
export const KRAFT_MAX = 100;
const ROLLE_SCHLUESSEL = "fynn:rolle";
const KRAFT_SCHLUESSEL = "fynn:kraft";

// "feld" ist die Nummer der vollen Kugel in glyph_E3.png; die halbe
// liegt vier Felder dahinter, die leere auf Feld 0.
export const ROLLEN = {
    ritter: {
        name: "Ritter", farbe: "§6", kraft: "Ausdauer", feld: 1,
        bild: "textures/items/ritterhelm",
        kurz: "Wirbelschlag · hält mehr aus",
        wirkung: { id: "resistance", stufe: 0 },
        nachschub: 1,
    },
    magier: {
        name: "Magier", farbe: "§9", kraft: "Mana", feld: 2,
        bild: "textures/items/feuerstab_2",
        kurz: "Feuerball · feuerfest",
        wirkung: { id: "fire_resistance", stufe: 0 },
        // Der Magier lebt von seiner Kraft, also kommt sie doppelt so
        // schnell wieder.
        nachschub: 2,
    },
    bogenschuetze: {
        name: "Bogenschütze", farbe: "§a", kraft: "Fokus", feld: 3,
        bild: "textures/items/bow_standby",
        kurz: "Pfeilhagel · springt höher",
        // Hoch hinaus, wo man ueber die Koepfe schiessen kann.
        wirkung: { id: "jump_boost", stufe: 0 },
        nachschub: 1,
    },
    assassine: {
        name: "Assassine", farbe: "§c", kraft: "Schatten", feld: 4,
        bild: "textures/items/eisendolche",
        kurz: "Schattensprung · flink",
        // Leichtfuessig und schneller als die anderen - so steht es in
        // PLAN.md, seit Fynn die Rollen zum ersten Mal beschrieben hat.
        wirkung: { id: "speed", stufe: 0 },
        nachschub: 1,
    },
};
export const REIHENFOLGE = ["ritter", "magier", "bogenschuetze", "assassine"];

const zeichen = (feld) => String.fromCharCode(0xe300 + feld);
const STERN = 9;

// Die Ruestung jeder Rolle. Wer alle vier Teile traegt, bekommt die Kraft
// schneller zurueck (einen Punkt mehr je halbe Sekunde), und hinter der
// Leiste steht ein goldener Stern.
const SETS = {
    ritter: ["fynn:ritterhelm", "fynn:ritterbrustpanzer", "fynn:ritterbeinschutz", "fynn:ritterstiefel"],
    magier: ["fynn:magierhut", "fynn:magierrobe", "fynn:magierrock", "fynn:magierschuhe"],
    bogenschuetze: ["fynn:waldlaeuferkapuze", "fynn:waldlaeuferwams", "fynn:waldlaeuferhose",
        "fynn:waldlaeuferstiefel"],
    assassine: ["fynn:assassinenkapuze", "fynn:assassinenharnisch", "fynn:assassinenhose",
        "fynn:assassinenstiefel"],
};
const PLAETZE = ["Head", "Chest", "Legs", "Feet"];

export function vollesSet(spieler, rolle) {
    try {
        const ausruestung = spieler.getComponent("minecraft:equippable");
        if (!ausruestung || !SETS[rolle]) return false;
        return PLAETZE.every((platz, i) => ausruestung.getEquipment(platz)?.typeId === SETS[rolle][i]);
    } catch (fehler) {
        return false;
    }
}

// ------------------------------------------------------------ Speicher

// Die Kraft steht im Speicher und zusaetzlich am Spieler, damit sie ein
// Neuladen der Welt uebersteht. Gelesen wird am Spieler nur einmal.
const kraft = new Map();

export function rolleVon(spieler) {
    try {
        const r = spieler.getDynamicProperty(ROLLE_SCHLUESSEL);
        return ROLLEN[r] ? r : undefined;
    } catch (fehler) {
        return undefined;
    }
}

export function kraftVon(spieler) {
    if (!kraft.has(spieler.id)) {
        let gespeichert;
        try {
            gespeichert = spieler.getDynamicProperty(KRAFT_SCHLUESSEL);
        } catch (fehler) {
            // ohne Speicher eben mit halber Kraft anfangen
        }
        kraft.set(spieler.id, typeof gespeichert === "number" ? gespeichert : KRAFT_MAX / 2);
    }
    return kraft.get(spieler.id);
}

function setzeKraft(spieler, wert) {
    const neu = Math.max(0, Math.min(KRAFT_MAX, wert));
    if (neu === kraft.get(spieler.id)) return;
    kraft.set(spieler.id, neu);
    try {
        spieler.setDynamicProperty(KRAFT_SCHLUESSEL, neu);
    } catch (fehler) {
        console.warn(`Rollen, Kraft speichern: ${fehler}`);
    }
}

// ------------------------------------------------------------ Anzeige

// Kurze Meldungen stehen eine Zeile ueber der Kraftleiste, statt sie zu
// ersetzen - sonst verschwaende die Leiste bei jedem Hinweis.
const hinweise = new Map();

export function hinweis(spieler, text, dauer = 50) {
    hinweise.set(spieler.id, { text, bis: system.currentTick + dauer });
    zeige(spieler);
}

function leiste(spieler, rolle) {
    const r = ROLLEN[rolle];
    const wert = kraftVon(spieler);
    let kugeln = "";
    for (let i = 0; i < 10; i++) {
        const rest = wert - i * 10;
        kugeln += zeichen(rest >= 10 ? r.feld : rest >= 5 ? r.feld + 4 : 0);
    }
    if (vollesSet(spieler, rolle)) kugeln += zeichen(STERN);
    // Weiss vor den Kugeln, damit die Schriftfarbe sie nicht einfaerbt.
    return `${r.farbe}${r.kraft} §f${kugeln}`;
}

function zeige(spieler) {
    try {
        const zeilen = [];
        const h = hinweise.get(spieler.id);
        if (h && h.bis > system.currentTick) zeilen.push(h.text);
        else hinweise.delete(spieler.id);
        const art = anzeigeArt(spieler);
        if (art) zeilen.push(leiste(spieler, art));
        if (zeilen.length) spieler.onScreenDisplay.setActionBar(zeilen.join("\n"));
    } catch (fehler) {
        console.warn(`Rollen, Anzeige: ${fehler}`);
    }
}

/** Welche Leiste zu sehen ist: die der Waffe in der Hand, sonst die der Rolle. */
export function anzeigeArt(spieler) {
    return artInDerHand(spieler) ?? rolleVon(spieler);
}

// ------------------------------------------------- Angriffe und Kosten

/**
 * Reicht die Kraft fuer diesen Angriff? Wer die Waffe haelt, darf ihn
 * ausloesen, gleich welche Rolle er hat - es fehlt hoechstens Kraft, und
 * das wird gesagt, sonst saehe es aus wie ein Fehler.
 */
export function angriffErlaubt(spieler, art, kosten, still = false) {
    const r = ROLLEN[art];
    // Die Waffe verlangt Werte (Buch der Faehigkeiten) - ohne sie kein Angriff.
    const fehlt = fehlendeWerte(spieler, waffeInDerHand(spieler));
    if (fehlt.length) {
        if (!still) hinweis(spieler, `§cDafür brauchst du ${fehlt.join(", ")}.`);
        return false;
    }
    if (kraftVon(spieler) < echteKosten(spieler, art, kosten)) {
        if (!still) hinweis(spieler, `§7Zu wenig ${r.kraft}.`);
        return false;
    }
    return true;
}

// Was ein Angriff wirklich kostet: Die erste Rollenfaehigkeit macht ihn ab
// Stufe 10 und 20 billiger.
function echteKosten(spieler, art, kosten) {
    return Math.max(0, kosten - (art ? kostenRabatt(spieler, art) : 0));
}

export function verbrauche(spieler, menge, art) {
    setzeKraft(spieler, kraftVon(spieler) - echteKosten(spieler, art, menge));
    zeige(spieler);
}

/** Kraft dazu - die Manaquelle gibt sie fuer Treffer mit dem Stab. */
export function gibKraft(spieler, menge) {
    setzeKraft(spieler, kraftVon(spieler) + menge);
}

// --------------------------------------------------------- Rollenwahl

async function waehlen(spieler, versuch = 0) {
    const jetzt = rolleVon(spieler);
    const form = new ActionFormData()
        .title("Wähle deine Rolle")
        .body((jetzt ? `Du bist gerade ${ROLLEN[jetzt].farbe}${ROLLEN[jetzt].name}§r.\n\n` : "")
            + "Kraft, Stärke und Fähigkeiten kommen von der Waffe in deiner Hand: "
            + "Schwert oder Hammer wie ein Ritter, Stab wie ein Magier, Bogen wie ein "
            + "Bogenschütze, Dolche wie ein Assassine. Die Rolle bestimmt deine Leiste, "
            + "wenn du keine Waffe hältst.\n\n"
            + "Aufladen: Waffe in die Hand, ducken, bis es klingt, dann aufstehen.\n\n"
            + "Trägst du die ganze Rüstung zur Waffe, kommt die Kraft schneller - "
            + "dann steht ein goldener Stern hinter der Leiste.\n\n"
            + "Wechseln kannst du jederzeit hier am Altar.");
    for (const k of REIHENFOLGE) {
        form.button(`${ROLLEN[k].farbe}${ROLLEN[k].name}\n§8${ROLLEN[k].kurz}`, ROLLEN[k].bild);
    }

    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        // "Beschaeftigt" heisst meist: Das Antippen ist noch nicht ganz
        // vorbei. Dann gleich noch einmal versuchen, nicht aufgeben.
        if (antwort.cancelationReason === "UserBusy" && versuch < 10) {
            system.runTimeout(() => waehlen(spieler, versuch + 1), 5);
        }
        return;
    }
    const neu = REIHENFOLGE[antwort.selection];
    if (!neu) return;
    if (neu === jetzt) {
        hinweis(spieler, `§7Du bist schon ${ROLLEN[neu].farbe}${ROLLEN[neu].name}§7.`);
        return;
    }

    setzeRolle(spieler, neu);
}

/** Macht aus dem Spieler einen Ritter, Magier ... - fuer Altar und Tempel. */
export function setzeRolle(spieler, neu) {
    spieler.setDynamicProperty(ROLLE_SCHLUESSEL, neu);
    // Halbe Kraft nach jedem Wechsel: Sonst liesse sich die Leiste durch
    // Hin- und Herwechseln auffuellen.
    setzeKraft(spieler, KRAFT_MAX / 2);

    const r = ROLLEN[neu];
    spieler.onScreenDisplay.setTitle(`${r.farbe}${r.name}`, {
        subtitle: "§7ist jetzt deine Rolle",
        fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10,
    });
    spieler.dimension.playSound("random.levelup", spieler.location, { volume: 0.6, pitch: 1.2 });
    zeige(spieler);
}

// Ueber eine eigene Blockkomponente statt ueber das allgemeine Antippen:
// Nur so weiss das Spiel, dass man den Altar benutzen kann, und nimmt das
// Antippen auch mit leerer Hand an.
system.beforeEvents.startup.subscribe((e) => {
    e.blockComponentRegistry.registerCustomComponent("fynn:rollenwahl", {
        onPlayerInteract(ereignis) {
            const spieler = ereignis.player;
            if (!spieler) return;
            system.run(() => {
                waehlen(spieler).catch((fehler) => console.warn(`Rollen, Wahl: ${fehler}`));
            });
        },
    });
});

// ---------------------------------------------------------- Schleifen

function wirken(spieler) {
    const art = artInDerHand(spieler);
    if (!art) return;
    const w = ROLLEN[art].wirkung;
    // Gibt das Buch der Faehigkeiten dieselbe Staerke schon laenger oder
    // staerker (Tempo aus Agility), nicht mit der kurzen ueberschreiben.
    const alt = spieler.getEffect?.(w.id);
    if (alt && alt.amplifier >= w.stufe && alt.duration > 40) return;
    spieler.addEffect(w.id, 30, { amplifier: w.stufe, showParticles: false });
}

// Alle fuenf Ticks: Leiste neu zeigen. Nachschub und Staerke jede zweite
// Runde, also zweimal je Sekunde - vom leeren zum vollen Balken knapp eine
// Minute, mit einem Stab in der Hand eine halbe.
let runde = 0;
system.runInterval(() => {
    runde += 1;
    for (const spieler of world.getAllPlayers()) {
        try {
            const art = anzeigeArt(spieler);
            if (art && runde % 2 === 0) {
                const bonus = vollesSet(spieler, art) ? 1 : 0;
                setzeKraft(spieler, kraftVon(spieler) + ROLLEN[art].nachschub + bonus + kraftBonus(spieler, art));
                wirken(spieler);
            }
            zeige(spieler);
        } catch (fehler) {
            console.warn(`Rollen, Runde: ${fehler}`);
        }
    }
}, 5);
