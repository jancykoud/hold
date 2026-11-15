import type { SampleItem } from './sample-rentals.ts'

// What a demo shop is written in. The figures, the kinds and the order are the demo's own (demo-shop.ts); these are
// only its words, so a visitor who reads French meets a shop in French. The web app gives them from its messages.
export type DemoWords = {
  // The language its two people are registered in.
  readonly language: string
  // One for each entry of the demo's price list, in its order.
  readonly prices: readonly string[]
  // The bike and the car a visitor can book, each with one label for each view of its plan, in its order.
  readonly bike: { readonly name: string; readonly views: readonly string[] }
  readonly car: { readonly name: string; readonly views: readonly string[] }
  readonly dropPoint: string
  readonly wearPolicy: string
  readonly sampleItems: Readonly<Record<SampleItem, string>>
}

// The demo's words in the languages the site is written in, beside English (DEMO_WORDS in demo-shop.ts). Each list
// follows the demo's own order: the price list's entries, then each plan's views. demo-words.test.ts counts them.
const CAR_VIEWS = {
  fr: ['Avant', 'Arrière', 'Côté gauche', 'Côté droit', 'Angle avant gauche', 'Angle avant droit', 'Angle arrière gauche', 'Angle arrière droit', 'Roue avant gauche', 'Roue avant droite', 'Roue arrière gauche', 'Roue arrière droite', 'Pare-brise', 'Lunette arrière', 'Toit', 'Sièges avant', 'Sièges arrière', 'Coffre', 'Tableau de bord, avec kilométrage et carburant'],
  de: ['Vorne', 'Hinten', 'Linke Seite', 'Rechte Seite', 'Ecke vorne links', 'Ecke vorne rechts', 'Ecke hinten links', 'Ecke hinten rechts', 'Rad vorne links', 'Rad vorne rechts', 'Rad hinten links', 'Rad hinten rechts', 'Windschutzscheibe', 'Heckscheibe', 'Dach', 'Vordersitze', 'Rücksitze', 'Kofferraum', 'Armaturenbrett, mit Kilometerstand und Tankfüllung'],
  es: ['Delantera', 'Trasera', 'Lado izquierdo', 'Lado derecho', 'Esquina delantera izquierda', 'Esquina delantera derecha', 'Esquina trasera izquierda', 'Esquina trasera derecha', 'Rueda delantera izquierda', 'Rueda delantera derecha', 'Rueda trasera izquierda', 'Rueda trasera derecha', 'Parabrisas', 'Luneta trasera', 'Techo', 'Asientos delanteros', 'Asientos traseros', 'Maletero', 'Salpicadero, con kilómetros y combustible'],
} as const

