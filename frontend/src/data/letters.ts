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
  { id: "amor", label: "Amor", glyph: "✿", tone: "rose", description: "Palavras que ainda encontram caminho." },
  { id: "saudade", label: "Saudade", glyph: "⌁", tone: "blue", description: "O que ficou morando na lembrança." },
  { id: "desabafos", label: "Desabafos", glyph: "✎", tone: "olive", description: "O que precisava sair do peito." },
  { id: "nunca-enviadas", label: "Nunca Enviadas", glyph: "✉", tone: "gold", description: "Cartas que escolheram ficar na gaveta." },
  { id: "tristeza", label: "Tristeza", glyph: "☂", tone: "lilac", description: "Dias cinzentos também merecem companhia." },
  { id: "historicas", label: "Históricas", glyph: "✦", tone: "blue", description: "Pequenos testemunhos de outros tempos." },
  { id: "coracoes-partidos", label: "Corações partidos", glyph: "◇", tone: "red", description: "Depois do adeus, ainda há palavras." },
  { id: "confissoes", label: "Confissões", glyph: "·", tone: "rose", description: "Verdades contadas em voz baixa." },
  { id: "pensamentos-noturnos", label: "Pensamentos noturnos", glyph: "☾", tone: "lilac", description: "Para ler quando a casa já silenciou." },
  { id: "licoes-de-vida", label: "Lições de vida", glyph: "⌂", tone: "olive", description: "O que só o tempo conseguiu ensinar." },
  { id: "familia", label: "Cartas de família", glyph: "⌂", tone: "gold", description: "Bilhetes que carregam uma casa inteira." },
  { id: "historias-anonimas", label: "Histórias anônimas", glyph: "?", tone: "red", description: "Vidas inteiras em algumas linhas." },
];

