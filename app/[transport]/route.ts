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
          return {
            content: [
              { 
                type: "text", 
                text: `Error calculating mortgage payment: ${error.message}. Please check your input values and try again.` 
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
