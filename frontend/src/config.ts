import {
  createActor,
  type backendInterface,
  type CreateActorOptions,
  ExternalBlob,
} from "./backend";
import { HttpAgent } from "@icp-sdk/core/agent";

interface JsonConfig {
  backend_host: string;
  backend_canister_id: string;
  project_id: string;
  ii_derivation_origin: string;
}

interface Config {
  backend_host?: string;
  backend_canister_id: string;
  ii_derivation_origin?: string;
}

let configCache: Config | null = null;

export async function loadConfig(): Promise<Config> {
  if (configCache) {
    return configCache;
  }
  const backendCanisterId = process.env.CANISTER_ID_BACKEND;
  try {
    const response = await fetch("./env.json");
    const config = (await response.json()) as JsonConfig;
    if (!backendCanisterId && config.backend_canister_id === "undefined") {
      console.error("CANISTER_ID_BACKEND is not set");
      throw new Error("CANISTER_ID_BACKEND is not set");
    }

    const fullConfig = {
      backend_host:
        config.backend_host == "undefined" ? undefined : config.backend_host,
      backend_canister_id: (config.backend_canister_id == "undefined"
        ? backendCanisterId
        : config.backend_canister_id) as string,
      ii_derivation_origin:
        config.ii_derivation_origin == "undefined"
          ? undefined
          : config.ii_derivation_origin,
    };
    configCache = fullConfig;
    return fullConfig;
  } catch {
    if (!backendCanisterId) {
      console.error("CANISTER_ID_BACKEND is not set");
      throw new Error("CANISTER_ID_BACKEND is not set");
    }
    const fallbackConfig = {
      backend_host: undefined,
      backend_canister_id: backendCanisterId,
      ii_derivation_origin: undefined,
    };
    return fallbackConfig;
  }
}

function extractAgentErrorMessage(error: string): string {
  const errorString = String(error);
  const match = errorString.match(/with message:\s*'([^']+)'/s);
  return match ? match[1] : errorString;
}

function processError(e: unknown): never {
  if (e && typeof e === "object" && "message" in e) {
    throw new Error(extractAgentErrorMessage(e["message"] as string));
  } else throw e;
}

export async function createActorWithConfig(
  options?: CreateActorOptions,
): Promise<backendInterface> {
  const config = await loadConfig();
  if (!options) {
    options = {};
  }
  const agent = new HttpAgent({
    ...options.agentOptions,
    host: config.backend_host,
  });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch((err) => {
      console.warn(
        "Unable to fetch root key. Check to ensure that your local replica is running",
      );
      console.error(err);
    });
  }
  options = {
    ...options,
    agent: agent,
    processError,
  };

  // Required by createActor signature but not used
  const uploadFile = async (_file: ExternalBlob): Promise<Uint8Array> => {
    throw new Error("File upload not supported");
  };

  const downloadFile = async (_bytes: Uint8Array): Promise<ExternalBlob> => {
    throw new Error("File download not supported");
  };

  return createActor(
    config.backend_canister_id,
    uploadFile,
    downloadFile,
    options,
  );
}
