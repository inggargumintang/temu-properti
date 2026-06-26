import os
import json
import logging

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

api_key = os.getenv("OPENAI_API_KEY")

client = AsyncOpenAI(api_key=api_key) if api_key else None


async def generate_ai_insights(
    area: str,
    overall: dict,
    by_type: list,
    furnishing: list,
    lang: str = "en",
) -> list:
    
    if client is None:
        return []

    if not os.getenv("OPENAI_API_KEY"):
        return []

    lang_instruction = (
        "Respond in Bahasa Indonesia."
        if lang == "id"
        else "Respond in English."
    )

    system = f"""
You are a Malaysian rental property market analyst.

Given aggregated rental statistics, produce 5-7 crisp, actionable,
data-driven insights.

Rules:
- Each insight must be one sentence.
- Mention actual numbers from the data.
- Avoid generic advice.
- Focus on rental pricing, investment opportunity,
market trends and demand.

{lang_instruction}

Return ONLY a JSON array.

Example:

[
  "Average rent is RM2500...",
  "Studios command..."
]
"""

    payload = {
        "area": area,
        "overall": overall,
        "by_unit_type": by_type,
        "furnishing_distribution": furnishing,
    }

    try:

        response = await client.chat.completions.create(
            model="gpt-4.1",
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": system,
                },
                {
                    "role": "user",
                    "content": json.dumps(payload, indent=2),
                },
            ],
        )

        content = response.choices[0].message.content

        data = json.loads(content)

        if isinstance(data, dict):
            if "insights" in data:
                return data["insights"][:7]

        if isinstance(data, list):
            return data[:7]

        return []

    except Exception as e:
        logger.exception(e)
        return []