"""AI-powered market insights using Emergent LLM Key (Claude Sonnet 4.5)."""
import os
import json
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)


async def generate_ai_insights(area: str, overall: dict, by_type: list, furnishing: list, lang: str = "en") -> list:
    """Generate 5-7 AI-powered insights as a list of strings. Bilingual (en/id)."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return []

    lang_instruction = (
        "Respond in Bahasa Indonesia." if lang == "id"
        else "Respond in English."
    )

    system = (
        "You are a Malaysian rental property market analyst. "
        "Given aggregated rental statistics, produce 5-7 crisp, actionable, data-driven insights. "
        "Each insight must be a single sentence, specific, and reference real numbers from the data. "
        "Avoid generic statements. Focus on investment value, pricing, and market dynamics. "
        f"{lang_instruction} "
        "Return ONLY a JSON array of strings, no other text. Example: [\"insight 1\", \"insight 2\"]."
    )

    user_payload = {
        "area": area,
        "overall": overall,
        "by_unit_type": by_type,
        "furnishing_distribution": furnishing,
    }

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"insights-{area}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        msg = UserMessage(text=f"Analyze this data and return JSON array of insights:\n{json.dumps(user_payload, indent=2)}")
        response = await chat.send_message(msg)

        # Strip markdown code fences if present
        text = response.strip()
        if text.startswith("```"):
            text = text.split("```")[1] if "```" in text[3:] else text
            if text.startswith("json"):
                text = text[4:]
            text = text.strip("` \n")
        # Find JSON array
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            arr = json.loads(text[start:end + 1])
            if isinstance(arr, list):
                return [str(x) for x in arr][:7]
        return []
    except Exception as e:
        logger.warning(f"AI insights failed: {e}")
        return []
