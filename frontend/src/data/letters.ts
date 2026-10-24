export type LetterCategory = {
  id: string;
  label: string;
  glyph: string;
  tone: "red" | "blue" | "olive" | "lilac" | "gold" | "rose";
  description: string;
};

export type Letter = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  sender: string;
  recipient: string;
  object: "envelope" | "postcard" | "crumpled";
  place: string;
  body: string[];
  signature: string;
};

export const categories: LetterCategory[] = [
  { id: "amor", label: "Love", glyph: "✿", tone: "rose", description: "Words that still find a way." },
  { id: "saudade", label: "Longing", glyph: "⌁", tone: "blue", description: "What remained dwelling in memory." },
  { id: "desabafos", label: "Unburdening", glyph: "✎", tone: "olive", description: "What needed to leave the chest." },
  { id: "nunca-enviadas", label: "Never Sent", glyph: "✉", tone: "gold", description: "Letters that chose to stay in the drawer." },
  { id: "tristeza", label: "Melancholy", glyph: "☂", tone: "lilac", description: "Gray days also deserve gentle company." },
  { id: "historicas", label: "Historical", glyph: "✦", tone: "blue", description: "Small testimonies of other times." },
  { id: "coracoes-partidos", label: "Broken Hearts", glyph: "◇", tone: "red", description: "After farewell, there are still words." },
  { id: "confissoes", label: "Confessions", glyph: "·", tone: "rose", description: "Truths spoken in a whisper." },
  { id: "pensamentos-noturnos", label: "Night Thoughts", glyph: "☾", tone: "lilac", description: "To read when the house has grown quiet." },
  { id: "licoes-de-vida", label: "Life Lessons", glyph: "⌂", tone: "olive", description: "What only time managed to teach." },
  { id: "familia", label: "Family Letters", glyph: "⌂", tone: "gold", description: "Notes that carry an entire home." },
  { id: "historias-anonimas", label: "Anonymous Stories", glyph: "?", tone: "red", description: "Entire lives held in a few lines." },
];

