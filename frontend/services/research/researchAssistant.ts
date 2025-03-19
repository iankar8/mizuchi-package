
import { supabase } from "@/utils/supabase/client";

// Function to query the Perplexity API through our edge function
export const queryResearchAssistant = async (query: string, model: string = "llama-3.1-sonar-small-128k-online") => {
  try {
    console.log("Invoking research-assistant function with query:", query);
    const { data, error } = await supabase.functions.invoke("research-assistant", {
      body: { query, model },
    });

    console.log("Research assistant function response:", { data, error });
    
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error("Error querying research assistant:", error);
    throw error;
  }
};
