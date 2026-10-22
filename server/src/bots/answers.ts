import { QUESTION_BANK } from '@mentira/shared';

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
    const pool = [...(ANSWERS[question] ?? []), ...GENERIC].filter(([text]) => !taken.has(text));
    const choice = pool.length ? pick(pool.slice(0, ANSWERS[question] ? 4 : pool.length)) : pick(GENERIC);
    taken.add(choice[0]);
    return choice;
  };
  return { pick: pickAnswer, reset: () => used.clear() };
}
