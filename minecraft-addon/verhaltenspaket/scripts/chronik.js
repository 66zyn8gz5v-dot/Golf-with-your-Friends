// Die Chronik der Bosse - ein Buch, das jeden Boss zeigt.
//
// Keiner der Bosse erscheint von selbst; man muss wissen, dass es sie gibt
// und womit man sie ruft. Die Chronik sagt es: erst eine Seite mit allen
// Bossen (ihr Ei als Bild, dazu wie oft man ihn schon besiegt hat), dann je
// Boss eine Seite mit Rufen, Angriffen, einem Tipp und der Beute. Die Siege
// zaehlt boss_kern.js beim Verteilen der Beute.

import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { siegeVon } from "./boss_kern.js";

export const BOSSE = [
    {
        typ: "fynn:roland", name: "Sir Roland von Ronceval", farbe: "§9", bild: "textures/items/roland_ei",
        rang: "Oberkommandant des Ritterordens",
        rufen: "Wirf einen §fFehdehandschuh§r: fünf Stahlbarren, ein Goldbarren, ein Lapislazuli.",
        angriffe: "Hiebfolge, Schildstoß, Klingenwirbel, Sprungschlag, Schildwall mit Konter, "
            + "Sternenklingen, Saphirwelle. In Phase 2 ruft er den Orden - Ritter eilen ihm zu Hilfe.",
        tipp: "Hinter dem Schildwall wartet ein Konter: nicht blind draufhauen, sondern warten, "
            + "bis der Schild sinkt. Der Saphirwelle weichst du seitlich aus.",
        beute: "Durendal, Olifant, Diamanten, Gold, Smaragde, goldene Äpfel, oft das Saphirschwert.",
    },
    {
        typ: "fynn:rabenfuerst", name: "Morvan, der Rabenfürst", farbe: "§5", bild: "textures/items/rabenfuerst_ei",
        rang: "König aller Banditen",
        rufen: "Lies einen §fKopfgeldbrief§r: Papier, Tintenbeutel, Smaragd, Goldbarren.",
        angriffe: "Dolchhiebe, Dolchfächer mit Gift, Rauchbombe mit Stich von hinten, "
            + "Schattendoppelgänger, Rabenschwarm, Schattensprung. In Phase 2 bringt er die Rabennacht.",
        tipp: "Verschwindet er in der Rauchbombe, steht er gleich hinter dir - dreh dich um. "
            + "Seine Schatten haben nur ein Herz; ein Schlag, und sie zerfallen.",
        beute: "Rabenklinge, Rauchbomben, Smaragde, Gold, Diamanten.",
    },
    {
        typ: "fynn:frostmammut", name: "Hrimgar, das Frostmammut", farbe: "§b", bild: "textures/items/frostmammut_ei",
        rang: "Uraltes Mammut aus dem ewigen Eis",
        rufen: "Blase den §fFrostruf§r: ein Bisonhorn, drei Packeis, ein Diamant.",
        angriffe: "Ansturm, Stampfen, Stoßzahnfeger, Eiszapfenregen, Rüsselschleuder. "
            + "In Phase 2 zerspringt sein Eispanzer: Frostatem, Eiswölfe und eine Frostaura.",
        tipp: "Spring, wenn es stampft - die Welle trifft nur, wer am Boden steht. "
            + "Bleib nicht auf den Zeichen stehen, dort fallen gleich die Eiszapfen. "
            + "Dem Ansturm weichst du zur Seite aus.",
        beute: "Frostzahn, Herz des Winters, Diamanten, Blaueis, Leder.",
    },
];

export function knopfText(boss, siege) {
    const stand = siege > 0 ? `§2besiegt: ${siege}×` : "§8noch unbesiegt";
    return `${boss.farbe}${boss.name}\n${stand}`;
}

