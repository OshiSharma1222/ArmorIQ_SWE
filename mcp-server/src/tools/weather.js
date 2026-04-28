import { z } from 'zod';

const WEATHER_API = 'https://wttr.in';

export function registerWeatherTools(server) {
  server.tool(
    'get_weather',
    'Get current weather for a city using wttr.in',
    { city: z.string().describe('City name, e.g. "London" or "New York"') },
    async ({ city }) => {
      try {
        const res = await fetch(`${WEATHER_API}/${encodeURIComponent(city)}?format=j1`);
        if (!res.ok) {
          return {
            content: [{ type: 'text', text: `Weather API returned ${res.status}` }],
            isError: true
          };
        }

        const data = await res.json();
        const current = data.current_condition?.[0];
        if (!current) {
          return {
            content: [{ type: 'text', text: 'Could not parse weather data' }],
            isError: true
          };
        }

        const summary = {
          city,
          temperature_c: current.temp_C,
          temperature_f: current.temp_F,
          feels_like_c: current.FeelsLikeC,
          humidity: current.humidity + '%',
          description: current.weatherDesc?.[0]?.value || 'Unknown',
          wind_speed_kmph: current.windspeedKmph,
          wind_direction: current.winddir16Point
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to fetch weather: ${err.message}` }],
          isError: true
        };
      }
    }
  );
}
