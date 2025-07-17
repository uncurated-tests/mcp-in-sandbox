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
