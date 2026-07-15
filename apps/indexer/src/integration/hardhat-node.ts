import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";

const CONTRACTS_DIR = path.resolve(__dirname, "../../../contracts");

export interface HardhatNodeHandle {
  rpcUrl: string;
  stop: () => Promise<void>;
}

async function waitUntilReady(rpcUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`hardhat node didn't become ready within ${timeoutMs}ms`);
}

/** Spawns a real `hardhat node` (the actual compiled contracts, not a mock)
 * from apps/contracts, on a dedicated port so it can run alongside a
 * developer's own local Sepolia-pointed indexer without colliding. */
export async function startHardhatNode(port: number): Promise<HardhatNodeHandle> {
  const rpcUrl = `http://127.0.0.1:${port}`;
  const child: ChildProcess = spawn(path.join(CONTRACTS_DIR, "node_modules/.bin/hardhat"), ["node", "--port", String(port)], {
    cwd: CONTRACTS_DIR,
    stdio: "ignore",
  });

  const exitPromise = new Promise<void>((_resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`hardhat node exited early with code ${code}`));
      }
    });
  });

  await Promise.race([waitUntilReady(rpcUrl, 20_000), exitPromise]);

  return {
    rpcUrl,
    stop: () =>
      new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
        child.kill();
      }),
  };
}