export const letters: Letter[] = [
  {
    id: "rua-da-chuva",
    title: "A rua em que a chuva demorava",
    excerpt: "Eu ainda passo devagar pela rua da nossa antiga casa.",
    category: "saudade",
    date: "17 de abril, sem ano",
    sender: "Alguém que ainda lembra",
    recipient: "Para quem ficou na janela",
    object: "envelope",
    place: "Campinas, SP",
    body: [
      "Eu ainda passo devagar pela rua da nossa antiga casa. A padaria mudou de nome, a árvore cresceu tanto que já esconde a varanda, mas a calçada continua guardando aquele desnível onde a gente sempre tropeçava quando andava de mãos dadas.",
      "Quando chove, eu espero um pouco antes de abrir o guarda-chuva. É um costume bobo, eu sei. Só que por alguns segundos parece que você vai aparecer na porta, dizendo que a chuva nunca teve pressa de ir embora quando a gente estava junto.",
      "Não sei se isso é saudade ou só o jeito que encontrei de cuidar de uma lembrança. Talvez não precise ter nome. Talvez bastasse você saber que ainda existe um lugar onde a chuva demora por nós.",
    ],
    signature: "Com carinho, sempre",
  },
  {
    id: "bilhete-mae",
    title: "Bilhete preso na geladeira",
    excerpt: "Tem sopa no fogão. Volto antes das seis. Te amo.",
    category: "familia",
    date: "Uma terça-feira qualquer",
    sender: "Mãe",
    recipient: "Para a minha menina",
    object: "postcard",
    place: "Cozinha de casa",
    body: [
      "Tem sopa no fogão. Volto antes das seis. Se chover, leva o guarda-chuva azul que está atrás da porta.",
      "Deixei também duas mexericas na fruteira, as mais docinhas. Não precisa esperar acordada. Sei que a semana foi puxada e que você anda estudando até tarde outra vez.",
      "Só queria que você encontrasse alguma coisa quentinha quando chegasse. Às vezes o amor de mãe cabe num bilhete torto, escrito com a caneta que quase não funciona.",
    ],
    signature: "Te amo, mãe",
  },
  {
    id: "gaveta-azul",
    title: "O que guardei na gaveta azul",
    excerpt: "Escrevi seu nome tantas vezes que ele virou quase um desenho.",
    category: "nunca-enviadas",
    date: "Noite de domingo",
    sender: "Uma pessoa que hesitou",
    recipient: "Para você, que nunca vai ler",
    object: "envelope",
    place: "Um quarto silencioso",
    body: [
      "Escrevi seu nome tantas vezes que ele virou quase um desenho. Depois dobrei o papel em quatro, como se isso pudesse deixar a vontade menor.",
      "Eu queria ter dito que aquele verão me salvou de um jeito que você nunca percebeu. Queria ter agradecido pela conversa na escada, pelos cafés sem açúcar e por ter ficado quando eu não sabia pedir companhia.",
      "Não vou enviar. Não porque tenha deixado de sentir, mas porque às vezes uma carta também pode ser um lugar seguro para pousar o que não encontrou destino.",
    ],
    signature: "Fica aqui, então",
  },
  {
    id: "depois-do-adeus",
    title: "Depois do último trem",
    excerpt: "A estação ficou enorme quando o trem levou você embora.",
    category: "coracoes-partidos",
    date: "2 de setembro",
    sender: "M.",
    recipient: "Para quem partiu",
    object: "crumpled",
    place: "Estação da Luz",
    body: [
      "A estação ficou enorme quando o trem levou você embora. O painel continuou trocando os horários, as pessoas continuaram correndo, mas eu fiquei parada com duas passagens na mão e nenhum lugar para ir.",
      "Passei meses achando que o fim tinha sido uma falha minha. Agora entendo que algumas histórias acabam não por falta de amor, mas porque o amor sozinho não consegue construir uma casa para duas pessoas.",
      "Guardei a passagem dentro desta carta. Não para voltar. Só para lembrar que um dia tive coragem de embarcar.",
    ],
    signature: "M.",
  },
  {
    id: "janela-acesa",
    title: "Uma janela ainda acesa",
    excerpt: "Se você chegou até aqui, descanse um pouco.",
    category: "tristeza",
    date: "Depois da meia-noite",
    sender: "Uma desconhecida",
    recipient: "Para quem está cansado",
    object: "postcard",
    place: "Em algum lugar do Brasil",
    body: [
      "Se você chegou até aqui, descanse um pouco. Não precisa resolver tudo esta noite. Há dias em que levantar, tomar água e abrir a janela já é um jeito imenso de continuar.",
      "Eu também já achei que a tristeza era uma casa sem portas. Depois descobri que ela tem frestas pequenas: uma música no rádio, alguém que pergunta se você comeu, o cheiro de café vindo de outro apartamento.",
      "Não precisa acreditar que amanhã será perfeito. Basta deixar uma janela aberta para que a manhã consiga encontrar você.",
    ],
    signature: "Com ternura, uma desconhecida",
  },
  {
    id: "carta-de-1912",
    title: "Do outro lado do oceano",
    excerpt: "Cheguei bem. A mala veio molhada, mas as fotografias resistiram.",
    category: "historicas",
    date: "12 de outubro de 1912",
    sender: "A. para a família",
    recipient: "À minha irmã querida",
    object: "envelope",
    place: "Santos, SP",
    body: [
      "Cheguei bem. A mala veio molhada, mas as fotografias resistiram. O mar parecia não terminar nunca e pensei em nossa casa mais vezes do que consigo contar.",
      "A cidade é barulhenta, cheia de idiomas que ainda não conheço. Mesmo assim, encontrei uma senhora na pensão que faz pão com erva-doce como a nossa avó fazia aos domingos.",
      "Quando eu puder, mando notícias melhores. Por enquanto, guarda esta carta perto da janela, como se eu estivesse apenas do outro lado da rua.",
    ],
    signature: "Seu irmão, A.",
  },
  {
    id: "confissao-cafe",
    title: "O café que nunca pedi",
    excerpt: "Toda manhã eu escolhia a mesa perto da janela, esperando você chegar.",
    category: "confissoes",
    date: "Uma manhã de inverno",
    sender: "Sem assinatura",
    recipient: "Para o rapaz do casaco verde",
    object: "postcard",
    place: "Rua do Rosário",
    body: [
      "Toda manhã eu escolhia a mesa perto da janela, esperando você chegar. Você sempre pedia café sem açúcar e deixava o livro aberto ao lado da xícara.",
      "Um dia eu quase perguntei o que estava lendo. No outro, quase disse que gostava do jeito como você franzia a testa quando uma frase era bonita. Depois a cafeteria fechou para reforma e eu nunca mais vi você.",
      "Não sei seu nome. Ainda assim, obrigada por ter sido a pequena história que inventei para atravessar aquelas manhãs frias.",
    ],
    signature: "A moça da mesa ao lado",
  },
  {
    id: "conselho-velho",
    title: "Quando a vida pedir silêncio",
    excerpt: "Nem toda resposta chega como uma frase. Algumas chegam como descanso.",
    category: "licoes-de-vida",
    date: "Para ler devagar",
    sender: "Seu avô",
    recipient: "Para quando você tiver pressa",
    object: "envelope",
    place: "Interior de Minas",
    body: [
      "Nem toda resposta chega como uma frase. Algumas chegam como descanso. Aprende a reconhecer quando seu corpo está pedindo uma pausa antes que ele precise gritar.",
      "Não tenha vergonha de mudar de caminho. A estrada não sabe o que você prometeu aos vinte anos. Só você pode decidir o que continua fazendo sentido agora.",
      "E, quando puder, ligue para quem ama sem esperar uma data especial. A vida gosta de ser interrompida por essas coisas pequenas.",
    ],
    signature: "Um abraço comprido, vô",
  },
];

export function getLetter(id: string) {
  return letters.find((letter) => letter.id === id);
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id);
}
