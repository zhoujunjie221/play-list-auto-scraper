interface Env {
  APPS_STORE: KVNamespace;
  API_KEY: string;
  API_URL: string;
  KEYWORDS: string;
}

interface AppItem {
  appId: string;
  title: string;
}

interface ApiResponse {
  results: AppItem[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("Use scheduled trigger");
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      // 解析关键词配置
      const keywords = env.KEYWORDS.split(',').map(k => k.toLowerCase());

      // 请求应用列表
      const response = await fetch(env.API_URL, {
        headers: { "x-api-key": env.API_KEY }
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data: ApiResponse = await response.json();
      const matchedApps = data.results.filter(app =>
        keywords.some(keyword =>
          app.title.toLowerCase().includes(keyword)
        )
      );

      console.log(`Matched ${matchedApps.length} apps`);

      // 批量写入KV
      const batch = matchedApps.map(app => ({
        key: app.appId,
        value: JSON.stringify({
          package_name: app.appId,
          app_name: app.title
        })
      }));

      await writeToKV(env.APPS_STORE, batch);
      console.log("Data saved successfully");
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }
};

async function writeToKV(kv: KVNamespace, items: { key: string, value: string }[]) {
  const promises = items.map(async ({ key, value }) => {
    // 检查是否已存在，如果不存在则添加
    const exists = await kv.get(key);
    if (!exists) {
      await kv.put(key, value);
      console.log(`Added: ${key}`);
    }
  });
  await Promise.all(promises);
}