export function seitenText(boss, siege) {
    return [
        `§7${boss.rang}`,
        "",
        `§6Rufen§r\n${boss.rufen}`,
        "",
        `§6Phasen§r\nIst die erste Leiste leer, lädt sich der Boss unverwundbar auf und kehrt stärker zurück. `
            + "Je mehr Spieler mitkämpfen, desto mehr Leben hat er - und jeder bekommt seinen Anteil an der Beute.",
        "",
        `§6Angriffe§r\n${boss.angriffe}`,
        "",
        `§6Tipp§r\n${boss.tipp}`,
        "",
        `§6Beute§r\n${boss.beute}`,
        "",
        siege > 0 ? `§2Du hast ${boss.name.split(",")[0]} ${siege}× besiegt.` : "§8Du hast diesen Boss noch nicht besiegt.",
    ].join("\n");
}

function nochmal(spieler, antwort, weiter, versuch) {
    // "Beschaeftigt" heisst meist: Das Antippen ist noch nicht vorbei -
    // gleich noch einmal versuchen, wie bei der Rollenwahl.
    if (antwort.canceled && antwort.cancelationReason === "UserBusy" && versuch < 10) {
        system.runTimeout(() => weiter(versuch + 1), 5);
        return true;
    }
    return false;
}

export async function zeigeChronik(spieler, versuch = 0) {
    const besiegt = BOSSE.filter((b) => siegeVon(spieler, b.typ) > 0).length;
    const form = new ActionFormData()
        .title("Chronik der Bosse")
        .body(`Drei Bosse erwarten dich - keiner kommt von selbst, du musst ihn rufen.\n\n`
            + `§7Besiegt: ${besiegt} von ${BOSSE.length}`);
    for (const b of BOSSE) form.button(knopfText(b, siegeVon(spieler, b.typ)), b.bild);
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(spieler, antwort, (v) => zeigeChronik(spieler, v), versuch);
        return;
    }
    const boss = BOSSE[antwort.selection];
    if (boss) await zeigeSeite(spieler, boss);
}

export async function zeigeSeite(spieler, boss, versuch = 0) {
    const form = new ActionFormData()
        .title(`${boss.farbe}${boss.name}`)
        .body(seitenText(boss, siegeVon(spieler, boss.typ)))
        .button("§8Zurück");
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(spieler, antwort, (v) => zeigeSeite(spieler, boss, v), versuch);
        return;
    }
    if (antwort.selection === 0) await zeigeChronik(spieler);
}

// Jeder bekommt die Chronik einmal geschenkt, beim ersten Betreten der Welt -
// sonst erfaehrt niemand, dass es die Bosse gibt. Wer sie verliert, kann
// sie nachbauen.
export function schenke(spieler) {
    try {
        if (spieler.getDynamicProperty("fynn:chronik_bekommen")) return false;
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        if (!inv) return false;
        inv.addItem(new ItemStack("fynn:bosschronik", 1));
        spieler.setDynamicProperty("fynn:chronik_bekommen", true);
        spieler.sendMessage?.("§6Die Chronik der Bosse liegt in deinem Inventar. "
            + "§7Schlag sie auf, um zu sehen, wer auf dich wartet.");
        return true;
    } catch (e) {
        return false;
    }
}

// Etwas warten: Gleich nach dem Betreten ist das Inventar noch nicht bereit.
// Die Wartenden prueft ein eigener Takt, damit sich das Geschenk nicht mit
// dem Tempel in die Quere kommt, der beim Betreten ebenfalls wartet.
const wartend = new Map();
world.afterEvents.playerSpawn.subscribe((e) => {
    if (e.initialSpawn) wartend.set(e.player.id, { spieler: e.player, ab: system.currentTick + 80 });
});
system.runInterval(() => {
    for (const [id, w] of wartend) {
        if (system.currentTick < w.ab) continue;
        wartend.delete(id);
        schenke(w.spieler);
    }
}, 20);

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === "fynn:bosschronik") zeigeChronik(e.source);
    } catch (fehler) {
        console.warn(`Chronik: ${fehler}`);
    }
});
