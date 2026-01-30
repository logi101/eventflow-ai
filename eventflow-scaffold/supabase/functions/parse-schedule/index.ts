import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CORS Configuration
// ============================================================================

function getCorsHeaders(origin: string | null): Record<string, string> {
    // Allow all for now or restrict to specific origins
    return {
        'Access-Control-Allow-Origin': '*', // Allow all origins for simplicity in this dev/demo environment
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    }
}

// ============================================================================
// Main Logic
// ============================================================================

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: getCorsHeaders(req.headers.get('origin')) })
    }

    try {
        const { rows, eventDate, eventId } = await req.json()

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            throw new Error('No rows provided for parsing')
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured')
        }

        // Construct the prompt
        const prompt = `
    You are an AI assistant that parses raw schedule data into a structured JSON format.
    
    Target Schema (Array of Objects):
    {
      "title": string, // Title of the session/event
      "description": string | null, // Description if available
      "start_time": string, // Full ISO 8601 date-time string (e.g. "2024-03-20T09:00:00")
      "end_time": string, // Full ISO 8601 date-time string
      "location": string | null, // Venue/Hall name
      "room": string | null, // Specific room
      "track": string | null, // Track name (e.g. Technology, Business) or calculated from context
      "speaker_name": string | null, // Speaker full name
      "speaker_title": string | null, // Speaker job title
      "is_break": boolean, // true if it's a coffee break, lunch, registration, etc.
      "is_mandatory": boolean, // true if it sounds mandatory (Opening, Keynote, etc.)
    }

    Context:
    - Base Event Date: ${eventDate || 'Use dates found in data or assume today/future date if only time provided'}
    - Rows count: ${rows.length}

    Instructions:
    1. Parse the input rows (which may have Hebrew or English keys/values).
    2. Map them to the target schema.
    3. If 'start_time' or 'end_time' are just times (e.g. "09:00"), combine with Base Event Date (${eventDate}).
    4. Auto-detect "is_break" for lunch, coffee, registration, networking.
    5. Clean up names and text, BUT DO NOT TRANSLATE.
    6. CRITICAL: PRESERVE ORIGINAL LANGUAGE (Hebrew/English) for Title, Description, Speaker, etc. NEVER translate Hebrew to English.
    7. Return ONLY a JSON array. No code blocks, no markdown.
 
    Input Data (JSON):
    ${JSON.stringify(rows.slice(0, 50))} 
    `
        // Limiting to 50 rows for safety in this version, or standard context limits

        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey,
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json'
                    }
                }),
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`)
        }

        const result = await response.json()
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text

        if (!content) {
            throw new Error('No content returned from Gemini')
        }

        let parsedData
        try {
            parsedData = JSON.parse(content)
        } catch (e) {
            console.error('JSON parse error', content)
            throw new Error('Failed to parse Gemini output as JSON')
        }

        // Optional: Insert directly into Supabase here if eventId is provided? 
        // Or just return the data to client for preview/confirmation. 
        // Returning to client is safer for UX (preview before commit).

        return new Response(
            JSON.stringify({ success: true, data: parsedData }),
            { headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in parse-schedule:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
        )
    }
})
