import axios, { AxiosError } from "axios";
import logger from "../config/logger.config";

/**
 * Supported LLM providers.
 *
 * Extend this union when adding new providers (e.g. "anthropic", "ollama").
 */
type SupportedProvider = "openai" | "groq";

/**
 * Chat message structure compatible with OpenAI-style APIs.
 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Provider configuration shape.
 * Defines how to construct the final API endpoint.
 */
interface ProviderConfig {
  baseUrl: string;
  endpoint: string;
}

/**
 * LLMService
 *
 * A provider-agnostic service for interacting with OpenAI-compatible LLM APIs.
 *
 * Key Features:
 * - Supports multiple providers (OpenAI, Groq)
 * - Centralized request handling
 * - Easily extendable for future providers
 * - Environment-driven configuration (no hardcoding)
 *
 * Expected ENV variables:
 *
 *   AI_PROVIDER     → "openai" | "groq"
 *   AI_API_KEY      → API key for selected provider
 *   AI_MODEL        → Model name (e.g. "gpt-4o-mini", "llama-3.1-8b-instant")
 *   AI_BASE_URL     → Base API URL (WITHOUT endpoint)
 *
 * Optional ENV:
 *   AI_TIMEOUT      → request timeout (ms)
 *   AI_MAX_TOKENS   → max tokens per response
 *   AI_TEMPERATURE  → randomness (0–1)
 */
export class LLMService {
  private readonly provider: SupportedProvider;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  /**
   * Default system prompt applied to every request.
   * Keep it short to avoid wasting tokens.
   */
  private static readonly SYSTEM_PROMPT =
    "You are an environmental IoT assistant for the Breezo air quality network. " +
    "Interpret sensor data and give concise, human-readable insights under 200 words.";

  constructor() {
    this.provider = this.requireEnv("AI_PROVIDER") as SupportedProvider;
    this.apiKey = this.requireEnv("AI_API_KEY");
    this.model = this.requireEnv("AI_MODEL");
    this.baseUrl = this.requireEnv("AI_BASE_URL");
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Sends a prompt to the configured LLM provider.
   *
   * @param prompt - User input prompt
   * @returns AI-generated response text
   */
  async ask(prompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: "system", content: LLMService.SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const url = this.getEndpoint();

    try {
      const response = await axios.post(
        url,
        {
          model: this.model,
          messages,
          temperature: Number(process.env.AI_TEMPERATURE ?? 0.7),
          max_tokens: Number(process.env.AI_MAX_TOKENS ?? 300),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: Number(process.env.AI_TIMEOUT ?? 15000),
        }
      );

      // Extract content from OpenAI-compatible response structure
      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        logger.warn("LLM returned empty response", {
          provider: this.provider,
          model: this.model,
        });
        return "No response from AI.";
      }

      return content.trim();
    } catch (err) {
      const axiosErr = err as AxiosError;

      logger.error("LLM API call failed", {
        provider: this.provider,
        url,
        status: axiosErr.response?.status,
        data: axiosErr.response?.data,
      });

      throw new Error(
        `LLM request failed (${this.provider}): ${axiosErr.message}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PROVIDER CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Builds the full API endpoint dynamically.
   *
   * Prevents common bugs like:
   * - Missing `/chat/completions`
   * - Incorrect base URLs
   */
  private getEndpoint(): string {
    const config = this.getProviderConfig();
    return `${config.baseUrl}${config.endpoint}`;
  }

  /**
   * Returns provider-specific configuration.
   *
   * Extend this method when adding new providers.
   */
  private getProviderConfig(): ProviderConfig {
    switch (this.provider) {
      case "openai":
        return {
          baseUrl: this.baseUrl,
          endpoint: "/chat/completions",
        };

      case "groq":
        return {
          baseUrl: this.baseUrl,
          endpoint: "/chat/completions",
        };

      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Reads a required environment variable.
   * Fails fast if missing to avoid runtime surprises.
   */
  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required env variable: ${key}`);
    }
    return value;
  }
}
