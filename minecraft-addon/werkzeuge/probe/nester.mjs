// Probe: Nester entstehen, Eier kommen dazu, Klauen, Tiere und ihr Nest - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const n = await import("./nester.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function perm(typ, zustaende = {}) {
    return {
        type: { id: typ }, zustaende,
        getState(k) { return this.zustaende[k]; },
        withState(k, v) { return perm(typ, { ...this.zustaende, [k]: v }); },
    };
}
const schl = (o) => `${Math.floor(o.x)},${Math.floor(o.y)},${Math.floor(o.z)}`;

// Eine kleine Welt aus Bloecken und Wesen.
function welt() {
    const w = { bloecke: new Map(), wesen: [], dinge: [], toene: [], teilchen: [] };
    w.dim = {
        id: "minecraft:overworld",
        getBlock(o) {
            const k = schl(o);
            const p = w.bloecke.get(k) ?? perm("minecraft:air");
            const ort = { x: Math.floor(o.x), y: Math.floor(o.y), z: Math.floor(o.z) };
            return {
                typeId: p.type.id, permutation: p, isAir: p.type.id === "minecraft:air", dimension: w.dim, location: ort,
                center: () => ({ x: ort.x + 0.5, y: ort.y + 0.5, z: ort.z + 0.5 }),
                setPermutation(neu) { w.bloecke.set(k, neu.typ ? perm(neu.typ, neu.zustaende ?? {}) : neu); },
            };
        },
        spawnItem: (s, o) => w.dinge.push([s.typeId, s.amount, o]),
        playSound: (t) => w.toene.push(t),
        spawnParticle: (t) => w.teilchen.push(t),
        getEntities: (f) => w.wesen.filter((e) => !f?.type || e.typeId === f.type)
            .filter((e) => !f?.location || Math.hypot(e.location.x - f.location.x, e.location.y - f.location.y,
                                                     e.location.z - f.location.z) <= f.maxDistance),
        spawnEntity(typ, o) { const t = tier(w, typ.split("<")[0], o); t.gerufen = typ; return t; },
    };
    w.setze = (o, typ, zustaende = {}) => w.bloecke.set(schl(o), perm(typ, zustaende));
    w.typ = (o) => w.bloecke.get(schl(o))?.type.id ?? "minecraft:air";
    w.inhalt = (o) => w.bloecke.get(schl(o))?.getState("fynn:inhalt");
    return w;
}
let nr = 0;
function tier(w, typeId, ort, komp = {}) {
    const t = { id: `t${++nr}`, typeId, location: { ...ort }, dimension: w.dim, dyn: {}, stoesse: [], schaden: [], komp,
        getDynamicProperty(k) { return this.dyn[k]; },
        setDynamicProperty(k, v) { if (v === undefined) delete this.dyn[k]; else this.dyn[k] = v; },
        getComponent(k) { return this.komp[k]; },
        applyImpulse(v) { this.stoesse.push(v); },
        applyDamage(m, o) { this.schaden.push([m, o?.damagingEntity]); },
        teleport(o) { this.location = { ...o }; },
        triggerEvent(e) { this.ereignis = e; } };
    w.wesen.push(t);
    return t;
}
function baum(w, x, z, holz = "oak") {
    for (let y = 64; y < 69; y++) w.setze({ x, y, z }, `minecraft:${holz}_log`);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        w.setze({ x: x + dx, y: 69, z: z + dz }, `minecraft:${holz}_leaves`, { persistent_bit: false });
    }
}
const immer = () => 0.0, nie = () => 0.99;

// --- Plaetze
{
    const w = welt();
    baum(w, 0, 0);
    pruefe("Laub: das Nest liegt oben auf der Krone", n.platzAufLaub(w.dim, { x: 1, y: 69, z: 1 })?.y === 70);
    w.setze({ x: 5, y: 69, z: 5 }, "minecraft:oak_leaves", { persistent_bit: true });
    pruefe("... nicht auf einer gesetzten Hecke", !n.platzAufLaub(w.dim, { x: 5, y: 69, z: 5 }));
    const s = n.platzImStamm(w.dim, { x: 0, y: 66, z: 0 });
    pruefe("Stamm: Specht findet eine freie Seite", s && s.seite === 0 && s.ort.y === 66);
    w.setze({ x: 0, y: 66, z: -1 }, "minecraft:dirt");
    pruefe("... nach Norden zu, dann nach Westen", n.platzImStamm(w.dim, { x: 0, y: 66, z: 0 })?.seite === 1);
    // Ein Balken im Haus: Holz uebereinander, aber keine Krone.
    for (let y = 64; y < 68; y++) w.setze({ x: 20, y, z: 20 }, "minecraft:oak_log");
    pruefe("... aber nicht in einen Balken ohne Krone", !n.platzImStamm(w.dim, { x: 20, y: 66, z: 20 }));
    w.setze({ x: 10, y: 120, z: 10 }, "minecraft:stone");
    pruefe("Fels hoch oben: Platz fuer einen Horst", n.platzAufFels(w.dim, { x: 10, y: 120, z: 10 })?.y === 121);
    w.setze({ x: 10, y: 70, z: 10 }, "minecraft:stone");
    pruefe("... aber nicht im Tal", !n.platzAufFels(w.dim, { x: 10, y: 70, z: 10 }));
    pruefe("nestFuer: Laub gibt Vogelnest oder Kobel",
        n.nestFuer(w.dim, { x: 1, y: 69, z: 1 }, nie)?.nest === "fynn:vogelnest"
        && n.nestFuer(w.dim, { x: 1, y: 69, z: 1 }, immer)?.nest === "fynn:kobel");
    pruefe("nestFuer: Fels gibt Adlerhorst, selten Greifennest",
        n.nestFuer(w.dim, { x: 10, y: 120, z: 10 }, nie)?.nest === "fynn:adlerhorst"
        && n.nestFuer(w.dim, { x: 10, y: 120, z: 10 }, immer)?.nest === "fynn:greifennest");
}

