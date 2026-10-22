/**
 * Seed Inicial de Cartas Epistolares — Entre Cartas
 * Cartas curadas para dar vida ao acervo afetivo e permitir testes imediatos
 */

const cartasIniciais = [
  {
    titulo: 'Para o garoto que pegava o trem das 18h12',
    remetente_anonimo: 'A passageira do casaco mostarda',
    destinatario_anonimo: 'O leitor de Dostoiévski no vagão 3',
    categoria: 'amor',
    tipo_papel: 'envelhecido',
    lacre_cera_cor: 'vinho',
    data_carta: 'Novembro chuvoso, 2019',
    leituras_count: 142,
    conteudo: `Durante todo o inverno daquele ano, meus dias tinham uma única certeza: às 18h12 você entraria pela segunda porta do vagão, sacudiria a água do guarda-chuva e abriria o mesmo livro surrado com a capa colada com fita adesiva.

Eu nunca tive coragem de dizer que comprei o mesmo livro só para saber em qual capítulo você estava sorrindo. O trem parava na Estação Luz e o fluxo de pessoas sempre nos afastava antes que eu conseguisse perguntar o seu nome. 

Se por algum milagre do destino você encontrar este pedaço de papel guardado aqui: eu ainda olho para as portas automáticas toda vez que a chuva começa a cair na cidade.`
  },
  {
    titulo: 'Se você encontrar esta caixa sob o assoalho',
    remetente_anonimo: 'M. E. (Antiga moradora)',
    destinatario_anonimo: 'Quem habitar esta casa de janelas azuis depois de mim',
    categoria: 'memorias',
    tipo_papel: 'linho',
    lacre_cera_cor: 'dourado',
    data_carta: 'Primavera de 1974',
    leituras_count: 89,
    conteudo: `Não se assuste com o rangido do terceiro degrau da escada de madeira: ele não é um defeito, é um aviso carinhoso de que alguém está voltando para o ninho.

Nesta casa nós dançamos descalços ao som de bossa nova nas noites quentes de fevereiro, choramos a perda de um gato rajado e vimos as jacarandás florescerem trinta e duas vezes no quintal. Deixei nesta fresta do assoalho três moedas antigas, um botão de madrepérola e esta carta.

Cuide bem das roseiras da entrada. Elas gostam da água fresca logo no início da manhã. Que este teto seja tão gentil com você quanto foi conosco.`
  },
  {
    titulo: 'As palavras que engoli no jantar de despedida',
    remetente_anonimo: 'Alguém que ainda sonha com você',
    destinatario_anonimo: 'Você, do outro lado da mesa de toalha xadrez',
    categoria: 'nunca_enviada',
    tipo_papel: 'rasgado',
    lacre_cera_cor: 'verde_musgo',
    data_carta: 'Quinta-feira fria, 01:40',
    leituras_count: 215,
    conteudo: `Você elogiou a massa e disse que o vinho estava no ponto exato. Eu sorri e concordei, enquanto por dentro tentava decorar a curvatura exata do seu riso quando você ajeita o cabelo atrás da orelha.

Eu sabia que as malas já estavam no porta-malas do carro. Sabia que você pegaria o voo das sete da manhã para recomeçar a vida do outro lado do oceano. Em nenhum segundo eu tive coragem de pedir: "fica, ou pelo menos me leva na mala".

Achei que o silêncio era a prova mais elegante de amor. Hoje entendo que o silêncio foi só covardia. Espero que o vento do outono na Europa seja mais suave do que o nó que ficou na minha garganta naquela noite.`
  },
  {
    titulo: 'O cheiro de café coado e pão na chapa às cinco da manhã',
    remetente_anonimo: 'Seu neto mais distraído',
    destinatario_anonimo: 'Vovó Leonor',
    categoria: 'memorias',
    tipo_papel: 'pautado',
    lacre_cera_cor: 'azul_noite',
    data_carta: 'Um domingo de silêncio',
    leituras_count: 67,
    conteudo: `Vó,

A cidade grande acorda muito tarde e com muita pressa. Ninguém aqui acende o fogão de ferro nem varre as folhas da calçada cantarolando hinos antigos.

Sinto falta de sentar no banquinho de madeira e ouvir suas histórias repetidas sobre quando você e o vô compraram o primeiro rádio a pilha. Eu achava que o tempo fosse infinito e que suas mãos com veias azuis e cheiro de alfazema estariam sempre ali para segurar as minhas.

Coloquei um pouco de açúcar a mais na garrafa hoje, só para tentar imitar o seu café. Não ficou igual, mas me fez fechar os olhos e voltar para a sua cozinha por cinco minutos.`
  },
  {
    titulo: 'Perdoa a pressa com que vivi nossos vinte anos',
    remetente_anonimo: 'C. B.',
    destinatario_anonimo: 'Ao meu primeiro grande amor',
    categoria: 'desabafo',
    tipo_papel: 'datilografado',
    lacre_cera_cor: 'vinho',
    data_carta: 'Madrugada de Outubro, 2016',
    leituras_count: 310,
    conteudo: `Éramos tão jovens e tão cheios de certezas urgentes que não sabíamos sentar na grama do parque e apenas respirar. Eu tinha pressa de ter um emprego, pressa de ter um apartamento, pressa de provar ao mundo que nós dois éramos adultos invencíveis.

No meio de tanta pressa, esqueci de reparar em como você me olhava quando cantávamos no carro com os vidros abaixados. Esqueci de agradecer pelas cartas escritas à mão que você enfiava no meio dos meus cadernos da faculdade.

A gente não terminou por falta de afeto; a gente terminou porque eu não soube ter calma. Hoje tenho todas as coisas materiais pelas quais corri tanto, e daria cada uma delas para ter mais uma tarde de domingo deitada no seu peito sem hora para ir embora.`
  },
  {
    titulo: 'Bilhete clandestino em um exemplar de "Cem Anos de Solidão"',
    remetente_anonimo: 'Leitor da Biblioteca Municipal',
    destinatario_anonimo: 'Ao próximo que alugar o livro com a etiqueta 863.64',
    categoria: 'confissao',
    tipo_papel: 'envelhecido',
    lacre_cera_cor: 'dourado',
    data_carta: '14 de Setembro, 2021',
    leituras_count: 184,
    conteudo: `Se você chegou até a página 142 deste exemplar, reparou que há uma mancha circular de café na borda direita.

Na tarde em que derrubei essa xícara, eu havia acabado de descobrir que o homem que prometeu casar comigo tinha comprado duas passagens só de ida para o norte com outra pessoa. As lágrimas caíram no papel antes que eu conseguisse secar.

Este livro me salvou do abismo durante as três semanas seguintes. Macondo e a família Buendía foram o único refúgio onde minha dor parecia suportável. 

Seja quem for que estiver com este exemplar em mãos: se o seu coração estiver doendo hoje, respire fundo. Macondo desapareceu como um furacão de poeira, mas você ainda está aqui. E as coisas vão melhorar.`
  },
  {
    titulo: 'Para o futuro que planejamos na praia de Santos',
    remetente_anonimo: 'Nós dois (antes de sermos estranhos)',
    destinatario_anonimo: 'O apartamento de janelas altas que nunca existiu',
    categoria: 'luto',
    tipo_papel: 'linho',
    lacre_cera_cor: 'azul_noite',
    data_carta: '31 de Dezembro, virada de ano',
    leituras_count: 98,
    conteudo: `Tínhamos um caderno com capa de papel kraft onde colávamos recortes de revistas: a estante de madeira maciça que construiríamos juntos, a luminária pendente amarela e o cachorro vira-lata que adotaríamos na feira da praça.

O destino tem essa ironia cruel de desarmar projetos com conversas de dez minutos na cozinha. 

Hoje passo em frente ao prédio que visitamos naquele sábado ensolarado e vejo que colocaram cortinas brancas nas janelas do quarto andar. Fico imaginando se quem mora lá dentro sabe que, no meu coração, aquele espaço ainda pertence aos nossos fantasmas de vinte e poucos anos.`
  },
  {
    titulo: 'Ainda guardo a folha de plátano seca que você pôs no meu casaco',
    remetente_anonimo: 'Alguém que não soube te esquecer',
    destinatario_anonimo: 'Clara',
    categoria: 'amor',
    tipo_papel: 'envelhecido',
    lacre_cera_cor: 'verde_musgo',
    data_carta: 'Tarde de vento frio em Curitiba',
    leituras_count: 247,
    conteudo: `Já se passaram quase quatro outonos. A folha que você colheu do chão perto da fonte e colocou no bolso esquerdo do meu casaco de lã já perdeu a cor alaranjada viva; agora é marrom-escura, frágil e quebradiça.

Mas toda vez que abro a gaveta de cima da escrivaninha e sinto o cheiro da madeira antiga misturado com o papel, ouço sua risada debochando do meu nariz vermelho pelo frio.

Dizem que o amor verdadeiro se transforma em gratidão pacífica com o passar do tempo. Acho que o meu ainda não aprendeu a ser pacífico. Ele ainda bate na porta feito chuva fina no vidro.`
  }
];

module.exports = {
  cartasIniciais
};
