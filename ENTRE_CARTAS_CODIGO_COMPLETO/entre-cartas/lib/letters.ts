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
  { id: "amor", name: "Amor", note: "onde tudo começa", color: "#8b1e1e" },
  { id: "saudade", name: "Saudade", note: "o que ficou perto", color: "#334f79" },
  { id: "desabafos", name: "Desabafos", note: "palavras sem pressa", color: "#705947" },
  { id: "nunca-enviadas", name: "Nunca Enviadas", note: "guardadas na gaveta", color: "#8b514a" },
  { id: "tristeza", name: "Tristeza", note: "um lugar de pouso", color: "#5d6574" },
  { id: "historicas", name: "Históricas", note: "vozes de outros tempos", color: "#9a7445" },
];

export const letters: Letter[] = [
  {
    id: "estacao-das-seis",
    title: "A estação das seis",
    category: "saudade",
    sender: "De alguém que ainda espera",
    date: "12 de outubro, sem ano",
    excerpt: "Se você ainda passa por aquela rua, olhe para a janela azul. Deixei a luz acesa só mais uma vez.",
    content: [
      "Se você ainda passa por aquela rua, olhe para a janela azul. Deixei a luz acesa só mais uma vez.",
      "O trem das seis continua chegando atrasado, e eu continuo fingindo que não sei de cor o barulho que ele faz. Talvez a gente guarde certos sons porque ainda não aprendeu a guardar as pessoas.",
      "Não precisa responder. Só queria que soubesse que, por aqui, a tarde ainda tem o tamanho de uma despedida bonita.",
    ],
    artifact: "postcard",
    accent: "#334f79",
    readingTime: "2 min de leitura",
  },
  {
    id: "pequena-coisa",
    title: "A pequena coisa azul",
    category: "amor",
    sender: "Da pessoa que aprendeu seu café",
    date: "Uma quinta-feira de inverno",
    excerpt: "Você esqueceu o botão azul na mesa. Acho que foi assim que percebi: até as coisas pequenas já sabiam o seu nome.",
    content: [
      "Você esqueceu o botão azul na mesa. Acho que foi assim que percebi: até as coisas pequenas já sabiam o seu nome.",
      "Guardei-o dentro deste envelope, junto da conta do café e do papel em que escrevi uma canção que nunca terminei. Parece exagero, mas a vida fica cheia de arquivos secretos quando se ama alguém.",
      "Se voltar para buscá-lo, não precisa bater. A casa ainda reconhece o seu passo.",
    ],
    artifact: "sealed",
    accent: "#8b1e1e",
    readingTime: "2 min de leitura",
  },
  {
    id: "depois-da-chuva",
    title: "Depois da chuva",
    category: "desabafos",
    sender: "Uma voz do outro lado do papel",
    date: "Noite de domingo",
    excerpt: "Hoje não dei conta de tudo. Escrevo isso para lembrar que não dar conta também pode ser uma forma de continuar.",
    content: [
      "Hoje não dei conta de tudo. Escrevo isso para lembrar que não dar conta também pode ser uma forma de continuar.",
      "Deixei as roupas na máquina e o mundo não acabou. Fiz um chá, esqueci onde o coloquei, achei frio depois. Talvez o descanso seja isso: parar de exigir que cada gesto prove alguma coisa.",
      "Amanhã eu tento de novo. Por hoje, está bom assim.",
    ],
    artifact: "folded",
    accent: "#705947",
    readingTime: "1 min de leitura",
  },
  {
    id: "gaveta-de-baixo",
    title: "Da gaveta de baixo",
    category: "nunca-enviadas",
    sender: "Uma carta que ficou aqui",
    date: "Nunca carimbada",
    excerpt: "Escrevi seu nome tantas vezes que a tinta quase abriu um caminho. Depois dobrei o papel e guardei a coragem junto.",
    content: [
      "Escrevi seu nome tantas vezes que a tinta quase abriu um caminho. Depois dobrei o papel e guardei a coragem junto.",
      "Não sei se o que eu queria dizer ainda cabe na pessoa que sou agora. Há cartas que ficam sem destino não por falta de endereço, mas porque a gente muda enquanto procura as palavras.",
      "Mesmo assim, obrigada por ter existido em tantas linhas minhas.",
    ],
    artifact: "crumpled",
    accent: "#8b514a",
    readingTime: "2 min de leitura",
  },
  {
    id: "inverno-na-margem",
    title: "O lado de dentro do inverno",
    category: "tristeza",
    sender: "Alguém que escreveu devagar",
    date: "Fim de julho",
    excerpt: "Não vim pedir que passe depressa. Só queria deixar uma cadeira puxada, caso você precise sentar um pouco.",
    content: [
      "Não vim pedir que passe depressa. Só queria deixar uma cadeira puxada, caso você precise sentar um pouco.",
      "A tristeza às vezes é uma casa silenciosa. Hoje abri a cortina só o bastante para notar que a tarde continuava do lado de fora, sem cobrar nada de mim.",
      "Se o dia pesar, volte quando quiser. Há espaço nesta página para o silêncio também.",
    ],
    artifact: "envelope",
    accent: "#5d6574",
    readingTime: "2 min de leitura",
  },
  {
    id: "margem-do-atlantico",
    title: "Da margem do Atlântico",
    category: "historicas",
    sender: "Caderno de uma viagem antiga",
    date: "Lisboa, primavera de 1942",
    excerpt: "A cidade acordou antes do sol. Guardei no bolso um bilhete de bonde e o cheiro do mar para contar quando voltar.",
    content: [
      "A cidade acordou antes do sol. Guardei no bolso um bilhete de bonde e o cheiro do mar para contar quando voltar.",
      "As ruas ainda guardam o fresco da madrugada. De tempos em tempos o vento vira uma página do caderno por conta própria, como se também quisesse saber o final desta viagem.",
      "Escrevo com cuidado para que o caminho, daqui a muitos anos, possa ser encontrado outra vez.",
    ],
    artifact: "sealed",
    accent: "#9a7445",
    readingTime: "2 min de leitura",
  },
];

export function getLetter(id: string) {
  return letters.find((letter) => letter.id === id);
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id);
}