// --- Suche um den Spieler
{
    const w = welt();
    baum(w, 0, 0, "birch");
    n.feldVergessen();
    const spieler = { location: { x: 0.5, y: 69, z: 0.5 }, dimension: w.dim };
    let i = 0;
    const wuerfe = [0.5, 0.5, 0.5, 0.9, 0.0, 0.1];   // Mitte der Suche, Vogelnest, Glueck, zwei Eier
    const p = n.suche(spieler, () => wuerfe[i++ % wuerfe.length]);
    pruefe("Suche setzt ein Vogelnest mit Eiern auf die Birke",
        p?.nest === "fynn:vogelnest" && w.typ({ x: 0, y: 70, z: 0 }) === "fynn:vogelnest" && w.inhalt({ x: 0, y: 70, z: 0 }) === 2);
    i = 0;
    pruefe("... und im selben Stueck Land kein zweites", n.suche(spieler, () => wuerfe[i++ % wuerfe.length]) === undefined);
    pruefe("... das merkt sich die Welt", String(gemerkt.eigenschaften.get("fynn:nestfelder")).includes("0:0"));
}

// --- Eier legen und klauen
{
    const w = welt();
    baum(w, 0, 0);
    n.setzeNest(w.dim, { x: 0, y: 70, z: 0 }, "fynn:vogelnest", 0);
    const nest = () => w.dim.getBlock({ x: 0, y: 70, z: 0 });
    pruefe("Ohne Vogel kein Ei", n.legen(nest(), immer) === "verlassen" && w.inhalt({ x: 0, y: 70, z: 0 }) === 0);
    const vogel = tier(w, "fynn:singvogel", { x: 3, y: 70, z: 0 });
    pruefe("Mit Vogel in der Naehe: ein Ei", n.legen(nest(), immer) === "gelegt" && w.inhalt({ x: 0, y: 70, z: 0 }) === 1);
    n.legen(nest(), immer); n.legen(nest(), immer);
    pruefe("... hoechstens drei", n.legen(nest(), immer) === "voll" && w.inhalt({ x: 0, y: 70, z: 0 }) === 3);
    const leiste = [];
    const spieler = { onScreenDisplay: { setActionBar: (t) => leiste.push(t) } };
    pruefe("Klauen: ein Ei in die Hand", n.klauen(nest(), spieler) && w.dinge.some(([t]) => t === "fynn:vogelei")
        && w.inhalt({ x: 0, y: 70, z: 0 }) === 2);
    pruefe("... der Vogel zetert", w.teilchen.includes("minecraft:villager_angry"));
    n.klauen(nest(), spieler); n.klauen(nest(), spieler);
    pruefe("Leeres Nest: nichts mehr zu holen", !n.klauen(nest(), spieler) && leiste.at(-1).includes("leer"));
    void vogel;
}

// --- Der Adler verteidigt seinen Horst, der zahme Greif nicht
{
    const w = welt();
    w.setze({ x: 0, y: 120, z: 0 }, "fynn:adlerhorst", { "fynn:inhalt": 2 });
    const adler = tier(w, "fynn:steinadler", { x: 10, y: 130, z: 0 });
    const spieler = { id: "s", onScreenDisplay: { setActionBar() {} } };
    n.klauen(w.dim.getBlock({ x: 0, y: 120, z: 0 }), spieler);
    pruefe("Adlerei geklaut: Der Adler greift an", adler.schaden.length === 1 && adler.schaden[0][1] === spieler
        && w.dinge.some(([t]) => t === "fynn:adlerei"));
    w.setze({ x: 50, y: 120, z: 0 }, "fynn:greifennest", { "fynn:inhalt": 1 });
    const zahm = tier(w, "fynn:greif", { x: 52, y: 121, z: 0 }, { "minecraft:is_tamed": {} });
    const wild = tier(w, "fynn:greif", { x: 48, y: 121, z: 0 });
    n.klauen(w.dim.getBlock({ x: 50, y: 120, z: 0 }), spieler);
    pruefe("Greifenei geklaut: der wilde Greif greift an, der zahme nicht",
        wild.schaden.length === 1 && zahm.schaden.length === 0);
    pruefe("Abgebaut: die Eier fallen mit heraus",
        n.abgebaut(w.dim, { x: 0, y: 120, z: 0 }, perm("fynn:adlerhorst", { "fynn:inhalt": 1 })) === 1);
}