export const TRANSLATED_DEMO_WORDS: Readonly<Record<'fr' | 'de' | 'es', DemoWords>> = {
  fr: {
    language: 'fr',
    prices: [
      'Rayure sur la carrosserie, jusqu’à la tôle',
      'Bosse sur un élément de carrosserie',
      'Éclat sur le pare-brise',
      'Vitre fêlée ou brisée',
      'Clé perdue',
      'Retour en retard, par jour entamé',
      'Nettoyage après un retour sale',
      'Chaque kilomètre au-delà de ceux inclus',
      'Chaque huitième de réservoir manquant',
      'Rayure sur le cadre, jusqu’au métal',
      'Patte de dérailleur arrière tordue',
      'Antivol perdu',
      'Éclairage avant perdu',
      'Nettoyage après une sortie boueuse',
    ],
    bike: { name: 'Vélo de ville', views: ['Cadre, côté transmission', 'Roue avant', 'Roue arrière'] },
    car: { name: 'Citadine', views: CAR_VIEWS.fr },
    dropPoint: 'Place 4 derrière le bureau, ou le râtelier fermé à gauche de la porte pour un vélo. Laissez la clé dans la boîte à clés, avec le code de votre réservation.',
    wearPolicy:
      'Les éclats plus petits qu’une pièce de monnaie, les légères traces sur les pneus et les enjoliveurs, et l’usure normale des sièges et des pédales ne sont jamais facturés. Une marque déjà notée à la remise n’est jamais facturée de nouveau.',
    sampleItems: { hatchback: 'Compacte', saloon: 'Berline', scooter: 'Scooter 125', estate: 'Break', seat: 'Siège enfant', suv: 'SUV', ebike: 'Vélo électrique' },
  },
  de: {
    language: 'de',
    prices: [
      'Kratzer in der Karosserie, bis auf das Blech',
      'Delle in einem Karosserieteil',
      'Steinschlag in der Windschutzscheibe',
      'Gesprungenes oder zerbrochenes Glas',
      'Verlorener Schlüssel',
      'Verspätete Rückgabe, je angefangenem Tag',
      'Reinigung nach schmutziger Rückgabe',
      'Jeder Kilometer über die inklusiven hinaus',
      'Jedes fehlende Achtel Tankfüllung',
      'Kratzer am Rahmen, bis auf das Metall',
      'Verbogenes Schaltauge hinten',
      'Verlorenes Schloss',
      'Verlorenes Vorderlicht',
      'Reinigung nach einer Schlammfahrt',
    ],
    bike: { name: 'Stadtrad', views: ['Rahmen, Antriebsseite', 'Vorderrad', 'Hinterrad'] },
    car: { name: 'Kleinwagen', views: CAR_VIEWS.de },
    dropPoint: 'Stellplatz 4 hinter dem Büro, oder für ein Fahrrad der abgeschlossene Ständer links neben der Tür. Legen Sie den Schlüssel in den Schlüsselkasten, mit dem Code aus Ihrer Buchung.',
    wearPolicy:
      'Steinschläge, die kleiner sind als eine Münze, leichte Spuren an Reifen und Radkappen und die normale Abnutzung von Sitzen und Pedalen werden nie berechnet. Eine Spur, die bei der Übergabe schon vermerkt war, wird nie erneut berechnet.',
    sampleItems: { hatchback: 'Kompaktwagen', saloon: 'Limousine', scooter: 'Roller 125', estate: 'Kombi', seat: 'Kindersitz', suv: 'SUV', ebike: 'E-Bike' },
  },
  es: {
    language: 'es',
    prices: [
      'Arañazo en la carrocería, hasta la chapa',
      'Abolladura en un panel de la carrocería',
      'Impacto de piedra en el parabrisas',
      'Cristal agrietado o roto',
      'Llave perdida',
      'Devolución tardía, por día empezado',
      'Limpieza tras una devolución sucia',
      'Cada kilómetro más allá de los incluidos',
      'Cada octavo de depósito que falte',
      'Arañazo en el cuadro, hasta el metal',
      'Patilla del cambio trasero doblada',
      'Candado perdido',
      'Luz delantera perdida',
      'Limpieza tras una salida con barro',
    ],
    bike: { name: 'Bici de ciudad', views: ['Cuadro, lado de la transmisión', 'Rueda delantera', 'Rueda trasera'] },
    car: { name: 'Utilitario', views: CAR_VIEWS.es },
    dropPoint: 'Plaza 4 detrás de la oficina, o el aparcabicis cerrado a la izquierda de la puerta para una bici. Deja la llave en la caja de llaves, con el código de tu reserva.',
    wearPolicy:
      'Los impactos más pequeños que una moneda, los roces leves en neumáticos y tapacubos y el desgaste normal de asientos y pedales nunca se cobran. Una marca ya anotada en la entrega nunca se cobra de nuevo.',
    sampleItems: { hatchback: 'Compacto', saloon: 'Berlina', scooter: 'Scooter 125', estate: 'Familiar', seat: 'Silla infantil', suv: 'SUV', ebike: 'Bici eléctrica' },
  },
}
