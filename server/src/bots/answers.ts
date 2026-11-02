import { QUESTION_BANK, type TripleAnswer } from '@mentira/shared';

export const BOT_NAMES = ['Bia', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Helô', 'Igor'];

/** Respostas por pergunta do banco: [texto, é verdade?] */
export const ANSWERS: Record<string, [string, boolean][]> = {
  [QUESTION_BANK[0]]: [
    ['Fui pra Ushuaia de ônibus saindo de Curitiba, foram 4 dias de estrada', true],
    ['Passei uma noite num hotel feito inteiro de gelo na Suécia', false],
    ['Fui num casamento em Goiânia e voltei padrinho sem conhecer os noivos', false],
    ['Acampei sozinho na Chapada e um lobo-guará comeu meu pão', true],
  ],
  [QUESTION_BANK[1]]: [
    ['Consigo dobrar a língua em formato de trevo', true],
    ['Sei assobiar o hino nacional de trás pra frente', false],
    ['Faço malabares com 5 laranjas', false],
    ['Decoro qualquer placa de carro na primeira olhada', true],
  ],
  [QUESTION_BANK[2]]: [
    ['Formiga tanajura frita, em Minas, e achei bom', true],
    ['Sorvete de bacalhau em Portugal', false],
    ['Pizza de banana com canela e catupiry', true],
    ['Gafanhoto com chocolate num restaurante de São Paulo', false],
  ],
  [QUESTION_BANK[3]]: [
    ['Fui Papai Noel de shopping com 19 anos', true],
    ['Trabalhei testando colchão pra uma fábrica', false],
    ['Fui figurante de novela da Globo, apareci 2 segundos', true],
    ['Passeava com cachorro de famoso no Leblon', false],
  ],
  [QUESTION_BANK[4]]: [
    ['Dividi elevador com o Faustão', true],
    ['O Gil me pediu um isqueiro no aeroporto', false],
    ['Tirei foto com a Anitta numa farmácia', false],
    ['Joguei futevôlei com o Romário na praia', false],
  ],
  [QUESTION_BANK[5]]: [
    ['Escorreguei no palco da formatura bem na hora do diploma', true],
    ['Chamei a professora de "mãe" no meio da prova', true],
    ['Entrei no carro errado achando que era meu Uber e fui até a esquina', false],
    ['Caí na piscina de roupa num evento da empresa', false],
  ],
  [QUESTION_BANK[6]]: [
    ['Fiz curso de mágica por correspondência', true],
    ['Criei caracóis por dois anos', false],
    ['Colecionava sachês de açúcar de padaria', true],
    ['Pratiquei esgrima medieval com armadura', false],
  ],
  [QUESTION_BANK[7]]: [
    ['Uma foto minha bebê emoldurada… dada por um ex', true],
    ['Um peixe vivo num saco plástico', false],
    ['Uma cadeira de massagem quebrada', false],
    ['Um pote de areia da praia "pra lembrar de mim"', true],
  ],
  [QUESTION_BANK[8]]: [
    ['Ganhei um concurso de comer pastel na feira', true],
    ['Tenho o recorde da escola em pular corda', false],
    ['Fiquei em 3º num campeonato de truco', true],
    ['Já fui campeão estadual de pebolim', false],
  ],
  [QUESTION_BANK[9]]: [
    ['Fiquei preso num teleférico por 40 minutos', true],
    ['Fui confundido com um palestrante e dei a palestra', false],
    ['Fui parar num casamento cigano por engano', false],
    ['Perdi o voo porque dormi no portão de embarque', true],
  ],
  [QUESTION_BANK[10]]: [
    ['Me chamavam de Tatu porque eu vivia cavando o quintal', true],
    ['Meu apelido era Pipoca porque eu não parava quieto', true],
    ['Era Bolacha, porque eu trocava o lanche da escola por bolacha recheada', true],
    ['Me chamavam de Radar porque eu ouvia tudo que os adultos falavam', false],
    ['Meu apelido era Professor porque eu corrigia o português de todo mundo', false],
    ['Era Tampinha, mesmo eu sendo o mais alto da turma', false],
  ],
  [QUESTION_BANK[11]]: [
    ['Pintei o cachorro do vizinho com tinta guache azul', true],
    ['Cortei a franja da minha irmã com tesoura de picotar', true],
    ['Escondi o controle da TV dentro do freezer por uma semana', true],
    ['Vendi as plantas da minha avó na porta de casa', false],
    ['Tranquei meu pai do lado de fora no meio de uma chuva', false],
    ['Soltei todas as galinhas do sítio do meu tio', false],
  ],
  [QUESTION_BANK[12]]: [
    ['Queria ser astronauta e treinava girando na cadeira do escritório', true],
    ['Queria ser caminhoneiro só para conhecer todos os estados', true],
    ['Queria ser veterinário de dinossauro', true],
    ['Queria ser jóquei, mesmo tendo medo de cavalo', false],
    ['Queria ser apresentador da previsão do tempo', false],
    ['Queria dirigir o caminhão de sorvete do bairro', false],
  ],
  [QUESTION_BANK[13]]: [
    ['Gastei o primeiro salário inteiro num videogame', true],
    ['Paguei um rodízio de pizza para a família toda', true],
    ['Comprei um tênis que eu queria havia dois anos', true],
    ['Guardei tudo numa lata de biscoito e esqueci onde ela estava', false],
    ['Comprei uma bateria e toquei uma vez só', false],
    ['Dei tudo de entrada numa moto que nunca aprendi a pilotar', false],
  ],
  [QUESTION_BANK[14]]: [
    ['O entrevistador atendeu o celular e pediu uma pizza no meio da entrevista', true],
    ['Fiz uma entrevista inteira com a câmera em modo batata', true],
    ['Numa reunião, o chefe passou meia hora falando do gato dele', true],
    ['Me pediram para cantar o hino da empresa na entrevista', false],
    ['A entrevista foi feita andando numa esteira', false],
    ['O entrevistador era meu ex-professor de matemática e lembrou da minha nota', false],
  ],
  [QUESTION_BANK[15]]: [
    ['Só durmo com meias de cores diferentes', true],
    ['Conto os degraus de toda escada que subo', true],
    ['Como o recheio do biscoito antes da bolacha', true],
    ['Preciso tocar a maçaneta três vezes antes de sair de casa', false],
    ['Organizo a geladeira pela cor das embalagens', false],
    ['Leio o final do livro antes de começar', false],
  ],
  [QUESTION_BANK[16]]: [
    ['Sei cantar "Ragatanga" inteira, com a parte em espanhol', true],
    ['Sei "Ilariê", da Xuxa, com coreografia e tudo', true],
    ['Sei todas as aberturas de desenho dos anos 90', true],
    ['Sei de cor o jingle de uma propaganda de banco de 2004', false],
    ['Sei cantar "Macarena" inteira em espanhol', false],
    ['Sei a música de "Chiquititas" do começo ao fim', false],
  ],
  [QUESTION_BANK[17]]: [
    ['Não suporto chocolate, nem em bolo', true],
    ['Odeio pizza de qualquer sabor', true],
    ['Não como pão de queijo de jeito nenhum', true],
    ['Brigadeiro me dá enjoo só de olhar', false],
    ['Detesto batata frita', false],
    ['Não suporto café, nem o cheiro', false],
  ],
  [QUESTION_BANK[18]]: [
    ['Guardo o ingresso do primeiro show que eu fui, de 2008', true],
    ['Tenho uma caixa com os carregadores de todos os celulares que já tive', true],
    ['Guardo um dente de leite numa caixinha de fósforo', true],
    ['Guardo a chave de um carro que vendi há dez anos', false],
    ['Tenho no congelador um pedaço do bolo de 15 anos da minha prima', false],
    ['Guardo uma pedra que trouxe de uma praia na Grécia', false],
  ],
  [QUESTION_BANK[19]]: [
    ['Me perdi num shopping e só me acharam pelo alto-falante', true],
    ['Errei a saída da estrada e fui parar em outro estado', true],
    ['Me perdi numa trilha e voltei seguindo um cachorro', true],
    ['Me perdi no metrô de Tóquio por quatro horas', false],
    ['Entrei no avião errado e só percebi na decolagem', false],
    ['Me perdi num labirinto de milho no interior', false],
  ],
  [QUESTION_BANK[20]]: [
    ['Um lagarto caiu do teto no meu prato', true],
    ['Acordei com um gato desconhecido dormindo em cima de mim', true],
    ['O elevador desceu dois andares de uma vez comigo dentro', true],
    ['Um macaco roubou meus óculos no zoológico', false],
    ['Fiquei preso na câmara fria de um supermercado', false],
    ['Pisei numa cobra achando que era uma mangueira', false],
  ],
  [QUESTION_BANK[21]]: [
    ['Tive um jabuti que viveu mais que três cachorros da família', true],
    ['Criei uma galinha no apartamento por um ano', true],
    ['Tive um peixe que viveu doze anos', true],
    ['Tive uma iguana que dormia na minha cama', false],
    ['Cuidei de um filhote de capivara por uns meses', false],
    ['Tive um papagaio que imitava a campainha', false],
  ],
  [QUESTION_BANK[22]]: [
    ['Comi uma pimenta inteira para ganhar um refrigerante', true],
    ['Raspei a sobrancelha por causa de um jogo de futebol', true],
    ['Fui trabalhar de pijama por causa de uma aposta', true],
    ['Pulei de bungee jump por causa de uma aposta no truco', false],
    ['Fiquei um mês sem celular por uma aposta', false],
    ['Fui a uma festa fantasiado de galinha por uma aposta', false],
  ],
  [QUESTION_BANK[23]]: [
    ['Pedi um corte da moda e saí parecendo um cogumelo', true],
    ['Meu irmão passou a máquina no meu cabelo e esqueceu o pente', true],
    ['Fiz luzes em casa e o cabelo ficou laranja', true],
    ['Fiz um moicano para a formatura', false],
    ['Pintei o cabelo de azul na véspera de uma entrevista de emprego', false],
    ['Cortei a própria franja olhando no reflexo da colher', false],
  ],
  [QUESTION_BANK[24]]: [
    ['Encontrei um colega da escola num restaurante em outro país', true],
    ['Meu vizinho de poltrona no avião era um primo distante', true],
    ['Achei na rua uma carteira de alguém com o meu nome completo', true],
    ['Nasci no mesmo dia e hora que meu melhor amigo', false],
    ['Ganhei duas vezes a mesma rifa', false],
    ['Comprei um livro usado e era um que eu mesmo tinha doado', false],
  ],
  [QUESTION_BANK[25]]: [
    ['O mais longe que fui foi o Japão, com 24 horas de voo', true],
    ['Fui até a Patagônia de carro', true],
    ['O mais longe foi a Austrália, num intercâmbio', true],
    ['Fui à Islândia ver a aurora boreal', false],
    ['Passei uma semana na Antártida num navio de pesquisa', false],
    ['Fui à Mongólia e dormi numa tenda', false],
  ],
  [QUESTION_BANK[26]]: [
    ['Fiquei 3 minutos com uma colher equilibrada no nariz', true],
    ['Descasco uma laranja inteira sem quebrar a casca', true],
    ['Sei o nome das capitais de todos os países do mundo', true],
    ['Falo o alfabeto de trás pra frente em 5 segundos', false],
    ['Empilhei 40 moedas numa pilha só', false],
    ['Fiz 200 embaixadinhas com uma laranja', false],
  ],
  [QUESTION_BANK[27]]: [
    ['Fiquei 9 horas na fila para comprar ingresso de show', true],
    ['Esperei 6 horas no aeroporto por uma mala que nem era minha', true],
    ['Passei a noite na fila do lançamento de um celular', true],
    ['Dormi dois dias na calçada para pegar um autógrafo', false],
    ['Fiquei 5 horas na fila do Detran e era no guichê errado', false],
    ['Esperei 12 horas para entrar num parque de diversões', false],
  ],
};

export const GENERIC: [string, boolean][] = [
  ['Isso aconteceu comigo em 2019 e até hoje ninguém acredita', true],
  ['Tenho até foto disso, mas perdi o celular', false],
  ['Foi numa viagem com a família, juro', true],
  ['Meu primo estava junto e pode confirmar', false],
  ['Aconteceu numa terça-feira chuvosa em Belo Horizonte', true],
  ['Saiu até no jornal do bairro', false],
  ['Minha mãe conta essa história em todo Natal', true],
  ['Foi no intercâmbio, no Canadá, com neve até o joelho', false],
  ['Eu tinha 7 anos e lembro de tudo', true],
  ['Rolou no aniversário de 15 anos da minha prima', false],
];

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/**
 * Sorteia respostas para os bots de uma sala sem repetir a mesma frase numa
 * rodada. Perguntas do banco usam respostas próprias; as outras, genéricas.
 */
export function createAnswerPicker() {
  const used = new Map<number, Set<string>>();
  const pickAnswer = (round: number, question: string): [string, boolean] => {
    const taken = used.get(round) ?? new Set<string>();
    used.set(round, taken);
    const fresh = (items: [string, boolean][]) => items.filter(([text]) => !taken.has(text));
    const own = fresh(ANSWERS[question] ?? []);
    const generic = fresh(GENERIC);
    const choice = pick(own.length ? own : generic.length ? generic : GENERIC);
    taken.add(choice[0]);
    return choice;
  };
  /** 1 verdade + 2 mentiras, sempre diferentes entre si, mesmo com o banco esgotado. */
  const pickTriple = (round: number, question: string): TripleAnswer => {
    const taken = used.get(round) ?? new Set<string>();
    used.set(round, taken);
    const chosen = new Set<string>();
    const pickOne = (isTruth: boolean) => {
      const matching = (items: [string, boolean][]) =>
        items.filter(([text, truth]) => truth === isTruth && !chosen.has(text)).map(([text]) => text);
      const fresh = (items: string[]) => items.filter((text) => !taken.has(text));
      const own = fresh(matching(ANSWERS[question] ?? []));
      const generic = matching(GENERIC);
      const text = pick(own.length ? own : fresh(generic).length ? fresh(generic) : generic);
      taken.add(text);
      chosen.add(text);
      return text;
    };
    return { truth: pickOne(true), lies: [pickOne(false), pickOne(false)] };
  };
  return { pick: pickAnswer, pickTriple, reset: () => used.clear() };
}
