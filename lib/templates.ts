/** Prompt templates shown in the Templates panel and home examples. */
export interface Template {
  id: string;
  category: string;
  title: string;
  prompt: string;
  actorId?: string;
  duration?: 15 | 30;
}

export const TEMPLATES: Template[] = [
  { id: "demo", category: "Démo produit", title: "Démo produit en main", prompt: "Aïcha présente mon beurre de karité pur, en salle de bain, avant/après sur la peau, 15 secondes", actorId: "aicha", duration: 15 },
  { id: "pitch", category: "Pitch créateur", title: "Pitch d'une cliente", prompt: "Nneka parle de ma boutique de perruques, -20 % ce week-end, dans un salon de coiffure", actorId: "nneka", duration: 15 },
  { id: "unboxing", category: "Déballage", title: "Déballage téléphone", prompt: "Kofi déballe le nouveau Samsung que je vends, prix choc cette semaine, livraison à Abidjan", actorId: "kofi", duration: 15 },
  { id: "resto", category: "Restaurant", title: "Dégustation au maquis", prompt: "Mariam goûte mon poulet braisé et le recommande, ambiance maquis, commande sur WhatsApp", actorId: "mariam", duration: 15 },
  { id: "mode", category: "Mode", title: "Spécial fête", prompt: "Fatou présente mes boubous pour la Tabaski, tenue prête en 3 jours, atelier de couture", actorId: "fatou", duration: 15 },
  { id: "livraison", category: "Livraison", title: "Livré en 2 heures", prompt: "Yao explique qu'on livre partout à Douala en 2 heures, commande sur WhatsApp", actorId: "yao", duration: 15 },
  { id: "immo", category: "Immobilier", title: "Visite d'appartement", prompt: "Tshiala fait visiter un appartement 2 chambres à louer à Kinshasa, bien situé, prix abordable", actorId: "tshiala", duration: 15 },
  { id: "event", category: "Événement", title: "Annonce d'événement", prompt: "Chinedu annonce mon concert de samedi avec humour, billets en vente sur WhatsApp", actorId: "chinedu", duration: 30 },
  { id: "promo", category: "Promo", title: "Bon plan du marché", prompt: "Moussa annonce une promo sur mes sacs de riz au marché, prix imbattable cette semaine", actorId: "moussa", duration: 15 },
];

export const HOME_EXAMPLES = [
  { id: "demo", kicker: "Démo produit", title: "Aïcha montre un karité pur, 15 s", actorId: "aicha" },
  { id: "pitch", kicker: "Pitch créateur", title: "Nneka vend tes perruques, 15 s", actorId: "nneka" },
  { id: "unboxing", kicker: "Déballage", title: "Kofi déballe un téléphone, 15 s", actorId: "kofi" },
];
