"""Fynns Elektrumklinge, aus dem Vorlagenbild abgetastet.

Das Bild kam als JPEG mit zehn Schwertern nebeneinander - kein sauberes
Raster, sondern weichgezeichnete Kanten. Die Rasterweite steht trotzdem
fest: Der schwarze Umriss ist ueberall genau einen gemalten Pixel dick
und misst im Bild neun bis zehn Bildpunkte. Daraus folgen 26 x 75 Pixel.

Die Farben sind nicht geraten, sondern gezaehlt: Alles, was nicht
Hintergrund ist, wurde auf elf Toene zusammengefasst. Der Umriss faellt
dabei von selbst als eigene Farbe heraus - eine Helligkeitsschwelle
haette stattdessen die dunkle Klingenfuellung mit abgeschnitten, und
genau das ist im ersten Versuch passiert.

Sie ist breiter und laenger als die anderen Klingen: 26 x 75 statt
20 x 63. In der Hand macht das rund ein Fuenftel mehr Laenge - ein
Grossschwert neben den uebrigen, so wie im Vorbild.
"""

FARBEN = {
    'k': (39, 33, 30, 255),   # Umriss
    'n': (67, 58, 49, 255),   # Elektrum Nacht
    't': (80, 72, 67, 255),   # Elektrum tief
    'd': (92, 77, 63, 255),   # Elektrum dunkel
    's': (98, 82, 67, 255),   # Elektrum Schatten
    'm': (109, 99, 88, 255),   # Elektrum matt
    'e': (130, 118, 106, 255),   # Elektrum
    'w': (157, 130, 97, 255),   # Elektrum warm
    'h': (167, 151, 130, 255),   # Elektrum hell
    'g': (196, 178, 146, 255),   # Elektrum Glanz
    'l': (208, 193, 165, 255),   # Elektrum Licht
}

# Umgedreht: Im Vorlagenbild zeigt die Spitze nach unten, hier nach
# oben - so erwartet es das Bauwerkzeug, und so liegen auch die
# anderen Klingen.

# Die bemalten Spalten laufen von 7 bis 19 - dreizehn Stueck, also eine
# ungerade Zahl. Die Symmetrieachse liegt damit nicht zwischen zwei
# Spalten, sondern mitten auf der dreizehnten: 13,5 in Kastenmassen.
# Mit 13,0 haengt das Schwert einen halben Pixel schief in der Hand.
MITTE = 13.5

KARTE = [
    "............hnl...........",
    "...........hnwnl..........",
    # Im Bild fehlte hier rechts ein Pixel - die weichen JPEG-Kanten
    # haben ihn verschluckt. Die Mittenpruefung hat es gefunden.
    "..........lswgmel.........",
    "..........mmlggkl.........",
    ".........hngggggke........",
    "........lswggmggetl.......",
    "........eslgmdeggmm.......",
    ".......hkgghdsdgggnh......",
    "......lkgggsddddgggkh.....",
    ".....lhmggwdddddhggmml....",
    ".....hkggmdddddddmllsm....",
    ".....hkllhsddddddgllsm....",
    "......lkglhdddddgllme.....",
    ".......hnlgwdddhllsm......",
    ".......hnhlsdddslgmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggmm......",
    ".......hnhhdddddggsm......",
    ".......hnhhdddddggsm......",
    ".......hnhhdddddggsm......",
    ".......hnhwssdddggsm......",
    ".......hnwwtttnnwwdm......",
    ".......hnwwttttnwwdm......",
    ".......hnwwtnnnnwwdm......",
    ".......hnwentnnnwwdm......",
    ".......hnwennnnnwwdm......",
    ".......hnwwnnnnnwwdm......",
    ".......hnwwnnnnnhwdm......",
    ".......hkwwnnnnnwwdm......",
    ".......hkeennnnnwwdm......",
    ".......hkmmnnnnnwwnm......",
    ".......hkmsnnnnneenm......",
    ".......hkmsnnnnneenm......",
    ".......hkmsnnnnneenm......",
    ".......hksmnnnnnmenm......",
    ".......hkddnnnnnsmnm......",
    ".......hkdtnnnnnmmnm......",
    ".......hkdtnelmnsskm......",
    ".......hksteglgmsskm......",
    ".......hkdwghtggsskm......",
    ".......hkmggtnsggmkm......",
    "......hnmhhnnnnsghmkm.....",
    "....lkkmwhntnnntshwsdkl...",
    "...lmnehhwmssmmmewhwmekl..",
    "..gtdehllgwwwwwwghllwwmne.",
    "..mnehednnnnnnnnnntdhgwwk.",
    "..mnglndtnnnnnnnnnddnllwk.",
    "..lmnhhttnnnnnnnnnsdhgenh.",
    "...lmwwwwmmsddssemwhhwse..",
    "....lknwwmssddsseewhwkk...",
    "......gmmtknttttkkmme.....",
    ".........lktmeemnt........",
    "..........hkntttn.........",
    "..........hknemtn.........",
    "..........hkteemn.........",
    "..........gkteemk.........",
    "..........lkteemk.........",
    "..........lkteetk.........",
    "..........lkteemk.........",
    "..........lkteemk.........",
    "..........lkteemk.........",
    "..........mnnmmtk.........",
    "..........kswwggk.........",
    ".........nnswwggwk........",
    ".........nktsmhwwk........",
    ".........nknmwhhwk........",
    ".........tknmeghmk........",
    ".........tknsewwmk........",
    "..........knmmwwk.........",
    "...........kkkkk..........",
]
