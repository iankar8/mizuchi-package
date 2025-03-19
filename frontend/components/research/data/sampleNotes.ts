
import { ResearchNote } from "../types";

// Sample research notes
export const sampleNotes: ResearchNote[] = [
  {
    id: "note1",
    title: "Tech Sector Analysis Q2 2023",
    content: "## AI Impact on Tech Valuations\n\nAI capabilities are driving valuation premiums across the tech sector. Companies with strong AI strategies are seeing multiple expansion.\n\n### Key Insights:\n\n- Enterprise AI adoption accelerating faster than consumer\n- Cloud providers seeing increased demand for AI infrastructure\n- Semiconductor constraints becoming apparent\n- Rising AI inference costs may impact margins\n\n### Follow-up Research:\n- Assess memory chip supply constraints\n- Review Nvidia's competitive position vs AMD\n- Evaluate Microsoft's AI monetization strategy",
    date: new Date(2023, 5, 15),
    tags: ["AI", "Tech", "Semiconductors"],
    relatedStocks: ["NVDA", "MSFT", "AMD"]
  },
  {
    id: "note2",
    title: "Financial Sector Interest Rate Analysis",
    content: "## Bank Performance in Rising Rate Environment\n\nRegional banks remain under pressure despite stabilization in deposits. Net interest margins are showing early signs of compression as deposit costs rise faster than loan yields.\n\n### Key Insights:\n\n- Larger banks outperforming regionals due to diversified revenue streams\n- Credit quality holding steady but early warning signs in commercial real estate\n- Investment banking activity remains subdued\n- Consumer credit showing resilience despite higher rates\n\n### Follow-up Research:\n- Monitor credit card delinquency trends\n- Assess impact of office real estate on bank loans\n- Compare deposit beta assumptions across banks",
    date: new Date(2023, 7, 20),
    tags: ["Banking", "Interest Rates", "Credit"],
    relatedStocks: ["JPM", "BAC", "GS", "RF"]
  }
];
