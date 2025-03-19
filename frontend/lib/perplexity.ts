
type PerplexityRequestConfig = {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  search_domain_filter?: string[];
  search_recency_filter?: string;
  frequency_penalty?: number;
  presence_penalty?: number;
  return_images?: boolean;
  return_related_questions?: boolean;
};

export const PERPLEXITY_MODELS = {
  SMALL: 'llama-3.1-sonar-small-128k-online',
  LARGE: 'llama-3.1-sonar-large-128k-online',
  HUGE: 'llama-3.1-sonar-huge-128k-online',
};

export const DEFAULT_SYSTEM_PROMPT = `You are a knowledgeable financial research assistant. 
Your goal is to provide accurate, insightful analysis of financial markets, companies, and investment strategies.
Always cite your sources and be transparent about the limitations of your knowledge.
Format your responses with clear sections and bullet points when appropriate.
If the information requested might be outdated, acknowledge that limitation.`;

export async function queryPerplexity(
  message: string,
  apiKey?: string,
  options: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
) {
  // Use environment variable or provided key
  const key = apiKey || import.meta.env.VITE_PERPLEXITY_API_KEY;
  
  // Check if we have a key
  if (!key) {
    throw new Error("Perplexity API key not provided. Set VITE_PERPLEXITY_API_KEY environment variable.");
  }
  const {
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    model = PERPLEXITY_MODELS.SMALL,
    temperature = 0.2,
    maxTokens = 1000,
  } = options;

  try {
    const requestConfig: PerplexityRequestConfig = {
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: 0.9,
      return_images: false,
      return_related_questions: false,
      search_domain_filter: ['perplexity.ai'],
      search_recency_filter: 'month',
      frequency_penalty: 1,
      presence_penalty: 0
    };

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      sources: data.choices[0].search_info?.search_results || [],
    };
  } catch (error) {
    console.error('Error querying Perplexity:', error);
    throw error;
  }
}