export const letters: Letter[] = [
  {
    id: "rua-da-chuva",
    title: "The street where rain lingered",
    excerpt: "I still walk slowly down the street of our old home.",
    category: "saudade",
    date: "April 17, unrecorded year",
    sender: "Someone who still remembers",
    recipient: "For the one at the window",
    object: "envelope",
    place: "Campinas, SP",
    body: [
      "I still walk slowly down the street of our old home. The bakery changed its name, the tree grew so tall it hides the porch now, but the sidewalk still keeps that small uneven bump where we always stumbled when walking hand in hand.",
      "When it rains, I wait a little while before opening the umbrella. It is a foolish habit, I know. But for a few seconds, it feels like you might appear at the door, saying rain was never in any rush to leave whenever we were together.",
      "I do not know whether this is longing or simply the way I found to tend to a memory. Perhaps it needs no name. Perhaps it is enough that you know there is still a place where the rain lingers for us.",
    ],
    signature: "With love, always",
  },
  {
    id: "bilhete-mae",
    title: "Note pinned to the refrigerator",
    excerpt: "There is soup on the stove. I will be home before six. Love you.",
    category: "familia",
    date: "An ordinary Tuesday",
    sender: "Mom",
    recipient: "For my dear girl",
    object: "postcard",
    place: "Home kitchen",
    body: [
      "There is soup on the stove. I will be home before six. If it rains, take the blue umbrella behind the door.",
      "I also left two tangerines in the fruit bowl, the sweetest ones. No need to stay awake waiting. I know this week was exhausting and that you have been studying late into the night again.",
      "I only wanted you to find something warm when you arrived. Sometimes a mother's love fits inside a crooked note, penned with an ink that barely flows.",
    ],
    signature: "Love you always, Mom",
  },
  {
    id: "gaveta-azul",
    title: "What I kept in the blue drawer",
    excerpt: "I wrote your name so many times it almost became a sketch.",
    category: "nunca-enviadas",
    date: "Sunday night",
    sender: "A soul who hesitated",
    recipient: "To you, who will never read this",
    object: "envelope",
    place: "A quiet room",
    body: [
      "I wrote your name so many times it almost became a sketch. Then I folded the paper in four, as if that could make the yearning any smaller.",
      "I wanted to have told you that that summer saved me in a way you never realized. I wanted to thank you for the quiet talks on the stairs, for the bitter coffee, and for staying when I did not know how to ask for company.",
      "I will not send this. Not because I have stopped feeling, but because sometimes a letter can also be a gentle place to rest what found no destination.",
    ],
    signature: "Rest here, then",
  },
  {
    id: "depois-do-adeus",
    title: "After the last train",
    excerpt: "The station felt vast when the train took you away.",
    category: "coracoes-partidos",
    date: "September 2",
    sender: "M.",
    recipient: "For the one who departed",
    object: "crumpled",
    place: "Luz Railway Station",
    body: [
      "The station felt vast when the train took you away. The arrival boards kept turning over schedules, people kept running past, but I remained standing with two tickets in my hand and nowhere left to go.",
      "I spent months believing our ending was my own failing. Now I understand that some stories end not for lack of love, but because love alone cannot build a home for two people.",
      "I kept the ticket inside this letter. Not to return. Only to remember that once, I was brave enough to board.",
    ],
    signature: "M.",
  },
  {
    id: "janela-acesa",
    title: "A window still lit",
    excerpt: "If you made it this far, rest for a little while.",
    category: "tristeza",
    date: "Past midnight",
    sender: "A stranger",
    recipient: "For the weary heart",
    object: "postcard",
    place: "Somewhere in the night",
    body: [
      "If you made it this far, rest for a little while. You do not have to solve everything tonight. There are days when standing up, drinking a glass of water, and cracking open the window is already an enormous way of carrying on.",
      "I too once thought sorrow was a house without doors. Later I learned it has little cracks: a quiet melody on the radio, someone asking if you have eaten, the aroma of warm coffee drifting from another apartment.",
      "You do not need to believe that tomorrow will be effortless. It is enough to leave a window ajar so morning can find you.",
    ],
    signature: "With tenderness, a stranger",
  },
  {
    id: "carta-de-1912",
    title: "From across the ocean",
    excerpt: "I arrived safely. The trunk got damp, but the photographs survived.",
    category: "historicas",
    date: "October 12, 1912",
    sender: "A. to the family",
    recipient: "To my beloved sister",
    object: "envelope",
    place: "Santos Harbor",
    body: [
      "I arrived safely. The trunk got damp, but the photographs survived. The sea seemed to stretch endlessly and I thought of our home more times than I can count.",
      "The city is loud, filled with dialects I do not yet understand. Even so, I found a kind lady at the boarding house who bakes fennel bread just like grandmother used to make on Sundays.",
      "When I am able, I shall send better news. For now, keep this letter near the window, as if I were only across the street.",
    ],
    signature: "Your brother, A.",
  },
  {
    id: "confissao-cafe",
    title: "The coffee I never ordered",
    excerpt: "Every morning I chose the table by the window, waiting for you to arrive.",
    category: "confissoes",
    date: "A winter morning",
    sender: "Unsigned",
    recipient: "To the person in the green coat",
    object: "postcard",
    place: "Rosário Street",
    body: [
      "Every morning I chose the table by the window, waiting for you to arrive. You always ordered black coffee and left the book open beside the porcelain cup.",
      "One day I almost asked what you were reading. Another day, I nearly said how fond I was of the way your brow furrowed whenever a phrase was lovely. Then the café closed for renovations, and I never saw you again.",
      "I do not know your name. Even so, thank you for being the quiet story I invented to make it through those cold mornings.",
    ],
    signature: "The person at the next table",
  },
  {
    id: "conselho-velho",
    title: "When life asks for quiet",
    excerpt: "Not every answer arrives as a sentence. Some arrive as rest.",
    category: "licoes-de-vida",
    date: "To read slowly",
    sender: "Grandpa",
    recipient: "For whenever you feel hurried",
    object: "envelope",
    place: "The countryside hills",
    body: [
      "Not every answer arrives as a sentence. Some arrive as rest. Learn to recognize when your body is asking for a pause before it has to scream.",
      "Do not be ashamed of altering your course. The road does not know what promises you made at twenty. Only you can decide what continues to make sense now.",
      "And whenever you can, call someone you love without waiting for a holiday. Life loves being interrupted by such small devotions.",
    ],
    signature: "A warm, long embrace, Grandpa",
  },
];

export function getLetter(id: string) {
  return letters.find((letter) => letter.id === id);
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id);
}
