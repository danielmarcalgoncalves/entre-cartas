export type ArtifactKind = "envelope" | "folded" | "postcard" | "sealed" | "crumpled";

export type LetterCategory = {
  id: string;
  name: string;
  note: string;
  color: string;
};

export type Letter = {
  id: string;
  title: string;
  category: string;
  sender: string;
  date: string;
  excerpt: string;
  content: string[];
  artifact: ArtifactKind;
  accent: string;
  readingTime: string;
};

export const categories: LetterCategory[] = [
  { id: "amor", name: "Love", note: "where everything begins", color: "#8b1e1e" },
  { id: "saudade", name: "Longing", note: "what stayed close", color: "#334f79" },
  { id: "desabafos", name: "Unburdening", note: "words without hurry", color: "#705947" },
  { id: "nunca-enviadas", name: "Never Sent", note: "kept in the drawer", color: "#8b514a" },
  { id: "tristeza", name: "Melancholy", note: "a quiet resting place", color: "#5d6574" },
  { id: "historicas", name: "Historical", note: "voices of other times", color: "#9a7445" },
];

export const letters: Letter[] = [
  {
    id: "estacao-das-seis",
    title: "The six o'clock station",
    category: "saudade",
    sender: "From one who still waits",
    date: "October 12, unrecorded year",
    excerpt: "If you still walk down that street, look up at the blue window. I left the light on just one more time.",
    content: [
      "If you still walk down that street, look up at the blue window. I left the light on just one more time.",
      "The six o'clock train still arrives late, and I still pretend I do not know its whistle by heart. Perhaps we keep certain sounds because we have not yet learned how to keep people.",
      "You do not need to reply. I only wanted you to know that around here, twilight still carries the grace of a gentle farewell.",
    ],
    artifact: "postcard",
    accent: "#334f79",
    readingTime: "2 min read",
  },
  {
    id: "pequena-coisa",
    title: "The little blue button",
    category: "amor",
    sender: "From the one who learned your coffee",
    date: "A winter Thursday",
    excerpt: "You left the blue button on the table. I think that was when I noticed: even small things had learned your name.",
    content: [
      "You left the blue button on the table. I think that was when I noticed: even small things had learned your name.",
      "I kept it inside this envelope, tucked beside the coffee receipt and the scrap of paper where I wrote a song I never finished. It sounds excessive, but life becomes filled with quiet archives when you love someone.",
      "If you ever return to look for it, do not knock. The house still knows your footstep.",
    ],
    artifact: "sealed",
    accent: "#8b1e1e",
    readingTime: "2 min read",
  },
  {
    id: "depois-da-chuva",
    title: "After the rain",
    category: "desabafos",
    sender: "A voice on the other side of paper",
    date: "Sunday evening",
    excerpt: "Today I couldn't handle everything. I write this to remember that falling short can also be a way of going on.",
    content: [
      "Today I couldn't handle everything. I write this to remember that falling short can also be a way of going on.",
      "I left the laundry in the machine and the world did not collapse. I brewed tea, forgot where I put it, found it cold later. Perhaps rest is simply this: no longer demanding that every gesture prove something.",
      "Tomorrow I shall try once more. For tonight, this is enough.",
    ],
    artifact: "folded",
    accent: "#705947",
    readingTime: "1 min read",
  },
  {
    id: "gaveta-de-baixo",
    title: "From the bottom drawer",
    category: "nunca-enviadas",
    sender: "A letter that stayed here",
    date: "Never postmarked",
    excerpt: "I wrote your name so many times the ink nearly carved a furrow. Then I folded the sheet and tucked courage away with it.",
    content: [
      "I wrote your name so many times the ink nearly carved a furrow. Then I folded the sheet and tucked courage away with it.",
      "I do not know whether what I wanted to say still fits the person I have become. Some letters remain unaddressed not for lack of an envelope, but because we change while searching for words.",
      "Even so, thank you for having lived across so many of my lines.",
    ],
    artifact: "crumpled",
    accent: "#8b514a",
    readingTime: "2 min read",
  },
  {
    id: "inverno-na-margem",
    title: "The inner side of winter",
    category: "tristeza",
    sender: "Someone who wrote slowly",
    date: "Late July",
    excerpt: "I did not come to ask that it pass quickly. I only wanted to pull out a chair, in case you need to sit down for a while.",
    content: [
      "I did not come to ask that it pass quickly. I only wanted to pull out a chair, in case you need to sit down for a while.",
      "Sadness is sometimes a quiet room. Today I pulled the curtain back just enough to see that afternoon went on outside, demanding nothing from me.",
      "If the day feels heavy, return whenever you wish. There is room on this page for silence, too.",
    ],
    artifact: "envelope",
    accent: "#5d6574",
    readingTime: "2 min read",
  },
  {
    id: "margem-do-atlantico",
    title: "From the Atlantic shore",
    category: "historicas",
    sender: "Journal of an old voyage",
    date: "Lisbon, spring of 1942",
    excerpt: "The city woke before the sun. In my coat pocket I kept a tram ticket and the salt of the sea to recount when I return.",
    content: [
      "The city woke before the sun. In my coat pocket I kept a tram ticket and the salt of the sea to recount when I return.",
      "The cobblestones still hold the chill of dawn. From time to time the breeze turns a page of the notebook on its own, as if it also wished to know how this voyage ends.",
      "I write with care so that the way, many years from now, may be found once more.",
    ],
    artifact: "sealed",
    accent: "#9a7445",
    readingTime: "2 min read",
  },
];

export function getLetter(id: string) {
  return letters.find((letter) => letter.id === id);
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id);
}
