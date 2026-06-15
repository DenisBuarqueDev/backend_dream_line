const axios = require('axios');
const { AI_PROVIDERS } = require('../config/aiProviders');

const DREAM_CATEGORIES = [
  'Perseguição', 'Queda', 'Água', 'Família', 'Trabalho',
  'Morte', 'Dinheiro', 'Viagem', 'Relacionamento', 'Outros',
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
