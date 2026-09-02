// Traductions des libelles propres a ce fork. Le depot amont ne les connait
// pas, et `locale/` en est un clone non versionne : elles vivent donc ici.
//
// Les cles sont les libelles anglais EXACTS tels que `yarn generate:i18n` les
// extrait des sources — une cle approximative ne declenche aucune erreur, elle
// laisse simplement l'anglais s'afficher. `migration/verif-traductions.py`
// controle la correspondance.
export const fr: Record<string, string> = {
  Reserves: 'Réserves',
  'Accounts balance': 'Solde des comptes',
  Reserve: 'Réserve',
  'Reserves by month': 'Réserves par mois',
  'Reserve name': 'Nom de la réserve',
  'New reserve': 'Nouvelle réserve',
  'Rename reserve': 'Renommer la réserve',
  'Per month': 'Par mois',
  'Menu for {{name}}': 'Menu de {{name}}',
  'Monthly amount for {{name}}': 'Montant mensuel de {{name}}',
  '{{name}}, {{month}}': '{{name}}, {{month}}',
  'Accounts to split…': 'Comptes ventilés…',
  'Accounts to split into reserves': 'Comptes ventilés en réserves',
  Unallocated: 'Non affecté',
  'A name is required': 'Un nom est obligatoire',
  'A reserve with this name already exists': 'Une réserve porte déjà ce nom',
  'No account is being split into reserves yet':
    "Aucun compte n'est encore ventilé en réserves",
  "Figures past the current month are a projection: today's balance plus what each standing order will add.":
    "Au-delà du mois en cours, les montants sont une projection : le solde d'aujourd'hui augmenté de ce que chaque versement mensuel apportera.",
  'Reserves split the balance of an off-budget savings account. Mark a savings account as off-budget in its settings to get started.':
    "Les réserves ventilent le solde d'un compte d'épargne hors budget. Marquez un compte d'épargne comme hors budget dans ses réglages pour commencer.",
  'Choose which savings accounts should be split into reserves.':
    "Choisissez les comptes d'épargne à ventiler en réserves.",
  'No reserve yet. Create one, then type a figure into a month to start its running total.':
    "Aucune réserve pour l'instant. Créez-en une, puis saisissez un montant dans un mois pour démarrer son cumul.",
  'Delete the reserve "{{name}}"? The {{amount}} it holds goes back to unallocated.':
    "Supprimer la réserve « {{name}} » ? Les {{amount}} qu'elle contient repassent en non affecté.",
  'The balance of the accounts you pick here is what gets split across reserves. Accounts left unchecked stay plain savings.':
    "Le solde des comptes cochés ici est ce qui se répartit entre les réserves. Les comptes non cochés restent de l'épargne pure.",
};
