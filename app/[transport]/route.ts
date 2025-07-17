import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { createHash } from "crypto";

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "echo",
      "Echo a message",
      {
        message: z.string().describe("The message to echo"),
      },
      async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }],
      })
    );

    server.tool(
      "calculate_sha1",
      "Calculate the SHA1 hash of a given string input",
      {
        input: z.string().describe("The input string to calculate SHA1 hash for. Example: 'hello world' would produce 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'"),
      },
      async ({ input }) => {
        const hash = createHash('sha1');
        hash.update(input);
        const sha1Hash = hash.digest('hex');
        
        return {
          content: [
            { 
              type: "text", 
              text: `SHA1 hash of "${input}": ${sha1Hash}` 
            }
          ],
          hash: sha1Hash,
          input: input,
          algorithm: "sha1"
        };
      }
    );

    server.tool(
      "get_population_data",
      "Get current population data for a country from REST Countries API",
      {
        country: z.string().describe("The name of the country to get population data for. Can be full name (e.g., 'United States'), common name (e.g., 'USA'), or ISO code (e.g., 'US'). Examples: 'Germany', 'Japan', 'Brazil', 'UK', 'France'"),
      },
      async ({ country }) => {
        try {
          // Try to fetch country data from REST Countries API
          const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              return {
                content: [
                  { 
                    type: "text", 
                    text: `Country "${country}" not found. Please check the spelling or try alternative names (e.g., 'USA' instead of 'United States', 'UK' instead of 'United Kingdom').` 
                  }
                ],
                success: false,
                error: "Country not found"
              };
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // REST Countries API returns an array, get the first match
          const countryData = Array.isArray(data) ? data[0] : data;
          
          if (!countryData) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `No data found for country "${country}". Please verify the country name and try again.` 
                }
              ],
              success: false,
              error: "No data found"
            };
          }

          const population = countryData.population;
          const officialName = countryData.name?.official || countryData.name?.common || country;
          const commonName = countryData.name?.common || officialName;
          const capital = countryData.capital ? countryData.capital[0] : "N/A";
          const region = countryData.region || "N/A";
          const subregion = countryData.subregion || "N/A";
          
          // Format population with commas for readability
          const formattedPopulation = population.toLocaleString();
          
          return {
            content: [
              { 
                type: "text", 
                text: `Population data for ${commonName}:\n\nPopulation: ${formattedPopulation}\nOfficial name: ${officialName}\nCapital: ${capital}\nRegion: ${region}\nSubregion: ${subregion}\n\nData source: REST Countries API\nNote: Population figures are estimates and may not reflect the most recent census data.` 
              }
            ],
            success: true,
            country: {
              name: {
                common: commonName,
                official: officialName
              },
              population: population,
              capital: capital,
              region: region,
              subregion: subregion
            },
            data_source: "REST Countries API",
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            content: [
              { 
                type: "text", 
                text: `Error fetching population data for "${country}": ${error.message}. Please try again or verify the country name.` 
              }
            ],
            success: false,
            error: error.message
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message",
        },
        count_character: {
          description: "Count occurrences of a character in a string",
        },
        calculate_sha1: {
          description: "Calculate the SHA1 hash of a given string input. Useful for creating checksums, verifying data integrity, or generating unique identifiers. Takes any string input and returns the SHA1 hash in hexadecimal format.",
        },
        get_population_data: {
          description: "Get current population data for any country from REST Countries API. Takes a country name (full name, common name, or ISO code) and returns comprehensive population and country information including population count, official name, capital, region, and subregion. Useful for demographic research, country comparisons, and accessing up-to-date population statistics.",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
