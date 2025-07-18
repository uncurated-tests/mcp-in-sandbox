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
      "calculate_sha256",
      "Calculate the SHA256 hash of a given string input",
      {
        input: z.string().describe("The input string to calculate SHA256 hash for. Works with any string including special characters, numbers, and Unicode characters. Example: 'hello world' would produce 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'"),
      },
      async ({ input }) => {
        const hash = createHash('sha256');
        hash.update(input, 'utf8');
        const sha256Hash = hash.digest('hex');
        
        return {
          content: [
            { 
              type: "text", 
              text: `SHA256 hash of "${input}": ${sha256Hash}` 
            }
          ],
          hash: sha256Hash,
          input: input,
          algorithm: "sha256",
          encoding: "utf8"
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              { 
                type: "text", 
                text: `Error fetching population data for "${country}": ${errorMessage}. Please try again or verify the country name.` 
              }
            ],
            success: false,
            error: errorMessage
          };
        }
      }
    );

    server.tool(
      "calculate_mortgage_payment",
      "Calculate monthly mortgage payment using the standard mortgage payment formula",
      {
        loanAmount: z.number().positive().describe("The loan amount in dollars. Example: 300000 for a $300,000 loan"),
        annualInterestRate: z.number().min(0).describe("The annual interest rate as a percentage. Example: 6.5 for 6.5% annual interest rate, or 0 for 0% interest"),
        loanTermYears: z.number().int().positive().describe("The loan term in years. Example: 30 for a 30-year mortgage"),
      },
      async ({ loanAmount, annualInterestRate, loanTermYears }) => {
        try {
          // Convert annual interest rate to monthly rate (divide by 12 and convert percentage to decimal)
          const monthlyInterestRate = (annualInterestRate / 100) / 12;
          
          // Convert loan term to number of months
          const numberOfPayments = loanTermYears * 12;
          
          // Calculate monthly payment using the standard mortgage payment formula:
          // M = P * [r(1 + r)^n] / [(1 + r)^n - 1]
          // Where: M = Monthly payment, P = Principal loan amount, r = Monthly interest rate, n = Number of payments
          
          let monthlyPayment: number;
          
          if (monthlyInterestRate === 0) {
            // Special case: 0% interest rate
            monthlyPayment = loanAmount / numberOfPayments;
          } else {
            const numerator = loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments);
            const denominator = Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1;
            monthlyPayment = numerator / denominator;
          }
          
          // Calculate total amount paid over the life of the loan
          const totalAmountPaid = monthlyPayment * numberOfPayments;
          
          // Calculate total interest paid
          const totalInterest = totalAmountPaid - loanAmount;
          
          // Format currency values
          const formatCurrency = (amount: number) => 
            new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(amount);
          
          return {
            content: [
              { 
                type: "text", 
                text: `Mortgage Payment Calculation:\n\nLoan Amount: ${formatCurrency(loanAmount)}\nAnnual Interest Rate: ${annualInterestRate}%\nLoan Term: ${loanTermYears} years\n\nMonthly Payment: ${formatCurrency(monthlyPayment)}\nTotal Amount Paid: ${formatCurrency(totalAmountPaid)}\nTotal Interest Paid: ${formatCurrency(totalInterest)}\n\nThis calculation uses the standard mortgage payment formula and assumes a fixed interest rate throughout the loan term.` 
              }
            ],
            success: true,
            calculation: {
              loanAmount,
              annualInterestRate,
              loanTermYears,
              monthlyPayment: Math.round(monthlyPayment * 100) / 100,
              totalAmountPaid: Math.round(totalAmountPaid * 100) / 100,
              totalInterest: Math.round(totalInterest * 100) / 100,
              monthlyInterestRate: Math.round(monthlyInterestRate * 10000) / 10000,
              numberOfPayments
            },
            formula: "M = P * [r(1 + r)^n] / [(1 + r)^n - 1]",
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              { 
                type: "text", 
                text: `Error calculating mortgage payment: ${errorMessage}. Please check your input values and try again.` 
              }
            ],
            success: false,
            error: errorMessage
          };
        }
      }
    );

    server.tool(
      "count_letter_occurrences",
      "Count the exact number of occurrences of a specific letter in a given string with case-insensitive matching, returning both the count and positions for verification",
      {
        text: z.string().describe("The text string to search in. Example: 'Hello World' - can contain any characters including spaces, punctuation, and numbers"),
        letter: z.string().length(1).describe("The single letter to count (case-insensitive). Example: 'l' to count both 'l' and 'L' occurrences. Must be exactly one character"),
      },
      async ({ text, letter }) => {
        try {
          // Convert both text and letter to lowercase for case-insensitive matching
          const lowerText = text.toLowerCase();
          const lowerLetter = letter.toLowerCase();
          
          // Find all positions where the letter occurs
          const positions: number[] = [];
          let count = 0;
          
          for (let i = 0; i < lowerText.length; i++) {
            if (lowerText[i] === lowerLetter) {
              positions.push(i);
              count++;
            }
          }
          
          // Create a visual representation showing the matches
          const visualRepresentation = text.split('').map((char, index) => {
            return positions.includes(index) ? char.toUpperCase() : char;
          }).join('');
          
          return {
            content: [
              { 
                type: "text", 
                text: `Letter Count Results:\n\nText: "${text}"\nLetter to count: "${letter}" (case-insensitive)\n\nTotal occurrences: ${count}\nPositions: ${positions.length > 0 ? positions.join(', ') : 'none'}\n\nVisualization (matches in uppercase):\n"${visualRepresentation}"\n\nNote: Position counting starts from 0. Case-insensitive matching finds both uppercase and lowercase versions of the letter.` 
              }
            ],
            success: true,
            analysis: {
              originalText: text,
              targetLetter: letter,
              caseSensitive: false,
              totalCount: count,
              positions: positions,
              textLength: text.length,
              visualRepresentation: visualRepresentation
            },
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [
              { 
                type: "text", 
                text: `Error counting letter occurrences: ${errorMessage}. Please check your input values and try again.` 
              }
            ],
            success: false,
            error: errorMessage
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
        count_letter_occurrences: {
          description: "Count the exact number of occurrences of a specific letter in a given string with case-insensitive matching, returning both the count and positions for verification. Useful for text analysis, pattern detection, and character frequency analysis.",
        },
        calculate_sha1: {
          description: "Calculate the SHA1 hash of a given string input. Useful for creating checksums, verifying data integrity, or generating unique identifiers. Takes any string input and returns the SHA1 hash in hexadecimal format.",
        },
        calculate_sha256: {
          description: "Calculate the SHA256 hash of a given string input. More secure than SHA1, useful for creating checksums, verifying data integrity, password hashing, or generating unique identifiers. Takes any string input including special characters, numbers, and Unicode characters, and returns the SHA256 hash in hexadecimal format.",
        },
        get_population_data: {
          description: "Get current population data for any country from REST Countries API. Takes a country name (full name, common name, or ISO code) and returns comprehensive population and country information including population count, official name, capital, region, and subregion. Useful for demographic research, country comparisons, and accessing up-to-date population statistics.",
        },
        calculate_mortgage_payment: {
          description: "Calculate monthly mortgage payment using the standard mortgage payment formula. Takes loan amount, annual interest rate (as percentage), and loan term in years. Returns monthly payment amount, total amount paid, and total interest paid. Uses the formula M = P * [r(1 + r)^n] / [(1 + r)^n - 1]. Useful for mortgage planning, loan comparisons, and financial planning.",
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
