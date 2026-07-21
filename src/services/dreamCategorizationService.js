const axios = require('axios');
const { AI_PROVIDERS } = require('../config/aiProviders');

const DREAM_CATEGORIES = [
  'Perseguição', 'Queda', 'Água', 'Família', 'Trabalho',
  'Morte', 'Dinheiro', 'Viagem', 'Relacionamento', 'Animais',
  'Crianças', 'Casa', 'Escola', 'Veículos', 'Natureza',
  'Fogo', 'Escuridão', 'Espiritualidade', 'Festa', 'Doença',
  'Prisão', 'Acidente', 'Sexo', 'Gravidez', 'Casamento',
  'Separação', 'Amigos', 'Desconhecidos', 'Objetos', 'Tecnologia',
  'Outros',
];

const CATEGORIZATION_PROMPT = `Classifique o sonho abaixo em APENAS UMA das categorias:

Perseguição: sonhos onde o usuário é perseguido, ameaçado, fugindo de alguém/algo
Queda: sonhos de cair, desabar, perder o equilíbrio, altura
Água: sonhos com mar, rio, chuva, afogamento, inundação, piscina
Família: sonhos com parentes, família, casa da infância, pais, irmãos
Trabalho: sonhos com trabalho, chefes, colegas, prazos, demissão
Morte: sonhos com morte, falecimento, funerais, luto
Dinheiro: sonhos com dinheiro, riqueza, pobreza, contas, compras
Viagem: sonhos com viagens, transporte, avião, carro, estradas
Relacionamento: sonhos com parceiro(a), ex, casamento, romance, amizade
Animais: sonhos com animais domésticos, selvagens, criaturas
Crianças: sonhos com crianças, bebês, parto, infância
Casa: sonhos com casa, lar, construção, mudança, mobília
Escola: sonhos com escola, faculdade, provas, sala de aula, professores
Veículos: sonhos com carros, ônibus, trens, acidentes de trânsito
Natureza: sonhos com florestas, montanhas, plantas, animais selvagens, paisagens
Fogo: sonhos com incêndio, chamas, explosões, calor intenso
Escuridão: sonhos com escuro, noite, sombras, visão turva
Espiritualidade: sonhos com religião, deuses, vida após a morte, milagres
Festa: sonhos com festas, celebrações, encontros sociais, dança
Doença: sonhos com doenças, hospitais, cirurgias, dor, sofrimento
Prisão: sonhos com prisão, cárcere, restrição, impossibilidade de fugir
Acidente: sonhos com acidentes, quedas, colisões, quedas livres
Sexo: sonhos com sexo, desejo, intimidade, nudez
Gravidez: sonhos com gravidez, gestação, parto, maternidade/paternidade
Casamento: sonhos com casamento, alianças, cerimônias, compromisso
Separação: sonhos com separação, abandono, perda de alguém
Amigos: sonhos com amigos, amizade, encontros, convívio social
Desconhecidos: sonhos com pessoas desconhecidas, estranhos, misteriosos
Objetos: sonhos com objetos importantes, ferramentas, presentes, itens pessoais
Tecnologia: sonhos com computadores, celulares, internet, redes sociais, inteligência artificial
Outros: quando não se encaixa em nenhuma categoria acima

Responda APENAS com o nome da categoria, sem pontuação ou explicação.

SONHO:
`;

async function categorizeDream(dreamText) {
  const config = AI_PROVIDERS.deepseek.primary;

  try {
    const response = await axios({
      url: config.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY}`,
      },
      data: {
        model: config.model,
        messages: [
          { role: 'system', content: 'Você classifica sonhos em categorias. Responda apenas o nome da categoria.' },
          { role: 'user', content: CATEGORIZATION_PROMPT + dreamText },
        ],
        temperature: 0.3,
        max_tokens: 20,
      },
      timeout: AI_PROVIDERS.deepseek.timeout,
    });

    const raw = response.data.choices?.[0]?.message?.content?.trim() || '';
    const matched = DREAM_CATEGORIES.find(
      c => raw.toLowerCase().includes(c.toLowerCase())
    );

    return matched || 'Outros';
  } catch (error) {
    console.error('❌ Erro ao categorizar sonho:', error.message);
    return 'Outros';
  }
}

module.exports = { categorizeDream, DREAM_CATEGORIES };
