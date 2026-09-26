// Die Rollen: Ritter, Magier, Bogenschuetze, Assassine.
//
// Gewaehlt wird am Wappenstein - antippen, ein Fenster mit vier Knoepfen.
// Die Rolle haengt am Spieler selbst (eine Eigenschaft, die Minecraft mit
// der Welt speichert), sie ueberlebt also Tod und Neustart. Wechseln geht
// jederzeit am Stein.
//
// Jede Rolle hat eine Kraft, die sich von selbst auffuellt: der Magier
// Mana, die anderen Ausdauer, Fokus oder Schatten. Die aufgeladenen
// Angriffe kosten davon. Angezeigt wird sie als Kugelreihe ueber der
// Schnellleiste - nicht im Chat, das wollte Fynn ausdruecklich nicht.
// Die Kugeln sind Bilder aus font/glyph_E3.png, die an Stelle von
// Schriftzeichen stehen; mehr als diese eine Zeile ueber der
// Schnellleiste laesst sich ohne Umbau der Spieloberflaeche nicht
// beschreiben.
//
// Dazu gibt jede Rolle eine kleine Staerke, dauerhaft, solange man sie
// hat. Aufgefrischt wird sie alle zwei Sekunden mit vier Sekunden Dauer,
// damit sie nie auslaeuft, aber nach einem Wechsel schnell verschwindet.

import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

export const WAPPENSTEIN = "fynn:wappenstein";
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
        kurz: "schneller zu Fuß",
        wirkung: { id: "speed", stufe: 0 },
        nachschub: 1,
    },
    assassine: {
        name: "Assassine", farbe: "§c", kraft: "Schatten", feld: 4,
        bild: "textures/items/eisendolche",
        kurz: "Schattensprung · unsichtbar",
        wirkung: { id: "jump_boost", stufe: 0 },
        nachschub: 1,
    },
};
export const REIHENFOLGE = ["ritter", "magier", "bogenschuetze", "assassine"];

const zeichen = (feld) => String.fromCharCode(0xe300 + feld);

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
    // Weiss vor den Kugeln, damit die Schriftfarbe sie nicht einfaerbt.
    return `${r.farbe}${r.kraft} §f${kugeln}`;
}

function zeige(spieler) {
    try {
        const zeilen = [];
        const h = hinweise.get(spieler.id);
        if (h && h.bis > system.currentTick) zeilen.push(h.text);
        else hinweise.delete(spieler.id);
        const rolle = rolleVon(spieler);
        if (rolle) zeilen.push(leiste(spieler, rolle));
        if (zeilen.length) spieler.onScreenDisplay.setActionBar(zeilen.join("\n"));
    } catch (fehler) {
        console.warn(`Rollen, Anzeige: ${fehler}`);
    }
}

// ------------------------------------------------- Angriffe und Kosten

/**
 * Darf dieser Spieler den Angriff dieser Rolle ausloesen?
 *
 * Die Waffen selbst kann jeder schwingen; nur die aufgeladenen Angriffe
 * gehoeren zur Rolle. Wer es trotzdem versucht, bekommt gesagt, warum
 * nichts passiert - sonst saehe es aus wie ein Fehler.
 */
export function angriffErlaubt(spieler, rolle, kosten, still = false) {
    const r = ROLLEN[rolle];
    if (rolleVon(spieler) !== rolle) {
        if (!still) hinweis(spieler, `§7Das kann nur ein ${r.farbe}${r.name}§7. Wähle deine Rolle am Wappenstein.`);
        return false;
    }
    if (kraftVon(spieler) < kosten) {
        if (!still) hinweis(spieler, `§7Zu wenig ${r.kraft}.`);
        return false;
    }
    return true;
}

export function verbrauche(spieler, menge) {
    setzeKraft(spieler, kraftVon(spieler) - menge);
    zeige(spieler);
}

// --------------------------------------------------------- Rollenwahl

async function waehlen(spieler, versuch = 0) {
    const jetzt = rolleVon(spieler);
    const form = new ActionFormData()
        .title("Wähle deine Rolle")
        .body((jetzt ? `Du bist gerade ${ROLLEN[jetzt].farbe}${ROLLEN[jetzt].name}§r.\n\n` : "")
            + "Jede Rolle hat ihre eigene Kraft - die Kugeln über der Schnellleiste. "
            + "Aufgeladene Angriffe kosten Kraft, sie kommt von selbst wieder.\n\n"
            + "Aufladen: die Waffe deiner Rolle in die Hand, ducken, bis es klingt, "
            + "dann aufstehen.\n\n"
            + "Wechseln kannst du jederzeit hier am Stein.");
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

    spieler.setDynamicProperty(ROLLE_SCHLUESSEL, neu);
    // Halbe Kraft nach jedem Wechsel: Sonst liesse sich die Leiste durch
    // Hin- und Herwechseln auffuellen.
    setzeKraft(spieler, KRAFT_MAX / 2);
    for (const k of REIHENFOLGE) {
        try {
            spieler.removeEffect(ROLLEN[k].wirkung.id);
        } catch (fehler) {
            // hatte er nicht
        }
    }
    wirken(spieler);

    const r = ROLLEN[neu];
    spieler.onScreenDisplay.setTitle(`${r.farbe}${r.name}`, {
        subtitle: "§7ist jetzt deine Rolle",
        fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10,
    });
    spieler.dimension.playSound("random.levelup", spieler.location, { volume: 0.6, pitch: 1.2 });
    zeige(spieler);
}

// Ueber eine eigene Blockkomponente statt ueber das allgemeine Antippen:
// Nur so weiss das Spiel, dass man den Stein benutzen kann, und nimmt das
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
    const rolle = rolleVon(spieler);
    if (!rolle) return;
    const w = ROLLEN[rolle].wirkung;
    spieler.addEffect(w.id, 80, { amplifier: w.stufe, showParticles: false });
}

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            wirken(spieler);
        } catch (fehler) {
            console.warn(`Rollen, Staerke: ${fehler}`);
        }
    }
}, 40);

// Alle fuenf Ticks: Leiste neu zeigen, Assassine im Schatten. Nachschub
// jede zweite Runde, also zweimal je Sekunde - vom leeren zum vollen
// Balken knapp eine Minute, beim Magier eine halbe.
let runde = 0;
system.runInterval(() => {
    runde += 1;
    for (const spieler of world.getAllPlayers()) {
        try {
            const rolle = rolleVon(spieler);
            if (rolle && runde % 2 === 0) {
                setzeKraft(spieler, kraftVon(spieler) + ROLLEN[rolle].nachschub);
            }
            if (rolle === "assassine" && spieler.isSneaking) {
                // Kurz, damit er beim Aufstehen sofort wieder zu sehen ist.
                spieler.addEffect("invisibility", 10, { amplifier: 0, showParticles: false });
            }
            zeige(spieler);
        } catch (fehler) {
            console.warn(`Rollen, Runde: ${fehler}`);
        }
    }
}, 5);