// --- Tiere und ihr Nest
{
    const w = welt();
    baum(w, 0, 0);
    n.bekannt.clear();
    const specht = tier(w, "fynn:specht", { x: 1.5, y: 66, z: 0.5 });
    const r = n.heimTakt(specht, 10000, false, immer);
    const o = n.nestVon(specht);
    pruefe("Specht hackt sich eine Hoehle in den Stamm", r === "nest" && o && w.typ(o) === "fynn:spechthoehle");
    const zweiter = tier(w, "fynn:specht", { x: 4.5, y: 66, z: 0.5 });
    pruefe("... ein zweiter zieht mit ein, statt neu zu bauen",
        n.heimTakt(zweiter, 10000, false, nie) === "nest" && n.nestVon(zweiter)?.y === o.y);
    specht.location = { x: 40, y: 66, z: 0 };
    pruefe("Zu weit weg: er kehrt um", n.heimTakt(specht, 10100, false) === "kehrt um" && specht.stoesse.at(-1).x < 0);
    specht.location = { x: 6, y: 66, z: 0 };
    pruefe("Nachts sitzt er vor seinem Loch", n.heimTakt(specht, 10200, true) === "schlaeft"
        && Math.hypot(specht.location.x - (o.x + 0.5), specht.location.z - (o.z + 0.5)) < 1);
    w.setze(o, "minecraft:oak_log");
    pruefe("Hoehle weg: Er vergisst sie und baut nicht gleich neu",
        n.heimTakt(specht, 10300, false, immer) === "sucht" && !n.nestVon(specht));

    const hoernchen = tier(w, "fynn:eichhoernchen", { x: 0.5, y: 70, z: 1.5 });
    n.heimTakt(hoernchen, 20000, false, immer);
    const k = n.nestVon(hoernchen);
    pruefe("Eichhoernchen baut seinen Kobel oben ins Laub", k && w.typ(k) === "fynn:kobel" && k.y === 70);
    const kobel = w.dim.getBlock(k);
    n.legen(kobel, immer);
    pruefe("... und legt Nuesse hinein", w.inhalt(k) === 1);
    n.klauen(w.dim.getBlock(k), { onScreenDisplay: { setActionBar() {} } });
    pruefe("... die man ihm stibitzen kann", w.dinge.some(([t]) => t === "fynn:nuss"));
    const zahm = tier(w, "fynn:singvogel", { x: 0, y: 70, z: 0 }, { "minecraft:is_tamed": {} });
    pruefe("Zahme Voegel sind frei", n.heimTakt(zahm, 0, false, immer) === "frei");
}

// --- Das Greifenei
{
    const w = welt();
    const leiste = [];
    const eier = { typeId: "fynn:greifenei", amount: 1 };
    const inv = { getItem: () => eier, setItem: (i, d) => { inv.gesetzt = [i, d]; } };
    const spieler = { location: { x: 0, y: 64, z: 0 }, dimension: w.dim, selectedSlotIndex: 3,
        getViewDirection: () => ({ x: 0, y: 0, z: 1 }), getGameMode: () => "Survival",
        getComponent: (k) => (k === "minecraft:inventory" ? { container: inv } : undefined),
        onScreenDisplay: { setActionBar: (t) => leiste.push(t) } };
    const kueken = n.schluepfen(spieler);
    pruefe("Greifenei: ein Kueken schluepft vor dem Spieler",
        kueken.gerufen === "fynn:greif<fynn:schluepft>" && Math.abs(kueken.location.z - 1.5) < 1e-9);
    pruefe("... das Ei ist verbraucht", inv.gesetzt?.[0] === 3 && inv.gesetzt[1] === undefined);
    pruefe("... und es wird gleich gezaehmt", gemerkt.takte.some(([f, t]) => f === "spaeter" && t === 2));
    let gezaehmt;
    kueken.komp["minecraft:tameable"] = { tame: (s) => { gezaehmt = s; return true; } };
    pruefe("Zaehmen: fuer diesen Spieler", n.zaehmen(kueken, spieler) && gezaehmt === spieler);
    kueken.komp["minecraft:is_baby"] = {};
    pruefe("Aufs Kueken setzt man sich nicht", !n.darfReiten(kueken, { typeId: "minecraft:saddle" })
        && !n.darfReiten(kueken, undefined));
    pruefe("... aber Fleisch darf es fressen", n.darfReiten(kueken, { typeId: "minecraft:beef" }));
    delete kueken.komp["minecraft:is_baby"];
    pruefe("Erwachsen: satteln und reiten", n.darfReiten(kueken, { typeId: "minecraft:saddle" }));
}

pruefe("Anmeldung: Nest-Baustein und Takt",
    (gemerkt.ereignisse["system.startup"] ?? []).length > 0 && gemerkt.takte.some(([f, t]) => typeof f === "function" && t === 100));

const fehler = ergebnisse.filter((x) => !x).length;
console.log(`${ergebnisse.length - fehler} von ${ergebnisse.length} bestanden`);
if (fehler) process.exit(1);
